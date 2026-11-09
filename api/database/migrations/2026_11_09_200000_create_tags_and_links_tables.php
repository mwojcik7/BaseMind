<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->syncable();
            $table->string('name', 64);
            $table->string('color', 16)->nullable();
        });

        // No foreign keys to the tagged or linked records: they live in many different tables.
        Schema::create('entity_tags', function (Blueprint $table) {
            $table->syncable();
            $table->string('entity_type', 32);
            $table->uuid('entity_id');
            $table->uuid('tag_id');

            $table->index(['entity_type', 'entity_id']);
            $table->index('tag_id');
        });

        Schema::create('entity_links', function (Blueprint $table) {
            $table->syncable();
            $table->string('source_type', 32);
            $table->uuid('source_id');
            $table->string('target_type', 32);
            $table->uuid('target_id');
            $table->string('origin', 16); // manual | parsed

            $table->index(['source_type', 'source_id']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_links');
        Schema::dropIfExists('entity_tags');
        Schema::dropIfExists('tags');
    }
};
