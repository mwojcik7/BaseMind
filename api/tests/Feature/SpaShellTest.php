<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SpaShellTest extends TestCase
{
    private string $publicDir;

    protected function setUp(): void
    {
        parent::setUp();

        // Use a temporary public dir, so the tests don't depend on a frontend build.
        $this->publicDir = storage_path('framework/testing/spa-'.uniqid());
        File::ensureDirectoryExists($this->publicDir);
        File::put($this->publicDir.'/index.html', '<!doctype html><title>shell</title>');
        $this->app->usePublicPath($this->publicDir);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->publicDir);

        parent::tearDown();
    }

    /** @return array<string, array{string}> */
    public static function clientRoutes(): array
    {
        return [
            'root' => ['/'],
            'shell file' => ['/index.html'],
            'tab' => ['/tasks'],
            'nested' => ['/more/finance'],
            'starts with a server prefix' => ['/settings'],
            'starts with api' => ['/apiary'],
        ];
    }

    #[DataProvider('clientRoutes')]
    public function test_client_routes_return_the_shell(string $path): void
    {
        $this->get($path)
            ->assertOk()
            ->assertSee('<title>shell</title>', false)
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8');
    }

    /** @return array<string, array{string}> */
    public static function nonClientRoutes(): array
    {
        return [
            'api' => ['/api/nope'],
            'bare api' => ['/api'],
            'sanctum' => ['/sanctum/nope'],
            'public share link' => ['/s/token'],
            'missing asset' => ['/assets/app-12345678.js'],
            'missing icon' => ['/app-icons/nope'],
            'missing file' => ['/nope.txt'],
        ];
    }

    #[DataProvider('nonClientRoutes')]
    public function test_other_paths_are_not_swallowed_by_the_shell(string $path): void
    {
        $this->get($path)->assertNotFound();
    }

    public function test_shell_gets_a_strict_csp(): void
    {
        $csp = $this->get('/')->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("script-src 'self';", $csp);
        $this->assertStringContainsString("frame-ancestors 'none'", $csp);
        $this->assertStringContainsString("object-src 'none'", $csp);
    }

    public function test_shell_does_not_start_a_session(): void
    {
        $this->get('/')->assertCookieMissing(config('session.cookie'));
    }

    public function test_shell_revalidates_on_every_load(): void
    {
        $cacheControl = $this->get('/')->headers->get('Cache-Control');

        $this->assertStringContainsString('no-cache', $cacheControl);
    }

    public function test_missing_build_returns_503(): void
    {
        File::delete($this->publicDir.'/index.html');

        $this->get('/')->assertStatus(503);
    }
}
