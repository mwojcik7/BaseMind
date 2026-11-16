<?php

namespace Tests\Feature;

use App\Jobs\SendReminder;
use App\Models\Event;
use App\Models\Reminder;
use App\Models\User;
use App\Services\ReminderDispatcher;
use App\Services\Trash;
use App\Services\WebPushService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Mockery;
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

    /** A reminder as the app makes it: no rule of its own, pointing at the next occurrence. */
    private function pushReminder(string $eventId, string $remindAt, int $offset, ?string $time = null): Reminder
    {
        $id = (string) Str::uuid7();
        $this->actingAs($this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'reminders',
            'record_id' => $id,
            'op' => 'create',
            'payload' => [
                'id' => $id,
                'space_id' => $this->user->spaces()->first()->id,
                'entity_type' => 'events',
                'entity_id' => $eventId,
                'title' => 'Dentysta',
                'remind_at' => $remindAt,
                'offset_minutes' => $offset,
                'remind_time' => $time,
                'channels' => ['push', 'email'],
                'status' => 'scheduled',
            ],
            'base_version' => 0,
            'client_ts' => '2026-11-16T09:00:00.000Z',
        ]]])->assertOk()->assertJsonPath('results.0.status', 'applied');

        return Reminder::findOrFail($id);
    }

    private function runAt(string $utc): int
    {
        return app(ReminderDispatcher::class)->dispatchDue(CarbonImmutable::parse($utc, 'UTC'));
    }

    public function test_a_reminder_moves_on_to_the_next_occurrence_skipping_left_out_ones(): void
    {
        Queue::fake();
        // Tuesdays at 18:00 in Warsaw (17:00 UTC in winter), reminded an hour before.
        $event = $this->pushEvent([
            'start_date' => '2026-11-17',
            'end_date' => '2026-11-17',
            'rrule' => 'FREQ=WEEKLY;BYDAY=TU',
            'exdates' => ['2026-11-24'],
        ]);
        $reminder = $this->pushReminder($event['id'], '2026-11-17T16:00:00.000Z', 60);

        $this->assertSame(1, $this->runAt('2026-11-17 16:00:00'));

        $reminder->refresh();
        $this->assertSame('scheduled', $reminder->status);
        $this->assertSame('2026-12-01 16:00', $reminder->remind_at->utc()->format('Y-m-d H:i'));
        // Events go to the phone only, unless the user says otherwise.
        Queue::assertPushed(SendReminder::class, 1);
        Queue::assertPushed(SendReminder::class, fn (SendReminder $job) => $job->channel === 'push');
    }

    public function test_a_reminder_with_a_time_of_its_own_keeps_it_for_the_next_occurrence(): void
    {
        Queue::fake();
        // Tuesdays at 18:00, reminded two days before at 20:00 (19:00 UTC in winter).
        $event = $this->pushEvent([
            'start_date' => '2026-11-17',
            'end_date' => '2026-11-17',
            'rrule' => 'FREQ=WEEKLY;BYDAY=TU',
        ]);
        $reminder = $this->pushReminder($event['id'], '2026-11-15T19:00:00.000Z', 2880, '20:00');

        $this->assertSame(1, $this->runAt('2026-11-15 19:00:00'));

        $reminder->refresh();
        $this->assertSame('20:00', $reminder->remind_time);
        $this->assertSame('2026-11-22 19:00', $reminder->remind_at->utc()->format('Y-m-d H:i'));
    }

    public function test_a_reminder_time_must_be_a_time(): void
    {
        $event = $this->pushEvent();
        $id = (string) Str::uuid7();

        $this->actingAs($this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'reminders',
            'record_id' => $id,
            'op' => 'create',
            'payload' => [
                'id' => $id,
                'space_id' => $this->user->spaces()->first()->id,
                'entity_type' => 'events',
                'entity_id' => $event['id'],
                'title' => 'Dentysta',
                'remind_at' => '2026-11-15T19:00:00.000Z',
                'offset_minutes' => 2880,
                'remind_time' => '25:00',
                'channels' => ['push'],
                'status' => 'scheduled',
            ],
            'base_version' => 0,
            'client_ts' => '2026-11-16T09:00:00.000Z',
        ]]])->assertOk()->assertJsonPath('results.0.reason', 'invalid');
    }

    public function test_a_reminder_about_a_single_event_or_a_deleted_one_ends_when_sent(): void
    {
        Queue::fake();
        $single = $this->pushReminder($this->pushEvent()['id'], '2026-11-19T06:00:00.000Z', 1440);
        $deleted = $this->pushEvent(['rrule' => 'FREQ=DAILY']);
        $orphan = $this->pushReminder($deleted['id'], '2026-11-19T06:00:00.000Z', 1440);
        $this->op('delete', $deleted['id'], baseVersion: 1);

        $this->assertSame(2, $this->runAt('2026-11-19 06:00:00'));

        $this->assertSame('sent', $single->refresh()->status);
        $this->assertSame('sent', $orphan->refresh()->status);
    }

    public function test_noting_the_notification_keeps_a_series_going_and_ends_a_single_event(): void
    {
        Queue::fake();
        $series = $this->pushReminder(
            $this->pushEvent(['start_date' => '2026-11-17', 'end_date' => '2026-11-17', 'rrule' => 'FREQ=WEEKLY;BYDAY=TU'])['id'],
            '2026-11-17T16:00:00.000Z',
            60,
        );
        $single = $this->pushReminder($this->pushEvent(['start_date' => '2026-11-17', 'end_date' => '2026-11-17'])['id'], '2026-11-17T16:00:00.000Z', 60);
        $this->runAt('2026-11-17 16:00:00');
        $this->travelTo(CarbonImmutable::parse('2026-11-17 16:05:00', 'UTC'));

        $this->actingAs($this->user)->postJson("/api/reminders/{$series->id}/dismiss", ['done' => true])->assertNoContent();
        $this->actingAs($this->user)->postJson("/api/reminders/{$single->id}/dismiss", ['done' => true])->assertNoContent();

        $this->assertSame('scheduled', $series->refresh()->status);
        $this->assertSame('2026-11-24 16:00', $series->remind_at->utc()->format('Y-m-d H:i'));
        $this->assertSame('dismissed', $single->refresh()->status);
    }

    public function test_the_notification_opens_the_event_and_says_what_it_is_about(): void
    {
        $event = $this->pushEvent();
        $reminder = $this->pushReminder($event['id'], '2026-11-19T06:00:00.000Z', 1440);
        $push = Mockery::mock(WebPushService::class);
        $push->shouldReceive('send')->once()->withArgs(fn ($user, $payload) => $payload['url'] === '/calendar/events/'.$event['id']
            && $payload['entity_type'] === 'events');

        (new SendReminder($reminder->id, 'push'))->handle($push);
    }

    public function test_removing_an_event_for_good_removes_its_reminder(): void
    {
        $event = $this->pushEvent();
        $reminderId = $this->pushReminder($event['id'], '2026-11-19T06:00:00.000Z', 1440)->id;

        $this->assertSame('applied', $this->op('delete', $event['id'], baseVersion: 1)['status']);
        DB::transaction(fn () => app(Trash::class)->purge(Event::withTrashed()->lockForUpdate()->findOrFail($event['id'])));

        $this->assertNull(Event::withTrashed()->find($event['id']));
        $this->assertNull(Reminder::withTrashed()->find($reminderId));
    }
}
