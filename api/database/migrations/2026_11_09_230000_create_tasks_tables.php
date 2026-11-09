<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_lists', function (Blueprint $table) {
            $table->syncable();
            $table->string('name', 120);
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->syncable();
            // No foreign key: records arrive from devices in any order, and a list deleted
            // on one device may still be used on another that is offline.
            $table->uuid('list_id')->nullable();
            $table->text('title'); // encrypted
            $table->text('notes')->nullable(); // encrypted
            $table->unsignedTinyInteger('priority');
            $table->string('status', 16); // todo | done | cancelled
            $table->date('due_date')->nullable();
            $table->char('due_time', 5)->nullable(); // HH:MM, on the user's clock
            $table->dateTime('completed_at')->nullable();

            $table->index(['space_id', 'status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('task_lists');
    }
};
