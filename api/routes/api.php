<?php

use App\Http\Controllers\DeviceSessionController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\SpaceController;
use App\Http\Controllers\SyncController;
use App\Http\Controllers\UserSettingsController;
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

// Sign-in, sign-up and password reset live under /api/auth (Fortify, config/fortify.php).
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/me', MeController::class);

    Route::get('/spaces/{space}', [SpaceController::class, 'show']);

    Route::get('/sessions', [DeviceSessionController::class, 'index']);
    Route::delete('/sessions', [DeviceSessionController::class, 'destroyOthers']);
    Route::delete('/sessions/{id}', [DeviceSessionController::class, 'destroy']);

    Route::post('/sync/push', [SyncController::class, 'push']);
    Route::get('/sync/pull', [SyncController::class, 'pull']);

    Route::post('/settings', [UserSettingsController::class, 'update']);
});
