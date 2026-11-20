<?php

namespace App\Models;

use App\Casts\SodiumEncrypted;
use App\Models\Concerns\Syncable;
use App\Models\Contracts\SyncableModel;
use App\Rules\SyncedRecordInSpace;
use Illuminate\Database\Eloquent\Model;

class Note extends Model implements SyncableModel
{
    use Syncable;

    /**
     * About 50 pages. Even with four-byte characters the ciphertext stays under the
     * database's 1 MB packet limit (`projekt.md`, pkt 14).
     */
    public const MAX_CONTENT = 100_000;

    public function syncRules(): array
    {
        return [
            'folder_id' => ['nullable', 'uuid', new SyncedRecordInSpace($this->space_id, entity: 'note_folders')],
            'title' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'string', 'max:'.self::MAX_CONTENT],
            'pinned' => ['required', 'boolean'],
            'archived' => ['required', 'boolean'],
        ];
    }

    protected function casts(): array
    {
        return [
            'title' => SodiumEncrypted::class,
            'content' => SodiumEncrypted::class,
            'pinned' => 'boolean',
            'archived' => 'boolean',
        ];
    }
}
