<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Akun demo, password semuanya "password". */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $member = User::factory()->create(['name' => 'Budi', 'email' => 'budi@example.com']);
        User::factory()->editor()->create(['name' => 'Eka Editor', 'email' => 'editor@example.com']);
        Admin::factory()->create(['name' => 'Admin', 'email' => 'admin@example.com']);

        Note::factory()->count(3)->for($member)->create();
    }
}
