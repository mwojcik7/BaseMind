<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use App\Models\Task;
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
        ], completeTask: $request->boolean('done'));
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
    private function change(Request $request, Reminder $reminder, array $attributes, bool $completeTask = false): Response
    {
        app(SpaceItemPolicy::class)->update($request->user(), $reminder)->authorize();

        DB::transaction(function () use ($reminder, $attributes, $completeTask) {
            $locked = Reminder::lockForUpdate()->findOrFail($reminder->id);
            $this->sync->recordServerChange($locked, $attributes);

            if ($completeTask && $locked->entity_type === 'tasks') {
                $this->completeTask($locked);
            }
        });

        return response()->noContent();
    }

    /** Looked up within the reminder's space, the one access was just checked for. */
    private function completeTask(Reminder $reminder): void
    {
        $task = Task::where('space_id', $reminder->space_id)->lockForUpdate()->find($reminder->entity_id);

        if ($task?->status === 'todo') {
            $this->sync->recordServerChange($task, ['status' => 'done', 'completed_at' => now()]);
        }
    }
}
