<?php

namespace App\Rules;

use App\Services\TaskSeries;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use InvalidArgumentException;

/**
 * An RFC 5545 rule for a repeating task, limited to what the app can edit: whole days,
 * no DTSTART (the series starts at repeat_anchor) and no COUNT (repeat_remaining
 * counts instead, because the start of the rule moves with every occurrence).
 * UNTIL is a plain date, e.g. UNTIL=20261231.
 *
 * Calendar events use the same rule with COUNT allowed: their series starts at a
 * fixed date, so the count can't drift.
 */
class TaskRecurrence implements ValidationRule
{
    private const PARTS = ['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'BYMONTH', 'BYSETPOS', 'UNTIL', 'WKST'];

    public function __construct(private readonly bool $allowCount = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! $this->hasAllowedParts($value)) {
            $fail('validation.regex')->translate();

            return;
        }

        try {
            TaskSeries::rule($value, '2026-01-01');
        } catch (InvalidArgumentException) {
            $fail('validation.regex')->translate();
        }
    }

    private function hasAllowedParts(string $rule): bool
    {
        $parts = [];
        foreach (explode(';', strtoupper($rule)) as $part) {
            [$name, $value] = array_pad(explode('=', $part, 2), 2, '');
            $parts[$name] = $value;
        }

        $allowed = $this->allowCount ? [...self::PARTS, 'COUNT'] : self::PARTS;

        return array_diff(array_keys($parts), $allowed) === []
            && in_array($parts['FREQ'] ?? '', ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], true)
            && (! isset($parts['UNTIL']) || preg_match('/^\d{8}$/', $parts['UNTIL']) === 1)
            && (! isset($parts['COUNT']) || preg_match('/^[1-9]\d{0,2}$/', $parts['COUNT']) === 1)
            && ! (isset($parts['COUNT'], $parts['UNTIL']));
    }
}
