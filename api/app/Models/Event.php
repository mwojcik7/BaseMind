<?php

namespace App\Models;

use App\Casts\SodiumEncrypted;
use App\Models\Concerns\Syncable;
use App\Models\Contracts\SyncableModel;
use App\Rules\EventSpan;
use App\Rules\TaskRecurrence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * A calendar event. Times are wall time on the user's clock; an event without times
 * lasts whole days. A repeating event shows every occurrence its rule gives, from
 * start_date on, except the skipped ones in exdates.
 */
class Event extends Model implements SyncableModel
{
    use Syncable;

    /** Names of the palette colours; the app maps them to its own shades. */
    public const COLORS = ['blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'purple', 'gray'];

    public function syncRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:500'],
            'location' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:10000'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', new EventSpan],
            // Both times or neither: an event is either all-day or timed.
            'start_time' => ['nullable', 'date_format:H:i', 'required_with:end_time'],
            'end_time' => ['nullable', 'date_format:H:i', 'required_with:start_time'],
            'rrule' => ['nullable', 'string', 'max:255', new TaskRecurrence(allowCount: true)],
            'exdates' => ['nullable', 'array', 'max:1000'],
            'exdates.*' => ['date_format:Y-m-d'],
            'color' => ['nullable', 'string', Rule::in(self::COLORS)],
        ];
    }

    public function isAllDay(): bool
    {
        return $this->start_time === null;
    }

    protected function casts(): array
    {
        return [
            'title' => SodiumEncrypted::class,
            'location' => SodiumEncrypted::class,
            'description' => SodiumEncrypted::class,
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'exdates' => 'array',
        ];
    }
}
