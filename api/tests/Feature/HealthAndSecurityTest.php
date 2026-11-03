<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class HealthAndSecurityTest extends TestCase
{
    public function test_health_endpoint_reports_ok(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_health_hides_details_outside_local_env(): void
    {
        // phpunit runs with APP_ENV=testing -> not "local" -> no details.
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_security_headers_are_present(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        $response->assertHeaderMissing('X-Powered-By');
    }

    public function test_app_is_blocked_when_php_is_vulnerable(): void
    {
        Log::spy();
        Cache::flush();
        config([
            'basemind.block_on_critical' => true,
            // Pretend the running PHP branch requires a version that does not exist yet.
            'basemind.php_min_patched' => [PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION => '99.0.0'],
        ]);

        // Any route, even a non-existent one, is blocked before routing.
        $this->getJson('/api/anything')
            ->assertStatus(503)
            ->assertHeader('Retry-After', '3600');

        // Health stays reachable (and reports the problem).
        $this->getJson('/api/health')
            ->assertStatus(503)
            ->assertJson(['status' => 'degraded']);

        Log::shouldHaveReceived('critical')->once();
    }

    public function test_app_is_not_blocked_when_runtime_is_patched(): void
    {
        config(['basemind.block_on_critical' => true]);

        // Not blocked -> request reaches the router (unknown route = 404, not 503).
        $this->getJson('/api/anything')->assertNotFound();
    }

    public function test_security_check_command_passes_on_hardened_runtime(): void
    {
        $this->artisan('basemind:security-check')->assertSuccessful();
    }
}
