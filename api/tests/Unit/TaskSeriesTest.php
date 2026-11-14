<?php

namespace Tests\Unit;

use App\Services\TaskSeries;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** The app runs the same cases, so a series moves the same way on both sides. */
class TaskSeriesTest extends TestCase
{
    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function cases(): array
    {
        $file = dirname(__DIR__, 3).'/web/src/modules/tasks/recurrence.cases.json';
        $cases = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

        return collect($cases)->mapWithKeys(fn (array $case) => [$case['name'] => [$case]])->all();
    }

    /**
     * @param  array<string, mixed>  $case
     */
    #[DataProvider('cases')]
    public function test_the_next_due_date(array $case): void
    {
        $this->assertSame(
            $case['next'],
            TaskSeries::nextDueDate($case['rrule'], $case['from'], $case['anchor'], $case['remaining'], $case['today']),
        );
    }
}
