<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Server-only bookkeeping for conflict copies (App\Services\SyncService::update): which
 * version of the note last changed its title or content, and from which device.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            // 0 for notes from before this column: their first conflict makes no copy.
            $table->unsignedInteger('text_version')->default(0);
            $table->uuid('text_device')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn(['text_version', 'text_device']);
        });
    }
};
