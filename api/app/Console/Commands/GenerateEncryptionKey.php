<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\EditsEnvFile;
use App\Exceptions\CryptoException;
use App\Services\Crypto;
use Illuminate\Console\Command;

/**
 * Prints the key only with --show, so it doesn't end up in terminal history
 * or logs by accident. Otherwise the key is only written to .env.
 */
class GenerateEncryptionKey extends Command
{
    use EditsEnvFile;

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
}
