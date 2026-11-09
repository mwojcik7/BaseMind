<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\ContentEncoding;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    private const TIME_TO_LIVE_SECONDS = 86400;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function send(User $user, array $payload): void
    {
        $subscriptions = $this->activeSubscriptions($user);

        if ($subscriptions->isEmpty()) {
            return;
        }

        $expired = $this->deliver($subscriptions, $payload);

        if ($expired !== []) {
            PushSubscription::whereIn('endpoint_hash', array_map(PushSubscription::hashEndpoint(...), $expired))->delete();
            Log::info('Push subscriptions dropped: reported as gone by the push service', ['count' => count($expired)]);
        }
    }

    /**
     * Devices whose session has ended are dropped first: a phone signed out remotely
     * must not keep showing reminder titles on its lock screen.
     *
     * @return Collection<int, PushSubscription>
     */
    public function activeSubscriptions(User $user): Collection
    {
        $liveSessions = DB::table('sessions')->where('user_id', $user->id)->pluck('id');

        $dropped = PushSubscription::where('user_id', $user->id)
            ->where(fn ($query) => $query->whereNull('session_id')->orWhereNotIn('session_id', $liveSessions))
            ->delete();

        if ($dropped > 0) {
            Log::info('Push subscriptions dropped: their session has ended', ['count' => $dropped]);
        }

        return PushSubscription::where('user_id', $user->id)->get();
    }

    /**
     * @param  Collection<int, PushSubscription>  $subscriptions
     * @param  array<string, mixed>  $payload
     * @return list<string> Endpoints the push service reports as gone.
     */
    protected function deliver(Collection $subscriptions, array $payload): array
    {
        $config = config('basemind.push');

        if (empty($config['public_key']) || empty($config['private_key'])) {
            Log::warning('Push notification skipped: VAPID keys are missing. Run: php artisan basemind:vapid');

            return [];
        }

        $webPush = new WebPush(['VAPID' => [
            'subject' => 'mailto:'.config('basemind.owner_email'),
            'publicKey' => $config['public_key'],
            'privateKey' => $config['private_key'],
        ]]);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->p256dh,
                    'authToken' => $subscription->auth,
                    'contentEncoding' => ContentEncoding::aes128gcm,
                ]),
                (string) json_encode($payload),
                ['TTL' => self::TIME_TO_LIVE_SECONDS, 'urgency' => 'high'],
            );
        }

        $expired = [];

        foreach ($webPush->flush() as $report) {
            if ($report->isSubscriptionExpired()) {
                $expired[] = $report->getEndpoint();
            } elseif (! $report->isSuccess()) {
                // Only the reason: the endpoint identifies the device.
                Log::warning('Push notification failed: '.$report->getReason());
            }
        }

        return $expired;
    }
}
