<?php

namespace App\Models;

use App\Models\Concerns\Syncable;
use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    use Syncable;

    public function syncRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:64'],
            'color' => ['nullable', 'string', 'max:16'],
        ];
    }
}
