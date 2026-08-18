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
        [$firstName, $lastName] = array_pad(explode(' ', $name, 2), 2, '');
        $phone = '+63' . $this->faker->numerify('9#########');

        return [
            'name' => $name,
            'first_name' => $firstName,
            'last_name' => $lastName ?: $firstName,
            'email' => $this->faker->unique()->safeEmail(),
            'mobile' => $phone,
            'phone' => $phone,
            'password' => Hash::make('password'),
            'role' => 'buyer',
            'status' => 'active',
            'location_label' => $this->faker->city(),
            'email_verified_at' => now(),
            'last_active_at' => now(),
            'two_factor_enabled' => false,
            'remember_token' => Str::random(10),
        ];
    }
}
