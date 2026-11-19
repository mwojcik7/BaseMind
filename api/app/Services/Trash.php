<?php

namespace App\Services;

use App\Models\Contracts\SyncableModel;
use App\Models\EntityLink;
use App\Models\EntityTag;
use App\Models\Event;
use App\Models\Reminder;
use App\Models\Tag;
use App\Models\Task;
use App\Models\TaskList;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Removes deleted records for good: by hand from the trash, or after 30 days.
 */
class Trash
{
    public function __construct(private readonly SyncService $sync) {}

    /**
     * Removes the record and whatever only made sense together with it. Call inside a
     * transaction, with the record locked.
     */
    public function purge(Model&SyncableModel $record): void
    {
        $entity = $this->sync->entityOf($record);

        // Subtasks cannot exist without their parent.
        if ($record instanceof Task) {
            Task::withTrashed()->where('parent_id', $record->id)->lockForUpdate()->get()
                ->each(fn (Task $subtask) => $this->purge($subtask));
        }

        // The list's tasks waited in the inbox for it to come back: now they stay there.
        if ($record instanceof TaskList) {
            Task::withTrashed()->where('list_id', $record->id)->lockForUpdate()->get()
                ->each(fn (Task $task) => $this->sync->recordServerChange($task, ['list_id' => null]));
        }

        // Changed occurrences go with their series; one brought back on its own stays as a
        // plain event.
        if ($record instanceof Event) {
            Event::withTrashed()->where('series_id', $record->id)->lockForUpdate()->get()
                ->each(fn (Event $occurrence) => $occurrence->trashed()
                    ? $this->purge($occurrence)
                    : $this->sync->recordServerChange($occurrence, ['series_id' => null, 'series_date' => null]));
        }

        if ($record instanceof Tag) {
            $this->forgetAll(EntityTag::withTrashed()->where('tag_id', $record->id));
        }

        $this->forgetAll(Reminder::withTrashed()->where('entity_type', $entity)->where('entity_id', $record->id));
        $this->forgetAll(EntityTag::withTrashed()->where('entity_type', $entity)->where('entity_id', $record->id));
        $this->forgetAll(EntityLink::withTrashed()->where(fn ($query) => $query
            ->where(fn ($source) => $source->where('source_type', $entity)->where('source_id', $record->id))
            ->orWhere(fn ($target) => $target->where('target_type', $entity)->where('target_id', $record->id))));

        $this->sync->forget($record);
    }

    /**
     * Removes what has been in the trash longer than allowed, and forgets old notices.
     *
     * @return int How many records were removed (not counting their dependants).
     */
    public function emptyExpired(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now('UTC');
        $cutoff = $now->subDays(config('trash.retention_days'));
        $removed = 0;

        foreach (config('sync.entities') as $model) {
            $ids = $model::onlyTrashed()->where('deleted_at', '<', $cutoff)->pluck('id');

            foreach ($ids as $id) {
                $removed += DB::transaction(function () use ($model, $id, $cutoff) {
                    // Checked again under a lock: it may have been restored or removed meanwhile.
                    $record = $model::onlyTrashed()->where('deleted_at', '<', $cutoff)->lockForUpdate()->find($id);
                    if ($record === null) {
                        return 0;
                    }

                    $this->purge($record);

                    return 1;
                }, 3);
            }
        }

        $this->forgetOldNotices($now);

        return $removed;
    }

    private function forgetOldNotices(CarbonImmutable $now): void
    {
        DB::transaction(function () use ($now) {
            $old = DB::table('sync_purges')->where('purged_at', '<', $now->subDays(config('trash.purge_notice_days')));
            $newest = (int) (clone $old)->max('rev');
            if ($newest === 0) {
                return;
            }

            DB::table('sync_counter')->where('id', 1)->where('purge_horizon', '<', $newest)->update(['purge_horizon' => $newest]);
            $old->where('rev', '<=', $newest)->delete();
        });
    }

    /**
     * @template TModel of Model&SyncableModel
     *
     * @param  Builder<TModel>  $query
     */
    private function forgetAll(Builder $query): void
    {
        foreach ($query->lockForUpdate()->get() as $record) {
            $this->sync->forget($record);
        }
    }
}
