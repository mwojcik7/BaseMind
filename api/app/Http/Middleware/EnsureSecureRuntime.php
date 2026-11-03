<?php

namespace App\Http\Middleware;

use App\Support\PhpSecurity;
use App\Support\SecurityAlert;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Emergency brake: if the PHP runtime has a known critical vulnerability
 * (e.g. the hosting provider has not patched PHP2Shell yet), stop serving
 * the app instead of exposing user data. /api/health stays reachable.
 */
class EnsureSecureRuntime
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('basemind.block_on_critical') || $request->is('api/health')) {
            return $next($request);
        }

        $report = PhpSecurity::fromConfig()->report();

        if ($report['critical'] === []) {
            return $next($request);
        }

        SecurityAlert::notifyOwner($report['critical']);

        return response()->json(
            ['message' => 'Service temporarily unavailable for security maintenance.'],
            Response::HTTP_SERVICE_UNAVAILABLE,
            ['Retry-After' => '3600'],
        );
    }
}
