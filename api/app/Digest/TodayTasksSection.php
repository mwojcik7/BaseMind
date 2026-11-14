<?php

namespace App\Digest;

use App\Contracts\DigestSection;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;

class TodayTasksSection implements DigestSection
{
    public function forUser(User $user, CarbonImmutable $localDate): array
    {
        return [
            'title' => __('notifications.digest_tasks_today'),
            'items' => Task::query()->openFor($user)
                ->whereDate('due_date', $localDate->toDateString())
                // Titles are encrypted, so they are read through the model cast, not plucked in SQL.
                ->get()->map(fn (Task $task) => $task->title)->all(),
        ];
    }
}
