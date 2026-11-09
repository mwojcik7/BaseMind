<?php

namespace App\Rules;

use Closure;
use DateTimeImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use InvalidArgumentException;
use RRule\RRule;

/**
 * An RFC 5545 rule for repeating a reminder. COUNT is refused because the start of
 * the rule moves forward with every occurrence, so the count would never run out.
 * Use UNTIL instead. DTSTART comes from remind_at.
 */
class ReminderRecurrence implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match('/\b(COUNT|DTSTART)\b/i', $value) === 1) {
            $fail('validation.regex')->translate();

            return;
        }

        try {
            new RRule($value, new DateTimeImmutable('now'));
        } catch (InvalidArgumentException) {
            $fail('validation.regex')->translate();
        }
    }
}
