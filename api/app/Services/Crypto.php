<?php

namespace App\Services;

use App\Exceptions\CryptoException;
use SensitiveParameter;
use SodiumException;

/**
 * Server-side encryption of sensitive fields and files (projekt.md, section 8.4).
 *
 * Fields use secretbox, files use secretstream. Each gets its own subkey derived
 * from the master key, so the two algorithms never share key material.
 *
 * Field format: bm1:<key id, 8 hex>:<base64 of nonce + ciphertext>
 * File format:  "BMF1" + key id (4 bytes) + secretstream header + chunks of
 *               STREAM_CHUNK_BYTES plaintext, the last one tagged as final.
 *
 * The key id is a hash of the master key rather than a manual number, so a key
 * can't be paired with the wrong id during rotation. It reveals nothing useful
 * about the key: it is 4 bytes of a one-way derivation.
 */
final class Crypto
{
    private const FIELD_PREFIX = 'bm1';

    private const FILE_MAGIC = 'BMF1';

    private const KEY_ID_BYTES = 4;

    /** Small enough for shared hosting memory limits. */
    private const STREAM_CHUNK_BYTES = 65536;

    // Each KDF context must be exactly 8 characters.
    private const CONTEXT_FIELDS = 'bm_field';

    private const CONTEXT_FILES = 'bm_files';

    private const CONTEXT_KEY_ID = 'bm_keyid';

    private readonly string $currentKeyId;

    /** @var array<string, string> binary key id => binary master key */
    private readonly array $keys;

    /**
     * @param  string  $currentKey  base64, encrypts new data
     * @param  list<string>  $previousKeys  base64, only decrypt older data
     */
    public function __construct(
        #[SensitiveParameter] string $currentKey,
        #[SensitiveParameter] array $previousKeys = [],
    ) {
        if ($currentKey === '') {
            throw CryptoException::missingKey();
        }

        $current = self::decodeKey($currentKey, 'SODIUM_KEY');
        $this->currentKeyId = self::deriveKeyId($current);

        $keys = [$this->currentKeyId => $current];
        foreach ($previousKeys as $previousKey) {
            $previous = self::decodeKey($previousKey, 'SODIUM_PREVIOUS_KEYS');
            $keys[self::deriveKeyId($previous)] = $previous;
        }
        $this->keys = $keys;
    }

    public static function fromConfig(): self
    {
        return new self(
            (string) config('basemind.crypto.key'),
            config('basemind.crypto.previous_keys', []),
        );
    }

    /** A new random master key, base64. */
    public static function generateKey(): string
    {
        return base64_encode(sodium_crypto_secretbox_keygen());
    }

    public function keyId(): string
    {
        return bin2hex($this->currentKeyId);
    }

    public function encrypt(#[SensitiveParameter] string $plaintext): string
    {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = sodium_crypto_secretbox(
            $plaintext,
            $nonce,
            self::subkey($this->keys[$this->currentKeyId], self::CONTEXT_FIELDS),
        );

        return self::FIELD_PREFIX.':'.$this->keyId().':'
            .sodium_bin2base64($nonce.$ciphertext, SODIUM_BASE64_VARIANT_ORIGINAL);
    }

    public function decrypt(string $payload): string
    {
        [$keyId, $sealed] = $this->parsePayload($payload);

        $minLength = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + SODIUM_CRYPTO_SECRETBOX_MACBYTES;
        if (strlen($sealed) < $minLength) {
            throw CryptoException::malformed();
        }

        $plaintext = sodium_crypto_secretbox_open(
            substr($sealed, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
            substr($sealed, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
            self::subkey($this->keyFor($keyId), self::CONTEXT_FIELDS),
        );

        if ($plaintext === false) {
            throw CryptoException::authenticationFailed();
        }

        return $plaintext;
    }

    /** False also for malformed values, which then fail in reencrypt(). */
    public function usesCurrentKey(string $payload): bool
    {
        return str_starts_with($payload, self::FIELD_PREFIX.':'.$this->keyId().':');
    }

    /** Moves a value to the current key. */
    public function reencrypt(string $payload): string
    {
        return $this->encrypt($this->decrypt($payload));
    }

    /**
     * @param  resource  $input
     * @param  resource  $output
     */
    public function encryptStream($input, $output): void
    {
        $key = self::subkey($this->keys[$this->currentKeyId], self::CONTEXT_FILES);
        [$state, $header] = sodium_crypto_secretstream_xchacha20poly1305_init_push($key);

        self::write($output, self::FILE_MAGIC.$this->currentKeyId.$header);

        // Read one chunk ahead: only then do we know which chunk is the final one.
        $chunk = self::readExactly($input, self::STREAM_CHUNK_BYTES);
        do {
            $next = self::readExactly($input, self::STREAM_CHUNK_BYTES);
            $isLast = $next === '';

            self::write($output, sodium_crypto_secretstream_xchacha20poly1305_push(
                $state,
                $chunk,
                '',
                $isLast
                    ? SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL
                    : SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_MESSAGE,
            ));

            $chunk = $next;
        } while (! $isLast);
    }

    /**
     * Plaintext is written chunk by chunk, each one authenticated. If this throws,
     * discard what was already written: the file was truncated or tampered with.
     *
     * @param  resource  $input
     * @param  resource  $output
     */
    public function decryptStream($input, $output): void
    {
        $prefixLength = strlen(self::FILE_MAGIC) + self::KEY_ID_BYTES + SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES;
        $prefix = self::readExactly($input, $prefixLength);

        if (strlen($prefix) !== $prefixLength || ! str_starts_with($prefix, self::FILE_MAGIC)) {
            throw CryptoException::malformed();
        }

        $keyId = substr($prefix, strlen(self::FILE_MAGIC), self::KEY_ID_BYTES);
        $header = substr($prefix, strlen(self::FILE_MAGIC) + self::KEY_ID_BYTES);

        $state = sodium_crypto_secretstream_xchacha20poly1305_init_pull(
            $header,
            self::subkey($this->keyFor($keyId), self::CONTEXT_FILES),
        );

        $sealedChunkBytes = self::STREAM_CHUNK_BYTES + SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES;
        $finished = false;

        while (($sealed = self::readExactly($input, $sealedChunkBytes)) !== '') {
            if ($finished) {
                throw CryptoException::authenticationFailed(); // data after the final chunk
            }

            $result = strlen($sealed) < SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES
                ? false
                : sodium_crypto_secretstream_xchacha20poly1305_pull($state, $sealed);

            if ($result === false) {
                throw CryptoException::authenticationFailed();
            }

            [$plaintext, $tag] = $result;
            self::write($output, $plaintext);
            $finished = $tag === SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL;
        }

        if (! $finished) {
            throw CryptoException::truncated();
        }
    }

    /** @return array{0: string, 1: string} binary key id, binary nonce + ciphertext */
    private function parsePayload(string $payload): array
    {
        $parts = explode(':', $payload);

        if (count($parts) !== 3 || $parts[0] !== self::FIELD_PREFIX) {
            throw CryptoException::malformed();
        }

        try {
            $keyId = sodium_hex2bin($parts[1]);
            $sealed = sodium_base642bin($parts[2], SODIUM_BASE64_VARIANT_ORIGINAL);
        } catch (SodiumException) {
            throw CryptoException::malformed();
        }

        if (strlen($keyId) !== self::KEY_ID_BYTES) {
            throw CryptoException::malformed();
        }

        return [$keyId, $sealed];
    }

    private function keyFor(string $keyId): string
    {
        return $this->keys[$keyId] ?? throw CryptoException::unknownKey(bin2hex($keyId));
    }

    private static function decodeKey(#[SensitiveParameter] string $encoded, string $name): string
    {
        try {
            $key = sodium_base642bin($encoded, SODIUM_BASE64_VARIANT_ORIGINAL);
        } catch (SodiumException) {
            throw CryptoException::invalidKey($name);
        }

        if (strlen($key) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
            throw CryptoException::invalidKey($name);
        }

        return $key;
    }

    private static function deriveKeyId(#[SensitiveParameter] string $key): string
    {
        return substr(
            sodium_crypto_kdf_derive_from_key(SODIUM_CRYPTO_KDF_BYTES_MIN, 1, self::CONTEXT_KEY_ID, $key),
            0,
            self::KEY_ID_BYTES,
        );
    }

    private static function subkey(#[SensitiveParameter] string $key, string $context): string
    {
        return sodium_crypto_kdf_derive_from_key(SODIUM_CRYPTO_SECRETBOX_KEYBYTES, 1, $context, $key);
    }

    /**
     * fread() may return fewer bytes than asked on network streams, and chunk
     * boundaries must be exact. Returns less than $length only at the end of the stream.
     *
     * @param  resource  $stream
     */
    private static function readExactly($stream, int $length): string
    {
        $buffer = '';

        while (strlen($buffer) < $length && ! feof($stream)) {
            $read = fread($stream, $length - strlen($buffer));

            if ($read === false) {
                throw CryptoException::io('read');
            }

            $buffer .= $read;
        }

        return $buffer;
    }

    /** @param resource $stream */
    private static function write($stream, string $data): void
    {
        $offset = 0;
        $length = strlen($data);

        while ($offset < $length) {
            $written = fwrite($stream, substr($data, $offset));

            if ($written === false || $written === 0) {
                throw CryptoException::io('write to');
            }

            $offset += $written;
        }
    }
}
