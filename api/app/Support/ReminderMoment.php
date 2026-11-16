<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * When a reminder about something dated goes out. The app follows the same rule
 * (`web/src/lib/reminder-moment.ts`, same cases file).
 *
 * - Without a time, the day counts from the morning.
 * - Whole days before (e.g. "1 day before") land in the morning of that day; a reminder
 *   with its own time of day (`$at`) lands at that time instead.
 * - `$at` matters only for whole days: other offsets count from the moment itself.
 */
final class ReminderMoment
{
    public const MORNING = '07:00';

    private const DAY_MINUTES = 1440;

    /** The moment in UTC; `$date`, `$time` and `$at` are wall time in `$timezone`. */
    public static function for(string $date, ?string $time, int $offset, string $timezone, ?string $at = null): CarbonImmutable
    {
        if ($offset % self::DAY_MINUTES === 0 && ($offset > 0 || $at !== null)) {
            return CarbonImmutable::parse($date.' '.($at ?? self::MORNING), $timezone)
                ->subDays(intdiv($offset, self::DAY_MINUTES))
                ->utc();
        }

        return CarbonImmutable::parse($date.' '.($time ?? self::MORNING), $timezone)
            ->subMinutes($offset)
            ->utc();
    }
}
