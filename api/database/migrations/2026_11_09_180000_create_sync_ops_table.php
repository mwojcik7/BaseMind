<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Operations already applied, so a batch sent twice changes nothing (projekt.md, section 5).
        Schema::create('sync_ops', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('op_id');
            $table->dateTime('created_at');

            $table->primary(['user_id', 'op_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_ops');
    }
};
