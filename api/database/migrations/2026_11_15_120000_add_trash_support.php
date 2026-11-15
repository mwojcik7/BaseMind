<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Set on subtasks deleted together with their parent: restoring the parent from
            // the trash brings back just these, not ones deleted on their own earlier.
            $table->boolean('deleted_with_parent')->default(false)->after('parent_id');
        });

        // What is left of a record removed for good: enough for devices to drop their copy.
        // Kept for a year (config/trash.php), the content is gone at once.
        Schema::create('sync_purges', function (Blueprint $table) {
            $table->id();
            $table->string('entity', 40);
            $table->uuid('record_id');
            $table->uuid('space_id')->index();
            $table->unsignedBigInteger('rev')->index();
            $table->dateTime('purged_at')->index();
        });

        Schema::table('sync_counter', function (Blueprint $table) {
            // The newest rev among purges already forgotten. A device that last synced before it
            // may have missed one, so it has to download everything again.
            $table->unsignedBigInteger('purge_horizon')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('sync_counter', function (Blueprint $table) {
            $table->dropColumn('purge_horizon');
        });
        Schema::dropIfExists('sync_purges');
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('deleted_with_parent');
        });
    }
};
