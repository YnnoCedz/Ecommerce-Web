<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MarketplaceSearchTest extends TestCase
{
    use RefreshDatabase;

    private Seller $seller;
    private Category $electronics;
    private Category $petSupplies;

    protected function setUp(): void
    {
        parent::setUp();

        $this->electronics = $this->category('Electronics and Gadgets', 'electronics');
        $this->petSupplies = $this->category('Pet Supplies', 'pet-supplies');
        $apparel = $this->category("Men's Apparel", 'mens-apparel');
        $this->seller = $this->seller('Ynno Tech', 'ynno-tech');

        $this->product('Wireless Mouse', 'wireless-mouse', $this->electronics, 899, ['computer', 'peripheral'], 'Ergonomic black wireless computer mouse.');
        $this->product('Gaming Mouse', 'gaming-mouse', $this->electronics, 1299, ['rgb', 'computer'], 'Wired precision mouse for gaming.');
        $this->product('Wireless Keyboard', 'wireless-keyboard', $this->electronics, 1599, ['computer'], 'Compact Bluetooth keyboard.');
        $this->product('Bluetooth Earbuds', 'bluetooth-earbuds', $this->electronics, 1999, ['tws', 'audio'], 'Wireless in-ear audio.');
        $this->product('Wired Earphones', 'wired-earphones', $this->electronics, 499, ['audio'], 'Classic wired listening.');
        $this->product('Phone Charger', 'phone-charger', $this->electronics, 699, ['mobile'], 'Fast wall charging adapter.');
        $this->product('USB-C Charger', 'usb-c-charger', $this->electronics, 999, ['iphone', 'apple-compatible'], 'USB-C fast charging adapter for compatible phones.');
        $this->product('Nutri Bites', 'nutri-bites', $this->petSupplies, 450, ['dog', 'kibble'], 'Complete dry pet food for adult dogs.');
        $this->product('Road Runner', 'road-runner', $apparel, 2200, ['running shoes', 'sneakers'], 'Lightweight footwear for daily runs.');
        $this->product('Galaxy A55 Smartphone', 'galaxy-a55', $this->electronics, 24990, ['Samsung', 'phone'], 'Android mobile phone.');
    }

    public function test_exact_case_insensitive_and_word_order_searches_rank_the_best_product_first(): void
    {
        foreach (['Wireless Mouse', 'wireless mouse', 'mouse wireless'] as $query) {
            $this->getJson('/api/search?q=' . urlencode($query))
                ->assertOk()
                ->assertJsonPath('data.0.name', 'Wireless Mouse');
        }
    }

    public function test_partial_typo_and_synonym_queries_recover_relevant_products(): void
    {
        $this->getJson('/api/search?q=headphon')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Bluetooth Earbuds']);

        $this->getJson('/api/search?q=wirless+mouse')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Wireless Mouse');

        $this->getJson('/api/search?q=earphones')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Bluetooth Earbuds']);
    }

    public function test_category_tags_store_and_multi_word_relevance_are_searchable(): void
    {
        $this->getJson('/api/search?q=pet+food')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Nutri Bites');

        $this->getJson('/api/search?q=Samsung+phone')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Galaxy A55 Smartphone');

        $this->getJson('/api/search?q=Ynno+Tech')
            ->assertOk()
            ->assertJsonPath('meta.total', 10);

        $this->getJson('/api/search?q=black+wireless+gaming+mouse')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Wireless Mouse');
    }

    public function test_filters_sort_and_pagination_are_applied_by_the_backend(): void
    {
        $secondSeller = $this->seller('Other Store', 'other-store');
        $this->product('Budget Wireless Mouse', 'budget-wireless-mouse', $this->electronics, 350, ['mouse'], 'Affordable wireless mouse.', $secondSeller);

        $this->getJson('/api/search?q=mouse&category=electronics&seller=ynno-tech&min_price=800&max_price=1500&sort=price_high_high')
            ->assertUnprocessable();

        $this->getJson('/api/search?q=mouse&category=electronics&seller=ynno-tech&min_price=800&max_price=1500&sort=price_high_low')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Gaming Mouse');

        $this->getJson('/api/search?q=mouse&per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_hidden_products_and_sellers_are_excluded(): void
    {
        $draft = $this->product('Secret Wireless Mouse', 'secret-wireless-mouse', $this->electronics, 100, [], 'Hidden draft.');
        $draft->update(['status' => 'draft']);

        $suspendedSeller = $this->seller('Suspended Shop', 'suspended-shop', 'suspended');
        $this->product('Suspended Wireless Mouse', 'suspended-wireless-mouse', $this->electronics, 100, [], 'Hidden seller.', $suspendedSeller);

        $this->getJson('/api/search?q=wireless+mouse')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Secret Wireless Mouse'])
            ->assertJsonMissing(['name' => 'Suspended Wireless Mouse']);
    }

    public function test_suggestions_use_real_public_products(): void
    {
        $this->getJson('/api/search/suggestions?q=wire')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'product')
            ->assertJsonStructure(['data' => [['id', 'type', 'label', 'subtitle', 'slug', 'image']]]);
    }

    public function test_hostile_queries_do_not_break_search_or_expose_server_errors(): void
    {
        foreach (["'", '"', '%', '_', '<script>', "1' OR 1=1 --"] as $query) {
            $this->getJson('/api/search?q=' . urlencode($query))
                ->assertOk()
                ->assertJsonStructure(['data', 'meta', 'query']);
        }
    }

    private function category(string $name, string $slug): Category
    {
        return Category::create([
            'name' => $name,
            'slug' => $slug,
            'active' => true,
            'sort_order' => 1,
        ]);
    }

    private function seller(string $name, string $slug, string $status = 'approved'): Seller
    {
        $user = User::create([
            'name' => $name . ' Owner',
            'email' => $slug . '@example.test',
            'mobile' => '+63917' . str_pad((string) random_int(0, 9999999), 7, '0', STR_PAD_LEFT),
            'password' => Hash::make('Password1!'),
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        return Seller::create([
            'user_id' => $user->id,
            'business_name' => $name,
            'trade_name' => $name,
            'slug' => $slug,
            'address_line1' => 'Test address',
            'province' => 'Metro Manila',
            'city' => 'Makati',
            'postal_code' => '1200',
            'status' => $status,
            'verified' => $status === 'approved',
        ]);
    }

    private function product(
        string $name,
        string $slug,
        Category $category,
        float $price,
        array $tags,
        string $description,
        ?Seller $seller = null,
    ): Product {
        return Product::create([
            'seller_id' => ($seller ?? $this->seller)->id,
            'category_id' => $category->id,
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
            'tags' => $tags,
            'sku' => 'SKU-' . strtoupper($slug),
            'price' => $price,
            'status' => 'active',
            'track_inventory' => true,
            'stock_quantity' => 10,
            'published_at' => now(),
        ]);
    }
}
