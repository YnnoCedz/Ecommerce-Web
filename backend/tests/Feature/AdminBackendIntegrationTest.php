<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBackendIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_read_endpoints_return_real_database_records(): void
    {
        [$admin, $buyer, $seller, $category, $product, $order] = $this->marketplaceFixture();

        $this->actingAs($admin)->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('data.metrics.total_users', 2)
            ->assertJsonPath('data.metrics.total_products', 1)
            ->assertJsonPath('data.metrics.total_orders', 1);

        $this->actingAs($admin)->getJson('/api/admin/users')->assertOk()
            ->assertJsonFragment(['email' => $buyer->email])
            ->assertJsonMissing(['email' => $admin->email]);
        $this->actingAs($admin)->getJson('/api/admin/sellers')->assertOk()
            ->assertJsonFragment(['business_name' => $seller->business_name]);
        $this->actingAs($admin)->getJson('/api/admin/products')->assertOk()
            ->assertJsonFragment(['sku' => $product->sku]);
        $this->actingAs($admin)->getJson('/api/admin/orders')->assertOk()
            ->assertJsonFragment(['order_number' => $order->order_number]);
        $this->actingAs($admin)->getJson('/api/admin/categories')->assertOk()
            ->assertJsonFragment(['slug' => $category->slug]);
        $this->actingAs($admin)->getJson('/api/admin/analytics')->assertOk()
            ->assertJsonPath('data.totals.orders', 1)
            ->assertJsonPath('data.totals.gmv', 1200);
    }

    public function test_admin_can_persist_supported_management_actions(): void
    {
        [$admin, $buyer, $seller, , $product] = $this->marketplaceFixture();

        $this->actingAs($admin)->patchJson("/api/admin/users/{$buyer->id}/status", [
            'status' => 'suspended', 'reason' => 'Account activity requires an administrator review.',
        ])->assertOk()->assertJsonPath('data.status', 'suspended');

        $this->actingAs($admin)->patchJson("/api/admin/sellers/{$seller->id}/status", [
            'status' => 'suspended', 'reason' => 'Seller fulfillment activity requires review.',
        ])->assertOk()->assertJsonPath('data.status', 'suspended');

        $this->actingAs($admin)->patchJson("/api/admin/products/{$product->id}/status", [
            'status' => 'flagged', 'note' => 'Listing claims require supporting documentation.',
        ])->assertOk()->assertJsonPath('data.status', 'flagged');

        $created = $this->actingAs($admin)->postJson('/api/admin/categories', [
            'parent_id' => null, 'name' => 'Admin Category', 'slug' => 'admin-category', 'icon' => 'box', 'active' => true, 'sort_order' => 20,
        ])->assertCreated();
        $categoryId = $created->json('data.id');
        $this->actingAs($admin)->patchJson("/api/admin/categories/{$categoryId}", [
            'parent_id' => null, 'name' => 'Updated Category', 'slug' => 'updated-category', 'icon' => 'box', 'active' => false, 'sort_order' => 21,
        ])->assertOk()->assertJsonPath('data.active', false);

        $this->assertDatabaseHas('users', ['id' => $buyer->id, 'status' => 'suspended']);
        $this->assertDatabaseHas('sellers', ['id' => $seller->id, 'status' => 'suspended']);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'status' => 'flagged']);
        $this->assertDatabaseHas('categories', ['id' => $categoryId, 'slug' => 'updated-category', 'active' => false]);
    }

    public function test_admin_endpoints_reject_guests_and_non_admin_users(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        foreach (['dashboard', 'users', 'sellers', 'products', 'orders', 'categories', 'analytics'] as $endpoint) {
            $this->getJson("/api/admin/{$endpoint}")->assertUnauthorized();
        }

        foreach (['dashboard', 'users', 'sellers', 'products', 'orders', 'categories', 'analytics'] as $endpoint) {
            $this->actingAs($buyer)->getJson("/api/admin/{$endpoint}")->assertForbidden();
        }
    }

    private function marketplaceFixture(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved']);
        $category = Category::factory()->create();
        $product = Product::factory()->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'price' => 1200]);
        $order = Order::create([
            'buyer_id' => $buyer->id, 'order_number' => 'ORD-ADMIN-TEST', 'status' => 'completed', 'payment_status' => 'paid', 'payment_method' => 'gcash', 'currency' => 'PHP',
            'shipping_name' => 'Test Buyer', 'shipping_phone' => '+639171234567', 'shipping_line1' => '1 Test Street', 'shipping_city' => 'Makati', 'shipping_province' => 'Metro Manila', 'shipping_postal_code' => '1200',
            'subtotal' => 1200, 'grand_total' => 1200, 'placed_at' => now(),
        ]);
        $sellerOrder = SellerOrder::create(['order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'completed', 'subtotal' => 1200, 'grand_total' => 1200]);
        OrderItem::create(['order_id' => $order->id, 'seller_order_id' => $sellerOrder->id, 'seller_id' => $seller->id, 'product_id' => $product->id, 'product_name' => $product->name, 'product_slug' => $product->slug, 'sku' => $product->sku, 'unit_price' => 1200, 'quantity' => 1, 'subtotal' => 1200]);

        return [$admin, $buyer, $seller, $category, $product, $order];
    }
}
