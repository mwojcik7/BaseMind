<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use App\Policies\SpaceItemPolicy;
use App\Services\SyncService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * The buttons on a notification. Called by the Service Worker, which may know
 * nothing about the reminder yet if it was created on another device.
 */
class ReminderActionController
{
    public function __construct(private readonly SyncService $sync) {}

    public function dismiss(Request $request, Reminder $reminder): Response
    {
        return $this->change($request, $reminder, [
            // A repeating reminder keeps going; only this occurrence is dealt with.
            'status' => $reminder->rrule === null ? 'dismissed' : 'scheduled',
            'snoozed_until' => null,
        ]);
    }

    public function snooze(Request $request, Reminder $reminder): Response
    {
        $data = $request->validate(['minutes' => ['required', 'integer', 'min:5', 'max:10080']]);

        return $this->change($request, $reminder, [
            'status' => 'snoozed',
            'snoozed_until' => now()->addMinutes((int) $data['minutes']),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function change(Request $request, Reminder $reminder, array $attributes): Response
    {
        app(SpaceItemPolicy::class)->update($request->user(), $reminder)->authorize();

        DB::transaction(function () use ($reminder, $attributes) {
            $this->sync->recordServerChange(Reminder::lockForUpdate()->findOrFail($reminder->id), $attributes);
        });

        return response()->noContent();
    }
}
