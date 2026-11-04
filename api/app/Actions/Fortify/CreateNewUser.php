<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    private const MAX_CODE_ATTEMPTS = 5;

    private const CODE_LOCKOUT_SECONDS = 900;

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        // Checked before anything else, so without the code nobody can
        // find out which e-mail addresses already have an account.
        $this->ensureInvitationCodeIsValid($input['invitation_code'] ?? null);

        $data = Validator::make($input, [
            'display_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'password' => ['required', 'string', Password::min(10), 'confirmed'],
        ])->validate();

        // Together with its private space and settings, or not at all.
        return DB::transaction(fn () => User::create([
            'display_name' => $data['display_name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]));
    }

    private function ensureInvitationCodeIsValid(mixed $code): void
    {
        $key = 'invitation-code|'.request()->ip();

        if (RateLimiter::tooManyAttempts($key, self::MAX_CODE_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'invitation_code' => __('auth.throttle', ['seconds' => RateLimiter::availableIn($key)]),
            ]);
        }

        $expected = config('basemind.registration_code');

        // No code configured means registration is switched off.
        $valid = is_string($expected) && $expected !== ''
            && is_string($code) && hash_equals($expected, $code);

        if (! $valid) {
            RateLimiter::hit($key, self::CODE_LOCKOUT_SECONDS);

            throw ValidationException::withMessages([
                'invitation_code' => __('auth.invalid_invitation_code'),
            ]);
        }

        RateLimiter::clear($key);
    }
}
