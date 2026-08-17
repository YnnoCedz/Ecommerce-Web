<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        $name = $this->faker->name();

        return [
            'name' => $name,
            'email' => $this->faker->unique()->safeEmail(),
            'mobile' => '+63 ' . $this->faker->numerify('9## ### ####'),
            'password' => Hash::make('password'),
            'role' => 'buyer',
            'status' => 'active',
            'location_label' => $this->faker->city(),
            'email_verified_at' => now(),
            'last_active_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }
}

