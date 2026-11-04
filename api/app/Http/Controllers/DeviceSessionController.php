<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The "Sessions and devices" screen. The API exposes a hash instead of the
 * session ID, because that ID alone is enough to take over a session.
 */
class DeviceSessionController
{
    public function index(Request $request): JsonResponse
    {
        $current = $this->publicId($request->session()->getId());

        $sessions = $this->sessionsOf($request)
            ->map(fn (object $session) => [
                'id' => $this->publicId($session->id),
                'ip_address' => $session->ip_address,
                'user_agent' => $session->user_agent,
                'last_active_at' => date(DATE_ATOM, (int) $session->last_activity),
                'is_current' => $this->publicId($session->id) === $current,
            ])
            ->sortByDesc('last_active_at')
            ->values();

        return response()->json(['sessions' => $sessions]);
    }

    public function destroy(Request $request, string $id): Response
    {
        // The session on this device ends through logout, not here.
        abort_if($id === $this->publicId($request->session()->getId()), 422);

        $session = $this->sessionsOf($request)
            ->first(fn (object $session) => hash_equals($this->publicId($session->id), $id));

        // Only the user's own sessions are in that list, so others' look like they don't exist.
        abort_if($session === null, 404);

        DB::table('sessions')->where('id', $session->id)->delete();

        return response()->noContent();
    }

    public function destroyOthers(Request $request): Response
    {
        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return response()->noContent();
    }

    /**
     * @return Collection<int, object>
     */
    private function sessionsOf(Request $request): Collection
    {
        return DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->get(['id', 'ip_address', 'user_agent', 'last_activity']);
    }

    private function publicId(string $sessionId): string
    {
        return hash('sha256', $sessionId);
    }
}
