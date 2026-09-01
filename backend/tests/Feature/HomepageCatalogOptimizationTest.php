<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\HomepageCatalogSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HomepageCatalogOptimizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_catalog_seeder_is_idempotent_and_creates_three_image_backed_products_for_eight_categories(): void
    {
        $this->createApprovedSellers();

        $this->seed(HomepageCatalogSeeder::class);
        $this->seed(HomepageCatalogSeeder::class);

        $categorySlugs = [
            'pet-supplies', 'electronics', 'womens-apparel', 'mens-apparel',
            'kids-baby', 'home-garden', 'sports-outdoors', 'books-media',
        ];
        $categories = Category::query()->whereIn('slug', $categorySlugs)->get();

        $this->assertCount(8, $categories);
        foreach ($categories as $category) {
            $this->assertSame(3, Product::query()->where('category_id', $category->id)->count());
        }
        $this->assertSame(24, Product::query()->count());
        $this->assertSame(24, ProductImage::query()->where('is_primary', true)->where('storage_disk', 'external')->count());
        $this->assertSame(24, ProductImage::query()->where('file_path', 'like', 'https://images.unsplash.com/%')->count());
    }

    public function test_product_listing_is_bounded_lightweight_and_free_of_relation_n_plus_one_queries(): void
    {
        $this->createApprovedSellers();
        $this->seed(HomepageCatalogSeeder::class);

        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $response = $this->getJson('/api/products?limit=12')
            ->assertOk()
            ->assertJsonCount(12, 'data');

        $first = $response->json('data.0');
        $this->assertArrayHasKey('image', $first);
        $this->assertArrayHasKey('seller', $first);
        $this->assertArrayHasKey('category', $first);
        $this->assertArrayHasKey('rating', $first);
        $this->assertArrayHasKey('in_stock', $first);
        $this->assertArrayNotHasKey('description', $first);
        $this->assertArrayNotHasKey('images', $first);
        $this->assertArrayNotHasKey('variants', $first);
        $this->assertArrayNotHasKey('reviews', $first);
        $this->assertLessThanOrEqual(5, count($queries));
        $this->assertSame(1, count(array_filter(
            $queries,
            fn (string $sql): bool => str_contains(strtolower($sql), 'from "product_images"')
                || str_contains(strtolower($sql), 'from `product_images`')
        )));
    }

    public function test_public_reference_summaries_use_short_lived_cache_entries(): void
    {
        $this->createApprovedSellers();
        $this->seed(HomepageCatalogSeeder::class);
        Cache::flush();

        $this->getJson('/api/categories')->assertOk();
        $this->getJson('/api/deals')->assertOk();
        $this->getJson('/api/sellers')->assertOk();

        $this->assertTrue(Cache::has('catalog.categories.v1'));
        $this->assertTrue(Cache::has('catalog.sellers.v1'));
    }

    private function createApprovedSellers(): void
    {
        Seller::factory()->count(2)->sequence(
            ['user_id' => User::factory()->state(['role' => 'seller', 'status' => 'active'])],
            ['user_id' => User::factory()->state(['role' => 'seller', 'status' => 'active'])],
        )->create(['status' => 'approved']);
    }
}
