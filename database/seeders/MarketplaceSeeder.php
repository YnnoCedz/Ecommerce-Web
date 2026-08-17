<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Health and Beauty', 'slug' => 'health-beauty'],
            ['name' => 'Home and Garden', 'slug' => 'home-garden'],
            ['name' => 'Men\'s Apparel', 'slug' => 'mens-apparel'],
            ['name' => 'Women\'s Apparel', 'slug' => 'womens-apparel'],
        ];

        foreach ($categories as $index => $category) {
            Category::firstOrCreate(
                ['slug' => $category['slug']],
                [
                    'name' => $category['name'],
                    'icon' => '•',
                    'active' => true,
                    'sort_order' => $index + 1,
                ]
            );
        }

        $buyer = User::firstOrCreate(
            ['email' => 'ana.reyes@email.com'],
            [
                'name' => 'Ana Reyes',
                'mobile' => '+63 917 555 0182',
                'password' => Hash::make('password'),
                'role' => 'buyer',
                'status' => 'active',
                'location_label' => 'Makati',
                'email_verified_at' => now(),
                'last_active_at' => now(),
            ]
        );

        $sellerUser = User::firstOrCreate(
            ['email' => 'maria@verdebotanics.com'],
            [
                'name' => 'Maria Santos',
                'mobile' => '+63 917 000 0000',
                'password' => Hash::make('password'),
                'role' => 'seller',
                'status' => 'active',
                'location_label' => 'Pasig',
                'email_verified_at' => now(),
                'last_active_at' => now(),
            ]
        );

        $seller = Seller::firstOrCreate(
            ['slug' => 'verde-botanics'],
            [
                'user_id' => $sellerUser->id,
                'business_name' => 'Verde Botanics Trading',
                'trade_name' => 'Verde Botanics',
                'tagline' => 'Naturally rooted, beautifully made.',
                'description' => 'Natural skincare and wellness products.',
                'province' => 'Metro Manila',
                'city' => 'Pasig',
                'postal_code' => '1600',
                'address_line1' => 'Unit 4B, Emerald Building, Emerald Ave.',
                'verified' => true,
                'status' => 'approved',
                'response_rate' => 98,
                'response_time_label' => 'within 1 hour',
                'joined_year' => 2021,
            ]
        );

        $categoryIds = Category::whereIn('slug', ['health-beauty', 'home-garden'])->pluck('id')->all();
        $seller->categories()->syncWithoutDetaching($categoryIds);

        $product = Product::firstOrCreate(
            ['slug' => 'organic-lavender-serum'],
            [
                'seller_id' => $seller->id,
                'category_id' => Category::where('slug', 'health-beauty')->firstOrFail()->id,
                'name' => 'Organic Lavender Serum',
                'description' => 'Hydrating botanical serum for daily use.',
                'sku' => 'VB-SRM-001',
                'price' => 1450,
                'status' => 'active',
                'delivery_type' => 'both',
                'track_inventory' => true,
                'stock_quantity' => 24,
                'low_stock_threshold' => 10,
                'free_shipping' => true,
                'published_at' => now(),
            ]
        );
    }
}
