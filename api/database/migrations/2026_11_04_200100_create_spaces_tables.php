<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spaces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('type', 16); // App\Enums\SpaceType
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('space_members', function (Blueprint $table) {
            $table->foreignUuid('space_id')->constrained('spaces')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 16); // App\Enums\SpaceRole
            $table->timestamps();

            $table->primary(['space_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('user_settings', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->json('settings');
            $table->timestamps();
        });

        // Global change counter behind the sync cursor (projekt.md, section 4.1). One row only.
        Schema::create('sync_counter', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedBigInteger('value');
        });
        DB::table('sync_counter')->insert(['id' => 1, 'value' => 0]);
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_counter');
        Schema::dropIfExists('user_settings');
        Schema::dropIfExists('space_members');
        Schema::dropIfExists('spaces');
    }
};
