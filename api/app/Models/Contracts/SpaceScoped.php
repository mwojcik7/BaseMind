<?php

namespace App\Models\Contracts;

use Illuminate\Database\Eloquent\Model;

/**
 * A model stored in a space (App\Models\Concerns\BelongsToSpace), checked by
 * App\Policies\SpaceItemPolicy.
 *
 * @phpstan-require-extends Model
 *
 * @property string $space_id
 */
interface SpaceScoped {}
