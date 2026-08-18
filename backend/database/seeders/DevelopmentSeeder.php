<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        User::firstOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@maketo.local')],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'name' => 'Admin User',
                'mobile' => env('ADMIN_MOBILE', '+639000000000'),
                'phone' => env('ADMIN_MOBILE', '+639000000000'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'password123')),
                'role' => 'admin',
                'status' => 'active',
                'location_label' => 'Maketo Admin',
                'two_factor_enabled' => false,
                'email_verified_at' => now(),
                'last_active_at' => now(),
            ]
        );

        $this->call(MarketplaceSeeder::class);
    }
}
