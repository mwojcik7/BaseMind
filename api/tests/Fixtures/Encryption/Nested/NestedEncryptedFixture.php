<?php

namespace Tests\Fixtures\Encryption\Nested;

use App\Casts\SodiumEncrypted;
use Illuminate\Database\Eloquent\Model;

class NestedEncryptedFixture extends Model
{
    protected $casts = ['secret' => SodiumEncrypted::class];
}
