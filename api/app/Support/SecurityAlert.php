<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Logs critical security issues and e-mails the owner at most once a day.
 */
final class SecurityAlert
{
    /**
     * @param  list<string>  $issues
     */
    public static function notifyOwner(array $issues): void
    {
        // Cache::add only succeeds when the key is absent -> throttles to 1/day.
        if (! Cache::add('basemind:security-alert-sent', true, now()->addDay())) {
            return;
        }

        Log::critical('BaseMind security check failed', ['issues' => $issues]);

        $owner = config('basemind.owner_email');
        if (! $owner) {
            return;
        }

        try {
            Mail::raw(
                "BaseMind wykrył krytyczny problem bezpieczeństwa serwera:\n\n- ".implode("\n- ", $issues)
                ."\n\nAplikacja jest zablokowana do czasu usunięcia problemu (np. aktualizacji PHP w panelu hostingu).",
                fn ($message) => $message->to($owner)->subject('[BaseMind] Krytyczny problem bezpieczeństwa'),
            );
        } catch (Throwable $e) {
            Log::error('BaseMind security alert e-mail failed', ['error' => $e->getMessage()]);
        }
    }
}
