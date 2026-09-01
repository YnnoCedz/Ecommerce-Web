<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SellerInventoryPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_promotion_picker_is_lightweight_paginated_and_seller_scoped(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);
        $otherSeller = Seller::factory()->create();
        $category = Category::factory()->create();
        $products = Product::factory()->count(15)->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'status' => 'active',
        ]);
        Product::factory()->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'status' => 'draft']);
        $foreignProduct = Product::factory()->create(['seller_id' => $otherSeller->id, 'category_id' => $category->id, 'status' => 'active']);
        ProductImage::create([
            'product_id' => $products->last()->id,
            'storage_disk' => 'public',
            'file_path' => 'products/picker.jpg',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = $this->actingAs($user)->getJson('/api/seller/products?view=promotion-picker&page=1&per_page=12')
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('meta.total', 15)
            ->assertJsonPath('meta.per_page', 12)
            ->assertJsonMissingPath('meta.counts')
            ->assertJsonMissingPath('data.0.description')
            ->assertJsonMissingPath('data.0.variants')
            ->assertJsonStructure(['data' => [['id', 'name', 'sku', 'price', 'sale_price', 'stock_quantity', 'image', 'has_active_variants']]]);

        $imageQueries = collect(DB::getQueryLog())->filter(fn (array $query) => str_contains($query['query'], 'product_images'));
        $this->assertCount(1, $imageQueries, 'Picker images should be eager-loaded in one query.');
        $this->assertNotContains($foreignProduct->id, collect($response->json('data'))->pluck('id'));
    }

    public function test_promotion_picker_searches_owned_products_by_name_and_sku(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);
        $otherSeller = Seller::factory()->create();
        $category = Category::factory()->create();
        $owned = Product::factory()->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'status' => 'active', 'name' => 'iPad Air', 'sku' => 'IPAD-AIR-01']);
        Product::factory()->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'status' => 'active', 'name' => 'Unrelated product', 'sku' => 'OTHER-01']);
        Product::factory()->create(['seller_id' => $otherSeller->id, 'category_id' => $category->id, 'status' => 'active', 'name' => 'iPad Air Foreign', 'sku' => 'IPAD-FOREIGN']);

        $this->actingAs($user)->getJson('/api/seller/products?view=promotion-picker&page=1&per_page=12&search=IPAD')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $owned->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_seller_products_are_paginated_twenty_per_page(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);
        $category = Category::factory()->create();

        Product::factory()->count(55)->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'stock_quantity' => 25,
            'low_stock_threshold' => 10,
        ]);

        $this->actingAs($user)->getJson('/api/seller/products?page=1&per_page=20')
            ->assertOk()->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 55)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.from', 1)
            ->assertJsonPath('meta.to', 20);

        $this->actingAs($user)->getJson('/api/seller/products?page=2&per_page=20')
            ->assertOk()->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.from', 21)
            ->assertJsonPath('meta.to', 40);

        $this->actingAs($user)->getJson('/api/seller/products?page=3&per_page=20')
            ->assertOk()->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonPath('meta.from', 41)
            ->assertJsonPath('meta.to', 55);
    }

    public function test_search_and_stock_filter_update_pagination_totals(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);
        $category = Category::factory()->create();
        Product::factory()->count(22)->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'stock_quantity' => 25, 'low_stock_threshold' => 10]);
        Product::factory()->count(3)->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'name' => 'Needle stock item', 'stock_quantity' => 0, 'low_stock_threshold' => 10]);

        $this->actingAs($user)->getJson('/api/seller/products?page=1&per_page=20&search=Needle&stock_status=out-of-stock')
            ->assertOk()->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.counts.all', 3)
            ->assertJsonPath('meta.counts.out-of-stock', 3);
    }
}
