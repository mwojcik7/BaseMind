<?php

namespace App\Jobs;

use App\Mail\ReminderMail;
use App\Models\Reminder;
use App\Services\WebPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

/**
 * One job per channel, so retrying a failed e-mail doesn't repeat the notification.
 */
class SendReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public readonly string $reminderId,
        public readonly string $channel,
    ) {}

    public function handle(WebPushService $push): void
    {
        $reminder = Reminder::find($this->reminderId);
        $user = $reminder?->creator;

        if ($reminder === null || $user === null) {
            return;
        }

        if ($this->channel === 'email') {
            Mail::to($user)->send(new ReminderMail($reminder));

            return;
        }

        $push->send($user, [
            'title' => $reminder->title,
            'body' => __('notifications.reminder_body'),
            'reminder_id' => $reminder->id,
            'url' => '/',
            'badge' => Reminder::where('created_by', $user->id)->where('status', 'sent')->count(),
        ]);
    }
}
