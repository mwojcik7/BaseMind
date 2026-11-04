<?php

namespace App\Http\Controllers;

use App\Models\Space;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeController
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'display_name' => $user->display_name,
                'email' => $user->email,
                'timezone' => $user->timezone,
                'locale' => $user->locale,
            ],
            'spaces' => $user->spaces()->get()->map(fn (Space $space) => [
                'id' => $space->id,
                'name' => $space->name,
                'type' => $space->type->value,
                'role' => $space->pivot->role,
            ]),
        ]);
    }
}
