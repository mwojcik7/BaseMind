<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserSettingsController
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['notifications' => $request->user()->settings->notifications()]);
    }

    public function update(Request $request): Response
    {
        $data = $request->validate([
            'theme' => ['sometimes', 'in:system,light,dark'],
            'notifications' => ['sometimes', 'array'],
            'notifications.push' => ['required_with:notifications', 'boolean'],
            'notifications.email' => ['required_with:notifications', 'boolean'],
            'notifications.quiet_hours' => ['present_with:notifications', 'nullable', 'array'],
            'notifications.quiet_hours.start' => ['required_with:notifications.quiet_hours', 'date_format:H:i'],
            'notifications.quiet_hours.end' => ['required_with:notifications.quiet_hours', 'date_format:H:i'],
            'notifications.digest.enabled' => ['required_with:notifications', 'boolean'],
            'notifications.digest.time' => ['required_with:notifications', 'date_format:H:i'],
            // Widget ids are not checked against a list: the registry lives in the app, and
            // devices may run different versions of it.
            'dashboard' => ['sometimes', 'array:order,hidden'],
            'dashboard.order' => ['present_with:dashboard', 'array', 'max:50'],
            'dashboard.order.*' => ['string', 'max:40', 'regex:/^[a-z][a-z0-9_-]*$/', 'distinct'],
            'dashboard.hidden' => ['present_with:dashboard', 'array', 'max:50'],
            'dashboard.hidden.*' => ['string', 'max:40', 'regex:/^[a-z][a-z0-9_-]*$/', 'distinct'],
        ]);

        $settings = $request->user()->settings;
        $settings->update(['settings' => [...$settings->settings, ...$data]]);

        return response()->noContent();
    }
}
