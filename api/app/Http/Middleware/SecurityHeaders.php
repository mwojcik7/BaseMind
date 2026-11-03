<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security headers for every response.
 *
 * TODO (step 0.3, PWA): add a Content-Security-Policy for the HTML app shell
 * once the frontend exists. JSON responses already get a locked-down CSP.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (function_exists('header_remove')) {
            header_remove('X-Powered-By');
        }

        $headers = $response->headers;
        $headers->remove('X-Powered-By');
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        // Camera is needed later for receipt / item photos; everything else off.
        $headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');

        if ($request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        if (str_contains((string) $headers->get('Content-Type'), 'json')) {
            $headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        }

        return $response;
    }
}
