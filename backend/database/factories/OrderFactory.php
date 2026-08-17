<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'buyer_id' => User::factory(),
            'order_number' => 'ORD-' . $this->faker->unique()->numberBetween(1000, 9999),
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'card',
            'currency' => 'PHP',
            'shipping_name' => $this->faker->name(),
            'shipping_phone' => $this->faker->phoneNumber(),
            'shipping_line1' => $this->faker->streetAddress(),
            'shipping_line2' => $this->faker->optional()->secondaryAddress(),
            'shipping_city' => $this->faker->city(),
            'shipping_province' => $this->faker->state(),
            'shipping_postal_code' => $this->faker->postcode(),
            'subtotal' => 0,
            'shipping_total' => 0,
            'discount_total' => 0,
            'tax_total' => 0,
            'grand_total' => 0,
            'buyer_notes' => $this->faker->optional()->sentence(),
            'placed_at' => now(),
        ];
    }
}

