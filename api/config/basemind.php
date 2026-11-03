<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Owner e-mail
    |--------------------------------------------------------------------------
    | Receives security alerts (vulnerable PHP version, unsafe ini settings).
    */
    'owner_email' => env('BASEMIND_OWNER_EMAIL'),

    /*
    |--------------------------------------------------------------------------
    | Minimum patched PHP versions per branch
    |--------------------------------------------------------------------------
    | PHP2Shell (CVE-2026-109618, CVE-2026-109619) is fixed in these releases.
    | Branches older than the oldest listed one are treated as vulnerable;
    | branches newer than the newest listed one are treated as patched.
    | Update this list whenever a new critical PHP advisory is published
    | (and the table in projekt.md, section 8.1).
    */
    'php_min_patched' => [
        '8.2' => '8.2.35',
        '8.3' => '8.3.36',
        '8.4' => '8.4.27',
        '8.5' => '8.5.12',
    ],

    /*
    |--------------------------------------------------------------------------
    | Block requests on critical runtime issues
    |--------------------------------------------------------------------------
    | When true (default in production), the app answers 503 to every request
    | except /api/health while a critical issue is detected.
    */
    'block_on_critical' => env('BASEMIND_BLOCK_ON_CRITICAL', env('APP_ENV') === 'production'),

];
