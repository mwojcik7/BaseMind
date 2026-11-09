<?php

namespace App\Models;

use App\Casts\SodiumEncrypted;
use App\Models\Concerns\Syncable;
use App\Rules\ReminderRecurrence;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rule;

class Reminder extends Model
{
    use Syncable;

    public const CHANNELS = ['push', 'email'];

    /** Filled in by the server when the reminder goes out. */
    public function syncReadOnlyFields(): array
    {
        return ['last_sent_at'];
    }

    public function syncRules(): array
    {
        return [
            'entity_type' => ['nullable', 'string', Rule::in(array_keys(config('sync.entities')))],
            'entity_id' => ['nullable', 'uuid'],
            'title' => ['required', 'string', 'max:255'],
            'remind_at' => ['required', 'date'],
            'rrule' => ['nullable', 'string', 'max:255', new ReminderRecurrence],
            'offset_minutes' => ['required', 'integer', 'min:0', 'max:527040'],
            'channels' => ['present', 'array'],
            'channels.*' => [Rule::in(self::CHANNELS)],
            'status' => ['required', 'in:scheduled,sent,dismissed,snoozed'],
            'snoozed_until' => ['nullable', 'date'],
        ];
    }

    protected function casts(): array
    {
        return [
            'title' => SodiumEncrypted::class,
            'remind_at' => 'datetime',
            'snoozed_until' => 'datetime',
            'last_sent_at' => 'datetime',
            'channels' => 'array',
            'offset_minutes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @param  Builder<static>  $query
     */
    public function scopeDue(Builder $query, CarbonImmutable $now): void
    {
        $query->whereNotNull('created_by')->where(function (Builder $due) use ($now) {
            $due->where(fn (Builder $q) => $q->where('status', 'scheduled')->where('remind_at', '<=', $now))
                ->orWhere(fn (Builder $q) => $q->where('status', 'snoozed')->where('snoozed_until', '<=', $now));
        });
    }
}
