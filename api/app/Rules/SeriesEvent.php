<?php

namespace App\Rules;

use App\Models\Event;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An occurrence changed on its own points at its series, which must not itself be such an
 * occurrence (one level, as with subtasks). Existence in the space is checked separately
 * by SyncedRecordInSpace.
 */
class SeriesEvent implements ValidationRule
{
    public function __construct(
        private readonly ?string $spaceId,
        private readonly ?string $eventId,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === $this->eventId) {
            $fail('validation.exists')->translate();

            return;
        }

        $series = Event::withTrashed()->where('space_id', $this->spaceId)->find($value);

        if ($series?->series_id !== null) {
            $fail('validation.exists')->translate();
        }
    }
}
