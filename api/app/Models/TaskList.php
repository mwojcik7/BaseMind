<?php

namespace App\Models;

use App\Models\Concerns\Syncable;
use App\Models\Contracts\SyncableModel;
use Illuminate\Database\Eloquent\Model;

class TaskList extends Model implements SyncableModel
{
    use Syncable;

    public function syncRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
        ];
    }
}
