<?php

namespace App\Http\Controllers;

use App\Models\Space;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SpaceController
{
    public function show(Request $request, Space $space): JsonResponse
    {
        Gate::authorize('view', $space);

        return response()->json([
            'id' => $space->id,
            'name' => $space->name,
            'type' => $space->type->value,
            'role' => $request->user()->roleIn($space->id)->value,
        ]);
    }
}
