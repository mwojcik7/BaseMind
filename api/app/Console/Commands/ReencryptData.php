<?php

namespace App\Console\Commands;

use App\Exceptions\CryptoException;
use App\Services\Crypto;
use App\Services\EncryptedFieldRotator;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;

class ReencryptData extends Command
{
    protected $signature = 'basemind:reencrypt {--model=* : Only these model classes (default: all with encrypted fields)}';

    protected $description = 'Move encrypted fields to the current key, after basemind:key --rotate';

    public function handle(): int
    {
        try {
            $crypto = app(Crypto::class);
        } catch (CryptoException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $rotator = new EncryptedFieldRotator($crypto);
        $models = $this->option('model') ?: $rotator->discoverModels();

        foreach ($models as $model) {
            if (! is_subclass_of($model, Model::class)) {
                $this->error("{$model} is not an Eloquent model.");

                return self::FAILURE;
            }
        }

        if ($models === []) {
            $this->info('No models have encrypted fields yet.');

            return self::SUCCESS;
        }

        $this->line('Current key: '.$crypto->keyId());
        $failures = 0;

        foreach ($models as $model) {
            $result = $rotator->rotate($model);
            $failures += count($result['failed']);

            $this->line("{$model}: {$result['updated']} updated, {$result['skipped']} already current or empty, ".count($result['failed']).' failed');

            foreach ($result['failed'] as $field) {
                $this->error("  Could not decrypt: {$field}");
            }
        }

        if ($failures > 0) {
            $this->error('Some values were not moved. Keep SODIUM_PREVIOUS_KEYS until this is resolved.');

            return self::FAILURE;
        }

        $this->info('All fields use the current key.');
        $this->warn('Encrypted files are not rotated yet and still need the older keys.');
        $this->warn('Database backups made before this also need them: keep old keys in your password manager.');

        return self::SUCCESS;
    }
}
