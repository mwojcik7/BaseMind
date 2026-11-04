<?php

namespace Tests\Feature;

use App\Enums\SpaceRole;
use App\Enums\SpaceType;
use App\Models\Concerns\BelongsToSpace;
use App\Models\Space;
use App\Models\User;
use App\Policies\SpaceItemPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SpaceItemFixture extends Model
{
    use BelongsToSpace;

    protected $table = 'space_item_fixtures';

    protected $guarded = [];
}

/**
 * "User A does not see the data of user B" (projekt.md, section 8.3).
 * DatabaseMigrations, because creating the fixture table would end RefreshDatabase's transaction.
 */
class SpaceAccessTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('space_item_fixtures', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('space_id');
            $table->string('title');
            $table->timestamps();
        });

        Gate::policy(SpaceItemFixture::class, SpaceItemPolicy::class);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('space_item_fixtures');

        parent::tearDown();
    }

    private function personalSpaceOf(User $user): Space
    {
        return $user->spaces()->where('type', SpaceType::Personal)->sole();
    }

    private function sharedSpace(User $owner): Space
    {
        $space = Space::create(['name' => 'Dom', 'type' => SpaceType::Shared, 'owner_id' => $owner->id]);
        $space->members()->attach($owner->id, ['role' => SpaceRole::Owner->value]);

        return $space;
    }

    public function test_a_user_cannot_see_another_users_space(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $this->actingAs($alice)
            ->getJson('/api/spaces/'.$this->personalSpaceOf($bob)->id)
            ->assertNotFound();

        $this->actingAs($alice)
            ->getJson('/api/spaces/'.$this->personalSpaceOf($alice)->id)
            ->assertOk()
            ->assertJsonPath('role', 'owner');
    }

    public function test_me_lists_only_own_spaces(): void
    {
        $alice = User::factory()->create();
        User::factory()->create();

        $this->actingAs($alice)->getJson('/api/me')
            ->assertJsonCount(1, 'spaces')
            ->assertJsonPath('spaces.0.id', $this->personalSpaceOf($alice)->id);
    }

    public function test_guests_cannot_see_any_space(): void
    {
        $space = $this->personalSpaceOf(User::factory()->create());

        $this->getJson("/api/spaces/{$space->id}")->assertUnauthorized();
    }

    public function test_records_are_scoped_to_the_users_spaces(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $own = SpaceItemFixture::create(['space_id' => $this->personalSpaceOf($alice)->id, 'title' => 'A']);
        SpaceItemFixture::create(['space_id' => $this->personalSpaceOf($bob)->id, 'title' => 'B']);

        $visible = SpaceItemFixture::query()->visibleTo($alice)->pluck('id')->all();

        $this->assertSame([$own->id], $visible);
    }

    public function test_the_item_policy_hides_records_from_non_members(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $item = SpaceItemFixture::create(['space_id' => $this->personalSpaceOf($bob)->id, 'title' => 'B']);

        foreach (['view', 'update', 'delete'] as $ability) {
            $response = Gate::forUser($alice)->inspect($ability, $item);

            $this->assertTrue($response->denied());
            $this->assertSame(404, $response->status());
        }
    }

    public function test_the_item_policy_follows_the_role(): void
    {
        $owner = User::factory()->create();
        $space = $this->sharedSpace($owner);
        $item = SpaceItemFixture::create(['space_id' => $space->id, 'title' => 'Wspólne']);

        $editor = User::factory()->create();
        $viewer = User::factory()->create();
        $space->members()->attach($editor->id, ['role' => SpaceRole::Editor->value]);
        $space->members()->attach($viewer->id, ['role' => SpaceRole::Viewer->value]);

        $can = fn (User $user, string $ability) => Gate::forUser($user)->allows($ability, $item);

        $this->assertTrue($can($owner, 'update'));
        $this->assertTrue($can($editor, 'update'));
        $this->assertTrue($can($editor, 'delete'));
        $this->assertTrue($can($viewer, 'view'));
        $this->assertFalse($can($viewer, 'update'));
        $this->assertFalse($can($viewer, 'delete'));
    }

    public function test_only_the_owner_manages_a_space_and_a_personal_one_cannot_be_deleted(): void
    {
        $owner = User::factory()->create();
        $shared = $this->sharedSpace($owner);
        $editor = User::factory()->create();
        $shared->members()->attach($editor->id, ['role' => SpaceRole::Editor->value]);

        $this->assertTrue(Gate::forUser($owner)->allows('update', $shared));
        $this->assertTrue(Gate::forUser($owner)->allows('delete', $shared));
        $this->assertFalse(Gate::forUser($editor)->allows('update', $shared));
        $this->assertFalse(Gate::forUser($editor)->allows('delete', $shared));
        $this->assertFalse(Gate::forUser($owner)->allows('delete', $this->personalSpaceOf($owner)));
    }
}
