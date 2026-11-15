<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->syncable();
            $table->text('title'); // encrypted
            $table->text('location')->nullable(); // encrypted
            $table->text('description')->nullable(); // encrypted, Markdown
            // Wall time on the user's clock, as for tasks: a series keeps its hour across
            // daylight saving changes. No times means an all-day event.
            $table->date('start_date');
            $table->char('start_time', 5)->nullable(); // HH:MM
            $table->date('end_date');
            $table->char('end_time', 5)->nullable(); // HH:MM
            $table->string('rrule')->nullable();
            $table->json('exdates')->nullable(); // skipped occurrences, as start dates
            $table->string('color', 16)->nullable(); // a palette name; null = the accent

            $table->index(['space_id', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
