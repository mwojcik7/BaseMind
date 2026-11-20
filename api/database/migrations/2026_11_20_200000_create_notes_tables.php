<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('note_folders', function (Blueprint $table) {
            $table->syncable();
            $table->string('name', 120);
            // Folders are one level deep for now; kept for nesting later, not synchronised yet.
            $table->uuid('parent_id')->nullable();
        });

        Schema::create('notes', function (Blueprint $table) {
            $table->syncable();
            // No foreign key, as for tasks and their lists: records arrive in any order.
            $table->uuid('folder_id')->nullable(); // null = the inbox
            $table->text('title')->nullable(); // encrypted; empty shows the first line instead
            // Encrypted Markdown. The ciphertext is about a third longer, hence MEDIUMTEXT.
            $table->mediumText('content')->nullable();
            $table->boolean('pinned')->default(false);
            $table->boolean('archived')->default(false);

            $table->index(['space_id', 'folder_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
        Schema::dropIfExists('note_folders');
    }
};
