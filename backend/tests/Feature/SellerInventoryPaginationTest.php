<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerInventoryPaginationTest extends TestCase
{
    use RefreshDatabase;

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
