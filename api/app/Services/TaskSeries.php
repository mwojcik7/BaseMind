<?php

namespace App\Services;

use App\Models\Reminder;
use App\Models\Task;
use App\Models\User;
use App\Support\ReminderMoment;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use RRule\RRule;

/**
 * Repeating tasks. The same rules run in the app (web/src/modules/tasks/recurrence.ts),
 * which handles completing offline; this side handles the Done button on a notification.
 * Both are checked against the cases in web/src/modules/tasks/recurrence.cases.json.
 */
class TaskSeries
{
    public function __construct(private readonly SyncService $sync) {}

    /**
     * The next due date, or null when the series has ended.
     *
     * Counting from the due date, the next occurrence is the first one after both the
     * current occurrence and today: an overdue task doesn't come back already overdue.
     */
    public static function nextDueDate(
        string $rrule,
        string $repeatFrom,
        string $anchor,
        ?int $remaining,
        string $today,
    ): ?string {
        if ($remaining !== null && $remaining <= 1) {
            return null;
        }

        $start = $repeatFrom === 'completion' ? $today : $anchor;
        $after = max($start, $today);

        $next = self::rule($rrule, $start)
            ->getOccurrencesAfter(new DateTimeImmutable($after, new DateTimeZone('UTC')), false, 1)[0] ?? null;

        return $next instanceof DateTimeInterface ? $next->format('Y-m-d') : null;
    }

    /**
     * Occurrences fall at midnight UTC, so their dates are the task's dates. php-rrule
     * wants UNTIL in UTC then, while tasks store it as a plain date (UNTIL=20261231).
     *
     * @throws \InvalidArgumentException When the rule is not valid.
     */
    public static function rule(string $rrule, string $start): RRule
    {
        $rrule = (string) preg_replace('/\bUNTIL=(\d{8})(?=;|$)/i', 'UNTIL=$1T000000Z', $rrule);

        return new RRule($rrule, new DateTimeImmutable($start, new DateTimeZone('UTC')));
    }

    /**
     * Completes (or skips) the current occurrence: a copy goes to history and the task
     * moves to its next date with its subtasks open again. When the series has ended,
     * the task itself is completed. Call inside a transaction, with the task locked.
     *
     * @param  'done'|'cancelled'  $status
     */
    public function finishOccurrence(Task $task, User $user, string $status = 'done'): void
    {
        $now = CarbonImmutable::now('UTC');
        $currentDue = $task->due_date?->format('Y-m-d') ?? $now->setTimezone($user->timezone)->format('Y-m-d');
        $next = self::nextDueDate(
            (string) $task->rrule,
            $task->repeat_from,
            $task->repeat_anchor?->format('Y-m-d') ?? $currentDue,
            $task->repeat_remaining,
            $now->setTimezone($user->timezone)->format('Y-m-d'),
        );

        if ($next === null) {
            $this->sync->recordServerChange($task, ['status' => $status, 'completed_at' => $now]);
            $this->moveReminder($task, $user);

            return;
        }

        $copy = new Task;
        $copy->space_id = $task->space_id;
        $this->sync->recordServerCreate($copy, $user, [
            'list_id' => $task->list_id,
            'parent_id' => null,
            'title' => $task->title,
            'notes' => $task->notes,
            'priority' => $task->priority,
            'status' => $status,
            'due_date' => $currentDue,
            'due_time' => $task->due_time,
            'completed_at' => $now,
            'recurring_task_id' => $task->id,
        ]);

        $shift = CarbonImmutable::parse($currentDue)->diffInDays(CarbonImmutable::parse($next));
        $this->sync->recordServerChange($task, [
            'due_date' => $next,
            'repeat_anchor' => $next,
            'repeat_remaining' => $task->repeat_remaining === null ? null : $task->repeat_remaining - 1,
        ]);
        $this->moveReminder($task, $user);

        $subtasks = Task::where('space_id', $task->space_id)->where('parent_id', $task->id)->get();
        foreach ($subtasks as $subtask) {
            $this->sync->recordServerChange($subtask, [
                'status' => 'todo',
                'completed_at' => null,
                'due_date' => $subtask->due_date?->addDays((int) $shift)->format('Y-m-d'),
            ]);
            $this->moveReminder($subtask, $user);
        }
    }

    /** Keeps the task's reminder, if it has one, in step with its date and status. */
    private function moveReminder(Task $task, User $user): void
    {
        $reminder = Reminder::where('space_id', $task->space_id)
            ->where('entity_type', 'tasks')
            ->where('entity_id', $task->id)
            ->first();

        if ($reminder === null) {
            return;
        }

        if ($task->status !== 'todo' || $task->due_date === null) {
            $this->sync->recordServerChange($reminder, ['status' => 'dismissed', 'snoozed_until' => null]);

            return;
        }

        $moment = ReminderMoment::for(
            $task->due_date->format('Y-m-d'),
            $task->due_time,
            $reminder->offset_minutes,
            $user->timezone,
        );

        $this->sync->recordServerChange($reminder, [
            'remind_at' => $moment,
            // A moment already gone must not fire at once (as in the app).
            'status' => $moment->isFuture() ? 'scheduled' : 'dismissed',
            'snoozed_until' => null,
        ]);
    }
}
