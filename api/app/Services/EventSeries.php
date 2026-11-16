<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Reminder;
use App\Support\ReminderMoment;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

/**
 * Occurrences of calendar events. The same rules run in the app
 * (web/src/modules/calendar/series.ts); both are checked against
 * web/src/modules/calendar/series.cases.json.
 *
 * A series starts at the event's start_date. Occurrences are plain dates (at midnight
 * UTC, as for tasks), and the event's times are added on the user's clock.
 */
class EventSeries
{
    /** Enough for any reminder the app offers; a guard against endless rules. */
    private const MAX_LOOKAHEAD = 1000;

    /**
     * Start dates of the occurrences that fall on any day from `$from` to `$to` (inclusive).
     *
     * @param  list<string>|null  $exdates
     * @return list<string>
     */
    public static function occurrenceStarts(
        string $startDate,
        string $endDate,
        ?string $rrule,
        ?array $exdates,
        string $from,
        string $to,
    ): array {
        $span = (int) self::date($startDate)->diff(self::date($endDate))->days;
        $earliest = self::date($from)->modify("-{$span} days")->format('Y-m-d');

        if ($rrule === null) {
            return $startDate >= $earliest && $startDate <= $to ? [$startDate] : [];
        }

        $starts = array_map(
            fn (DateTimeInterface $occurrence) => $occurrence->format('Y-m-d'),
            TaskSeries::rule($rrule, $startDate)->getOccurrencesBetween(self::date($earliest), self::date($to)),
        );

        return array_values(array_diff($starts, $exdates ?? []));
    }

    /**
     * When the reminder `$offset` minutes before an occurrence goes out next, strictly
     * after `$after`; null when no occurrence is left to remind about. `$at` is the
     * reminder's own time of day for whole days before (ReminderMoment).
     *
     * @param  list<string>|null  $exdates
     */
    public static function nextReminderAt(
        string $startDate,
        ?string $startTime,
        ?string $rrule,
        ?array $exdates,
        int $offset,
        CarbonImmutable $after,
        string $timezone,
        ?string $at = null,
    ): ?CarbonImmutable {
        $momentOf = fn (string $start) => ReminderMoment::for($start, $startTime, $offset, $timezone, $at);

        if ($rrule === null) {
            $moment = $momentOf($startDate);

            return $moment->greaterThan($after) ? $moment : null;
        }

        // A reminder never comes after its occurrence, so earlier days are already gone.
        $skipped = array_flip($exdates ?? []);
        $rule = TaskSeries::rule($rrule, $startDate);
        $cursor = self::date($after->setTimezone($timezone)->format('Y-m-d'));
        $inclusive = true;

        for ($step = 0; $step < self::MAX_LOOKAHEAD; $step++) {
            $next = $rule->getOccurrencesAfter($cursor, $inclusive, 1)[0] ?? null;
            if (! $next instanceof DateTimeInterface) {
                return null;
            }

            $start = $next->format('Y-m-d');
            $moment = $momentOf($start);
            if (! isset($skipped[$start]) && $moment->greaterThan($after)) {
                return $moment;
            }

            $cursor = DateTimeImmutable::createFromInterface($next);
            $inclusive = false;
        }

        return null;
    }

    /**
     * The next moment for a reminder about an event, after `$after`; null when the event
     * is gone or has nothing left to remind about.
     */
    public function nextReminderFor(Reminder $reminder, CarbonImmutable $after, string $timezone): ?CarbonImmutable
    {
        $event = Event::where('space_id', $reminder->space_id)->find($reminder->entity_id);

        if ($event === null) {
            return null;
        }

        return self::nextReminderAt(
            $event->start_date->format('Y-m-d'),
            $event->start_time,
            $event->rrule,
            $event->exdates,
            $reminder->offset_minutes,
            $after,
            $timezone,
            $reminder->remind_time,
        );
    }

    private static function date(string $date): DateTimeImmutable
    {
        return new DateTimeImmutable($date, new DateTimeZone('UTC'));
    }
}
