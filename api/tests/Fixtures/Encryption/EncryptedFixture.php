<?php

namespace Tests\Fixtures\Encryption;

use App\Casts\SodiumEncrypted;
use App\Casts\SodiumEncryptedJson;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EncryptedFixture extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'encrypted_fixtures';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'secret' => SodiumEncrypted::class,
            'details' => SodiumEncryptedJson::class,
        ];
    }
}
