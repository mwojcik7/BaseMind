<?php

namespace App\Rules;

use App\Models\Task;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Subtasks are one level deep: the parent must be a top-level task, and a task that
 * already has subtasks cannot become one itself. Existence in the space is checked
 * separately by SyncedRecordInSpace.
 */
class ParentTask implements ValidationRule
{
    public function __construct(
        private readonly ?string $spaceId,
        private readonly ?string $taskId,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === $this->taskId) {
            $fail('validation.exists')->translate();

            return;
        }

        $parent = Task::withTrashed()->where('space_id', $this->spaceId)->find($value);

        $hasSubtasks = $this->taskId !== null
            && Task::withTrashed()->where('space_id', $this->spaceId)->where('parent_id', $this->taskId)->exists();

        if ($parent?->parent_id !== null || $hasSubtasks) {
            $fail('validation.exists')->translate();
        }
    }
}
