<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserSettingsController
{
    public function update(Request $request): Response
    {
        $data = $request->validate(['theme' => ['required', 'in:system,light,dark']]);

        $settings = $request->user()->settings;
        $settings->update(['settings' => [...$settings->settings, ...$data]]);

        return response()->noContent();
    }
}
