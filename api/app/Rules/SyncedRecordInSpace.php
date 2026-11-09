<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The value must be the id of a record in the given space. Deleted records count:
 * another device may have tagged or linked one while offline, before learning of it.
 */
class SyncedRecordInSpace implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    private array $data = [];

    /**
     * @param  string|null  $entity  The entity's name, or null to read it from $typeField.
     * @param  string|null  $typeField  The field holding the entity's name.
     */
    public function __construct(
        private readonly ?string $spaceId,
        private readonly ?string $entity = null,
        private readonly ?string $typeField = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $entity = $this->entity ?? $this->data[$this->typeField] ?? null;
        $model = is_string($entity) ? (config('sync.entities')[$entity] ?? null) : null;

        if ($model === null || ! $model::withTrashed()->where('space_id', $this->spaceId)->whereKey($value)->exists()) {
            $fail('validation.exists')->translate();
        }
    }
}
