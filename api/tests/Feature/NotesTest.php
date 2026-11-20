<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\NoteFolder;
use App\Models\User;
use App\Services\Trash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NotesTest extends TestCase
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
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed> The result of the operation.
     */
    private function op(User $user, string $op, string $entity, string $id, array $payload = []): array
    {
        return $this->actingAs($user)->postJson('/api/sync/push', ['ops' => [[
            'op_id' => (string) Str::uuid7(),
            'entity' => $entity,
            'record_id' => $id,
            'op' => $op,
            'payload' => $payload,
            'base_version' => 0,
            'client_ts' => '2026-11-20T09:00:00.000Z',
        ]]])->assertOk()->json('results.0');
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed> The result of the operation, with the record's id.
     */
    private function push(string $entity, array $fields, ?User $user = null): array
    {
        $user ??= $this->user;
        $id = (string) Str::uuid7();
        $result = $this->op($user, 'create', $entity, $id, [
            'id' => $id,
            'space_id' => $user->spaces()->first()->id,
            ...$fields,
        ]);

        return [...$result, 'id' => $id];
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    private function pushNote(array $fields = [], ?User $user = null): array
    {
        return $this->push('notes', [
            'folder_id' => null,
            'title' => 'Pomysły',
            'content' => '# Pomysły',
            'pinned' => false,
            'archived' => false,
            ...$fields,
        ], $user);
    }

    public function test_a_note_is_stored_encrypted_and_pulled_as_sent(): void
    {
        $folder = $this->push('note_folders', ['name' => 'Dom']);
        $note = $this->pushNote([
            'folder_id' => $folder['id'],
            'title' => 'Tajny plan',
            'content' => "Tajna **treść**\n- [ ] zadanie",
            'pinned' => true,
        ]);
        $this->assertSame('applied', $note['status']);

        $row = DB::table('notes')->where('id', $note['id'])->first();
        foreach (['title', 'content'] as $field) {
            $this->assertStringStartsWith('bm1:', $row->{$field});
            $this->assertStringNotContainsString('Tajn', $row->{$field});
        }

        $changes = collect($this->actingAs($this->user)->getJson('/api/sync/pull')->assertOk()->json('changes'));
        $record = $changes->firstWhere('entity', 'notes')['record'];
        $this->assertSame($folder['id'], $record['folder_id']);
        $this->assertSame('Tajny plan', $record['title']);
        $this->assertSame("Tajna **treść**\n- [ ] zadanie", $record['content']);
        $this->assertTrue($record['pinned']);
        $this->assertFalse($record['archived']);
        $this->assertSame('Dom', $changes->firstWhere('entity', 'note_folders')['record']['name']);
    }

    public function test_a_note_may_have_no_title_and_no_content(): void
    {
        $note = $this->pushNote(['title' => null, 'content' => null]);

        $this->assertSame('applied', $note['status']);
        $this->assertNull(Note::findOrFail($note['id'])->title);
    }

    public function test_a_long_note_fits(): void
    {
        // Four-byte characters are the worst case for the stored size.
        $note = $this->pushNote(['content' => str_repeat('😀', Note::MAX_CONTENT)]);

        $this->assertSame('applied', $note['status']);
        $this->assertSame(Note::MAX_CONTENT, mb_strlen(Note::findOrFail($note['id'])->content));
    }

    public function test_another_user_does_not_receive_the_note(): void
    {
        $this->pushNote();

        $this->actingAs(User::factory()->create())->getJson('/api/sync/pull')
            ->assertOk()->assertJsonPath('changes', []);
    }

    public function test_a_note_cannot_use_a_folder_from_another_space(): void
    {
        $foreign = $this->push('note_folders', ['name' => 'Cudzy'], User::factory()->create());

        $this->assertSame('rejected', $this->pushNote(['folder_id' => $foreign['id']])['status']);
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    #[DataProvider('invalidNotes')]
    public function test_an_invalid_note_is_rejected(array $fields): void
    {
        $this->assertSame('rejected', $this->pushNote($fields)['status']);
        $this->assertSame(0, Note::count());
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function invalidNotes(): array
    {
        return [
            'title too long' => [['title' => str_repeat('a', 501)]],
            'content too long' => [['content' => str_repeat('a', Note::MAX_CONTENT + 1)]],
            'no pinned flag' => [['pinned' => null]],
            'archived not a flag' => [['archived' => 'tak']],
            'folder not an id' => [['folder_id' => 'dom']],
        ];
    }

    public function test_a_folder_needs_a_name(): void
    {
        $this->assertSame('rejected', $this->push('note_folders', ['name' => ''])['status']);
        $this->assertSame(0, NoteFolder::count());
    }

    public function test_removing_a_folder_leaves_its_notes_in_the_inbox(): void
    {
        $folder = $this->push('note_folders', ['name' => 'Dom']);
        $note = $this->pushNote(['folder_id' => $folder['id']]);
        $this->assertSame('applied', $this->op($this->user, 'delete', 'note_folders', $folder['id'])['status']);
        // Until then the note keeps its folder, so restoring the folder brings the note back to it.
        $this->assertSame($folder['id'], Note::findOrFail($note['id'])->folder_id);

        $this->assertSame('applied', $this->op($this->user, 'purge', 'note_folders', $folder['id'])['status']);

        $this->assertNull(NoteFolder::withTrashed()->find($folder['id']));
        $this->assertNull(Note::findOrFail($note['id'])->folder_id);
        $this->actingAs($this->user)->getJson('/api/sync/pull')
            ->assertJsonFragment(['id' => $note['id'], 'folder_id' => null]);
    }

    public function test_a_note_in_the_trash_is_removed_after_30_days(): void
    {
        $note = $this->pushNote();
        $this->op($this->user, 'delete', 'notes', $note['id']);
        Note::withTrashed()->whereKey($note['id'])->update(['deleted_at' => now()->subDays(31)]);

        $this->assertSame(1, app(Trash::class)->emptyExpired());
        $this->assertNull(Note::withTrashed()->find($note['id']));
    }
}
