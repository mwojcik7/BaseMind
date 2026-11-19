<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // One occurrence of a series changed on its own: a separate event that stands in
            // for the occurrence starting on series_date (also in the series' exdates).
            $table->uuid('series_id')->nullable()->after('exdates');
            $table->date('series_date')->nullable()->after('series_id');
            // Went to the trash together with its series, and comes back with it.
            $table->boolean('deleted_with_series')->default(false)->after('series_date');

            $table->index('series_id');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex(['series_id']);
            $table->dropColumn(['series_id', 'series_date', 'deleted_with_series']);
        });
    }
};
