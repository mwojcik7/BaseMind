<?php

namespace Tests\Feature;

use App\Exceptions\CryptoException;
use App\Services\Crypto;
use App\Services\EncryptedFieldRotator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\Fixtures\Encryption\EncryptedFixture;
use Tests\Fixtures\Encryption\Nested\NestedEncryptedFixture;
use Tests\TestCase;

/**
 * The shape domain tables will have: UUID key, soft deletes, encrypted columns.
 * No database trait: this test only needs its own table in basemind_test.
 */
class EncryptionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('basemind_test', DB::getDatabaseName());

        Schema::dropIfExists('encrypted_fixtures');
        Schema::create('encrypted_fixtures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('secret')->nullable();
            $table->text('details')->nullable();
            $table->string('title')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('encrypted_fixtures');

        parent::tearDown();
    }

    private function useKeys(string $current, array $previous = []): void
    {
        config(['basemind.crypto.key' => $current, 'basemind.crypto.previous_keys' => $previous]);
        $this->app->forgetInstance(Crypto::class);
    }

    private function rawValue(EncryptedFixture $fixture, string $column): ?string
    {
        return DB::table('encrypted_fixtures')->where('id', $fixture->id)->value($column);
    }

    public function test_the_database_holds_ciphertext_and_the_model_gives_plaintext(): void
    {
        $fixture = EncryptedFixture::create(['secret' => 'numer dowodu ABC123']);

        $raw = $this->rawValue($fixture, 'secret');

        $this->assertStringStartsWith('bm1:', $raw);
        $this->assertStringNotContainsString('ABC123', $raw);
        $this->assertSame('numer dowodu ABC123', $fixture->fresh()->secret);
    }

    public function test_json_values_are_encrypted_and_keep_their_type(): void
    {
        $sizes = ['koszula' => 'L', 'but' => 44, 'żona' => ['imię' => 'Ania']];
        $fixture = EncryptedFixture::create(['details' => $sizes]);

        $raw = $this->rawValue($fixture, 'details');

        $this->assertStringStartsWith('bm1:', $raw);
        $this->assertStringNotContainsString('koszula', $raw);
        $this->assertSame($sizes, $fixture->fresh()->details);
    }

    public function test_numbers_keep_their_type_in_the_json_cast(): void
    {
        $fixture = EncryptedFixture::create(['details' => 4550]);

        $this->assertSame(4550, $fixture->fresh()->details);
    }

    public function test_null_stays_null(): void
    {
        $fixture = EncryptedFixture::create(['secret' => null, 'details' => null]);

        $this->assertNull($this->rawValue($fixture, 'secret'));
        $this->assertNull($this->rawValue($fixture, 'details'));
        $this->assertNull($fixture->fresh()->secret);
        $this->assertNull($fixture->fresh()->details);
    }

    public function test_an_empty_string_is_not_turned_into_null(): void
    {
        $fixture = EncryptedFixture::create(['secret' => '']);

        $this->assertSame('', $fixture->fresh()->secret);
    }

    public function test_the_text_cast_refuses_other_types(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new EncryptedFixture(['secret' => ['not', 'a', 'string']]);
    }

    public function test_saving_the_same_value_is_not_a_change(): void
    {
        $fixture = EncryptedFixture::create(['secret' => 'bez zmian', 'details' => ['a' => 1]])->fresh();
        $stored = $this->rawValue($fixture, 'secret');

        $fixture->secret = 'bez zmian';
        $fixture->details = ['a' => 1];

        $this->assertFalse($fixture->isDirty());

        $fixture->save();

        $this->assertSame($stored, $this->rawValue($fixture, 'secret'));
    }

    public function test_a_different_value_is_a_change(): void
    {
        $fixture = EncryptedFixture::create(['secret' => 'stare', 'details' => null])->fresh();

        $fixture->secret = 'nowe';
        $this->assertTrue($fixture->isDirty('secret'));

        $fixture->details = ['a' => 1];
        $this->assertTrue($fixture->isDirty('details'));

        $fixture->secret = null;
        $this->assertTrue($fixture->isDirty('secret'));
    }

    public function test_reading_with_the_wrong_key_fails_instead_of_returning_garbage(): void
    {
        $fixture = EncryptedFixture::create(['secret' => 'tajne']);

        $this->useKeys(Crypto::generateKey());

        $this->expectException(CryptoException::class);

        $fixture->fresh()->secret;
    }

    public function test_without_a_key_nothing_is_written_as_plaintext(): void
    {
        $this->useKeys('');

        try {
            EncryptedFixture::create(['secret' => 'tajne']);
            $this->fail('Expected a missing key error.');
        } catch (CryptoException $e) {
            $this->assertSame(CryptoException::missingKey()->getMessage(), $e->getMessage());
        }

        $this->assertSame(0, DB::table('encrypted_fixtures')->count());
    }

    public function test_reencrypt_moves_all_rows_including_soft_deleted_ones(): void
    {
        $oldKey = Crypto::generateKey();
        $this->useKeys($oldKey);

        $active = EncryptedFixture::create(['secret' => 'aktywny', 'details' => ['n' => 1]]);
        $deleted = EncryptedFixture::create(['secret' => 'usunięty']);
        $deleted->delete();
        $empty = EncryptedFixture::create(['secret' => null]);

        $newKey = Crypto::generateKey();
        $this->useKeys($newKey, [$oldKey]);

        $this->assertSame(0, Artisan::call('basemind:reencrypt', ['--model' => [EncryptedFixture::class]]));

        // Only the new key from here on: everything must be readable without the old one.
        $this->useKeys($newKey);

        $this->assertSame('aktywny', $active->fresh()->secret);
        $this->assertSame(['n' => 1], $active->fresh()->details);
        $this->assertSame('usunięty', EncryptedFixture::withTrashed()->find($deleted->id)->secret);
        $this->assertNull($empty->fresh()->secret);
    }

    public function test_reencrypt_changes_nothing_but_the_encrypted_columns(): void
    {
        $oldKey = Crypto::generateKey();
        $this->useKeys($oldKey);

        $fixture = EncryptedFixture::create(['secret' => 'tajne', 'title' => 'jawne']);
        DB::table('encrypted_fixtures')->where('id', $fixture->id)->update(['updated_at' => '2020-01-02 03:04:05']);

        $this->useKeys(Crypto::generateKey(), [$oldKey]);
        Artisan::call('basemind:reencrypt', ['--model' => [EncryptedFixture::class]]);

        $row = DB::table('encrypted_fixtures')->where('id', $fixture->id)->first();

        $this->assertSame('2020-01-02 03:04:05', $row->updated_at);
        $this->assertSame('jawne', $row->title);
    }

    public function test_reencrypt_can_be_run_again_without_changes(): void
    {
        $oldKey = Crypto::generateKey();
        $this->useKeys($oldKey);
        $fixture = EncryptedFixture::create(['secret' => 'tajne']);

        $this->useKeys(Crypto::generateKey(), [$oldKey]);
        $rotator = app(EncryptedFieldRotator::class);

        $this->assertSame(1, $rotator->rotate(EncryptedFixture::class)['updated']);
        $stored = $this->rawValue($fixture, 'secret');

        $again = $rotator->rotate(EncryptedFixture::class);

        $this->assertSame(0, $again['updated']);
        $this->assertSame($stored, $this->rawValue($fixture, 'secret'));
    }

    public function test_reencrypt_reports_damaged_values_and_still_moves_the_rest(): void
    {
        $oldKey = Crypto::generateKey();
        $this->useKeys($oldKey);

        $good = EncryptedFixture::create(['secret' => 'dobry']);
        $damaged = EncryptedFixture::create(['secret' => 'zepsuty']);
        DB::table('encrypted_fixtures')->where('id', $damaged->id)->update(['secret' => 'plain text value']);

        $newKey = Crypto::generateKey();
        $this->useKeys($newKey, [$oldKey]);

        $this->assertSame(1, Artisan::call('basemind:reencrypt', ['--model' => [EncryptedFixture::class]]));
        $output = Artisan::output();

        $this->assertStringContainsString($damaged->id.'.secret', $output);
        $this->assertStringNotContainsString('plain text value', $output);
        $this->assertSame('plain text value', $this->rawValue($damaged, 'secret'));

        $this->useKeys($newKey);
        $this->assertSame('dobry', $good->fresh()->secret);
    }

    public function test_reencrypt_finds_no_models_yet_and_succeeds(): void
    {
        $this->assertSame([], app(EncryptedFieldRotator::class)->discoverModels());
        $this->assertSame(0, Artisan::call('basemind:reencrypt'));
    }

    public function test_discovery_finds_models_with_encrypted_fields_also_in_subdirectories(): void
    {
        $found = app(EncryptedFieldRotator::class)->discoverModels(
            base_path('tests/Fixtures/Encryption'),
            'Tests\\Fixtures\\Encryption\\',
        );

        sort($found);

        $this->assertSame([EncryptedFixture::class, NestedEncryptedFixture::class], $found);
    }

    public function test_reencrypt_lists_only_encrypted_columns(): void
    {
        $this->assertSame(
            ['secret', 'details'],
            app(EncryptedFieldRotator::class)->encryptedColumns(EncryptedFixture::class),
        );
    }

    public function test_reencrypt_refuses_a_class_that_is_not_a_model(): void
    {
        $this->assertSame(1, Artisan::call('basemind:reencrypt', ['--model' => [self::class]]));
    }

    public function test_reencrypt_fails_clearly_without_a_key(): void
    {
        $this->useKeys('');

        $this->assertSame(1, Artisan::call('basemind:reencrypt'));
        $this->assertStringContainsString('SODIUM_KEY', Artisan::output());
    }
}
