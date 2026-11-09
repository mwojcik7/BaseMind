<?php

namespace App\Http\Controllers;

use App\Services\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController
{
    public function push(Request $request, SyncService $sync): JsonResponse
    {
        $data = $request->validate([
            'ops' => ['present', 'array', 'max:100'],
            'ops.*.op_id' => ['required', 'uuid'],
            'ops.*.entity' => ['required', 'string'],
            'ops.*.record_id' => ['required', 'uuid'],
            'ops.*.op' => ['required', 'in:create,update,delete'],
            'ops.*.payload' => ['present', 'array'],
            'ops.*.base_version' => ['required', 'integer', 'min:0'],
            'ops.*.client_ts' => ['required', 'date'],
        ]);

        return response()->json(['results' => $sync->push($request->user(), $data['ops'])]);
    }

    public function pull(Request $request, SyncService $sync): JsonResponse
    {
        $data = $request->validate([
            'cursor' => ['sometimes', 'integer', 'min:0'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
        ]);

        return response()->json([
            ...$sync->pull($request->user(), (int) ($data['cursor'] ?? 0), (int) ($data['limit'] ?? 500)),
            'settings' => [
                'theme' => $request->user()->settings?->settings['theme'] ?? null,
                'dashboard' => $request->user()->settings?->settings['dashboard'] ?? null,
            ],
        ]);
    }
}
