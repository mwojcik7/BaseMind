<?php

namespace App\Models\Concerns;

use App\Models\Space;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/**
 * For every model with a space_id column. Pair it with App\Policies\SpaceItemPolicy.
 */
trait BelongsToSpace
{
    /**
     * @return BelongsTo<Space, $this>
     */
    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    /**
     * Only records from spaces the user is a member of.
     *
     * @param  Builder<static>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $query->whereIn(
            $this->qualifyColumn('space_id'),
            DB::table('space_members')->select('space_id')->where('user_id', $user->id),
        );
    }
}
