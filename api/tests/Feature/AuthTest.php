<?php

namespace Tests\Feature;

use App\Enums\SpaceRole;
use App\Enums\SpaceType;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const CODE = 'correct-invitation-code';

    protected function setUp(): void
    {
        parent::setUp();

        config(['basemind.registration_code' => self::CODE]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function registration(array $overrides = []): array
    {
        return [
            'display_name' => 'Marcin',
            'email' => 'marcin@example.com',
            'password' => 'long-enough-password',
            'password_confirmation' => 'long-enough-password',
            'invitation_code' => self::CODE,
            ...$overrides,
        ];
    }

    public function test_registering_with_the_code_creates_a_user_with_a_private_space(): void
    {
        $this->postJson('/api/auth/register', $this->registration())->assertCreated();

        $user = User::where('email', 'marcin@example.com')->sole();

        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('long-enough-password', $user->password));
        $this->assertNotNull($user->settings);

        $space = $user->spaces()->sole();
        $this->assertSame(SpaceType::Personal, $space->type);
        $this->assertSame($user->id, $space->owner_id);
        $this->assertSame(SpaceRole::Owner, $user->roleIn($space->id));
    }

    public function test_registering_without_the_right_code_is_refused(): void
    {
        foreach ([['invitation_code' => 'wrong'], ['invitation_code' => null]] as $overrides) {
            $this->postJson('/api/auth/register', $this->registration($overrides))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('invitation_code');
        }

        $this->assertSame(0, User::count());
    }

    public function test_registration_is_off_when_no_code_is_configured(): void
    {
        foreach (['', null] as $configured) {
            config(['basemind.registration_code' => $configured]);

            // An empty code must not match an empty configuration.
            $this->postJson('/api/auth/register', $this->registration(['invitation_code' => '']))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('invitation_code');
        }

        $this->assertSame(0, User::count());
    }

    public function test_a_wrong_code_does_not_reveal_whether_an_email_is_taken(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/auth/register', $this->registration([
            'email' => 'taken@example.com',
            'invitation_code' => 'wrong',
        ]))->assertJsonMissingValidationErrors('email');
    }

    public function test_guessing_the_code_gets_locked_out(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/register', $this->registration(['invitation_code' => 'wrong']));
        }

        // The right code doesn't help anymore.
        $this->postJson('/api/auth/register', $this->registration())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('invitation_code');

        $this->assertSame(0, User::count());
    }

    public function test_a_short_password_is_refused(): void
    {
        $this->postJson('/api/auth/register', $this->registration([
            'password' => 'short',
            'password_confirmation' => 'short',
        ]))->assertJsonValidationErrors('password');
    }

    public function test_validation_messages_are_in_polish(): void
    {
        $this->postJson('/api/auth/register', $this->registration(['email' => 'nope']))
            ->assertJsonValidationErrors(['email' => 'Podaj poprawny adres e-mail.']);
    }

    public function test_logging_in_and_out(): void
    {
        $user = User::factory()->create(['password' => 'long-enough-password']);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'long-enough-password',
        ])->assertOk();
        $this->assertAuthenticatedAs($user);

        $this->postJson('/api/auth/logout')->assertNoContent();
        $this->assertGuest('web');
    }

    public function test_a_wrong_password_gets_the_same_message_as_an_unknown_email(): void
    {
        $user = User::factory()->create();
        $message = ['email' => 'Nieprawidłowy e-mail lub hasło.'];

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertJsonValidationErrors($message);
        $this->postJson('/api/auth/login', ['email' => 'nobody@example.com', 'password' => 'wrong-password'])
            ->assertJsonValidationErrors($message);

        $this->assertGuest('web');
    }

    public function test_logging_in_is_rate_limited(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong-password']);
        }

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertTooManyRequests();
    }

    public function test_me_requires_signing_in(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_answers_401_also_to_a_request_not_asking_for_json(): void
    {
        $this->get('/api/me')->assertUnauthorized();
    }

    public function test_me_returns_the_user_and_their_spaces_without_secrets(): void
    {
        $user = User::factory()->create(['display_name' => 'Marcin']);

        $response = $this->actingAs($user)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.display_name', 'Marcin')
            ->assertJsonPath('spaces.0.type', 'personal')
            ->assertJsonPath('spaces.0.role', 'owner');

        $this->assertStringNotContainsString('password', $response->getContent());
        $this->assertStringNotContainsString('remember_token', $response->getContent());
    }

    public function test_the_reset_form_does_not_reveal_whether_an_account_exists(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $known = $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk();

        $this->assertSame($known->json(), $unknown->json());
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_the_reset_link_leads_to_the_pwa_screen(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, function (ResetPassword $notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, config('app.url').'/reset-password?token=')
                && str_contains($url, 'email='.urlencode($user->email));
        });
    }

    public function test_resetting_the_password_signs_out_all_devices(): void
    {
        $user = User::factory()->create();
        DB::table('sessions')->insert([
            'id' => 'other-device',
            'user_id' => $user->id,
            'payload' => '',
            'last_activity' => time(),
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => Password::createToken($user),
            'email' => $user->email,
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('a-brand-new-password', $user->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'other-device']);
    }

    public function test_an_invalid_reset_token_is_refused(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/reset-password', [
            'token' => 'wrong',
            'email' => $user->email,
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])->assertUnprocessable();

        $this->assertFalse(Hash::check('a-brand-new-password', $user->fresh()->password));
    }
}
