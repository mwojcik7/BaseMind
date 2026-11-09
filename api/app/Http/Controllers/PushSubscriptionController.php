<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PushSubscriptionController
{
    /** The server will POST to this address, so it must be a real push service (SSRF). */
    private const PUSH_SERVICE_HOSTS = [
        '/^fcm\.googleapis\.com$/',
        '/^(.+\.)?push\.services\.mozilla\.com$/',
        '/^(.+\.)?push\.apple\.com$/',
        '/^(.+\.)?notify\.windows\.com$/',
    ];

    public function publicKey(): JsonResponse
    {
        return response()->json(['key' => config('basemind.push.public_key')]);
    }

    public function store(Request $request): Response
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url:https', 'max:2048', $this->isPushService(...)],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        // By endpoint: the same browser may sign in again, also to another account.
        PushSubscription::updateOrCreate(
            ['endpoint_hash' => PushSubscription::hashEndpoint($data['endpoint'])],
            [
                'user_id' => $request->user()->id,
                'session_id' => $request->session()->getId(),
                'endpoint' => $data['endpoint'],
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'device_name' => $data['device_name'] ?? null,
            ],
        );

        return response()->noContent();
    }

    public function destroy(Request $request): Response
    {
        $data = $request->validate(['endpoint' => ['required', 'string', 'max:2048']]);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint_hash', PushSubscription::hashEndpoint($data['endpoint']))
            ->delete();

        return response()->noContent();
    }

    private function isPushService(string $attribute, mixed $value, Closure $fail): void
    {
        $host = is_string($value) ? (string) parse_url($value, PHP_URL_HOST) : '';

        foreach (self::PUSH_SERVICE_HOSTS as $pattern) {
            if (preg_match($pattern, $host) === 1) {
                return;
            }
        }

        $fail('validation.url')->translate();
    }
}
