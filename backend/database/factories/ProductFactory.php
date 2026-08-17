<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = $this->faker->words(3, true);

        return [
            'seller_id' => Seller::factory(),
            'category_id' => Category::factory(),
            'name' => ucwords($name),
            'slug' => Str::slug($name) . '-' . $this->faker->unique()->numberBetween(10, 99),
            'description' => $this->faker->paragraphs(2, true),
            'sku' => strtoupper($this->faker->bothify('???-###')),
            'barcode' => $this->faker->optional()->ean13(),
            'price' => $this->faker->randomFloat(2, 100, 5000),
            'sale_price' => null,
            'cost_price' => $this->faker->randomFloat(2, 50, 4000),
            'status' => 'active',
            'delivery_type' => 'both',
            'track_inventory' => true,
            'stock_quantity' => $this->faker->numberBetween(1, 100),
            'low_stock_threshold' => 10,
            'weight_grams' => $this->faker->numberBetween(100, 2000),
            'length_cm' => 10,
            'width_cm' => 10,
            'height_cm' => 10,
            'free_shipping' => $this->faker->boolean(30),
            'published_at' => now(),
        ];
    }
}

