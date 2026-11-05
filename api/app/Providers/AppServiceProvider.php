<?php

namespace App\Providers;

use App\Services\Crypto;
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
        //
    }
}
