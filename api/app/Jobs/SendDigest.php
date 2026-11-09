<?php

namespace App\Jobs;

use App\Contracts\DigestSection;
use App\Mail\DigestMail;
use App\Models\User;
use App\Services\WebPushService;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

class SendDigest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public readonly int $userId,
        public readonly string $localDate,
    ) {}

    public function handle(WebPushService $push): void
    {
        $user = User::find($this->userId);
        if ($user === null) {
            return;
        }

        $date = CarbonImmutable::parse($this->localDate, $user->timezone);
        $sections = collect(config('digest.sections'))
            ->map(fn (string $section) => app($section))
            ->map(fn (DigestSection $section) => $section->forUser($user, $date))
            ->filter(fn (?array $section) => $section !== null && $section['items'] !== [])
            ->values();

        // A digest with nothing in it would only teach people to ignore it.
        if ($sections->isEmpty()) {
            return;
        }

        $preferences = $user->settings->notifications();

        if ($preferences['push']) {
            $push->send($user, [
                'title' => __('notifications.digest_title'),
                'body' => $sections->map(fn (array $section) => $section['title'].': '.count($section['items']))->join(', '),
                'url' => '/',
            ]);
        }

        if ($preferences['email']) {
            Mail::to($user)->send(new DigestMail($sections->all()));
        }
    }
}
