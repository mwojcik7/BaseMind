<?php

namespace App\Models;

use App\Casts\SodiumEncrypted;
use App\Models\Concerns\Syncable;
use App\Rules\SyncedRecordInSpace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use Syncable;

    public function syncRules(): array
    {
        return [
            'list_id' => ['nullable', 'uuid', new SyncedRecordInSpace($this->space_id, entity: 'task_lists')],
            'title' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'priority' => ['required', 'integer', 'between:1,4'],
            'status' => ['required', 'in:todo,done,cancelled'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'completed_at' => ['nullable', 'date'],
        ];
    }

    protected function casts(): array
    {
        return [
            'title' => SodiumEncrypted::class,
            'notes' => SodiumEncrypted::class,
            'priority' => 'integer',
            'due_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Tasks still to be done in the spaces the user belongs to, most important first.
     *
     * @param  Builder<static>  $query
     */
    public function scopeOpenFor(Builder $query, User $user): void
    {
        $query->where('status', 'todo')
            ->whereIn('space_id', $user->spaces()->pluck('spaces.id'))
            ->orderBy('priority')
            ->orderBy('due_date')
            ->orderBy('due_time');
    }
}
