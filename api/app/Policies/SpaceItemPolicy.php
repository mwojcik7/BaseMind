<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;

/**
 * Access rules shared by every record with a space_id (projekt.md, section 4.2).
 * Non-members get 404 instead of 403, so a record's existence is not revealed.
 */
class SpaceItemPolicy
{
    public function view(User $user, Model $item): Response
    {
        return $user->roleIn($item->space_id) === null
            ? Response::denyAsNotFound()
            : Response::allow();
    }

    public function update(User $user, Model $item): Response
    {
        return $this->edit($user, $item);
    }

    public function delete(User $user, Model $item): Response
    {
        return $this->edit($user, $item);
    }

    private function edit(User $user, Model $item): Response
    {
        $role = $user->roleIn($item->space_id);

        if ($role === null) {
            return Response::denyAsNotFound();
        }

        return $role->canEdit() ? Response::allow() : Response::deny();
    }
}
