<?php

namespace App\Digest;

use App\Contracts\DigestSection;
use App\Models\Event;
use App\Models\User;
use App\Services\EventSeries;
use Carbon\CarbonImmutable;

/**
 * Today's events, all-day ones first, then by the time they start ("10:00 Dentysta").
 * The inner and last days of a long event read as all-day, as in the app's widget.
 */
class TodayEventsSection implements DigestSection
{
    public function forUser(User $user, CarbonImmutable $localDate): array
    {
        $today = $localDate->toDateString();
        $rows = [];

        $events = Event::query()
            ->whereIn('space_id', $user->spaces()->pluck('spaces.id'))
            ->whereDate('start_date', '<=', $today)
            // A series may still have an occurrence today long after its first one ended.
            ->where(fn ($query) => $query->whereNotNull('rrule')->orWhereDate('end_date', '>=', $today))
            ->get();

        foreach ($events as $event) {
            $startDate = $event->start_date->format('Y-m-d');
            $endDate = $event->end_date->format('Y-m-d');
            // An end on the stroke of midnight leaves the last day out, as in the app (days.ts).
            $endsAtMidnight = $event->start_time !== null && $event->end_time === '00:00' && $endDate > $startDate;
            $span = (int) $event->start_date->diffInDays($event->end_date) - ($endsAtMidnight ? 1 : 0);

            $starts = EventSeries::occurrenceStarts($startDate, $endDate, $event->rrule, $event->exdates, $today, $today);

            foreach ($starts as $start) {
                if (CarbonImmutable::parse($start)->addDays($span)->toDateString() < $today) {
                    continue;
                }
                // Only the first day of an occurrence shows when it starts.
                $time = $start === $today ? $event->start_time : null;
                $rows[] = [
                    'time' => $time,
                    // Titles are encrypted, so they are read through the model cast.
                    'label' => $time !== null ? "{$time} {$event->title}" : (string) $event->title,
                ];
            }
        }

        usort($rows, fn (array $a, array $b) => [$a['time'] !== null, $a['time'], $a['label']]
            <=> [$b['time'] !== null, $b['time'], $b['label']]);

        return [
            'title' => __('notifications.digest_events_today'),
            'items' => array_column($rows, 'label'),
        ];
    }
}
