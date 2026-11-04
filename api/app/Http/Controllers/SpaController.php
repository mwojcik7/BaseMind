<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * Serves the built PWA shell (public/index.html, produced by `pnpm build` in web/).
 *
 * It goes through Laravel rather than Apache so the shell always gets the
 * Content-Security-Policy from SecurityHeaders. See public/.htaccess.
 */
class SpaController
{
    public function __invoke(): Response
    {
        $shell = public_path('index.html');

        abort_unless(is_file($shell), 503, 'Frontend is not built. Run "pnpm build" in web/.');

        return response(file_get_contents($shell), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            // A new build must be picked up right away; hashed assets are cached instead.
            'Cache-Control' => 'no-cache',
        ]);
    }
}
