<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\ProductImage;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Pet Supplies', 'slug' => 'pet-supplies'],
            ['name' => 'Electronics and Gadgets', 'slug' => 'electronics'],
            ['name' => "Women's Apparel", 'slug' => 'womens-apparel'],
            ['name' => "Men's Apparel", 'slug' => 'mens-apparel'],
            ['name' => 'Kids and Baby', 'slug' => 'kids-baby'],
            ['name' => 'Home and Garden', 'slug' => 'home-garden'],
            ['name' => 'Sports and Outdoors', 'slug' => 'sports-outdoors'],
            ['name' => 'Books and Media', 'slug' => 'books-media'],
            ['name' => 'Food and Gourmet', 'slug' => 'food-gourmet'],
            ['name' => 'Jewelry and Watches', 'slug' => 'jewelry-watches'],
            ['name' => 'Furniture and Office Equipment', 'slug' => 'furniture-office'],
            ['name' => 'Health and Beauty', 'slug' => 'health-beauty'],
        ];

        foreach ($categories as $index => $category) {
            Category::firstOrCreate(
                ['slug' => $category['slug']],
                [
                    'name' => $category['name'],
                    'icon' => '*',
                    'active' => true,
                    'sort_order' => $index + 1,
                ]
            );
        }

        $buyer = User::firstOrCreate(
            ['email' => 'ana.reyes@email.com'],
            [
                'first_name' => 'Ana',
                'last_name' => 'Reyes',
                'name' => 'Ana Reyes',
                'mobile' => '+639175550182',
                'phone' => '+639175550182',
                'password' => Hash::make('password'),
                'role' => 'buyer',
                'status' => 'active',
                'location_label' => 'Makati',
                'email_verified_at' => now(),
                'last_active_at' => now(),
                'two_factor_enabled' => false,
            ]
        );

        User::firstOrCreate(
            ['email' => 'otp.demo@maketo.local'],
            [
                'first_name' => 'Olivia',
                'last_name' => 'Perez',
                'name' => 'Olivia Perez',
                'mobile' => '+639175550199',
                'phone' => '+639175550199',
                'password' => Hash::make('password123'),
                'role' => 'buyer',
                'status' => 'active',
                'location_label' => 'Quezon City',
                'email_verified_at' => now(),
                'last_active_at' => now(),
                'two_factor_enabled' => true,
                'two_factor_method' => 'email',
            ]
        );

        $sellerUser = User::firstOrCreate(
            ['email' => 'maria@verdebotanics.com'],
            [
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'name' => 'Maria Santos',
                'mobile' => '+639170000000',
                'phone' => '+639170000000',
                'password' => Hash::make('password'),
                'role' => 'seller',
                'status' => 'active',
                'location_label' => 'Pasig',
                'email_verified_at' => now(),
                'last_active_at' => now(),
                'two_factor_enabled' => false,
            ]
        );

        $artisanUser = User::firstOrCreate(
            ['email' => 'luis@artisangoods.ph'],
            [
                'first_name' => 'Luis',
                'last_name' => 'Reyes',
                'name' => 'Luis Reyes',
                'mobile' => '+639180000001',
                'phone' => '+639180000001',
                'password' => Hash::make('password'),
                'role' => 'seller',
                'status' => 'active',
                'location_label' => 'Makati',
                'email_verified_at' => now(),
                'last_active_at' => now(),
                'two_factor_enabled' => false,
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

        $artisanSeller = Seller::firstOrCreate(
            ['slug' => 'artisan-goods'],
            [
                'user_id' => $artisanUser->id,
                'business_name' => 'Artisan Goods Co.',
                'trade_name' => 'Artisan Goods Co.',
                'tagline' => 'Handpicked pieces for thoughtful spaces.',
                'description' => 'Curated homeware and lifestyle products made by Filipino makers.',
                'province' => 'Metro Manila',
                'city' => 'Makati',
                'postal_code' => '1200',
                'address_line1' => 'Unit 12C, Salcedo Village',
                'verified' => true,
                'status' => 'approved',
                'response_rate' => 97,
                'response_time_label' => 'within 1 hour',
                'joined_year' => 2022,
            ]
        );

        $seller->categories()->syncWithoutDetaching(
            Category::whereIn('slug', ['health-beauty', 'home-garden'])->pluck('id')->all()
        );

        $artisanSeller->categories()->syncWithoutDetaching(
            Category::whereIn('slug', ['home-garden', 'jewelry-watches', 'furniture-office'])->pluck('id')->all()
        );

        $products = [
            [
                'seller_id' => $seller->id,
                'category_slug' => 'health-beauty',
                'name' => 'Organic Lavender Serum',
                'slug' => 'organic-lavender-serum',
                'description' => 'Hydrating botanical serum for daily use.',
                'sku' => 'VB-SRM-001',
                'price' => 1450,
                'sale_price' => 1290,
                'stock_quantity' => 24,
                'free_shipping' => true,
                'image' => 'https://images.unsplash.com/photo-1748543668676-ea8241cb3886',
            ],
            [
                'seller_id' => $seller->id,
                'category_slug' => 'health-beauty',
                'name' => 'Vitamin C + Hyaluronic Serum Duo',
                'slug' => 'serum-collection',
                'description' => 'Daily antioxidant duo for healthy, glowing skin.',
                'sku' => 'VB-SRM-002',
                'price' => 890,
                'stock_quantity' => 18,
                'free_shipping' => false,
                'image' => 'https://images.unsplash.com/photo-1748543668646-e81cda0890f3',
            ],
            [
                'seller_id' => $seller->id,
                'category_slug' => 'home-garden',
                'name' => 'Handmade Ceramic Bowl Set (3 pcs)',
                'slug' => 'handmade-ceramic-bowl-set',
                'description' => 'A set of three handcrafted ceramic bowls.',
                'sku' => 'VB-HG-001',
                'price' => 850,
                'stock_quantity' => 14,
                'free_shipping' => false,
                'image' => 'https://images.unsplash.com/photo-1607556672044-6110fc499247',
            ],
            [
                'seller_id' => $artisanSeller->id,
                'category_slug' => 'jewelry-watches',
                'name' => 'Minimalist Chronograph Watch',
                'slug' => 'minimalist-chronograph-watch',
                'description' => 'Slim chronograph with a modern leather strap.',
                'sku' => 'AG-WATCH-001',
                'price' => 4200,
                'sale_price' => 3490,
                'stock_quantity' => 9,
                'free_shipping' => true,
                'image' => 'https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d',
            ],
            [
                'seller_id' => $artisanSeller->id,
                'category_slug' => 'home-garden',
                'name' => 'Genuine Leather Tote Bag',
                'slug' => 'genuine-leather-tote-bag',
                'description' => 'Soft-grain tote made for everyday carry.',
                'sku' => 'AG-TOTE-001',
                'price' => 2800,
                'sale_price' => 2400,
                'stock_quantity' => 11,
                'free_shipping' => true,
                'image' => 'https://images.unsplash.com/photo-1616529484745-85f885b9889a',
            ],
            [
                'seller_id' => $artisanSeller->id,
                'category_slug' => 'mens-apparel',
                'name' => 'Low-Top Canvas Sneakers',
                'slug' => 'low-top-canvas-sneakers',
                'description' => 'Classic canvas sneakers with cushioned sole.',
                'sku' => 'AG-SHOE-001',
                'price' => 2350,
                'stock_quantity' => 16,
                'free_shipping' => false,
                'image' => 'https://images.unsplash.com/photo-1544441893-675973e31985',
            ],
        ];

        foreach ($products as $productData) {
            $product = Product::firstOrCreate(
                ['slug' => $productData['slug']],
                [
                    'seller_id' => $productData['seller_id'],
                    'category_id' => Category::where('slug', $productData['category_slug'])->firstOrFail()->id,
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'sku' => $productData['sku'],
                    'price' => $productData['price'],
                    'sale_price' => $productData['sale_price'] ?? null,
                    'status' => 'active',
                    'delivery_type' => 'both',
                    'track_inventory' => true,
                    'stock_quantity' => $productData['stock_quantity'],
                    'low_stock_threshold' => 10,
                    'free_shipping' => $productData['free_shipping'],
                    'published_at' => now(),
                ]
            );

            ProductImage::firstOrCreate(
                ['product_id' => $product->id, 'is_primary' => true],
                [
                    'file_path' => $productData['image'],
                    'alt_text' => $productData['name'],
                    'sort_order' => 0,
                ]
            );
        }
    }
}
