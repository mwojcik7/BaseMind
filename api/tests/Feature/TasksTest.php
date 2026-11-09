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

    public function test_the_digest_leaves_out_deleted_tasks(): void
    {
        $task = $this->pushTask(['due_date' => '2026-11-09']);
        Task::findOrFail($task['id'])->delete();

        $date = CarbonImmutable::parse('2026-11-09', 'Europe/Warsaw');

        $this->assertSame([], app(TodayTasksSection::class)->forUser($this->user, $date)['items']);
    }
}
