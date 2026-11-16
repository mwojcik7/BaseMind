<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A client's change that can never be applied. Thrown inside the operation's
 * transaction, so nothing of it is saved.
 */
class RejectedSyncOperation extends RuntimeException
{
    /**
     * @param  list<string>  $fields  Names of the fields at fault, for the log; never their values.
     */
    public function __construct(public readonly string $reason, public readonly array $fields = [])
    {
        parent::__construct($reason);
    }
}
