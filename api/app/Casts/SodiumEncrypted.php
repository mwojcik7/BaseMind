<?php

namespace App\Casts;

use App\Services\Crypto;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Database\Eloquent\ComparesCastableAttributes;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;
use Stringable;

/**
 * Stores a string encrypted in the database. NULL stays NULL.
 *
 * Encrypted columns can't be searched or sorted on the server, and they grow by
 * about a third: use TEXT, or MEDIUMTEXT for long content such as notes.
 * For numbers and arrays use SodiumEncryptedJson, which keeps the type.
 *
 * @implements CastsAttributes<string, string|Stringable>
 */
class SodiumEncrypted implements CastsAttributes, ComparesCastableAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        return $value === null ? null : $this->decode(app(Crypto::class)->decrypt($value));
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : app(Crypto::class)->encrypt($this->encode($key, $value));
    }

    /**
     * Each encryption uses a new nonce, so the stored values differ even for the
     * same text. Comparing plaintext stops a no-op save from looking like a change,
     * which would otherwise bump `version` and `rev` and trigger a needless sync.
     */
    public function compare(Model $model, string $key, mixed $firstValue, mixed $secondValue): bool
    {
        if ($firstValue === null || $secondValue === null) {
            return $firstValue === $secondValue;
        }

        $crypto = app(Crypto::class);

        return $this->decode($crypto->decrypt($firstValue)) === $this->decode($crypto->decrypt($secondValue));
    }

    protected function encode(string $key, mixed $value): string
    {
        if (! is_string($value) && ! $value instanceof Stringable) {
            throw new InvalidArgumentException("The encrypted attribute [{$key}] must be a string.");
        }

        return (string) $value;
    }

    protected function decode(string $plaintext): mixed
    {
        return $plaintext;
    }
}
