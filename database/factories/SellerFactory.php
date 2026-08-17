<?php

namespace Database\Factories;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class SellerFactory extends Factory
{
    protected $model = Seller::class;

    public function definition(): array
    {
        $business = $this->faker->company();

        return [
            'user_id' => User::factory(),
            'business_name' => $business,
            'trade_name' => $this->faker->optional()->company(),
            'slug' => Str::slug($business) . '-' . $this->faker->unique()->numberBetween(10, 99),
            'tagline' => $this->faker->sentence(6),
            'description' => $this->faker->paragraph(),
            'owner_id_number' => $this->faker->numerify('####-####-####'),
            'tin' => $this->faker->numerify('###-###-###'),
            'registration_number' => strtoupper($this->faker->bothify('??######')),
            'established_on' => $this->faker->date(),
            'address_line1' => $this->faker->streetAddress(),
            'address_line2' => $this->faker->optional()->secondaryAddress(),
            'province' => $this->faker->state(),
            'city' => $this->faker->city(),
            'postal_code' => $this->faker->postcode(),
            'contact_name' => $this->faker->name(),
            'contact_email' => $this->faker->companyEmail(),
            'public_email' => $this->faker->safeEmail(),
            'contact_phone' => $this->faker->phoneNumber(),
            'messaging_phone' => $this->faker->optional()->phoneNumber(),
            'verified' => true,
            'status' => 'approved',
            'response_rate' => 98.0,
            'response_time_label' => 'within 1 hour',
            'follower_count' => $this->faker->numberBetween(100, 10000),
            'product_count' => $this->faker->numberBetween(10, 200),
            'joined_year' => $this->faker->numberBetween(2020, 2026),
            'payout_method' => 'bank',
            'payout_schedule' => 'weekly',
            'bank_name' => 'BDO',
            'account_name' => $business,
            'account_number_last4' => $this->faker->numerify('####'),
        ];
    }
}

