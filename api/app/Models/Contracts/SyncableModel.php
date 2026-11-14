<?php

namespace App\Models\Contracts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A model exchanged with the PWA. Implemented through App\Models\Concerns\Syncable;
 * the columns below come from the $table->syncable() migration macro.
 *
 * @phpstan-require-extends Model
 *
 * @property string $id
 * @property int|null $created_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property int $rev
 * @property int $version
 * @property array<string, string>|null $field_stamps
 */
interface SyncableModel extends SpaceScoped
{
    /**
     * @return array<string, mixed>
     */
    public function syncRules(): array;

    /**
     * @return list<string>
     */
    public function syncFields(): array;

    /**
     * @return list<string>
     */
    public function syncReadOnlyFields(): array;

    /**
     * @return array<string, mixed>
     */
    public function toSyncArray(): array;
}
