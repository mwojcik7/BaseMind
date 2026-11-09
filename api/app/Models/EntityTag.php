<?php

namespace App\Models;

use App\Models\Concerns\Syncable;
use App\Rules\SyncedRecordInSpace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class EntityTag extends Model
{
    use Syncable;

    public function syncRules(): array
    {
        return [
            'entity_type' => ['required', 'string', Rule::in(array_keys(config('sync.entities')))],
            'entity_id' => ['required', 'uuid', new SyncedRecordInSpace($this->space_id, typeField: 'entity_type')],
            'tag_id' => ['required', 'uuid', new SyncedRecordInSpace($this->space_id, entity: 'tags')],
        ];
    }
}
