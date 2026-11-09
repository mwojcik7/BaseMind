<?php

namespace Tests\Feature;

use App\Casts\SodiumEncrypted;
use App\Enums\SpaceRole;
use App\Enums\SpaceType;
use App\Models\Concerns\Syncable;
use App\Models\Space;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SyncItemFixture extends Model
{
    use Syncable;

    protected $table = 'sync_item_fixtures';

    protected function casts(): array
    {
        return ['secret' => SodiumEncrypted::class];
    }

    public function syncRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:50'],
            'note' => ['nullable', 'string'],
            'secret' => ['nullable', 'string'],
        ];
    }
}

/**
 * DatabaseMigrations, because creating the fixture table would end RefreshDatabase's transaction.
 */
class SyncTest extends TestCase
{
    use DatabaseMigrations;

    private User $user;

    private string $spaceId;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('sync_item_fixtures', function (Blueprint $table) {
            $table->syncable();
            $table->string('title');
            $table->text('note')->nullable();
            $table->text('secret')->nullable();
        });

        config(['sync.entities' => ['items' => SyncItemFixture::class]]);

        $this->user = User::factory()->create();
        $this->spaceId = $this->user->spaces()->first()->id;
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('sync_item_fixtures');

        parent::tearDown();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function op(string $op, string $recordId, array $payload, int $baseVersion, array $overrides = []): array
    {
        return [
            'op_id' => (string) Str::uuid7(),
            'entity' => 'items',
            'record_id' => $recordId,
            'op' => $op,
            'payload' => $payload,
            'base_version' => $baseVersion,
            'client_ts' => '2026-11-09T10:00:00.000Z',
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    private function createOp(string $recordId, array $fields = [], ?string $spaceId = null): array
    {
        return $this->op('create', $recordId, [
            'id' => $recordId,
            'space_id' => $spaceId ?? $this->spaceId,
            'created_by' => 999,
            'rev' => null,
            'version' => 1,
            'title' => 'Mleko',
            ...$fields,
        ], 0);
    }

    /**
     * @param  list<array<string, mixed>>  $ops
     */
    private function push(array $ops, ?User $as = null): TestResponse
    {
        return $this->actingAs($as ?? $this->user)->postJson('/api/sync/push', ['ops' => $ops]);
    }

    /**
     * @return array<string, mixed>
     */
    private function assertStatus(TestResponse $response, string $status, int $index = 0): array
    {
        $response->assertOk();
        $result = $response->json("results.{$index}");
        $this->assertSame($status, $result['status'], json_encode($result));

        return $result;
    }

    private function createItem(string $id, string $title = 'Mleko'): void
    {
        $this->assertStatus($this->push([$this->createOp($id, ['title' => $title])]), 'applied');
    }

    private function item(string $id): SyncItemFixture
    {
        return SyncItemFixture::withTrashed()->findOrFail($id);
    }

    public function test_requires_a_session(): void
    {
        $this->postJson('/api/sync/push', ['ops' => []])->assertUnauthorized();
        $this->getJson('/api/sync/pull')->assertUnauthorized();
    }

    public function test_creates_a_record_with_server_controlled_fields(): void
    {
        $id = (string) Str::uuid7();

        $this->createItem($id);

        $item = $this->item($id);
        $this->assertSame('Mleko', $item->title);
        $this->assertSame($this->user->id, $item->created_by);
        $this->assertSame(1, $item->version);
        $this->assertGreaterThan(0, $item->rev);
        $this->assertSame('2026-11-09 10:00:00', $item->created_at->format('Y-m-d H:i:s'));
    }

    public function test_keeps_text_exactly_as_sent(): void
    {
        $id = (string) Str::uuid7();

        $this->createItem($id, '  spacje  ');
        $this->assertStatus($this->push([$this->op('update', $id, ['note' => ''], 1)]), 'applied');

        $this->assertSame('  spacje  ', $this->item($id)->title);
        $this->assertSame('', $this->item($id)->note);
    }

    public function test_a_repeated_batch_changes_nothing(): void
    {
        $id = (string) Str::uuid7();
        $batch = [$this->createOp($id), $this->op('update', $id, ['title' => 'Chleb'], 1)];

        $this->push($batch)->assertOk();
        $rev = $this->item($id)->rev;
        $response = $this->push($batch);

        $this->assertStatus($response, 'applied');
        $this->assertStatus($response, 'applied', 1);
        $this->assertSame(2, $this->item($id)->version);
        $this->assertSame($rev, $this->item($id)->rev);
    }

    public function test_updates_only_the_sent_fields(): void
    {
        $id = (string) Str::uuid7();
        $this->assertStatus($this->push([$this->createOp($id, ['note' => 'Notatka'])]), 'applied');

        $this->assertStatus($this->push([$this->op('update', $id, ['title' => 'Chleb'], 1)]), 'applied');

        $item = $this->item($id);
        $this->assertSame('Chleb', $item->title);
        $this->assertSame('Notatka', $item->note);
        $this->assertSame(2, $item->version);
    }

    public function test_a_conflict_keeps_changes_to_different_fields(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);
        $this->push([$this->op('update', $id, ['title' => 'Z telefonu'], 1, ['client_ts' => '2026-11-09T11:00:00.000Z'])])->assertOk();

        $response = $this->push([$this->op('update', $id, ['note' => 'Z komputera'], 1, ['client_ts' => '2026-11-09T10:30:00.000Z'])]);

        $this->assertStatus($response, 'merged');
        $this->assertSame('Z telefonu', $this->item($id)->title);
        $this->assertSame('Z komputera', $this->item($id)->note);
    }

    public function test_a_conflict_on_one_field_is_won_by_the_later_change(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);
        $this->push([$this->op('update', $id, ['title' => 'Późniejsza'], 1, ['client_ts' => '2026-11-09T12:00:00.000Z'])])->assertOk();
        $rev = $this->item($id)->rev;

        $older = $this->push([$this->op('update', $id, ['title' => 'Wcześniejsza'], 1, ['client_ts' => '2026-11-09T11:00:00.000Z'])]);

        $this->assertStatus($older, 'merged');
        $this->assertSame('Późniejsza', $this->item($id)->title);
        $this->assertGreaterThan($rev, $this->item($id)->rev, 'The losing device must pull the winning value.');

        $newer = $this->push([$this->op('update', $id, ['title' => 'Najnowsza'], 1, ['client_ts' => '2026-11-09T13:00:00.000Z'])]);

        $this->assertStatus($newer, 'merged');
        $this->assertSame('Najnowsza', $this->item($id)->title);
    }

    public function test_a_clock_in_the_future_cannot_block_later_changes(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);
        $this->push([$this->op('update', $id, ['title' => 'Z przyszłości'], 1, ['client_ts' => '2099-01-01T00:00:00.000Z'])])->assertOk();

        $this->assertLessThanOrEqual(now()->addMinute(), $this->item($id)->updated_at);

        $this->travel(1)->minute();
        $this->push([$this->op('update', $id, ['title' => 'Teraz'], 1, ['client_ts' => now()->toISOString()])])->assertOk();

        $this->assertSame('Teraz', $this->item($id)->title);
    }

    public function test_deletes_as_a_tombstone_and_rejects_later_edits(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);

        $this->assertStatus($this->push([$this->op('delete', $id, [], 1)]), 'applied');
        $this->assertNotNull($this->item($id)->deleted_at);

        $this->assertSame('deleted', $this->assertStatus($this->push([$this->op('update', $id, ['title' => 'X'], 2)]), 'rejected')['reason']);
        $this->assertStatus($this->push([$this->op('delete', $id, [], 2)]), 'applied');
        $this->assertSame(2, $this->item($id)->version);
    }

    public function test_one_rejected_change_does_not_block_the_others(): void
    {
        $bad = (string) Str::uuid7();
        $good = (string) Str::uuid7();

        $response = $this->push([$this->createOp($bad, ['title' => str_repeat('x', 51)]), $this->createOp($good)]);

        $this->assertSame('invalid', $this->assertStatus($response, 'rejected')['reason']);
        $this->assertStatus($response, 'applied', 1);
        $this->assertNull(SyncItemFixture::withTrashed()->find($bad));
        $this->assertNotNull(SyncItemFixture::find($good));
    }

    public function test_a_rejected_operation_is_not_remembered_as_applied(): void
    {
        $op = $this->createOp((string) Str::uuid7(), ['title' => str_repeat('x', 51)]);

        $this->assertStatus($this->push([$op]), 'rejected');

        $this->assertSame(0, DB::table('sync_ops')->where('op_id', $op['op_id'])->count());
    }

    public function test_rejects_unknown_entities_and_fields(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);

        $this->assertSame('unknown_entity', $this->assertStatus($this->push([$this->op('update', $id, ['title' => 'X'], 1, ['entity' => 'users'])]), 'rejected')['reason']);
        $this->assertSame('unknown_field', $this->assertStatus($this->push([$this->op('update', $id, ['field_stamps' => '[]'], 1)]), 'rejected')['reason']);
        $this->assertSame('unknown_field', $this->assertStatus($this->push([$this->op('update', $id, ['space_id' => $this->spaceId], 1)]), 'rejected')['reason']);
    }

    public function test_refuses_a_malformed_batch(): void
    {
        $this->push([['op_id' => 'nope']])->assertUnprocessable();
        $this->push(array_fill(0, 101, $this->createOp((string) Str::uuid7())))->assertUnprocessable();
    }

    public function test_a_user_cannot_touch_another_users_data(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);
        $stranger = User::factory()->create();

        $intoForeignSpace = $this->push([$this->createOp((string) Str::uuid7(), [], $this->spaceId)], $stranger);
        $update = $this->push([$this->op('update', $id, ['title' => 'Cudze'], 1)], $stranger);
        $delete = $this->push([$this->op('delete', $id, [], 1)], $stranger);
        $overwrite = $this->push([$this->createOp($id, ['title' => 'Cudze'], $stranger->spaces()->first()->id)], $stranger);

        $this->assertSame('not_found', $this->assertStatus($intoForeignSpace, 'rejected')['reason']);
        $this->assertSame('not_found', $this->assertStatus($update, 'rejected')['reason']);
        $this->assertSame('not_found', $this->assertStatus($delete, 'rejected')['reason']);
        $this->assertSame('already_exists', $this->assertStatus($overwrite, 'rejected')['reason']);
        $this->assertSame('Mleko', $this->item($id)->title);
        $this->assertNull($this->item($id)->deleted_at);
        $this->actingAs($stranger)->getJson('/api/sync/pull')->assertJsonPath('changes', []);
    }

    public function test_a_viewer_can_read_but_not_write(): void
    {
        $id = (string) Str::uuid7();
        $this->createItem($id);
        $viewer = User::factory()->create();
        Space::findOrFail($this->spaceId)->members()->attach($viewer->id, ['role' => SpaceRole::Viewer->value]);

        $this->assertSame('forbidden', $this->assertStatus($this->push([$this->op('update', $id, ['title' => 'X'], 1)], $viewer), 'rejected')['reason']);
        $this->actingAs($viewer)->getJson('/api/sync/pull')->assertJsonCount(1, 'changes');
    }

    public function test_an_editor_of_a_shared_space_can_write(): void
    {
        $space = Space::create(['name' => 'Dom', 'type' => SpaceType::Shared, 'owner_id' => $this->user->id]);
        $space->members()->attach($this->user->id, ['role' => SpaceRole::Owner->value]);
        $editor = User::factory()->create();
        $space->members()->attach($editor->id, ['role' => SpaceRole::Editor->value]);

        $this->assertStatus($this->push([$this->createOp((string) Str::uuid7(), [], $space->id)], $editor), 'applied');
    }

    public function test_pull_returns_changes_after_the_cursor_with_tombstones(): void
    {
        $kept = (string) Str::uuid7();
        $removed = (string) Str::uuid7();
        $this->createItem($kept);
        $this->createItem($removed);
        $cursor = $this->item($removed)->rev;
        $this->push([$this->op('delete', $removed, [], 1)])->assertOk();

        $response = $this->actingAs($this->user)->getJson("/api/sync/pull?cursor={$cursor}")->assertOk();

        $response->assertJsonCount(1, 'changes')
            ->assertJsonPath('changes.0.entity', 'items')
            ->assertJsonPath('changes.0.record.id', $removed)
            ->assertJsonPath('cursor', $this->item($removed)->rev)
            ->assertJsonPath('has_more', false);
        $this->assertNotNull($response->json('changes.0.record.deleted_at'));
        $this->assertArrayNotHasKey('field_stamps', $response->json('changes.0.record'));
    }

    public function test_pull_pages_through_changes_without_gaps(): void
    {
        $ids = [];
        foreach (range(1, 5) as $number) {
            $ids[] = $id = (string) Str::uuid7();
            $this->createItem($id, "Pozycja {$number}");
        }

        $seen = [];
        $cursor = 0;
        do {
            $page = $this->actingAs($this->user)->getJson("/api/sync/pull?cursor={$cursor}&limit=2")->assertOk()->json();
            array_push($seen, ...array_column(array_column($page['changes'], 'record'), 'id'));
            $cursor = $page['cursor'];
        } while ($page['has_more']);

        $this->assertSame($ids, $seen);
    }

    public function test_pull_keeps_the_cursor_when_nothing_changed(): void
    {
        $this->actingAs($this->user)->getJson('/api/sync/pull?cursor=42')
            ->assertOk()
            ->assertJson(['changes' => [], 'cursor' => 42, 'has_more' => false]);
    }

    public function test_sensitive_fields_are_encrypted_at_rest_and_plain_for_the_owner(): void
    {
        $id = (string) Str::uuid7();

        $this->assertStatus($this->push([$this->createOp($id, ['secret' => 'PIN 1234'])]), 'applied');

        $stored = DB::table('sync_item_fixtures')->where('id', $id)->value('secret');
        $this->assertStringStartsWith('bm1:', $stored);
        $this->assertStringNotContainsString('1234', $stored);
        $this->actingAs($this->user)->getJson('/api/sync/pull')->assertJsonPath('changes.0.record.secret', 'PIN 1234');
    }

    public function test_settings_are_saved_and_returned_by_pull(): void
    {
        $this->actingAs($this->user)->getJson('/api/sync/pull')->assertJsonPath('settings.theme', null);

        $this->actingAs($this->user)->postJson('/api/settings', ['theme' => 'dark'])->assertNoContent();

        $this->actingAs($this->user)->getJson('/api/sync/pull')->assertJsonPath('settings.theme', 'dark');
        $this->actingAs($this->user)->postJson('/api/settings', ['theme' => 'pink'])->assertUnprocessable();
    }
}
