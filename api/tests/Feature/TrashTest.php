<?php

namespace Tests\Feature;

use App\Models\EntityLink;
use App\Models\EntityTag;
use App\Models\Reminder;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;
use App\Services\Trash;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TrashTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private string $spaceId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:8080/');
        $this->user = User::factory()->create(['timezone' => 'Europe/Warsaw']);
        $this->spaceId = $this->user->spaces()->first()->id;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function op(string $op, string $entity, string $id, array $payload = [], ?User $as = null): TestResponse
    {
        return $this->actingAs($as ?? $this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => $entity,
            'record_id' => $id,
            'op' => $op,
            'payload' => $payload,
            'base_version' => 0,
            'client_ts' => '2026-11-09T09:00:00.000Z',
        ]]])->assertOk();
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    private function create(string $entity, array $fields): string
    {
        $id = (string) Str::uuid7();
        $this->op('create', $entity, $id, ['id' => $id, 'space_id' => $this->spaceId, ...$fields])
            ->assertJsonPath('results.0.status', 'applied');

        return $id;
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    private function task(array $fields = []): string
    {
        return $this->create('tasks', [
            'list_id' => null,
            'title' => 'Opłacić OC',
            'notes' => 'Polisa 123',
            'priority' => 4,
            'status' => 'todo',
            'due_date' => null,
            'due_time' => null,
            'completed_at' => null,
            ...$fields,
        ]);
    }

    private function trash(string $entity, string $id): void
    {
        $this->op('delete', $entity, $id)->assertJsonPath('results.0.status', 'applied');
    }

    private function purge(string $entity, string $id): TestResponse
    {
        return $this->op('purge', $entity, $id);
    }

    public function test_a_record_in_the_trash_can_be_removed_for_good(): void
    {
        $id = $this->task();
        $this->trash('tasks', $id);

        $this->purge('tasks', $id)->assertJsonPath('results.0.status', 'applied');

        $this->assertNull(Task::withTrashed()->find($id));
        // The encrypted title and notes leave the database with the row.
        $this->assertSame(0, DB::table('tasks')->where('id', $id)->count());
    }

    public function test_only_records_in_the_trash_can_be_removed_for_good(): void
    {
        $id = $this->task();

        $this->purge('tasks', $id)
            ->assertJsonPath('results.0.status', 'rejected')
            ->assertJsonPath('results.0.reason', 'not_deleted');

        $this->assertNotNull(Task::find($id));
    }

    public function test_removing_a_record_already_gone_counts_as_done(): void
    {
        $this->purge('tasks', (string) Str::uuid7())->assertJsonPath('results.0.status', 'applied');
    }

    public function test_others_cannot_remove_your_records(): void
    {
        $id = $this->task();
        $this->trash('tasks', $id);
        $stranger = User::factory()->create();

        $this->op('purge', 'tasks', $id, as: $stranger)->assertJsonPath('results.0.reason', 'not_found');

        $this->assertNotNull(Task::withTrashed()->find($id));
    }

    public function test_devices_learn_about_a_removal_and_strangers_do_not(): void
    {
        $id = $this->task();
        $this->trash('tasks', $id);
        $cursor = $this->actingAs($this->user)->getJson('/api/sync/pull')->json('cursor');

        $this->purge('tasks', $id);

        $change = $this->actingAs($this->user)->getJson("/api/sync/pull?cursor={$cursor}")->json('changes');
        $this->assertCount(1, $change);
        $this->assertSame('tasks', $change[0]['entity']);
        $this->assertSame($id, $change[0]['record']['id']);
        $this->assertTrue($change[0]['purged']);
        $this->assertGreaterThan($cursor, $change[0]['record']['rev']);

        $stranger = User::factory()->create();
        $this->actingAs($stranger)->getJson('/api/sync/pull')->assertJsonPath('changes', []);
    }

    public function test_removing_a_task_removes_its_subtasks_and_what_is_attached(): void
    {
        $parent = $this->task();
        $subtask = $this->task(['parent_id' => $parent, 'deleted_with_parent' => true]);
        $tag = $this->create('tags', ['name' => 'Auto', 'color' => null]);
        $tagging = $this->create('entity_tags', ['entity_type' => 'tasks', 'entity_id' => $parent, 'tag_id' => $tag]);
        $other = $this->task(['title' => 'Inne']);
        $link = $this->create('entity_links', ['source_type' => 'tasks', 'source_id' => $other, 'target_type' => 'tasks', 'target_id' => $parent, 'origin' => 'manual']);
        $reminder = $this->create('reminders', [
            'entity_type' => 'tasks',
            'entity_id' => $parent,
            'title' => 'Opłacić OC',
            'remind_at' => '2026-11-09T10:00:00.000Z',
            'offset_minutes' => 0,
            'channels' => ['push'],
            'status' => 'dismissed',
        ]);
        $this->trash('tasks', $subtask);
        $this->trash('tasks', $parent);

        $this->purge('tasks', $parent);

        $this->assertNull(Task::withTrashed()->find($subtask));
        $this->assertNull(EntityTag::withTrashed()->find($tagging));
        $this->assertNull(EntityLink::withTrashed()->find($link));
        $this->assertNull(Reminder::withTrashed()->find($reminder));
        // The tag and the other task stay.
        $this->assertNotNull(Task::find($other));
        $this->assertSame(1, DB::table('tags')->where('id', $tag)->count());
        $this->assertSame(5, DB::table('sync_purges')->count());
    }

    public function test_removing_a_list_leaves_its_tasks_in_the_inbox(): void
    {
        $list = $this->create('task_lists', ['name' => 'Dom']);
        $task = $this->task(['list_id' => $list]);
        $this->trash('task_lists', $list);
        // Until then the task keeps its list, so restoring the list brings the task back to it.
        $this->assertSame($list, Task::find($task)->list_id);

        $this->purge('task_lists', $list);

        $this->assertNull(TaskList::withTrashed()->find($list));
        $this->assertNull(Task::find($task)->list_id);
        $this->actingAs($this->user)->getJson('/api/sync/pull')
            ->assertJsonFragment(['id' => $task, 'list_id' => null]);
    }

    public function test_the_subtask_flag_is_synchronised(): void
    {
        $parent = $this->task();
        $subtask = $this->task(['parent_id' => $parent]);

        $this->op('update', 'tasks', $subtask, ['deleted_with_parent' => true]);

        $this->assertTrue(Task::find($subtask)->deleted_with_parent);
        $this->op('update', 'tasks', $subtask, ['deleted_with_parent' => 'yes'])->assertJsonPath('results.0.reason', 'invalid');
    }

    public function test_the_trash_is_emptied_after_30_days(): void
    {
        $old = $this->task();
        $recent = $this->task();
        $live = $this->task();
        $this->trash('tasks', $old);
        $this->trash('tasks', $recent);
        Task::withTrashed()->whereKey($old)->update(['deleted_at' => '2026-10-10 08:00:00']);
        Task::withTrashed()->whereKey($recent)->update(['deleted_at' => '2026-10-20 08:00:00']);

        $removed = app(Trash::class)->emptyExpired(CarbonImmutable::parse('2026-11-15 12:00:00', 'UTC'));

        $this->assertSame(1, $removed);
        $this->assertNull(Task::withTrashed()->find($old));
        $this->assertNotNull(Task::withTrashed()->find($recent));
        $this->assertNotNull(Task::find($live));
    }

    public function test_the_command_empties_the_trash(): void
    {
        $id = $this->task();
        $this->trash('tasks', $id);
        Task::withTrashed()->whereKey($id)->update(['deleted_at' => now()->subDays(31)]);

        $this->artisan('basemind:empty-trash')->expectsOutput('Records removed: 1')->assertSuccessful();
    }

    public function test_a_device_that_missed_forgotten_notices_starts_over(): void
    {
        $id = $this->task();
        $staleCursor = $this->actingAs($this->user)->getJson('/api/sync/pull')->json('cursor');
        $this->trash('tasks', $id);
        $this->purge('tasks', $id);
        $freshCursor = $this->actingAs($this->user)->getJson("/api/sync/pull?cursor={$staleCursor}")->json('cursor');

        // A year later the notice is gone.
        app(Trash::class)->emptyExpired(CarbonImmutable::now('UTC')->addDays(366));
        $this->assertSame(0, DB::table('sync_purges')->count());

        $this->actingAs($this->user)->getJson("/api/sync/pull?cursor={$staleCursor}")
            ->assertJsonPath('reset', true)
            ->assertJsonPath('cursor', 0)
            ->assertJsonPath('changes', []);
        // Devices that already knew go on as before.
        $this->actingAs($this->user)->getJson("/api/sync/pull?cursor={$freshCursor}")->assertJsonMissingPath('reset');
        $this->actingAs($this->user)->getJson('/api/sync/pull?cursor=0')->assertJsonMissingPath('reset');
    }
}
