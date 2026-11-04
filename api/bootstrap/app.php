<?php

use App\Http\Middleware\EnsureSecureRuntime;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Emergency brake first: refuse to serve on a vulnerable PHP runtime.
        $middleware->prepend(EnsureSecureRuntime::class);
        $middleware->append(SecurityHeaders::class);

        // Sanctum SPA (cookie) authentication for the PWA on the same domain.
        $middleware->statefulApi();

        // /login is a screen of the PWA, so no Laravel route has that name.
        // Without this, an API request not asking for JSON ends in a 500 instead of a 401.
        $middleware->redirectGuestsTo('/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
