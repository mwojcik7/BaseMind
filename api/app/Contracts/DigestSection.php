<?php

namespace App\Contracts;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * One part of the morning digest. Modules implement it and register in config/digest.php.
 */
interface DigestSection
{
    /**
     * @return array{title: string, items: list<string>}|null Null or no items leaves the section out.
     */
    public function forUser(User $user, CarbonImmutable $localDate): ?array;
}
