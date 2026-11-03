<?php

use App\Support\PhpSecurity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
| Health check. Public, so in production it reveals only a status
| (no PHP version or issue details — those are visible in local env
| and via `php artisan basemind:security-check`).
*/
Route::get('/health', function () {
    $report = PhpSecurity::fromConfig()->report();

    try {
        DB::select('select 1');
        $database = true;
    } catch (Throwable) {
        $database = false;
    }

    $ok = $database && $report['critical'] === [];

    $body = ['status' => $ok ? 'ok' : 'degraded'];

    if (app()->isLocal()) {
        $body += [
            'php' => PHP_VERSION,
            'database' => $database,
            'security' => $report,
        ];
    }

    return response()->json($body, $ok ? 200 : 503);
})->middleware('throttle:30,1');
