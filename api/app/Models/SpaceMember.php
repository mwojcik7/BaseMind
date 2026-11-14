<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * A user's membership in a space (the space_members table).
 *
 * @property string $role A App\Enums\SpaceRole value.
 */
class SpaceMember extends Pivot
{
    protected $table = 'space_members';
}
