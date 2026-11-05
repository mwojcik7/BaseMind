<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Encryption or decryption failed. Messages never contain keys or field values,
 * so this exception is safe to log.
 */
final class CryptoException extends RuntimeException
{
    public static function missingKey(): self
    {
        return new self('SODIUM_KEY is not set. Generate it with: php artisan basemind:key');
    }

    public static function invalidKey(string $name): self
    {
        return new self("{$name} must be 32 bytes encoded as base64.");
    }

    public static function unknownKey(string $keyId): self
    {
        return new self("Data was encrypted with an unknown key ({$keyId}). Add that key to SODIUM_PREVIOUS_KEYS.");
    }

    public static function malformed(): self
    {
        return new self('The value is not a valid encrypted payload.');
    }

    public static function authenticationFailed(): self
    {
        return new self('Decryption failed: the data was changed or the key is wrong.');
    }

    public static function truncated(): self
    {
        return new self('Decryption failed: the encrypted file is incomplete.');
    }

    public static function io(string $operation): self
    {
        return new self("Could not {$operation} the stream.");
    }
}
