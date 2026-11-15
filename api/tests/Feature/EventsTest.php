<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Reminder;
use App\Models\User;
use App\Services\Trash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EventsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:8080/');
        $this->user = User::factory()->create(['timezone' => 'Europe/Warsaw']);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed> The result of the operation.
     */
    private function op(string $op, string $id, array $payload = [], int $baseVersion = 0, ?User $user = null): array
    {
        return $this->actingAs($user ?? $this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'events',
            'record_id' => $id,
            'op' => $op,
            'payload' => $payload,
            'base_version' => $baseVersion,
            'client_ts' => '2026-11-16T09:00:00.000Z',
        ]]])->assertOk()->json('results.0');
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed> The result of the operation, with the record's id.
     */
    private function pushEvent(array $fields = [], ?User $user = null): array
    {
        $user ??= $this->user;
        $id = (string) Str::uuid7();
        $result = $this->op('create', $id, [
            'id' => $id,
            'space_id' => $user->spaces()->first()->id,
            'title' => 'Dentysta',
            'location' => null,
            'description' => null,
            'start_date' => '2026-11-20',
            'start_time' => '18:00',
            'end_date' => '2026-11-20',
            'end_time' => '19:00',
            'rrule' => null,
            'exdates' => null,
            'color' => null,
            ...$fields,
        ], user: $user);

        return [...$result, 'id' => $id];
    }

    public function test_an_event_is_stored_encrypted_and_pulled_as_sent(): void
    {
        $event = $this->pushEvent([
            'title' => 'Tajna wizyta',
            'location' => 'Tajny adres',
            'description' => 'Tajny **opis**',
            'rrule' => 'FREQ=WEEKLY;BYDAY=TU;COUNT=10',
            'exdates' => ['2026-11-27'],
            'color' => 'green',
        ]);
        $this->assertSame('applied', $event['status']);

        $row = DB::table('events')->where('id', $event['id'])->first();
        foreach (['title', 'location', 'description'] as $field) {
            $this->assertStringStartsWith('bm1:', $row->{$field});
            $this->assertStringNotContainsString('Tajn', $row->{$field});
        }

        $record = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->assertOk()->json('changes'))
            ->firstWhere('entity', 'events')['record'];
        $this->assertSame('Tajna wizyta', $record['title']);
        $this->assertSame('Tajny adres', $record['location']);
        $this->assertSame('Tajny **opis**', $record['description']);
        $this->assertSame('2026-11-20', $record['start_date']);
        $this->assertSame('18:00', $record['start_time']);
        $this->assertSame('2026-11-20', $record['end_date']);
        $this->assertSame('19:00', $record['end_time']);
        $this->assertSame('FREQ=WEEKLY;BYDAY=TU;COUNT=10', $record['rrule']);
        $this->assertSame(['2026-11-27'], $record['exdates']);
        $this->assertSame('green', $record['color']);
    }

    public function test_an_all_day_event_over_several_days_is_accepted(): void
    {
        $event = $this->pushEvent(['start_time' => null, 'end_time' => null, 'end_date' => '2026-11-22']);

        $this->assertSame('applied', $event['status']);
        $this->assertTrue(Event::findOrFail($event['id'])->isAllDay());
    }

    public function test_another_user_does_not_receive_the_event(): void
    {
        $this->pushEvent();

        $this->actingAs(User::factory()->create())->getJson('/api/sync/pull')
            ->assertOk()->assertJsonPath('changes', []);
    }

    #[DataProvider('invalidEvents')]
    public function test_an_invalid_event_is_rejected(array $fields): void
    {
        $this->assertSame('rejected', $this->pushEvent($fields)['status']);
        $this->assertSame(0, Event::count());
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function invalidEvents(): array
    {
        return [
            'empty title' => [['title' => '']],
            'title too long' => [['title' => str_repeat('a', 501)]],
            'location too long' => [['location' => str_repeat('a', 501)]],
            'description too long' => [['description' => str_repeat('a', 10001)]],
            'no start' => [['start_date' => null]],
            'no end' => [['end_date' => null]],
            'date with time' => [['start_date' => '2026-11-20T18:00:00Z']],
            'bad time' => [['start_time' => '25:00']],
            'ends the day before' => [['end_date' => '2026-11-19']],
            'ends before it starts' => [['end_time' => '17:30']],
            'start time without end time' => [['end_time' => null]],
            'end time without start time' => [['start_time' => null]],
            'unknown colour' => [['color' => '#ff0000']],
            'hourly rule' => [['rrule' => 'FREQ=HOURLY']],
            'rule with a start' => [['rrule' => 'DTSTART=20261120;FREQ=DAILY']],
            'count and until together' => [['rrule' => 'FREQ=DAILY;COUNT=3;UNTIL=20261231']],
            'zero count' => [['rrule' => 'FREQ=DAILY;COUNT=0']],
            'skipped date with time' => [['exdates' => ['2026-11-27T18:00']]],
        ];
    }

    public function test_an_event_may_end_when_it_starts(): void
    {
        $this->assertSame('applied', $this->pushEvent(['end_time' => '18:00'])['status']);
    }

    public function test_an_event_ending_the_next_day_may_end_at_an_earlier_hour(): void
    {
        $event = $this->pushEvent(['start_time' => '22:00', 'end_date' => '2026-11-21', 'end_time' => '02:00']);

        $this->assertSame('applied', $event['status']);
    }

    public function test_a_change_without_the_dates_keeps_the_span(): void
    {
        $event = $this->pushEvent();

        $this->assertSame('applied', $this->op('update', $event['id'], ['title' => 'Ortodonta'], 1)['status']);
        $this->assertSame('applied', $this->op('update', $event['id'], ['end_date' => '2026-11-21'], 2)['status']);
        $this->assertSame('rejected', $this->op('update', $event['id'], [
            'start_date' => '2026-11-22',
            'end_date' => '2026-11-21',
        ], 3)['status']);
    }

    public function test_removing_an_event_for_good_removes_its_reminder(): void
    {
        $event = $this->pushEvent();
        $reminderId = (string) Str::uuid7();
        $this->actingAs($this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'reminders',
            'record_id' => $reminderId,
            'op' => 'create',
            'payload' => [
                'id' => $reminderId,
                'space_id' => $this->user->spaces()->first()->id,
                'entity_type' => 'events',
                'entity_id' => $event['id'],
                'title' => 'Dentysta',
                'remind_at' => '2026-11-19T06:00:00.000Z',
                'offset_minutes' => 1440,
                'channels' => ['push'],
                'status' => 'scheduled',
            ],
            'base_version' => 0,
            'client_ts' => '2026-11-16T09:00:00.000Z',
        ]]])->assertOk()->assertJsonPath('results.0.status', 'applied');

        $this->assertSame('applied', $this->op('delete', $event['id'], baseVersion: 1)['status']);
        DB::transaction(fn () => app(Trash::class)->purge(Event::withTrashed()->lockForUpdate()->findOrFail($event['id'])));

        $this->assertNull(Event::withTrashed()->find($event['id']));
        $this->assertNull(Reminder::withTrashed()->find($reminderId));
    }
}
