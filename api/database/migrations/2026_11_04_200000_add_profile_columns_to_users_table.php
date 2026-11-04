<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('name', 'display_name');
            $table->string('timezone', 64)->default('Europe/Warsaw')->after('password');
            $table->string('locale', 8)->default('pl')->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('display_name', 'name');
            $table->dropColumn(['timezone', 'locale']);
        });
    }
};
