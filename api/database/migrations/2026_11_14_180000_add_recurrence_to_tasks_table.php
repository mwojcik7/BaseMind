<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // RFC 5545 rule without DTSTART and COUNT; the series starts at repeat_anchor.
            $table->string('rrule', 255)->nullable()->after('completed_at');
            $table->string('repeat_from', 16)->default('due')->after('rrule'); // due | completion
            // The date the pattern gives for the current occurrence. Differs from due_date
            // when just this occurrence was moved, e.g. to tomorrow.
            $table->date('repeat_anchor')->nullable()->after('repeat_from');
            // Occurrences left, the current one included; null means no limit.
            $table->unsignedSmallInteger('repeat_remaining')->nullable()->after('repeat_anchor');
            // On the copy kept in history when an occurrence is completed or skipped.
            // No foreign key, like list_id and parent_id.
            $table->uuid('recurring_task_id')->nullable()->after('repeat_remaining');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['rrule', 'repeat_from', 'repeat_anchor', 'repeat_remaining', 'recurring_task_id']);
        });
    }
};
