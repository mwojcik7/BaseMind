<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An event can't end before it starts. Checked on end_date, against whatever the same
 * change brings: the app always sends the dates and times of an event together, and
 * a partial change without them leaves the span as it was.
 */
class EventSpan implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    private array $data = [];

    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $start = $this->data['start_date'] ?? null;
        if (! is_string($value) || ! is_string($start)) {
            return;
        }

        $startTime = $this->data['start_time'] ?? null;
        $endTime = $this->data['end_time'] ?? null;
        $sameDayTimes = $value === $start && is_string($startTime) && is_string($endTime);

        if ($value < $start || ($sameDayTimes && $endTime < $startTime)) {
            $fail('validation.after_or_equal')->translate(['date' => $start]);
        }
    }
}
