<?php

namespace App\Services;

use App\Exceptions\RejectedSyncOperation;
use App\Models\User;
use App\Policies\SpaceItemPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Exchanges changes with the PWA (projekt.md, section 5).
 */
class SyncService
{
    /**
     * Applies each operation independently: one rejected change doesn't block the others.
     *
     * @param  list<array<string, mixed>>  $ops
     * @return list<array<string, string>>
     */
    public function push(User $user, array $ops): array
    {
        return array_map(fn (array $op) => $this->applyOperation($user, $op), $ops);
    }

    /**
     * @return array{changes: list<array{entity: string, record: array<string, mixed>}>, cursor: int, has_more: bool}
     */
    public function pull(User $user, int $cursor, int $limit): array
    {
        // One row over the limit per entity is enough to know whether another page exists.
        $changes = collect(config('sync.entities'))
            ->flatMap(fn (string $model, string $entity) => $model::withTrashed()
                ->visibleTo($user)
                ->where('rev', '>', $cursor)
                ->orderBy('rev')
                ->limit($limit + 1)
                ->get()
                ->map(fn (Model $record) => ['entity' => $entity, 'record' => $record->toSyncArray()]))
            ->sortBy('record.rev')
            ->values();

        $page = $changes->take($limit)->all();

        return [
            'changes' => $page,
            'cursor' => $page === [] ? $cursor : $page[array_key_last($page)]['record']['rev'],
            'has_more' => $changes->count() > $limit,
        ];
    }

    /**
     * @param  array<string, mixed>  $op
     * @return array<string, string>
     */
    private function applyOperation(User $user, array $op): array
    {
        try {
            // Retries cover deadlocks between devices syncing at the same moment.
            $status = DB::transaction(function () use ($user, $op) {
                // Waits for a concurrent copy of this operation to finish, then counts as a repeat.
                $isNew = DB::table('sync_ops')->insertOrIgnore([
                    'user_id' => $user->id,
                    'op_id' => $op['op_id'],
                    'created_at' => now(),
                ]) === 1;

                return $isNew ? $this->perform($user, $op) : 'applied';
            }, 3);
        } catch (RejectedSyncOperation $rejection) {
            return ['op_id' => $op['op_id'], 'status' => 'rejected', 'reason' => $rejection->reason];
        }

        return ['op_id' => $op['op_id'], 'status' => $status];
    }

    /**
     * @param  array<string, mixed>  $op
     * @return 'applied'|'merged'
     */
    private function perform(User $user, array $op): string
    {
        $model = config('sync.entities')[$op['entity']] ?? throw new RejectedSyncOperation('unknown_entity');
        $record = $model::withTrashed()->lockForUpdate()->find($op['record_id']);

        // A device's clock must not make its changes impossible to overwrite.
        $changedAt = CarbonImmutable::parse($op['client_ts'])->utc()->min(CarbonImmutable::now('UTC'));

        return match ($op['op']) {
            'create' => $this->create($user, $model, $record, $op, $changedAt),
            'update' => $this->update($user, $record, $op, $changedAt),
            'delete' => $this->delete($user, $record, $changedAt),
        };
    }

    /**
     * @param  class-string<Model>  $model
     * @param  array<string, mixed>  $op
     */
    private function create(User $user, string $model, ?Model $existing, array $op, CarbonImmutable $changedAt): string
    {
        if ($existing !== null) {
            throw new RejectedSyncOperation('already_exists');
        }

        $spaceId = $op['payload']['space_id'] ?? null;
        if (! is_string($spaceId)) {
            throw new RejectedSyncOperation('not_found');
        }

        $record = new $model;
        $record->forceFill(['id' => $op['record_id'], 'space_id' => $spaceId]);
        $this->authorizeEdit($user, $record);

        $fields = $this->validated($record, $op['payload'], [...$model::SYSTEM_FIELDS, ...$record->syncFields()], partial: false);

        $this->save($record, [
            ...$fields,
            'created_by' => $user->id,
            'created_at' => $changedAt,
            'deleted_at' => null,
            'version' => 1,
            'field_stamps' => array_fill_keys(array_keys($fields), $this->stamp($changedAt)),
        ], $changedAt);

        return 'applied';
    }

    /**
     * On a conflict, each field keeps its most recent value; fields the device didn't
     * touch are never affected. Even if every field loses, the record gets a new `rev`,
     * so the device pulls the values that won.
     *
     * @param  array<string, mixed>  $op
     */
    private function update(User $user, ?Model $record, array $op, CarbonImmutable $changedAt): string
    {
        if ($record === null) {
            throw new RejectedSyncOperation('not_found');
        }

        $this->authorizeEdit($user, $record);

        if ($record->deleted_at !== null) {
            throw new RejectedSyncOperation('deleted');
        }

        $fields = $this->validated($record, $op['payload'], $record->syncFields(), partial: true);
        $conflict = (int) $op['base_version'] !== $record->version;
        $stamps = $record->field_stamps ?? [];
        $stamp = $this->stamp($changedAt);

        if ($conflict) {
            $fields = array_filter(
                $fields,
                fn (string $field) => ($stamps[$field] ?? '') <= $stamp,
                ARRAY_FILTER_USE_KEY,
            );
        }

        $this->save($record, [
            ...$fields,
            'version' => $record->version + 1,
            'field_stamps' => [...$stamps, ...array_fill_keys(array_keys($fields), $stamp)],
        ], $changedAt);

        return $conflict ? 'merged' : 'applied';
    }

    private function delete(User $user, ?Model $record, CarbonImmutable $changedAt): string
    {
        if ($record === null) {
            throw new RejectedSyncOperation('not_found');
        }

        $this->authorizeEdit($user, $record);

        if ($record->deleted_at === null) {
            $this->save($record, ['deleted_at' => $changedAt, 'version' => $record->version + 1], $changedAt);
        }

        return 'applied';
    }

    /**
     * A change made by the server itself, e.g. a reminder going out. Devices receive it
     * like any other, and it takes part in conflicts. Call inside a transaction.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function recordServerChange(Model $record, array $attributes): void
    {
        $now = CarbonImmutable::now('UTC');

        $this->save($record, [
            ...$attributes,
            'version' => $record->version + 1,
            'field_stamps' => [...($record->field_stamps ?? []), ...array_fill_keys(array_keys($attributes), $this->stamp($now))],
        ], $now);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function save(Model $record, array $attributes, CarbonImmutable $changedAt): void
    {
        $record->forceFill([...$attributes, 'updated_at' => $changedAt, 'rev' => $this->nextRev()])->save();
    }

    /**
     * The counter row stays locked until the transaction commits, so changes become
     * visible in `rev` order and a client's cursor can never skip one.
     */
    private function nextRev(): int
    {
        DB::update('UPDATE sync_counter SET value = LAST_INSERT_ID(value + 1) WHERE id = 1');

        return (int) DB::selectOne('SELECT LAST_INSERT_ID() AS rev')->rev;
    }

    private function authorizeEdit(User $user, Model $record): void
    {
        $decision = app(SpaceItemPolicy::class)->update($user, $record);

        if ($decision->denied()) {
            throw new RejectedSyncOperation($decision->status() === 404 ? 'not_found' : 'forbidden');
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $allowed
     * @return array<string, mixed>
     */
    private function validated(Model $record, array $payload, array $allowed, bool $partial): array
    {
        if (array_diff(array_keys($payload), $allowed) !== []) {
            throw new RejectedSyncOperation('unknown_field');
        }

        $rules = $record->syncRules();
        if ($partial) {
            $rules = array_map(fn ($rule) => is_array($rule) ? ['sometimes', ...$rule] : "sometimes|{$rule}", $rules);
        }

        $validator = Validator::make($payload, $rules);
        if ($validator->fails()) {
            throw new RejectedSyncOperation('invalid');
        }

        return $validator->validated();
    }

    /** Millisecond precision in one format, so stamps compare correctly as strings. */
    private function stamp(CarbonImmutable $moment): string
    {
        return $moment->format('Y-m-d\TH:i:s.v\Z');
    }
}
