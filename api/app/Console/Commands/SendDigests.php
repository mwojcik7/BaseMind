<?php

namespace App\Console\Commands;

use App\Jobs\SendDigest;
use App\Models\User;
use App\Models\UserSettings;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendDigests extends Command
{
    /** How late a digest may still go out, e.g. after the server was down. */
    private const CATCH_UP_MINUTES = 120;

    protected $signature = 'basemind:send-digests';

    protected $description = 'Queue the morning digest for users whose digest time has come';

    public function handle(): int
    {
        User::with('settings')->each(function (User $user) {
            $preferences = $user->settings->notifications()['digest'];
            $now = CarbonImmutable::now($user->timezone);

            if ($preferences['enabled'] && $this->isDigestTime($now, $preferences['time'])) {
                $this->claimAndDispatch($user, $now->toDateString());
            }
        });

        return self::SUCCESS;
    }

    private function isDigestTime(CarbonImmutable $now, string $time): bool
    {
        [$hours, $minutes] = array_map(intval(...), explode(':', $time));
        $sinceDigestTime = $now->hour * 60 + $now->minute - ($hours * 60 + $minutes);

        return $sinceDigestTime >= 0 && $sinceDigestTime <= self::CATCH_UP_MINUTES;
    }

    /** The date is saved under a lock, so overlapping runs can't send the digest twice. */
    private function claimAndDispatch(User $user, string $localDate): void
    {
        DB::transaction(function () use ($user, $localDate) {
            $settings = UserSettings::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if (($settings->settings['digest_last_date'] ?? null) === $localDate) {
                return;
            }

            $settings->update(['settings' => [...$settings->settings, 'digest_last_date' => $localDate]]);
            SendDigest::dispatch($user->id, $localDate)->afterCommit();
        });
    }
}
