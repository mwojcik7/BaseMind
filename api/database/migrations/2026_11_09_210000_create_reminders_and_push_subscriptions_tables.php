<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->syncable();
            $table->string('entity_type', 32)->nullable();
            $table->uuid('entity_id')->nullable();
            $table->text('title'); // encrypted
            $table->dateTime('remind_at');
            $table->string('rrule')->nullable();
            $table->unsignedInteger('offset_minutes')->default(0);
            $table->json('channels');
            $table->string('status', 16); // scheduled | sent | dismissed | snoozed
            $table->dateTime('snoozed_until')->nullable();
            $table->dateTime('last_sent_at')->nullable();

            $table->index(['status', 'remind_at']);
            $table->index(['status', 'snoozed_until']);
        });

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Ties the device to its sign-in: ending the session must stop the notifications.
            $table->string('session_id')->nullable()->index();
            $table->text('endpoint');
            $table->char('endpoint_hash', 64)->unique(); // endpoint is too long for an index
            $table->string('p256dh');
            $table->string('auth');
            $table->string('device_name', 120)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('reminders');
    }
};
