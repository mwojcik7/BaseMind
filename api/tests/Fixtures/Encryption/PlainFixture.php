<?php

namespace Tests\Fixtures\Encryption;

use Illuminate\Database\Eloquent\Model;

/** Has no encrypted fields, so rotation must skip it. */
class PlainFixture extends Model
{
    protected $casts = ['flag' => 'boolean'];
}
