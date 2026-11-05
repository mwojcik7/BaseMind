<?php

namespace App\Console\Commands;

use App\Exceptions\CryptoException;
use App\Services\Crypto;
use Illuminate\Console\Command;

/**
 * Prints the key only with --show, so it doesn't end up in terminal history
 * or logs by accident. Otherwise the key is only written to .env.
 */
class GenerateEncryptionKey extends Command
{
    protected $signature = 'basemind:key
        {--rotate : Replace the current key and keep it for decrypting older data}
        {--show : Print a new key and change nothing}';

    protected $description = 'Generate the SODIUM_KEY used to encrypt sensitive fields and files';

    public function handle(): int
    {
        if ($this->option('show')) {
            $this->line(Crypto::generateKey());

            return self::SUCCESS;
        }

        $path = $this->laravel->environmentFilePath();

        if (! is_file($path)) {
            $this->error('The .env file does not exist.');

            return self::FAILURE;
        }

        $env = (string) file_get_contents($path);
        $current = $this->readValue($env, 'SODIUM_KEY');

        if ($this->option('rotate')) {
            if ($current === '') {
                $this->error('There is no key to rotate. Run basemind:key without --rotate.');

                return self::FAILURE;
            }

            try {
                new Crypto($current);
            } catch (CryptoException $e) {
                $this->error($e->getMessage());

                return self::FAILURE;
            }

            $previous = $this->readValue($env, 'SODIUM_PREVIOUS_KEYS');
            $env = $this->writeValue($env, 'SODIUM_PREVIOUS_KEYS', $previous === '' ? $current : $current.','.$previous);
        } elseif ($current !== '') {
            // Overwriting would make everything encrypted so far unreadable.
            $this->error('SODIUM_KEY is already set. To replace it, use --rotate.');

            return self::FAILURE;
        }

        $key = Crypto::generateKey();
        $this->replaceFile($path, $this->writeValue($env, 'SODIUM_KEY', $key));

        $this->info('A new SODIUM_KEY was saved in .env. Key id: '.(new Crypto($key))->keyId());
        $this->warn('Copy it to your password manager now. Losing it means losing the encrypted data.');

        if ($this->option('rotate')) {
            $this->line('Next: php artisan basemind:reencrypt');
            $this->line('Keep older keys in your password manager too: older backups still need them.');
        }

        if ($this->laravel->configurationIsCached()) {
            $this->warn('Configuration is cached. Run: php artisan config:cache');
        }

        return self::SUCCESS;
    }

    private function readValue(string $env, string $name): string
    {
        return preg_match('/^'.$name.'=([^\r\n]*)/m', $env, $match)
            ? trim($match[1], " \t\"'")
            : '';
    }

    private function writeValue(string $env, string $name, string $value): string
    {
        $line = $name.'='.$value;
        $count = 0;

        // A callback, because keys could otherwise be read as regex replacement references.
        $updated = preg_replace_callback('/^'.$name.'=[^\r\n]*/m', fn () => $line, $env, 1, $count);

        return $count > 0 ? $updated : rtrim($env)."\n".$line."\n";
    }

    /** Via a temporary file: an interrupted write must not damage the only copy of the keys. */
    private function replaceFile(string $path, string $contents): void
    {
        $temporary = $path.'.tmp';

        if (file_put_contents($temporary, $contents) !== strlen($contents) || ! rename($temporary, $path)) {
            @unlink($temporary);

            throw new \RuntimeException('Could not write the .env file.');
        }
    }
}
