<?php

namespace Tests\Feature;

use App\Contracts\DigestSection;
use App\Enums\SpaceRole;
use App\Jobs\SendDigest;
use App\Jobs\SendReminder;
use App\Mail\DigestMail;
use App\Mail\ReminderMail;
use App\Models\PushSubscription;
use App\Models\Reminder;
use App\Models\Space;
use App\Models\User;
use App\Services\ReminderDispatcher;
use App\Services\WebPushService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class FakeDigestSection implements DigestSection
{
    /** @var list<string> */
    public static array $items = ['Opłacić OC'];

    public function forUser(User $user, CarbonImmutable $localDate): ?array
    {
        return ['title' => 'Zadania', 'items' => self::$items];
    }
}

class RecordingWebPush extends WebPushService
{
    /** @var list<string> */
    public array $expired = [];

    public int $delivered = 0;

    protected function deliver(Collection $subscriptions, array $payload): array
    {
        $this->delivered = $subscriptions->count();

        return $this->expired;
    }
}

class RemindersTest extends TestCase
{
    use RefreshDatabase;

    private const FCM = 'https://fcm.googleapis.com/fcm/send/abc';

    private User $user;

    private string $spaceId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:8080/');
        $this->user = User::factory()->create(['timezone' => 'Europe/Warsaw']);
        $this->spaceId = $this->user->spaces()->first()->id;
        Queue::fake();
    }

    private function at(string $moment): CarbonImmutable
    {
        return CarbonImmutable::parse($moment, 'UTC');
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    private function pushCreate(array $fields, ?string $id = null): array
    {
        $id ??= (string) Str::uuid7();

        return $this->actingAs($this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'reminders',
            'record_id' => $id,
            'op' => 'create',
            'payload' => [
                'id' => $id,
                'space_id' => $this->spaceId,
                'title' => 'Przegląd auta',
                'remind_at' => '2026-11-09T10:00:00.000Z',
                'offset_minutes' => 0,
                'channels' => ['push', 'email'],
                'status' => 'scheduled',
                ...$fields,
            ],
            'base_version' => 0,
            'client_ts' => '2026-11-09T09:00:00.000Z',
        ]]])->assertOk()->json('results.0');
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    private function reminder(array $fields = []): Reminder
    {
        $id = (string) Str::uuid7();
        $this->assertSame('applied', $this->pushCreate($fields, $id)['status']);

        return Reminder::findOrFail($id);
    }

    private function run_at(string $moment): int
    {
        return app(ReminderDispatcher::class)->dispatchDue($this->at($moment));
    }

    /**
     * @param  array<string, mixed>  $notifications
     */
    private function setPreferences(array $notifications): void
    {
        $settings = $this->user->settings;
        $settings->update(['settings' => ['notifications' => $notifications]]);
        $this->user->refresh();
    }

    private function subscribe(string $sessionId = 'live-session', string $endpoint = self::FCM): void
    {
        PushSubscription::create([
            'user_id' => $this->user->id,
            'session_id' => $sessionId,
            'endpoint' => $endpoint,
            'endpoint_hash' => PushSubscription::hashEndpoint($endpoint),
            'p256dh' => 'key',
            'auth' => 'auth',
        ]);
    }

    private function addSession(string $id): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $this->user->id,
            'payload' => '',
            'last_activity' => time(),
        ]);
    }

    public function test_a_due_reminder_goes_out_once_on_each_channel(): void
    {
        $reminder = $this->reminder();
        $rev = $reminder->rev;

        $this->assertSame(1, $this->run_at('2026-11-09 10:00:00'));
        $this->assertSame(0, $this->run_at('2026-11-09 10:01:00'));

        $reminder->refresh();
        $this->assertSame('sent', $reminder->status);
        $this->assertSame('2026-11-09 10:00:00', $reminder->last_sent_at->format('Y-m-d H:i:s'));
        $this->assertGreaterThan($rev, $reminder->rev);
        $this->assertSame(2, $reminder->version);
        Queue::assertPushed(SendReminder::class, 2);
        Queue::assertPushed(SendReminder::class, fn ($job) => $job->channel === 'push');
        Queue::assertPushed(SendReminder::class, fn ($job) => $job->channel === 'email');
    }

    public function test_devices_learn_that_a_reminder_went_out(): void
    {
        $reminder = $this->reminder();
        $this->run_at('2026-11-09 10:00:00');

        $this->actingAs($this->user)->getJson('/api/sync/pull')
            ->assertJsonPath('changes.0.record.id', $reminder->id)
            ->assertJsonPath('changes.0.record.status', 'sent')
            ->assertJsonPath('changes.0.record.last_sent_at', fn ($value) => $value !== null);
    }

    public function test_devices_cannot_set_when_a_reminder_went_out(): void
    {
        $this->assertSame('unknown_field', $this->pushCreate(['last_sent_at' => '2026-11-09T10:00:00Z'])['reason']);
    }

    public function test_waits_for_its_time_and_ignores_deleted_or_dismissed_ones(): void
    {
        $this->reminder(['remind_at' => '2026-11-09T11:00:00.000Z']);
        $this->reminder(['status' => 'dismissed']);
        $this->reminder()->forceFill(['deleted_at' => now()])->save();

        $this->assertSame(0, $this->run_at('2026-11-09 10:30:00'));
    }

    public function test_only_uses_channels_the_user_has_on(): void
    {
        $this->setPreferences(['email' => false]);
        $this->reminder();

        $this->run_at('2026-11-09 10:00:00');

        Queue::assertPushed(SendReminder::class, 1);
        Queue::assertPushed(SendReminder::class, fn ($job) => $job->channel === 'push');
    }

    public function test_only_the_channels_of_the_reminder_are_used(): void
    {
        $this->reminder(['channels' => ['email']]);

        $this->run_at('2026-11-09 10:00:00');

        Queue::assertPushed(SendReminder::class, 1);
        Queue::assertPushed(SendReminder::class, fn ($job) => $job->channel === 'email');
    }

    public function test_a_repeating_reminder_moves_to_its_next_occurrence(): void
    {
        $reminder = $this->reminder(['rrule' => 'FREQ=DAILY']);

        $this->run_at('2026-11-09 10:00:00');

        $reminder->refresh();
        $this->assertSame('scheduled', $reminder->status);
        $this->assertSame('2026-11-10 10:00:00', $reminder->remind_at->format('Y-m-d H:i:s'));
    }

    public function test_a_daily_reminder_keeps_its_local_hour_across_a_clock_change(): void
    {
        // 9:00 in Warsaw is 07:00 UTC in summer time and 08:00 UTC in winter time.
        $reminder = $this->reminder(['rrule' => 'FREQ=DAILY', 'remind_at' => '2026-10-24T07:00:00.000Z']);

        $this->run_at('2026-10-24 07:00:00');

        $this->assertSame('2026-10-25 08:00:00', $reminder->refresh()->remind_at->format('Y-m-d H:i:s'));
    }

    public function test_occurrences_missed_while_the_server_was_down_are_not_sent_in_a_burst(): void
    {
        $reminder = $this->reminder(['rrule' => 'FREQ=DAILY']);

        $this->assertSame(1, $this->run_at('2026-11-14 12:00:00'));
        $this->assertSame(0, $this->run_at('2026-11-14 12:01:00'));

        $this->assertSame('2026-11-15 10:00:00', $reminder->refresh()->remind_at->format('Y-m-d H:i:s'));
    }

    public function test_an_early_warning_stays_the_same_time_before_each_occurrence(): void
    {
        // The payment is on the 10th of each month at 12:00 local; the reminder comes 3 days before.
        $reminder = $this->reminder([
            'rrule' => 'FREQ=MONTHLY;BYMONTHDAY=10',
            'offset_minutes' => 3 * 24 * 60,
            'remind_at' => '2026-11-07T11:00:00.000Z',
        ]);

        $this->run_at('2026-11-07 11:00:00');

        $this->assertSame('2026-12-07 11:00:00', $reminder->refresh()->remind_at->format('Y-m-d H:i:s'));
    }

    public function test_a_repeating_reminder_ends_with_its_rule(): void
    {
        $reminder = $this->reminder(['rrule' => 'FREQ=DAILY;UNTIL=20261109T235959Z']);

        $this->run_at('2026-11-09 10:00:00');

        $this->assertSame('sent', $reminder->refresh()->status);
    }

    public function test_a_rule_with_no_further_dates_ends_instead_of_failing(): void
    {
        $reminder = $this->reminder(['rrule' => 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30']);

        $this->run_at('2026-11-09 10:00:00');

        $this->assertSame('sent', $reminder->refresh()->status);
    }

    public function test_refuses_rules_it_cannot_honour(): void
    {
        foreach (['nonsense', 'FREQ=DAILY;COUNT=3', 'DTSTART:20260101T000000Z;FREQ=DAILY'] as $rule) {
            $this->assertSame('invalid', $this->pushCreate(['rrule' => $rule])['reason'], $rule);
        }
    }

    public function test_titles_are_encrypted_at_rest_and_plain_for_the_owner(): void
    {
        $reminder = $this->reminder(['title' => 'Wizyta u lekarza']);

        $stored = DB::table('reminders')->where('id', $reminder->id)->value('title');
        $this->assertStringStartsWith('bm1:', $stored);
        $this->assertStringNotContainsString('lekarza', $stored);
        $this->assertSame('Wizyta u lekarza', $reminder->title);
        $this->actingAs($this->user)->getJson('/api/sync/pull')->assertJsonPath('changes.0.record.title', 'Wizyta u lekarza');
    }

    public function test_the_longest_allowed_title_fits_when_encrypted(): void
    {
        $title = str_repeat('ż', 255);

        $this->assertSame($title, $this->reminder(['title' => $title])->title);
    }

    public function test_refuses_unknown_channels(): void
    {
        $this->assertSame('invalid', $this->pushCreate(['channels' => ['sms']])['reason']);
    }

    public function test_quiet_hours_hold_a_reminder_until_they_end(): void
    {
        $this->setPreferences(['quiet_hours' => ['start' => '22:00', 'end' => '07:00']]);
        // 23:00 in Warsaw.
        $reminder = $this->reminder(['remind_at' => '2026-11-09T22:00:00.000Z']);

        $this->assertSame(0, $this->run_at('2026-11-09 22:00:00'));
        $this->assertSame(0, $this->run_at('2026-11-10 05:59:00'));
        $this->assertSame('scheduled', $reminder->refresh()->status);

        $this->assertSame(1, $this->run_at('2026-11-10 06:00:00'));
    }

    public function test_quiet_hours_that_do_not_cross_midnight(): void
    {
        $this->setPreferences(['quiet_hours' => ['start' => '12:00', 'end' => '14:00']]);
        // 11:00 in Warsaw: before the quiet hours.
        $this->reminder();

        $this->assertSame(1, $this->run_at('2026-11-09 10:00:00'));
    }

    public function test_snoozing_brings_a_reminder_back_later(): void
    {
        $reminder = $this->reminder();
        $this->run_at('2026-11-09 10:00:00');

        $this->travelTo($this->at('2026-11-09 10:05:00'));
        $this->actingAs($this->user)->postJson("/api/reminders/{$reminder->id}/snooze", ['minutes' => 60])->assertNoContent();

        $this->assertSame('snoozed', $reminder->refresh()->status);
        $this->assertSame(0, $this->run_at('2026-11-09 11:04:00'));
        $this->assertSame(1, $this->run_at('2026-11-09 11:05:00'));
        $this->assertSame('sent', $reminder->refresh()->status);
        $this->assertNull($reminder->snoozed_until);
    }

    public function test_snoozing_a_repeating_reminder_does_not_shift_its_schedule(): void
    {
        $reminder = $this->reminder(['rrule' => 'FREQ=DAILY']);
        $this->run_at('2026-11-09 10:00:00');

        $this->travelTo($this->at('2026-11-09 10:05:00'));
        $this->actingAs($this->user)->postJson("/api/reminders/{$reminder->id}/snooze", ['minutes' => 60])->assertNoContent();
        $this->run_at('2026-11-09 11:05:00');

        $reminder->refresh();
        $this->assertSame('scheduled', $reminder->status);
        $this->assertSame('2026-11-10 10:00:00', $reminder->remind_at->format('Y-m-d H:i:s'));
    }

    public function test_dismissing_ends_a_one_off_reminder_but_not_a_repeating_one(): void
    {
        $oneOff = $this->reminder();
        $repeating = $this->reminder(['rrule' => 'FREQ=DAILY']);
        $this->run_at('2026-11-09 10:00:00');

        $this->actingAs($this->user)->postJson("/api/reminders/{$oneOff->id}/dismiss")->assertNoContent();
        $this->actingAs($this->user)->postJson("/api/reminders/{$repeating->id}/dismiss")->assertNoContent();

        $this->assertSame('dismissed', $oneOff->refresh()->status);
        $this->assertSame('scheduled', $repeating->refresh()->status);
    }

    public function test_buttons_respect_access_rights(): void
    {
        $reminder = $this->reminder();
        $stranger = User::factory()->create();
        $viewer = User::factory()->create();
        Space::findOrFail($this->spaceId)->members()->attach($viewer->id, ['role' => SpaceRole::Viewer->value]);

        $this->actingAs($stranger)->postJson("/api/reminders/{$reminder->id}/dismiss")->assertNotFound();
        $this->actingAs($viewer)->postJson("/api/reminders/{$reminder->id}/dismiss")->assertForbidden();
        $this->assertSame('scheduled', $reminder->refresh()->status);
    }

    public function test_snoozing_validates_the_time(): void
    {
        $reminder = $this->reminder();

        $this->actingAs($this->user)->postJson("/api/reminders/{$reminder->id}/snooze", ['minutes' => 1])->assertUnprocessable();
    }

    public function test_the_email_job_sends_the_reminder(): void
    {
        Mail::fake();
        $reminder = $this->reminder();

        (new SendReminder($reminder->id, 'email'))->handle(app(WebPushService::class));

        Mail::assertSent(ReminderMail::class, fn ($mail) => $mail->hasTo($this->user->email) && $mail->reminder->is($reminder));
    }

    public function test_the_email_renders_the_title_unescaped_as_plain_text(): void
    {
        $reminder = $this->reminder(['title' => 'Kawa & ciastko']);

        $this->assertStringContainsString('Kawa & ciastko', (new ReminderMail($reminder))->render());
    }

    public function test_the_push_job_sends_what_the_notification_needs(): void
    {
        $reminder = $this->reminder();
        $this->run_at('2026-11-09 10:00:00');
        $push = Mockery::mock(WebPushService::class);
        $push->shouldReceive('send')->once()->withArgs(fn ($user, $payload) => $user->is($this->user)
            && $payload['title'] === 'Przegląd auta'
            && $payload['reminder_id'] === $reminder->id
            && $payload['badge'] === 1);

        (new SendReminder($reminder->id, 'push'))->handle($push);
    }

    public function test_a_job_for_a_reminder_that_is_gone_does_nothing(): void
    {
        $push = Mockery::mock(WebPushService::class);
        $push->shouldNotReceive('send');

        (new SendReminder((string) Str::uuid7(), 'push'))->handle($push);
    }

    public function test_registers_a_device_tied_to_its_session(): void
    {
        $this->actingAs($this->user)->postJson('/api/push/subscriptions', [
            'endpoint' => self::FCM,
            'keys' => ['p256dh' => 'key', 'auth' => 'auth'],
            'device_name' => 'Chrome, Android',
        ])->assertNoContent();

        $subscription = PushSubscription::firstOrFail();
        $this->assertSame($this->user->id, $subscription->user_id);
        $this->assertNotNull($subscription->session_id);
    }

    public function test_registering_again_updates_the_device_even_for_another_account(): void
    {
        $this->subscribe();
        $other = User::factory()->create();

        $this->actingAs($other)->postJson('/api/push/subscriptions', [
            'endpoint' => self::FCM,
            'keys' => ['p256dh' => 'new', 'auth' => 'auth'],
        ])->assertNoContent();

        $this->assertSame(1, PushSubscription::count());
        $this->assertSame($other->id, PushSubscription::first()->user_id);
    }

    public function test_only_real_push_services_are_accepted(): void
    {
        foreach ([
            'http://fcm.googleapis.com/x',
            'https://evil.example.com/x',
            'https://fcm.googleapis.com.evil.example.com/x',
            'https://127.0.0.1/x',
        ] as $endpoint) {
            $this->actingAs($this->user)->postJson('/api/push/subscriptions', [
                'endpoint' => $endpoint,
                'keys' => ['p256dh' => 'key', 'auth' => 'auth'],
            ])->assertUnprocessable();
        }

        $this->assertSame(0, PushSubscription::count());
    }

    public function test_removes_only_your_own_device(): void
    {
        $this->subscribe();

        $this->actingAs(User::factory()->create())->deleteJson('/api/push/subscriptions', ['endpoint' => self::FCM])->assertNoContent();
        $this->assertSame(1, PushSubscription::count());

        $this->actingAs($this->user)->deleteJson('/api/push/subscriptions', ['endpoint' => self::FCM])->assertNoContent();
        $this->assertSame(0, PushSubscription::count());
    }

    public function test_a_device_whose_session_ended_stops_getting_notifications(): void
    {
        $this->addSession('live-session');
        $this->subscribe('live-session', self::FCM.'1');
        $this->subscribe('revoked-session', self::FCM.'2');
        $push = new RecordingWebPush;

        $push->send($this->user, ['title' => 'x']);

        $this->assertSame(1, $push->delivered);
        $this->assertSame([self::FCM.'1'], PushSubscription::pluck('endpoint')->all());
    }

    public function test_devices_the_push_service_reports_as_gone_are_removed(): void
    {
        $this->addSession('live-session');
        $this->subscribe();
        $push = new RecordingWebPush;
        $push->expired = [self::FCM];

        $push->send($this->user, ['title' => 'x']);

        $this->assertSame(0, PushSubscription::count());
    }

    public function test_settings_have_defaults_and_can_be_changed(): void
    {
        $this->actingAs($this->user)->getJson('/api/settings')->assertExactJson(['notifications' => [
            'push' => true,
            'email' => true,
            'quiet_hours' => null,
            'digest' => ['enabled' => true, 'time' => '07:00'],
        ]]);

        $changed = [
            'push' => false,
            'email' => true,
            'quiet_hours' => ['start' => '22:00', 'end' => '07:00'],
            'digest' => ['enabled' => false, 'time' => '06:30'],
        ];
        $this->actingAs($this->user)->postJson('/api/settings', ['notifications' => $changed])->assertNoContent();

        $this->actingAs($this->user)->getJson('/api/settings')->assertExactJson(['notifications' => $changed]);
    }

    public function test_quiet_hours_can_be_turned_off_again(): void
    {
        $this->setPreferences(['quiet_hours' => ['start' => '22:00', 'end' => '07:00']]);

        $this->actingAs($this->user)->postJson('/api/settings', ['notifications' => [
            'push' => true,
            'email' => true,
            'quiet_hours' => null,
            'digest' => ['enabled' => true, 'time' => '07:00'],
        ]])->assertNoContent();

        $this->assertNull($this->user->refresh()->settings->notifications()['quiet_hours']);
    }

    public function test_settings_are_validated(): void
    {
        $this->actingAs($this->user)->postJson('/api/settings', ['notifications' => [
            'push' => true,
            'email' => true,
            'quiet_hours' => null,
            'digest' => ['enabled' => true, 'time' => '25:00'],
        ]])->assertUnprocessable();
    }

    public function test_changing_the_theme_keeps_notification_settings(): void
    {
        $this->setPreferences(['push' => false]);

        $this->actingAs($this->user)->postJson('/api/settings', ['theme' => 'dark'])->assertNoContent();

        $this->assertFalse($this->user->refresh()->settings->notifications()['push']);
    }

    public function test_the_digest_goes_out_at_its_local_time_once_a_day(): void
    {
        // 7:00 in Warsaw.
        $this->travelTo($this->at('2026-11-09 06:00:00'));

        $this->artisan('basemind:send-digests')->assertSuccessful();
        $this->artisan('basemind:send-digests')->assertSuccessful();

        Queue::assertPushed(SendDigest::class, 1);
        Queue::assertPushed(SendDigest::class, fn ($job) => $job->userId === $this->user->id && $job->localDate === '2026-11-09');
    }

    public function test_the_digest_waits_for_its_time(): void
    {
        $this->travelTo($this->at('2026-11-09 05:59:00'));

        $this->artisan('basemind:send-digests')->assertSuccessful();

        Queue::assertNotPushed(SendDigest::class);
    }

    public function test_the_digest_follows_the_chosen_time(): void
    {
        $this->setPreferences(['digest' => ['enabled' => true, 'time' => '09:30']]);

        $this->travelTo($this->at('2026-11-09 06:00:00'));
        $this->artisan('basemind:send-digests');
        Queue::assertNotPushed(SendDigest::class);

        $this->travelTo($this->at('2026-11-09 08:30:00'));
        $this->artisan('basemind:send-digests');
        Queue::assertPushed(SendDigest::class, 1);
    }

    public function test_a_digest_too_late_in_the_day_is_skipped(): void
    {
        $this->travelTo($this->at('2026-11-09 14:00:00'));

        $this->artisan('basemind:send-digests');

        Queue::assertNotPushed(SendDigest::class);
    }

    public function test_the_digest_can_be_turned_off(): void
    {
        $this->setPreferences(['digest' => ['enabled' => false, 'time' => '07:00']]);
        $this->travelTo($this->at('2026-11-09 06:00:00'));

        $this->artisan('basemind:send-digests');

        Queue::assertNotPushed(SendDigest::class);
    }

    public function test_an_empty_digest_is_not_sent(): void
    {
        Mail::fake();
        $push = Mockery::mock(WebPushService::class);
        $push->shouldNotReceive('send');

        (new SendDigest($this->user->id, '2026-11-09'))->handle($push);

        Mail::assertNothingSent();
    }

    public function test_a_digest_with_content_goes_to_the_enabled_channels(): void
    {
        Mail::fake();
        config(['digest.sections' => [FakeDigestSection::class]]);
        $push = Mockery::mock(WebPushService::class);
        $push->shouldReceive('send')->once()->withArgs(fn ($user, $payload) => $payload['body'] === 'Zadania: 1');

        (new SendDigest($this->user->id, '2026-11-09'))->handle($push);

        Mail::assertSent(DigestMail::class, fn ($mail) => $mail->sections[0]['items'] === ['Opłacić OC']);
    }

    public function test_the_digest_respects_a_channel_turned_off(): void
    {
        Mail::fake();
        config(['digest.sections' => [FakeDigestSection::class]]);
        $this->setPreferences(['email' => false]);
        $push = Mockery::mock(WebPushService::class);
        $push->shouldReceive('send')->once();

        (new SendDigest($this->user->id, '2026-11-09'))->handle($push);

        Mail::assertNothingSent();
    }

    public function test_the_vapid_command_refuses_to_replace_existing_keys(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'env');
        file_put_contents($path, "VAPID_PUBLIC_KEY=existing\nVAPID_PRIVATE_KEY=secret\n");
        $this->app->useEnvironmentPath(dirname($path))->loadEnvironmentFrom(basename($path));

        $this->artisan('basemind:vapid')->assertFailed();

        $this->assertStringContainsString('VAPID_PRIVATE_KEY=secret', (string) file_get_contents($path));
        unlink($path);
    }
}
