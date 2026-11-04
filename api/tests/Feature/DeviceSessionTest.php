<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DeviceSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum starts a session only for requests coming from the PWA's own origin.
        $this->withHeader('Referer', 'http://localhost:8080/');
    }

    private function addSession(User $user, string $id): string
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Test browser',
            'payload' => '',
            'last_activity' => time(),
        ]);

        return hash('sha256', $id);
    }

    public function test_it_requires_signing_in(): void
    {
        $this->getJson('/api/sessions')->assertUnauthorized();
    }

    public function test_it_lists_only_own_sessions_and_never_their_real_ids(): void
    {
        $user = User::factory()->create();
        $publicId = $this->addSession($user, 'my-session');
        $this->addSession(User::factory()->create(), 'someone-elses-session');

        $response = $this->actingAs($user)->getJson('/api/sessions')
            ->assertOk()
            ->assertJsonCount(1, 'sessions')
            ->assertJsonPath('sessions.0.id', $publicId)
            ->assertJsonPath('sessions.0.user_agent', 'Test browser');

        $this->assertStringNotContainsString('my-session', $response->getContent());
    }

    public function test_it_signs_out_one_of_own_sessions(): void
    {
        $user = User::factory()->create();
        $publicId = $this->addSession($user, 'my-session');

        $this->actingAs($user)->deleteJson("/api/sessions/{$publicId}")->assertNoContent();

        $this->assertDatabaseMissing('sessions', ['id' => 'my-session']);
    }

    public function test_it_cannot_sign_out_someone_elses_session(): void
    {
        $publicId = $this->addSession(User::factory()->create(), 'someone-elses-session');

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/sessions/{$publicId}")
            ->assertNotFound();

        $this->assertDatabaseHas('sessions', ['id' => 'someone-elses-session']);
    }

    public function test_it_signs_out_all_other_sessions_of_this_user_only(): void
    {
        $user = User::factory()->create();
        $this->addSession($user, 'my-other-device');
        $this->addSession(User::factory()->create(), 'someone-elses-session');

        $this->actingAs($user)->deleteJson('/api/sessions')->assertNoContent();

        $this->assertDatabaseMissing('sessions', ['id' => 'my-other-device']);
        $this->assertDatabaseHas('sessions', ['id' => 'someone-elses-session']);
    }
}
