<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Nothing to seed: accounts are created with the invitation code,
     * so no installation ever contains a user with a known password.
     */
    public function run(): void
    {
        //
    }
}
