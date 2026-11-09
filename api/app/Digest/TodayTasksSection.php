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
                ->get()->pluck('title')->all(),
        ];
    }
}
