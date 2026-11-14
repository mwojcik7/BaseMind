<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use App\Models\Task;
use App\Models\User;
use App\Policies\SpaceItemPolicy;
use App\Services\SyncService;
use App\Services\TaskSeries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * The buttons on a notification. Called by the Service Worker, which may know
 * nothing about the reminder yet if it was created on another device.
 */
class ReminderActionController
{
    public function __construct(
        private readonly SyncService $sync,
        private readonly TaskSeries $series,
    ) {}

    public function dismiss(Request $request, Reminder $reminder): Response|JsonResponse
    {
        app(SpaceItemPolicy::class)->update($request->user(), $reminder)->authorize();

        // The user decides about open subtasks in the app: the notification can't ask.
        // Nothing changes here; the Service Worker opens the task instead.
        if ($request->boolean('done') && $this->hasOpenSubtasks($reminder)) {
            return response()->json(['task_id' => $reminder->entity_id], 409);
        }

        return $this->change($request, $reminder, [
            // A repeating reminder keeps going; only this occurrence is dealt with.
            'status' => $reminder->rrule === null ? 'dismissed' : 'scheduled',
            'snoozed_until' => null,
        ], completeTask: $request->boolean('done'));
    }

    public function snooze(Request $request, Reminder $reminder): Response
    {
        $data = $request->validate(['minutes' => ['required', 'integer', 'min:5', 'max:10080']]);

        return $this->change($request, $reminder, [
            'status' => 'snoozed',
            'snoozed_until' => now()->addMinutes((int) $data['minutes']),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function change(Request $request, Reminder $reminder, array $attributes, bool $completeTask = false): Response
    {
        app(SpaceItemPolicy::class)->update($request->user(), $reminder)->authorize();

        DB::transaction(function () use ($request, $reminder, $attributes, $completeTask) {
            $locked = Reminder::lockForUpdate()->findOrFail($reminder->id);
            $this->sync->recordServerChange($locked, $attributes);

            if ($completeTask && $locked->entity_type === 'tasks') {
                $this->completeTask($locked, $request->user());
            }
        });

        return response()->noContent();
    }

    /** A repeating task doesn't ask: its subtasks come back open with the next occurrence. */
    private function hasOpenSubtasks(Reminder $reminder): bool
    {
        return $reminder->entity_type === 'tasks'
            && Task::where('space_id', $reminder->space_id)
                ->where('id', $reminder->entity_id)
                ->whereNull('rrule')
                ->exists()
            && Task::where('space_id', $reminder->space_id)
                ->where('parent_id', $reminder->entity_id)
                ->where('status', 'todo')
                ->exists();
    }

    /** Looked up within the reminder's space, the one access was just checked for. */
    private function completeTask(Reminder $reminder, User $user): void
    {
        $task = Task::where('space_id', $reminder->space_id)->lockForUpdate()->find($reminder->entity_id);

        if ($task?->status !== 'todo') {
            return;
        }

        if ($task->isRecurring()) {
            $this->series->finishOccurrence($task, $user);
        } else {
            $this->sync->recordServerChange($task, ['status' => 'done', 'completed_at' => now()]);
        }
    }
}
