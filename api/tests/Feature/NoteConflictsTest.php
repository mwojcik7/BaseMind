<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\NoteFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Two devices change the same note without seeing each other's change: the text that loses
 * is kept as a separate note (decision 2026-11-20).
 */
class NoteConflictsTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = '01930000-0000-7000-8000-000000000001';

    private const LAPTOP = '01930000-0000-7000-8000-000000000002';

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:8080/');
        $this->user = User::factory()->create(['timezone' => 'Europe/Warsaw']);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function send(string $device, string $op, string $id, array $payload, int $base, string $at, string $entity = 'notes'): string
    {
        return $this->actingAs($this->user)->postJson('/api/sync/push', [
            'device_id' => $device,
            'ops' => [[
                'op_id' => (string) Str::uuid7(),
                'entity' => $entity,
                'record_id' => $id,
                'op' => $op,
                'payload' => $payload,
                'base_version' => $base,
                'client_ts' => $at,
            ]],
        ])->assertOk()->json('results.0.status');
    }

    /**
     * A note made on the phone at 9:00 UTC (10:00 in Warsaw), at version 1.
     *
     * @param  array<string, mixed>  $fields
     */
    private function note(array $fields = []): string
    {
        $id = (string) Str::uuid7();
        $this->send(self::PHONE, 'create', $id, [
            'id' => $id,
            'space_id' => $this->user->spaces()->first()->id,
            'folder_id' => null,
            'title' => 'Zakupy',
            'content' => 'mleko',
            'pinned' => false,
            'archived' => false,
            ...$fields,
        ], 0, '2026-11-20T09:00:00.000Z');

        return $id;
    }

    /** @return list<Note> */
    private function copies(string $original): array
    {
        return Note::where('id', '!=', $original)->orderBy('created_at')->get()->all();
    }

    public function test_the_older_text_is_kept_as_a_copy_when_the_newer_wins(): void
    {
        $id = $this->note();

        // Both devices start from version 1. The phone's change reaches the server first.
        $this->assertSame('applied', $this->send(self::PHONE, 'update', $id, ['content' => 'mleko, chleb'], 1, '2026-11-20T10:00:00.000Z'));
        $this->assertSame('merged', $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, masło'], 1, '2026-11-20T10:05:00.000Z'));

        $this->assertSame('mleko, masło', Note::find($id)->content);
        [$copy] = $this->copies($id);
        $this->assertSame('Zakupy (konflikt 20.11, 11:00)', $copy->title);
        $this->assertSame('mleko, chleb', $copy->content);
    }

    public function test_a_change_that_loses_goes_into_the_copy(): void
    {
        $id = $this->note();

        $this->send(self::PHONE, 'update', $id, ['content' => 'mleko, chleb'], 1, '2026-11-20T10:00:00.000Z');
        // Written earlier, sent later: the laptop was offline.
        $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, masło'], 1, '2026-11-20T09:30:00.000Z');

        $this->assertSame('mleko, chleb', Note::find($id)->content);
        [$copy] = $this->copies($id);
        $this->assertSame('Zakupy (konflikt 20.11, 10:30)', $copy->title);
        $this->assertSame('mleko, masło', $copy->content);
    }

    public function test_the_copy_is_a_new_note_in_the_same_folder_that_devices_receive(): void
    {
        $folder = (string) Str::uuid7();
        $this->send(self::PHONE, 'create', $folder, [
            'id' => $folder,
            'space_id' => $this->user->spaces()->first()->id,
            'name' => 'Dom',
        ], 0, '2026-11-20T09:00:00.000Z', 'note_folders');
        $id = $this->note(['folder_id' => $folder, 'pinned' => true, 'archived' => true]);

        $this->send(self::PHONE, 'update', $id, ['content' => 'a'], 1, '2026-11-20T10:00:00.000Z');
        $this->send(self::LAPTOP, 'update', $id, ['content' => 'b'], 1, '2026-11-20T10:05:00.000Z');

        [$copy] = $this->copies($id);
        $this->assertSame($folder, $copy->folder_id);
        $this->assertFalse($copy->pinned);
        $this->assertFalse($copy->archived);
        $this->assertSame($this->user->id, $copy->created_by);
        $this->assertNotNull(NoteFolder::find($folder));

        $pulled = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->json('changes'))
            ->firstWhere('record.id', $copy->id);
        $this->assertSame('notes', $pulled['entity']);
        $this->assertSame('Zakupy (konflikt 20.11, 11:00)', $pulled['record']['title']);
        $this->assertSame('a', $pulled['record']['content']);
        $this->assertArrayNotHasKey('text_device', $pulled['record']);
    }

    public function test_a_device_typing_on_before_it_receives_its_own_change_makes_no_copy(): void
    {
        $id = $this->note();

        $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, masło'], 1, '2026-11-20T10:00:00.000Z');
        // Still on version 1 locally: the answer to the previous save has not come back yet.
        $this->assertSame('merged', $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, masło, jajka'], 1, '2026-11-20T10:00:01.000Z'));

        $this->assertSame('mleko, masło, jajka', Note::find($id)->content);
        $this->assertSame([], $this->copies($id));
    }

    public function test_other_changes_on_another_device_make_no_copy(): void
    {
        $id = $this->note();

        $this->send(self::PHONE, 'update', $id, ['pinned' => true], 1, '2026-11-20T10:00:00.000Z');
        $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, masło'], 1, '2026-11-20T10:05:00.000Z');

        $note = Note::find($id);
        $this->assertTrue($note->pinned);
        $this->assertSame('mleko, masło', $note->content);
        $this->assertSame([], $this->copies($id));
    }

    public function test_the_same_text_on_both_devices_makes_no_copy(): void
    {
        $id = $this->note();

        $this->send(self::PHONE, 'update', $id, ['content' => 'mleko, chleb'], 1, '2026-11-20T10:00:00.000Z');
        $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, chleb'], 1, '2026-11-20T10:05:00.000Z');

        $this->assertSame([], $this->copies($id));
    }

    public function test_titles_changed_on_both_devices_make_a_copy_too(): void
    {
        $id = $this->note();

        $this->send(self::PHONE, 'update', $id, ['title' => 'Sklep'], 1, '2026-11-20T10:00:00.000Z');
        $this->send(self::LAPTOP, 'update', $id, ['title' => 'Lista zakupów'], 1, '2026-11-20T10:05:00.000Z');

        $this->assertSame('Lista zakupów', Note::find($id)->title);
        [$copy] = $this->copies($id);
        $this->assertSame('Sklep (konflikt 20.11, 11:00)', $copy->title);
        $this->assertSame('mleko', $copy->content);
    }

    public function test_a_copy_of_a_note_without_a_title_is_named_after_its_first_line(): void
    {
        $id = $this->note(['title' => null, 'content' => '# Zakupy']);

        $this->send(self::PHONE, 'update', $id, ['content' => "\n- [ ] **Mleko** do kawy\nchleb"], 1, '2026-11-20T10:00:00.000Z');
        $this->send(self::LAPTOP, 'update', $id, ['content' => '# Zakupy na weekend'], 1, '2026-11-20T10:05:00.000Z');

        [$copy] = $this->copies($id);
        $this->assertSame('Mleko do kawy (konflikt 20.11, 11:00)', $copy->title);
    }

    public function test_text_written_on_a_note_deleted_elsewhere_is_kept_as_a_copy(): void
    {
        $id = $this->note();

        $this->send(self::PHONE, 'delete', $id, [], 1, '2026-11-20T10:00:00.000Z');
        $this->assertSame('merged', $this->send(self::LAPTOP, 'update', $id, ['content' => 'mleko, masło'], 1, '2026-11-20T10:05:00.000Z'));

        $this->assertNotNull(Note::withTrashed()->find($id)->deleted_at);
        [$copy] = $this->copies($id);
        $this->assertSame('Zakupy (konflikt 20.11, 11:05)', $copy->title);
        $this->assertSame('mleko, masło', $copy->content);
    }

    public function test_other_changes_to_a_note_deleted_elsewhere_are_still_rejected(): void
    {
        $id = $this->note();

        $this->send(self::PHONE, 'delete', $id, [], 1, '2026-11-20T10:00:00.000Z');
        $this->assertSame('rejected', $this->send(self::LAPTOP, 'update', $id, ['pinned' => true], 1, '2026-11-20T10:05:00.000Z'));

        $this->assertSame([], $this->copies($id));
    }
}
