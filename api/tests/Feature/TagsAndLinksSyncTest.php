<?php

namespace Tests\Feature;

use App\Models\EntityLink;
use App\Models\EntityTag;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Tags are also what gets tagged and linked here: until the first module exists,
 * they are the only synchronised records.
 */
class TagsAndLinksSyncTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private string $spaceId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->spaceId = $this->user->spaces()->first()->id;
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    private function create(string $entity, array $fields, ?string $spaceId = null): array
    {
        $id = (string) Str::uuid7();

        return [
            'op_id' => (string) Str::uuid7(),
            'entity' => $entity,
            'record_id' => $id,
            'op' => 'create',
            'payload' => ['id' => $id, 'space_id' => $spaceId ?? $this->spaceId, ...$fields],
            'base_version' => 0,
            'client_ts' => '2026-11-09T10:00:00.000Z',
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $ops
     */
    private function push(array $ops, ?User $as = null): TestResponse
    {
        return $this->actingAs($as ?? $this->user)->postJson('/api/sync/push', ['ops' => $ops])->assertOk();
    }

    private function createTag(?User $owner = null, ?string $spaceId = null): string
    {
        $op = $this->create('tags', ['name' => 'Dom'], $spaceId);
        $this->push([$op], $owner)->assertJsonPath('results.0.status', 'applied');

        return $op['record_id'];
    }

    /**
     * @return array<string, string>
     */
    private function tagging(string $entityId, string $tagId): array
    {
        return ['entity_type' => 'tags', 'entity_id' => $entityId, 'tag_id' => $tagId];
    }

    /**
     * @return array<string, string>
     */
    private function link(string $sourceId, string $targetId): array
    {
        return [
            'source_type' => 'tags',
            'source_id' => $sourceId,
            'target_type' => 'tags',
            'target_id' => $targetId,
            'origin' => 'manual',
        ];
    }

    public function test_tags_travel_between_devices(): void
    {
        $id = $this->createTag();

        $this->actingAs($this->user)->getJson('/api/sync/pull')
            ->assertJsonPath('changes.0.entity', 'tags')
            ->assertJsonPath('changes.0.record.id', $id)
            ->assertJsonPath('changes.0.record.name', 'Dom');
    }

    public function test_validates_tag_fields(): void
    {
        $this->push([$this->create('tags', ['name' => str_repeat('x', 65)])])
            ->assertJsonPath('results.0.reason', 'invalid');
    }

    public function test_a_tag_and_its_use_can_arrive_in_one_batch(): void
    {
        $tag = $this->create('tags', ['name' => 'Dom']);
        $use = $this->create('entity_tags', $this->tagging($tag['record_id'], $tag['record_id']));

        $this->push([$tag, $use])
            ->assertJsonPath('results.0.status', 'applied')
            ->assertJsonPath('results.1.status', 'applied');

        $this->assertSame($tag['record_id'], EntityTag::findOrFail($use['record_id'])->tag_id);
    }

    public function test_a_record_can_only_use_tags_from_its_space(): void
    {
        $stranger = User::factory()->create();
        $foreignTag = $this->createTag($stranger, $stranger->spaces()->first()->id);
        $ownTag = $this->createTag();

        $this->push([$this->create('entity_tags', $this->tagging($ownTag, $foreignTag))])
            ->assertJsonPath('results.0.status', 'rejected')
            ->assertJsonPath('results.0.reason', 'invalid');
        $this->assertSame(0, EntityTag::count());
    }

    public function test_cannot_tag_a_record_of_another_space(): void
    {
        $stranger = User::factory()->create();
        $foreignRecord = $this->createTag($stranger, $stranger->spaces()->first()->id);
        $ownTag = $this->createTag();

        $this->push([$this->create('entity_tags', $this->tagging($foreignRecord, $ownTag))])
            ->assertJsonPath('results.0.reason', 'invalid');
    }

    public function test_refuses_unknown_record_types_and_missing_records(): void
    {
        $ownTag = $this->createTag();

        $this->push([
            $this->create('entity_tags', [...$this->tagging($ownTag, $ownTag), 'entity_type' => 'users']),
            $this->create('entity_tags', $this->tagging((string) Str::uuid7(), $ownTag)),
        ])
            ->assertJsonPath('results.0.reason', 'invalid')
            ->assertJsonPath('results.1.reason', 'invalid');
    }

    public function test_a_tag_deleted_elsewhere_can_still_be_used_by_an_offline_device(): void
    {
        $tag = $this->createTag();
        $this->push([[
            'op_id' => (string) Str::uuid7(),
            'entity' => 'tags',
            'record_id' => $tag,
            'op' => 'delete',
            'payload' => [],
            'base_version' => 1,
            'client_ts' => '2026-11-09T11:00:00.000Z',
        ]]);

        $this->push([$this->create('entity_tags', $this->tagging($tag, $tag))])
            ->assertJsonPath('results.0.status', 'applied');
    }

    public function test_links_require_a_source_in_the_same_space(): void
    {
        $own = $this->createTag();
        $stranger = User::factory()->create();
        $foreign = $this->createTag($stranger, $stranger->spaces()->first()->id);

        $this->push([$this->create('entity_links', $this->link($foreign, $own))])
            ->assertJsonPath('results.0.reason', 'invalid');

        $this->assertSame(0, EntityLink::count());
    }

    public function test_links_can_point_to_a_record_in_another_space(): void
    {
        $source = $this->createTag();
        $target = (string) Str::uuid7();

        $this->push([$this->create('entity_links', $this->link($source, $target))])
            ->assertJsonPath('results.0.status', 'applied');
    }

    public function test_links_validate_their_origin(): void
    {
        $source = $this->createTag();

        $this->push([$this->create('entity_links', [...$this->link($source, $source), 'origin' => 'magic'])])
            ->assertJsonPath('results.0.reason', 'invalid');
    }

    public function test_another_user_never_receives_tags_or_links(): void
    {
        $tag = $this->createTag();
        $this->push([$this->create('entity_tags', $this->tagging($tag, $tag))]);
        $this->push([$this->create('entity_links', $this->link($tag, $tag))]);
        $this->assertSame(1, Tag::count());

        $this->actingAs(User::factory()->create())->getJson('/api/sync/pull')->assertJsonPath('changes', []);
    }
}
