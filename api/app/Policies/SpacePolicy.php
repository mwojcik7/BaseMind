<?php

namespace App\Policies;

use App\Enums\SpaceRole;
use App\Enums\SpaceType;
use App\Models\Space;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SpacePolicy
{
    /**
     * Not a member: 404 instead of 403, so a space's existence is not revealed.
     */
    public function view(User $user, Space $space): Response
    {
        return $user->roleIn($space->id) === null
            ? Response::denyAsNotFound()
            : Response::allow();
    }

    public function update(User $user, Space $space): bool
    {
        return $user->roleIn($space->id) === SpaceRole::Owner;
    }

    public function delete(User $user, Space $space): bool
    {
        return $space->type !== SpaceType::Personal
            && $user->roleIn($space->id) === SpaceRole::Owner;
    }
}
