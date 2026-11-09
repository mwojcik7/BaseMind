<?php

namespace App\Models;

use App\Models\Concerns\Syncable;
use App\Rules\SyncedRecordInSpace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class EntityLink extends Model
{
    use Syncable;

    /**
     * The target may be in another of the user's spaces (a private contact mentioned
     * in a shared note), so only its form is checked. An id reveals nothing by itself.
     */
    public function syncRules(): array
    {
        $entities = array_keys(config('sync.entities'));

        return [
            'source_type' => ['required', 'string', Rule::in($entities)],
            'source_id' => ['required', 'uuid', new SyncedRecordInSpace($this->space_id, typeField: 'source_type')],
            'target_type' => ['required', 'string', Rule::in($entities)],
            'target_id' => ['required', 'uuid'],
            'origin' => ['required', 'in:manual,parsed'],
        ];
    }
}
