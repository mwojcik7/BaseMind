<?php

namespace Tests\Unit;

use App\Support\ReminderMoment;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** The app runs the same cases, so both sides remind at the same moment. */
class ReminderMomentTest extends TestCase
{
    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function cases(): array
    {
        $file = dirname(__DIR__, 3).'/web/src/lib/reminder-moment.cases.json';
        $cases = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

        return collect($cases)->mapWithKeys(fn (array $case) => [$case['name'] => [$case]])->all();
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('cases')]
    public function test_the_moment(array $case): void
    {
        $moment = ReminderMoment::for($case['date'], $case['time'], $case['offset'], 'Europe/Warsaw', $case['at'] ?? null);

        $this->assertSame($case['moment'], $moment->setTimezone('Europe/Warsaw')->format('Y-m-d H:i'));
    }
}
