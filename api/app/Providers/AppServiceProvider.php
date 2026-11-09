<?php

namespace App\Providers;

use App\Services\Crypto;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Resolved on first use, so a missing key only fails code that needs encryption.
        $this->app->singleton(Crypto::class, fn () => Crypto::fromConfig());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Columns common to every synchronised table (projekt.md, section 4.1).
        Blueprint::macro('syncable', function () {
            /** @var Blueprint $this */
            $this->uuid('id')->primary();
            $this->foreignUuid('space_id')->constrained('spaces')->cascadeOnDelete();
            $this->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $this->dateTime('created_at');
            $this->dateTime('updated_at');
            $this->dateTime('deleted_at')->nullable();
            $this->unsignedBigInteger('rev')->index();
            $this->unsignedInteger('version');
            $this->json('field_stamps')->nullable();
        });
    }
}
