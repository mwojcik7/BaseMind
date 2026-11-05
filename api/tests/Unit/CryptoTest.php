<?php

namespace Tests\Unit;

use App\Exceptions\CryptoException;
use App\Services\Crypto;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class CryptoTest extends TestCase
{
    private const CHUNK = 65536;

    /** @return array<string, array{string}> */
    public static function plaintexts(): array
    {
        return [
            'empty' => [''],
            'polish and emoji' => ['Zażółć gęślą jaźń 🔐'],
            'contains the separator' => ['a:b:c'],
            'long' => [str_repeat('x', 200000)],
        ];
    }

    #[DataProvider('plaintexts')]
    public function test_field_round_trip(string $plaintext): void
    {
        $crypto = new Crypto(Crypto::generateKey());

        $this->assertSame($plaintext, $crypto->decrypt($crypto->encrypt($plaintext)));
    }

    public function test_the_payload_hides_the_plaintext_and_names_the_key(): void
    {
        $crypto = new Crypto(Crypto::generateKey());

        $payload = $crypto->encrypt('tajne dane');

        $this->assertStringStartsWith('bm1:'.$crypto->keyId().':', $payload);
        $this->assertStringNotContainsString('tajne', $payload);
        $this->assertStringNotContainsString('tajne', (string) base64_decode(explode(':', $payload)[2]));
    }

    public function test_each_encryption_uses_a_new_nonce(): void
    {
        $crypto = new Crypto(Crypto::generateKey());

        $this->assertNotSame($crypto->encrypt('same'), $crypto->encrypt('same'));
    }

    public function test_a_changed_payload_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        [$prefix, $keyId, $sealed] = explode(':', $crypto->encrypt('tajne dane'));

        $bytes = base64_decode($sealed);
        $bytes[strlen($bytes) - 1] = $bytes[strlen($bytes) - 1] ^ "\x01";

        $this->expectExceptionObject(CryptoException::authenticationFailed());

        $crypto->decrypt($prefix.':'.$keyId.':'.base64_encode($bytes));
    }

    public function test_an_unknown_key_is_rejected(): void
    {
        $payload = (new Crypto(Crypto::generateKey()))->encrypt('tajne dane');

        $this->expectException(CryptoException::class);
        $this->expectExceptionMessage('unknown key');

        (new Crypto(Crypto::generateKey()))->decrypt($payload);
    }

    public function test_a_wrong_key_with_a_forged_key_id_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        $other = new Crypto(Crypto::generateKey());

        $forged = str_replace($other->keyId(), $crypto->keyId(), $other->encrypt('tajne dane'));

        $this->expectExceptionObject(CryptoException::authenticationFailed());

        $crypto->decrypt($forged);
    }

    /** @return array<string, array{string}> */
    public static function malformedPayloads(): array
    {
        return [
            'plain text' => ['just some text'],
            'empty' => [''],
            'wrong prefix' => ['bm9:00000000:AAAA'],
            'missing part' => ['bm1:00000000'],
            'too many parts' => ['bm1:00000000:AAAA:AAAA'],
            'bad key id' => ['bm1:zz:AAAA'],
            'short key id' => ['bm1:00:AAAA'],
            'bad base64' => ['bm1:00000000:***'],
        ];
    }

    #[DataProvider('malformedPayloads')]
    public function test_malformed_payloads_are_rejected(string $payload): void
    {
        $this->expectExceptionObject(CryptoException::malformed());

        (new Crypto(Crypto::generateKey()))->decrypt($payload);
    }

    public function test_a_payload_too_short_to_hold_a_nonce_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());

        $this->expectExceptionObject(CryptoException::malformed());

        $crypto->decrypt('bm1:'.$crypto->keyId().':AAAA');
    }

    /** @return array<string, array{string}> */
    public static function invalidKeys(): array
    {
        return [
            'too short' => [base64_encode(str_repeat('k', 31))],
            'too long' => [base64_encode(str_repeat('k', 33))],
            'not base64' => ['not base64 at all!'],
        ];
    }

    #[DataProvider('invalidKeys')]
    public function test_invalid_keys_are_rejected(string $key): void
    {
        $this->expectExceptionObject(CryptoException::invalidKey('SODIUM_KEY'));

        new Crypto($key);
    }

    public function test_a_missing_key_is_rejected(): void
    {
        $this->expectExceptionObject(CryptoException::missingKey());

        new Crypto('');
    }

    public function test_an_invalid_previous_key_is_rejected(): void
    {
        $this->expectExceptionObject(CryptoException::invalidKey('SODIUM_PREVIOUS_KEYS'));

        new Crypto(Crypto::generateKey(), ['nope']);
    }

    public function test_the_key_id_is_stable_and_differs_between_keys(): void
    {
        $key = Crypto::generateKey();

        $this->assertSame((new Crypto($key))->keyId(), (new Crypto($key))->keyId());
        $this->assertNotSame((new Crypto($key))->keyId(), (new Crypto(Crypto::generateKey()))->keyId());
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}$/', (new Crypto($key))->keyId());
    }

    public function test_rotation_keeps_old_data_readable_and_moves_it_to_the_new_key(): void
    {
        $oldKey = Crypto::generateKey();
        $payload = (new Crypto($oldKey))->encrypt('tajne dane');

        $rotated = new Crypto(Crypto::generateKey(), [$oldKey]);

        $this->assertSame('tajne dane', $rotated->decrypt($payload));
        $this->assertFalse($rotated->usesCurrentKey($payload));

        $moved = $rotated->reencrypt($payload);

        $this->assertTrue($rotated->usesCurrentKey($moved));
        $this->assertSame('tajne dane', $rotated->decrypt($moved));
    }

    /** @return array<string, array{int}> */
    public static function fileSizes(): array
    {
        return [
            'empty' => [0],
            'one byte' => [1],
            'just under a chunk' => [self::CHUNK - 1],
            'exactly a chunk' => [self::CHUNK],
            'just over a chunk' => [self::CHUNK + 1],
            'exactly three chunks' => [self::CHUNK * 3],
        ];
    }

    #[DataProvider('fileSizes')]
    public function test_file_round_trip(int $size): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        $plaintext = $size === 0 ? '' : random_bytes($size);

        $sealed = $this->encryptFile($crypto, $plaintext);

        $this->assertSame($plaintext, $this->decryptFile($crypto, $sealed));
    }

    public function test_an_encrypted_file_hides_the_plaintext(): void
    {
        $sealed = $this->encryptFile(new Crypto(Crypto::generateKey()), 'paragon ze sklepu');

        $this->assertStringStartsWith('BMF1', $sealed);
        $this->assertStringNotContainsString('paragon', $sealed);
    }

    public function test_a_file_from_a_previous_key_can_be_read(): void
    {
        $oldKey = Crypto::generateKey();
        $sealed = $this->encryptFile(new Crypto($oldKey), 'paragon');

        $this->assertSame('paragon', $this->decryptFile(new Crypto(Crypto::generateKey(), [$oldKey]), $sealed));
    }

    public function test_a_file_from_an_unknown_key_is_rejected(): void
    {
        $sealed = $this->encryptFile(new Crypto(Crypto::generateKey()), 'paragon');

        $this->expectException(CryptoException::class);
        $this->expectExceptionMessage('unknown key');

        $this->decryptFile(new Crypto(Crypto::generateKey()), $sealed);
    }

    public function test_a_changed_file_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        $sealed = $this->encryptFile($crypto, random_bytes(1000));
        $sealed[strlen($sealed) - 1] = $sealed[strlen($sealed) - 1] ^ "\x01";

        $this->expectExceptionObject(CryptoException::authenticationFailed());

        $this->decryptFile($crypto, $sealed);
    }

    public function test_a_file_cut_at_a_chunk_boundary_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        $sealed = $this->encryptFile($crypto, random_bytes(self::CHUNK * 2 + 10));

        // Drops the final chunk: every remaining chunk is still authentic, only the end is gone.
        $cut = substr($sealed, 0, $this->prefixLength() + 2 * $this->sealedChunk());

        $this->expectExceptionObject(CryptoException::truncated());

        $this->decryptFile($crypto, $cut);
    }

    public function test_a_file_with_only_its_header_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        $sealed = $this->encryptFile($crypto, 'paragon');

        $this->expectExceptionObject(CryptoException::truncated());

        $this->decryptFile($crypto, substr($sealed, 0, $this->prefixLength()));
    }

    public function test_swapped_chunks_are_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());
        $sealed = $this->encryptFile($crypto, random_bytes(self::CHUNK * 2 + 10));

        $prefix = $this->prefixLength();
        $size = $this->sealedChunk();
        $swapped = substr($sealed, 0, $prefix)
            .substr($sealed, $prefix + $size, $size)
            .substr($sealed, $prefix, $size)
            .substr($sealed, $prefix + 2 * $size);

        $this->expectExceptionObject(CryptoException::authenticationFailed());

        $this->decryptFile($crypto, $swapped);
    }

    public function test_data_after_the_final_chunk_is_rejected(): void
    {
        $crypto = new Crypto(Crypto::generateKey());

        $this->expectExceptionObject(CryptoException::authenticationFailed());

        $this->decryptFile($crypto, $this->encryptFile($crypto, 'paragon').'extra');
    }

    /** @return array<string, array{string}> */
    public static function malformedFiles(): array
    {
        return [
            'empty' => [''],
            'too short' => ['BMF1'],
            'not our format' => [str_repeat('x', 200)],
        ];
    }

    #[DataProvider('malformedFiles')]
    public function test_malformed_files_are_rejected(string $file): void
    {
        $this->expectExceptionObject(CryptoException::malformed());

        $this->decryptFile(new Crypto(Crypto::generateKey()), $file);
    }

    private function prefixLength(): int
    {
        return 8 + SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES;
    }

    private function sealedChunk(): int
    {
        return self::CHUNK + SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES;
    }

    private function encryptFile(Crypto $crypto, string $plaintext): string
    {
        $input = $this->streamWith($plaintext);
        $output = fopen('php://memory', 'w+b');

        $crypto->encryptStream($input, $output);
        rewind($output);

        return (string) stream_get_contents($output);
    }

    private function decryptFile(Crypto $crypto, string $sealed): string
    {
        $input = $this->streamWith($sealed);
        $output = fopen('php://memory', 'w+b');

        $crypto->decryptStream($input, $output);
        rewind($output);

        return (string) stream_get_contents($output);
    }

    /** @return resource */
    private function streamWith(string $contents)
    {
        $stream = fopen('php://memory', 'w+b');
        fwrite($stream, $contents);
        rewind($stream);

        return $stream;
    }
}
