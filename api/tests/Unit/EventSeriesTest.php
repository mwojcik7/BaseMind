<?php

namespace Tests\Unit;

use App\Services\EventSeries;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** The app runs the same cases, so both sides agree on occurrences and reminders. */
class EventSeriesTest extends TestCase
{
    private const TIMEZONE = 'Europe/Warsaw';

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    private static function cases(string $group): array
    {
        $file = dirname(__DIR__, 3).'/web/src/modules/calendar/series.cases.json';
        $cases = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

        return collect($cases[$group])->mapWithKeys(fn (array $case) => [$case['name'] => [$case]])->all();
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function occurrences(): array
    {
        return self::cases('occurrences');
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function reminders(): array
    {
        return self::cases('reminders');
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('occurrences')]
    public function test_the_occurrences(array $case): void
    {
        $event = $case['event'];

        $this->assertSame($case['starts'], EventSeries::occurrenceStarts(
            $event['start_date'], $event['end_date'], $event['rrule'], $event['exdates'], $case['from'], $case['to'],
        ));
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('reminders')]
    public function test_the_next_reminder(array $case): void
    {
        $event = $case['event'];
        $next = EventSeries::nextReminderAt(
            $event['start_date'],
            $event['start_time'],
            $event['rrule'],
            $event['exdates'],
            $case['offset'],
            CarbonImmutable::parse($case['after'], self::TIMEZONE),
            self::TIMEZONE,
        );

        $this->assertSame($case['next'], $next?->setTimezone(self::TIMEZONE)->format('Y-m-d H:i'));
    }
}
