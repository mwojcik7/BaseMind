<?php

namespace App\Models;

use App\Enums\SpaceType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Container for all user data and the unit of sharing (projekt.md, section 4.2).
 *
 * @property-read SpaceMember $pivot Present when loaded through User::spaces().
 */
#[Fillable(['name', 'type', 'owner_id'])]
class Space extends Model
{
    use HasUuids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['type' => SpaceType::class];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return BelongsToMany<User, $this, SpaceMember>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'space_members')
            ->using(SpaceMember::class)
            ->withPivot('role')
            ->withTimestamps();
    }
}
