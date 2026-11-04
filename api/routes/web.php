<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

// Every client-side route returns the PWA shell. Excluded, so they keep real 404s:
// server prefixes (/api, /sanctum, /s), static directories, and any path with a dot
// (a missing file must not come back as HTML with status 200).
// The shell is static, so it needs no session (and works without a database).
Route::withoutMiddleware('web')->group(function () {
    Route::get('/index.html', SpaController::class);
    Route::get('/{path?}', SpaController::class)
        ->where('path', '(?!(?:api|sanctum|s|assets|app-icons)(?:/|$))[^.]*');
});
