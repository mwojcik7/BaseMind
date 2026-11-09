<?php

namespace App\Services;

use App\Jobs\SendReminder;
use App\Models\Reminder;
use App\Models\User;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use RRule\RRule;

/**
 * Finds reminders that are due and queues their delivery. Runs every minute.
 */
class ReminderDispatcher
{
    private const BATCH_SIZE = 200;

    public function __construct(private readonly SyncService $sync) {}

    /**
     * @return int How many reminders went out.
     */
    public function dispatchDue(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now('UTC');
        $sent = 0;

        foreach (Reminder::due($now)->limit(self::BATCH_SIZE)->pluck('id') as $id) {
            $sent += $this->fire($id, $now) ? 1 : 0;
        }

        return $sent;
    }

    private function fire(string $id, CarbonImmutable $now): bool
    {
        return DB::transaction(function () use ($id, $now) {
            // Checked again under a lock, in case an overlapping run or the user got here first.
            $reminder = Reminder::due($now)->lockForUpdate()->find($id);
            if ($reminder === null) {
                return false;
            }

            $user = $reminder->creator;
            $preferences = $user->settings->notifications();

            // Stays due, so it goes out as soon as the quiet hours end.
            if ($this->isQuietTime($preferences['quiet_hours'], $user, $now)) {
                return false;
            }

            $this->sync->recordServerChange($reminder, $this->stateAfterFiring($reminder, $user, $now));

            foreach ($reminder->channels as $channel) {
                if ($preferences[$channel] ?? false) {
                    SendReminder::dispatch($reminder->id, $channel)->afterCommit();
                }
            }

            return true;
        }, 3);
    }

    /**
     * @return array<string, mixed>
     */
    private function stateAfterFiring(Reminder $reminder, User $user, CarbonImmutable $now): array
    {
        $state = ['snoozed_until' => null, 'last_sent_at' => $now];

        if ($reminder->rrule === null) {
            return [...$state, 'status' => 'sent'];
        }

        // A snooze ending: the regular schedule has already moved on and stays as it is.
        if ($reminder->remind_at->isAfter($now)) {
            return [...$state, 'status' => 'scheduled'];
        }

        $next = $this->nextFiring($reminder, $user->timezone, $now);

        return $next === null
            ? [...$state, 'status' => 'sent']
            : [...$state, 'status' => 'scheduled', 'remind_at' => $next];
    }

    /**
     * Occurrences are worked out in the user's time zone, so "every day at 9:00"
     * stays at 9:00 across daylight saving changes. Occurrences missed while the
     * server was down are skipped rather than sent in a burst.
     */
    private function nextFiring(Reminder $reminder, string $timezone, CarbonImmutable $now): ?CarbonImmutable
    {
        $offset = $reminder->offset_minutes;
        $occurrence = CarbonImmutable::parse($reminder->remind_at)->addMinutes($offset)->setTimezone($timezone);
        $after = $occurrence->max($now->addMinutes($offset)->setTimezone($timezone));

        $next = (new RRule($reminder->rrule, $occurrence->toDateTimeImmutable()))->getNthOccurrenceAfter($after, 1);

        return $next instanceof DateTimeInterface
            ? CarbonImmutable::instance($next)->subMinutes($offset)->utc()
            : null;
    }

    /**
     * @param  array{start: string, end: string}|null  $quietHours
     */
    private function isQuietTime(?array $quietHours, User $user, CarbonImmutable $now): bool
    {
        if ($quietHours === null) {
            return false;
        }

        $time = $now->setTimezone($user->timezone)->format('H:i');
        ['start' => $start, 'end' => $end] = $quietHours;

        // The usual case crosses midnight, e.g. 22:00 to 7:00.
        return $start <= $end
            ? $time >= $start && $time < $end
            : $time >= $start || $time < $end;
    }
}
