<?php

namespace Tests\Feature;

use App\Services\Crypto;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Every test points the application at a temporary .env, so the real one is never touched.
 */
class EncryptionKeyCommandTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'basemind-key-test-'.bin2hex(random_bytes(6));
        mkdir($this->directory);
        $this->app->useEnvironmentPath($this->directory);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->directory);

        parent::tearDown();
    }

    private function envPath(): string
    {
        return $this->directory.DIRECTORY_SEPARATOR.'.env';
    }

    private function writeEnv(string $contents): void
    {
        file_put_contents($this->envPath(), $contents);
    }

    private function envValue(string $name): ?string
    {
        return preg_match('/^'.$name.'=([^\r\n]*)/m', (string) file_get_contents($this->envPath()), $match)
            ? $match[1]
            : null;
    }

    public function test_it_writes_a_valid_key_to_an_empty_setting_and_does_not_print_it(): void
    {
        $this->writeEnv("APP_NAME=BaseMind\nSODIUM_KEY=\nSODIUM_PREVIOUS_KEYS=\nLOG_LEVEL=debug\n");

        $this->assertSame(0, Artisan::call('basemind:key'));

        $key = $this->envValue('SODIUM_KEY');

        new Crypto($key); // throws when invalid
        $this->assertStringNotContainsString($key, Artisan::output());
        $this->assertSame('debug', $this->envValue('LOG_LEVEL'));
        $this->assertSame('BaseMind', $this->envValue('APP_NAME'));
    }

    public function test_it_adds_the_setting_when_the_line_is_missing(): void
    {
        $this->writeEnv("APP_NAME=BaseMind\n");

        $this->assertSame(0, Artisan::call('basemind:key'));

        new Crypto($this->envValue('SODIUM_KEY'));
        $this->assertSame('BaseMind', $this->envValue('APP_NAME'));
    }

    public function test_it_refuses_to_overwrite_an_existing_key(): void
    {
        $key = Crypto::generateKey();
        $this->writeEnv("SODIUM_KEY={$key}\n");

        $this->assertSame(1, Artisan::call('basemind:key'));
        $this->assertSame($key, $this->envValue('SODIUM_KEY'));
    }

    public function test_rotate_keeps_the_old_key_for_decrypting(): void
    {
        $old = Crypto::generateKey();
        $this->writeEnv("SODIUM_KEY={$old}\nSODIUM_PREVIOUS_KEYS=\n");

        $this->assertSame(0, Artisan::call('basemind:key', ['--rotate' => true]));

        $new = $this->envValue('SODIUM_KEY');

        $this->assertNotSame($old, $new);
        $this->assertSame($old, $this->envValue('SODIUM_PREVIOUS_KEYS'));
        $this->assertStringNotContainsString($new, Artisan::output());
        $this->assertStringNotContainsString($old, Artisan::output());

        $payload = (new Crypto($old))->encrypt('tajne');
        $this->assertSame('tajne', (new Crypto($new, [$old]))->decrypt($payload));
    }

    public function test_rotating_twice_keeps_every_older_key(): void
    {
        $first = Crypto::generateKey();
        $this->writeEnv("SODIUM_KEY={$first}\n");

        Artisan::call('basemind:key', ['--rotate' => true]);
        $second = $this->envValue('SODIUM_KEY');
        Artisan::call('basemind:key', ['--rotate' => true]);

        $this->assertSame($second.','.$first, $this->envValue('SODIUM_PREVIOUS_KEYS'));
    }

    public function test_rotate_refuses_when_there_is_no_key(): void
    {
        $this->writeEnv("SODIUM_KEY=\n");

        $this->assertSame(1, Artisan::call('basemind:key', ['--rotate' => true]));
        $this->assertSame('', $this->envValue('SODIUM_KEY'));
    }

    public function test_rotate_refuses_an_invalid_current_key(): void
    {
        $this->writeEnv("SODIUM_KEY=broken\n");

        $this->assertSame(1, Artisan::call('basemind:key', ['--rotate' => true]));
        $this->assertSame('broken', $this->envValue('SODIUM_KEY'));
        $this->assertNull($this->envValue('SODIUM_PREVIOUS_KEYS'));
    }

    public function test_show_prints_a_key_and_changes_nothing(): void
    {
        $this->writeEnv("SODIUM_KEY=\n");

        $this->assertSame(0, Artisan::call('basemind:key', ['--show' => true]));

        new Crypto(trim(Artisan::output()));
        $this->assertSame('', $this->envValue('SODIUM_KEY'));
    }

    public function test_it_fails_without_an_env_file(): void
    {
        $this->assertSame(1, Artisan::call('basemind:key'));
        $this->assertFileDoesNotExist($this->envPath());
    }

    public function test_it_keeps_windows_line_endings_intact(): void
    {
        $this->writeEnv("APP_NAME=BaseMind\r\nSODIUM_KEY=\r\nLOG_LEVEL=debug\r\n");

        $this->assertSame(0, Artisan::call('basemind:key'));

        new Crypto($this->envValue('SODIUM_KEY'));
        $this->assertStringContainsString("\r\nLOG_LEVEL=debug\r\n", (string) file_get_contents($this->envPath()));
    }
}
