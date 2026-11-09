<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\EditsEnvFile;
use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;
use Throwable;

class GenerateVapidKeys extends Command
{
    use EditsEnvFile;

    protected $signature = 'basemind:vapid';

    protected $description = 'Generate the VAPID keys that identify this server to push services';

    public function handle(): int
    {
        $path = $this->laravel->environmentFilePath();

        if (! is_file($path)) {
            $this->error('The .env file does not exist.');

            return self::FAILURE;
        }

        $env = (string) file_get_contents($path);

        // New keys would silently cut off every device that has subscribed so far.
        if ($this->readValue($env, 'VAPID_PUBLIC_KEY') !== '') {
            $this->error('VAPID keys are already set. Replacing them would disconnect all devices.');

            return self::FAILURE;
        }

        try {
            $keys = VAPID::createVapidKeys();
        } catch (Throwable $e) {
            $this->error('Could not generate the keys: '.$e->getMessage());
            $this->line('On Windows, set OPENSSL_CONF to a valid openssl.cnf first (projekt.md, section 15).');

            return self::FAILURE;
        }

        $env = $this->writeValue($env, 'VAPID_PUBLIC_KEY', $keys['publicKey']);
        $this->replaceFile($path, $this->writeValue($env, 'VAPID_PRIVATE_KEY', $keys['privateKey']));

        $this->info('VAPID keys were saved in .env.');

        if ($this->laravel->configurationIsCached()) {
            $this->warn('Configuration is cached. Run: php artisan config:cache');
        }

        return self::SUCCESS;
    }
}
