<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // A subtask's parent; subtasks are one level deep. No foreign key, like list_id:
            // records arrive from devices in any order.
            $table->uuid('parent_id')->nullable()->after('list_id');
            $table->index(['space_id', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['space_id', 'parent_id']);
            $table->dropColumn('parent_id');
        });
    }
};
