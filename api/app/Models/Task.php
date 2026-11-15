<?php

namespace App\Models;

use App\Casts\SodiumEncrypted;
use App\Models\Concerns\Syncable;
use App\Models\Contracts\SyncableModel;
use App\Rules\ParentTask;
use App\Rules\SyncedRecordInSpace;
use App\Rules\TaskRecurrence;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Task extends Model implements SyncableModel
{
    use Syncable;

    public function syncRules(): array
    {
        return [
            'list_id' => ['nullable', 'uuid', new SyncedRecordInSpace($this->space_id, entity: 'task_lists')],
            'parent_id' => [
                'nullable',
                'uuid',
                new SyncedRecordInSpace($this->space_id, entity: 'tasks'),
                new ParentTask($this->space_id, $this->id),
            ],
            'deleted_with_parent' => ['boolean'],
            'title' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'priority' => ['required', 'integer', 'between:1,4'],
            'status' => ['required', 'in:todo,done,cancelled'],
            // A series needs a date to start from.
            'due_date' => ['nullable', 'date_format:Y-m-d', 'required_with:rrule'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'completed_at' => ['nullable', 'date'],
            'rrule' => ['nullable', 'string', 'max:255', new TaskRecurrence],
            'repeat_from' => ['string', 'in:due,completion'],
            'repeat_anchor' => ['nullable', 'date_format:Y-m-d'],
            'repeat_remaining' => ['nullable', 'integer', 'between:1,999'],
            'recurring_task_id' => ['nullable', 'uuid'],
        ];
    }

    public function isRecurring(): bool
    {
        return $this->rrule !== null;
    }

    protected function casts(): array
    {
        return [
            'title' => SodiumEncrypted::class,
            'notes' => SodiumEncrypted::class,
            'priority' => 'integer',
            'deleted_with_parent' => 'boolean',
            'due_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'repeat_anchor' => 'date:Y-m-d',
            'repeat_remaining' => 'integer',
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
