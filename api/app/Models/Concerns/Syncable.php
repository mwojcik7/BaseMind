<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Arr;

/**
 * For models exchanged with the PWA. The table is created with $table->syncable().
 * Register the model in config/sync.php.
 *
 * Timestamps are set by App\Services\SyncService from the moment of the change on
 * the device, not from when it reached the server.
 */
trait Syncable
{
    use BelongsToSpace, SoftDeletes;

    /** @var list<string> */
    public const SYSTEM_FIELDS = ['id', 'space_id', 'created_by', 'created_at', 'updated_at', 'deleted_at', 'rev', 'version'];

    /**
     * Fields a client may write, with their validation rules. A field not listed
     * here cannot be synchronised. Rules should mark required fields as `required`:
     * partial updates only validate the fields they contain. `space_id` is already
     * set when this is called, so rules can require references to stay in the space.
     *
     * @return array<string, mixed>
     */
    abstract public function syncRules(): array;

    public function initializeSyncable(): void
    {
        $this->incrementing = false;
        $this->keyType = 'string';
        $this->timestamps = false;
        $this->mergeCasts([
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'rev' => 'integer',
            'version' => 'integer',
            'field_stamps' => 'array',
        ]);
    }

    /**
     * The top-level fields a client may write.
     *
     * @return list<string>
     */
    public function syncFields(): array
    {
        return array_values(array_filter(array_keys($this->syncRules()), fn (string $field) => ! str_contains($field, '.')));
    }

    /**
     * The record as sent to clients, with encrypted fields decrypted.
     *
     * @return array<string, mixed>
     */
    public function toSyncArray(): array
    {
        return Arr::only($this->attributesToArray(), [...self::SYSTEM_FIELDS, ...$this->syncFields()]);
    }
}
