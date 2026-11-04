<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\PasswordResetLinkResponse;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FailedPasswordResetLinkRequestResponse::class, PasswordResetLinkResponse::class);
        $this->app->singleton(SuccessfulPasswordResetLinkRequestResponse::class, PasswordResetLinkResponse::class);
    }

    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        // The reset form is a screen of the PWA, not a Laravel route.
        ResetPassword::createUrlUsing(fn (User $user, string $token) => config('app.url').'/reset-password?'.http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]));

        ResetPassword::toMailUsing(fn (User $user, string $token) => (new MailMessage)
            ->subject(__('passwords.mail_subject'))
            ->line(__('passwords.mail_intro'))
            ->action(__('passwords.mail_action'), ResetPassword::$createUrlCallback->__invoke($user, $token))
            ->line(__('passwords.mail_expiry', ['count' => config('auth.passwords.users.expire')]))
            ->line(__('passwords.mail_ignore')));

        RateLimiter::for('login', function (Request $request) {
            $email = Str::transliterate(Str::lower((string) $request->input(Fortify::username())));

            return [
                Limit::perMinute(5)->by($email.'|'.$request->ip()),
                // Trying many accounts from one address.
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        // All auth endpoints (projekt.md, section 8.3).
        RateLimiter::for('auth-routes', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)->by($request->user()?->id ?: $request->ip()));
    }
}
