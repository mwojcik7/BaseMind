<?php

namespace Tests\Feature;

use App\Digest\OverdueTasksSection;
use App\Digest\TodayTasksSection;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TasksTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:8080/');
        $this->user = User::factory()->create(['timezone' => 'Europe/Warsaw']);
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed> The result of the operation, with the record's id.
     */
    private function push(User $user, string $entity, array $fields): array
    {
        $id = (string) Str::uuid7();
        $result = $this->actingAs($user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => $entity,
            'record_id' => $id,
            'op' => 'create',
            'payload' => ['id' => $id, 'space_id' => $user->spaces()->first()->id, ...$fields],
            'base_version' => 0,
            'client_ts' => '2026-11-09T09:00:00.000Z',
        ]]])->assertOk()->json('results.0');

        return [...$result, 'id' => $id];
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    private function pushTask(array $fields = [], ?User $user = null): array
    {
        return $this->push($user ?? $this->user, 'tasks', [
            'list_id' => null,
            'title' => 'Opłacić OC',
            'notes' => null,
            'priority' => 4,
            'status' => 'todo',
            'due_date' => null,
            'due_time' => null,
            'completed_at' => null,
            ...$fields,
        ]);
    }

    public function test_a_task_is_stored_encrypted_and_pulled_as_sent(): void
    {
        $list = $this->push($this->user, 'task_lists', ['name' => 'Dom']);
        $task = $this->pushTask([
            'list_id' => $list['id'],
            'title' => 'Tajny tytuł',
            'notes' => 'Tajna notatka',
            'priority' => 1,
            'due_date' => '2026-11-12',
            'due_time' => '14:30',
        ]);
        $this->assertSame('applied', $task['status']);

        $row = DB::table('tasks')->where('id', $task['id'])->first();
        $this->assertStringStartsWith('bm1:', $row->title);
        $this->assertStringStartsWith('bm1:', $row->notes);
        $this->assertStringNotContainsString('Tajn', $row->title.$row->notes);

        $records = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->assertOk()->json('changes'))
            ->pluck('record', 'entity');
        $this->assertSame($list['id'], $records['tasks']['list_id']);
        $this->assertSame('Tajny tytuł', $records['tasks']['title']);
        $this->assertSame('Tajna notatka', $records['tasks']['notes']);
        $this->assertSame(1, $records['tasks']['priority']);
        $this->assertSame('2026-11-12', $records['tasks']['due_date']);
        $this->assertSame('14:30', $records['tasks']['due_time']);
        $this->assertSame('Dom', $records['task_lists']['name']);
    }

    public function test_another_user_does_not_receive_the_task(): void
    {
        $this->pushTask();

        $this->actingAs(User::factory()->create())->getJson('/api/sync/pull')
            ->assertOk()->assertJsonPath('changes', []);
    }

    #[DataProvider('invalidTasks')]
    public function test_an_invalid_task_is_rejected(array $fields): void
    {
        $this->assertSame('rejected', $this->pushTask($fields)['status']);
        $this->assertSame(0, Task::count());
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function invalidTasks(): array
    {
        return [
            'empty title' => [['title' => '']],
            'title too long' => [['title' => str_repeat('a', 501)]],
            'priority too high' => [['priority' => 5]],
            'priority too low' => [['priority' => 0]],
            'unknown status' => [['status' => 'later']],
            'date with time' => [['due_date' => '2026-11-12T10:00:00Z']],
            'bad time' => [['due_time' => '25:00']],
            'list that does not exist' => [['list_id' => '019a0000-0000-7000-8000-000000000000']],
            'repeating without a date' => [['rrule' => 'FREQ=DAILY']],
            'rule that is not a rule' => [['rrule' => 'co tydzień', 'due_date' => '2026-11-14']],
            'hourly rule' => [['rrule' => 'FREQ=HOURLY', 'due_date' => '2026-11-14']],
            'rule with a count' => [['rrule' => 'FREQ=DAILY;COUNT=3', 'due_date' => '2026-11-14']],
            'rule with a start' => [['rrule' => 'DTSTART=20261114;FREQ=DAILY', 'due_date' => '2026-11-14']],
            'until with a time' => [['rrule' => 'FREQ=DAILY;UNTIL=20261231T235959Z', 'due_date' => '2026-11-14']],
            'unknown repeat start' => [['rrule' => 'FREQ=DAILY', 'due_date' => '2026-11-14', 'repeat_from' => 'start']],
            'no repetitions left' => [['rrule' => 'FREQ=DAILY', 'due_date' => '2026-11-14', 'repeat_remaining' => 0]],
        ];
    }

    public function test_a_task_cannot_use_a_list_from_another_space(): void
    {
        $foreign = $this->push(User::factory()->create(), 'task_lists', ['name' => 'Cudza']);

        $this->assertSame('rejected', $this->pushTask(['list_id' => $foreign['id']])['status']);
    }

    public function test_the_digest_lists_open_tasks_for_the_day_and_overdue_ones(): void
    {
        $this->pushTask(['title' => 'Mniej ważne', 'due_date' => '2026-11-09', 'priority' => 4]);
        $this->pushTask(['title' => 'Ważne', 'due_date' => '2026-11-09', 'priority' => 1]);
        $this->pushTask(['title' => 'Zaległe', 'due_date' => '2026-11-08']);
        $this->pushTask(['title' => 'Jutrzejsze', 'due_date' => '2026-11-10']);
        $this->pushTask(['title' => 'Bez terminu']);
        $this->pushTask(['title' => 'Zrobione', 'due_date' => '2026-11-09', 'status' => 'done']);
        $this->pushTask(['title' => 'Cudze', 'due_date' => '2026-11-09'], User::factory()->create());

        $date = CarbonImmutable::parse('2026-11-09', 'Europe/Warsaw');

        $this->assertSame(['Ważne', 'Mniej ważne'], app(TodayTasksSection::class)->forUser($this->user, $date)['items']);
        $this->assertSame(['Zaległe'], app(OverdueTasksSection::class)->forUser($this->user, $date)['items']);
    }

    /**
     * @return string The reminder's id.
     */
    private function reminderFor(string $taskId, ?User $user = null): string
    {
        return $this->push($user ?? $this->user, 'reminders', [
            'entity_type' => 'tasks',
            'entity_id' => $taskId,
            'title' => 'Opłacić OC',
            'remind_at' => '2026-11-09T10:00:00.000Z',
            'offset_minutes' => 0,
            'channels' => ['push'],
            'status' => 'sent',
        ])['id'];
    }

    private function dismiss(string $reminderId, array $body): void
    {
        $this->actingAs($this->user)->postJson("/api/reminders/{$reminderId}/dismiss", $body)->assertNoContent();
    }

    public function test_the_done_button_completes_the_task_for_every_device(): void
    {
        $task = $this->pushTask();
        $rev = Task::findOrFail($task['id'])->rev;

        $this->dismiss($this->reminderFor($task['id']), ['done' => true]);

        $stored = Task::findOrFail($task['id']);
        $this->assertSame('done', $stored->status);
        $this->assertNotNull($stored->completed_at);
        $this->assertGreaterThan($rev, $stored->rev);
    }

    public function test_tapping_the_notification_leaves_the_task_open(): void
    {
        $task = $this->pushTask();

        $this->dismiss($this->reminderFor($task['id']), ['done' => false]);

        $this->assertSame('todo', Task::findOrFail($task['id'])->status);
    }

    public function test_the_done_button_does_not_touch_a_finished_task(): void
    {
        $task = $this->pushTask(['status' => 'done', 'completed_at' => '2026-11-01T10:00:00.000Z']);
        $version = Task::findOrFail($task['id'])->version;

        $this->dismiss($this->reminderFor($task['id']), ['done' => true]);

        $this->assertSame($version, Task::findOrFail($task['id'])->version);
    }

    public function test_the_done_button_cannot_reach_a_task_in_another_space(): void
    {
        $foreign = $this->pushTask([], User::factory()->create());

        $this->dismiss($this->reminderFor($foreign['id']), ['done' => true]);

        $this->assertSame('todo', Task::findOrFail($foreign['id'])->status);
    }

    public function test_a_subtask_keeps_its_parent(): void
    {
        $parent = $this->pushTask(['title' => 'Remont łazienki']);
        $subtask = $this->pushTask(['title' => 'Kupić farbę', 'parent_id' => $parent['id']]);

        $this->assertSame('applied', $subtask['status']);
        $pulled = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->json('changes'))
            ->firstWhere('record.id', $subtask['id']);
        $this->assertSame($parent['id'], $pulled['record']['parent_id']);
    }

    public function test_a_subtask_cannot_have_subtasks(): void
    {
        $parent = $this->pushTask();
        $subtask = $this->pushTask(['parent_id' => $parent['id']]);

        $this->assertSame('rejected', $this->pushTask(['parent_id' => $subtask['id']])['status']);
    }

    public function test_a_subtask_needs_a_parent_from_its_own_space(): void
    {
        $foreign = $this->pushTask([], User::factory()->create());

        $this->assertSame('rejected', $this->pushTask(['parent_id' => $foreign['id']])['status']);
        $this->assertSame('rejected', $this->pushTask(['parent_id' => '019a0000-0000-7000-8000-000000000000'])['status']);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function update(string $taskId, array $payload): string
    {
        $task = Task::findOrFail($taskId);

        return $this->actingAs($this->user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'tasks',
            'record_id' => $taskId,
            'op' => 'update',
            'payload' => $payload,
            'base_version' => $task->version,
            'client_ts' => '2026-11-09T10:00:00.000Z',
        ]]])->assertOk()->json('results.0.status');
    }

    public function test_a_task_with_subtasks_cannot_become_a_subtask_or_its_own_parent(): void
    {
        $parent = $this->pushTask();
        $this->pushTask(['parent_id' => $parent['id']]);
        $other = $this->pushTask();

        $this->assertSame('rejected', $this->update($parent['id'], ['parent_id' => $other['id']]));
        $this->assertSame('rejected', $this->update($other['id'], ['parent_id' => $other['id']]));
        $this->assertSame('applied', $this->update($other['id'], ['parent_id' => $parent['id']]));
    }

    public function test_the_done_button_leaves_a_task_with_open_subtasks_for_the_app(): void
    {
        $task = $this->pushTask();
        $this->pushTask(['parent_id' => $task['id']]);
        $reminder = $this->reminderFor($task['id']);

        $this->actingAs($this->user)->postJson("/api/reminders/{$reminder}/dismiss", ['done' => true])
            ->assertStatus(409)
            ->assertExactJson(['task_id' => $task['id']]);

        $this->assertSame('todo', Task::findOrFail($task['id'])->status);
        $this->assertSame('sent', DB::table('reminders')->where('id', $reminder)->value('status'));
    }

    public function test_the_done_button_completes_a_task_whose_subtasks_are_finished(): void
    {
        $task = $this->pushTask();
        $this->pushTask(['parent_id' => $task['id'], 'status' => 'done', 'completed_at' => '2026-11-09T09:00:00.000Z']);
        $deleted = $this->pushTask(['parent_id' => $task['id']]);
        Task::findOrFail($deleted['id'])->delete();

        $this->dismiss($this->reminderFor($task['id']), ['done' => true]);

        $this->assertSame('done', Task::findOrFail($task['id'])->status);
    }

    public function test_the_open_subtasks_check_does_not_reveal_another_space(): void
    {
        $owner = User::factory()->create();
        $foreign = $this->pushTask([], $owner);
        $this->pushTask(['parent_id' => $foreign['id']], $owner);
        $reminder = $this->reminderFor($foreign['id'], $owner);

        // Without access the answer is 404, never the 409 that would confirm open subtasks.
        $this->actingAs($this->user)->postJson("/api/reminders/{$reminder}/dismiss", ['done' => true])
            ->assertNotFound();
    }

    public function test_a_repeating_task_is_stored_and_pulled(): void
    {
        $task = $this->pushTask([
            'due_date' => '2026-11-16',
            'rrule' => 'FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20271231',
            'repeat_from' => 'completion',
            'repeat_anchor' => '2026-11-16',
            'repeat_remaining' => 5,
        ]);
        $this->assertSame('applied', $task['status']);

        $record = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->json('changes'))
            ->firstWhere('record.id', $task['id'])['record'];
        $this->assertSame('FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20271231', $record['rrule']);
        $this->assertSame('completion', $record['repeat_from']);
        $this->assertSame('2026-11-16', $record['repeat_anchor']);
        $this->assertSame(5, $record['repeat_remaining']);
        $this->assertNull($record['recurring_task_id']);
    }

    public function test_a_task_from_an_older_app_counts_from_the_due_date(): void
    {
        $task = $this->pushTask();

        $this->assertSame('due', Task::findOrFail($task['id'])->repeat_from);
        $this->assertNull(Task::findOrFail($task['id'])->rrule);
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array{0: string, 1: string} The task's and its reminder's ids.
     */
    private function repeatingTaskWithReminder(array $fields = []): array
    {
        $task = $this->pushTask([
            'title' => 'Podlać kwiaty',
            'notes' => 'Także balkon',
            'priority' => 2,
            'due_date' => '2026-11-14',
            'due_time' => '18:00',
            'rrule' => 'FREQ=WEEKLY;BYDAY=SA',
            'repeat_anchor' => '2026-11-14',
            ...$fields,
        ]);

        return [$task['id'], $this->reminderFor($task['id'])];
    }

    public function test_the_done_button_moves_a_repeating_task_to_its_next_date(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-14 18:05', 'Europe/Warsaw'));
        [$taskId, $reminderId] = $this->repeatingTaskWithReminder(['repeat_remaining' => 3]);

        $this->dismiss($reminderId, ['done' => true]);

        $task = Task::findOrFail($taskId);
        $this->assertSame('todo', $task->status);
        $this->assertSame('2026-11-21', $task->due_date->format('Y-m-d'));
        $this->assertSame('2026-11-21', $task->repeat_anchor->format('Y-m-d'));
        $this->assertSame(2, $task->repeat_remaining);

        $copy = Task::where('recurring_task_id', $taskId)->sole();
        $this->assertSame('done', $copy->status);
        $this->assertSame('Podlać kwiaty', $copy->title);
        $this->assertSame('Także balkon', $copy->notes);
        $this->assertSame(2, $copy->priority);
        $this->assertSame('2026-11-14', $copy->due_date->format('Y-m-d'));
        $this->assertNull($copy->rrule);
        $this->assertNotNull($copy->completed_at);
        $this->assertSame($this->user->id, $copy->created_by);

        // 18:00 in Warsaw a week later, in UTC.
        $reminder = DB::table('reminders')->where('id', $reminderId)->first();
        $this->assertSame('scheduled', $reminder->status);
        $this->assertSame('2026-11-21 17:00:00', $reminder->remind_at);

        // Every device learns about both changes.
        $pulled = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->json('changes'))->pluck('record.id');
        $this->assertContains($copy->id, $pulled);
    }

    public function test_the_last_occurrence_completes_the_task(): void
    {
        [$taskId, $reminderId] = $this->repeatingTaskWithReminder(['repeat_remaining' => 1]);

        $this->dismiss($reminderId, ['done' => true]);

        $task = Task::findOrFail($taskId);
        $this->assertSame('done', $task->status);
        $this->assertSame('2026-11-14', $task->due_date->format('Y-m-d'));
        $this->assertSame(0, Task::whereNotNull('recurring_task_id')->count());
        $this->assertSame('dismissed', DB::table('reminders')->where('id', $reminderId)->value('status'));
    }

    public function test_the_done_button_reopens_the_subtasks_of_a_repeating_task(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-14 18:05', 'Europe/Warsaw'));
        [$taskId, $reminderId] = $this->repeatingTaskWithReminder();
        $dated = $this->pushTask(['parent_id' => $taskId, 'status' => 'done', 'due_date' => '2026-11-13', 'completed_at' => '2026-11-13T10:00:00.000Z']);
        $undated = $this->pushTask(['parent_id' => $taskId, 'status' => 'done', 'completed_at' => '2026-11-13T10:00:00.000Z']);

        $open = $this->pushTask(['parent_id' => $taskId]);

        // No question about the open one: it comes back open anyway.
        $this->dismiss($reminderId, ['done' => true]);

        $this->assertSame('todo', Task::findOrFail($open['id'])->status);
        $this->assertSame('todo', Task::findOrFail($dated['id'])->status);
        $this->assertNull(Task::findOrFail($dated['id'])->completed_at);
        // Moved by the same week as its parent.
        $this->assertSame('2026-11-20', Task::findOrFail($dated['id'])->due_date->format('Y-m-d'));
        $this->assertSame('todo', Task::findOrFail($undated['id'])->status);
        $this->assertNull(Task::findOrFail($undated['id'])->due_date);
    }

    public function test_an_overdue_repeating_task_comes_back_in_the_future(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-25 12:00', 'Europe/Warsaw'));
        [$taskId, $reminderId] = $this->repeatingTaskWithReminder();

        $this->dismiss($reminderId, ['done' => true]);

        $this->assertSame('2026-11-28', Task::findOrFail($taskId)->due_date->format('Y-m-d'));
    }

    public function test_the_digest_leaves_out_deleted_tasks(): void
    {
        $task = $this->pushTask(['due_date' => '2026-11-09']);
        Task::findOrFail($task['id'])->delete();

        $date = CarbonImmutable::parse('2026-11-09', 'Europe/Warsaw');

        $this->assertSame([], app(TodayTasksSection::class)->forUser($this->user, $date)['items']);
    }
}
