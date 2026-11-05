<?php

namespace App\Casts;

/**
 * Like SodiumEncrypted, for any JSON value: arrays, and numbers such as
 * hourly_rate_minor, which read back with their original type.
 */
class SodiumEncryptedJson extends SodiumEncrypted
{
    protected function encode(string $key, mixed $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }

    protected function decode(string $plaintext): mixed
    {
        return json_decode($plaintext, true, flags: JSON_THROW_ON_ERROR);
    }
}
