<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A client's change that can never be applied. Thrown inside the operation's
 * transaction, so nothing of it is saved.
 */
class RejectedSyncOperation extends RuntimeException
{
    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
