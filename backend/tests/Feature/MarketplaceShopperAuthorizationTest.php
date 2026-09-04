<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Courier;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketplaceShopperAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_shopper_capability_is_active_non_admin_identity_not_buyer_role(): void
    {
        $buyer = $this->user('buyer');
        $seller = $this->user('seller');
        $admin = $this->user('admin');
        $suspended = $this->user('buyer', 'suspended');

        $this->assertTrue($buyer->canShopMarketplace());
        $this->assertTrue($seller->canShopMarketplace());
        $this->assertFalse($admin->canShopMarketplace());
        $this->assertFalse($suspended->canShopMarketplace());
    }

    public function test_buyer_seller_and_courier_capable_accounts_can_use_shopper_endpoints(): void
    {
        $buyer = $this->user('buyer');
        $seller = $this->user('seller');
        Seller::factory()->create(['user_id' => $seller->id, 'status' => 'approved', 'verified' => true]);

        $buyerCourier = $this->user('buyer');
        $sellerCourier = $this->user('seller');
        Seller::factory()->create(['user_id' => $sellerCourier->id, 'status' => 'approved', 'verified' => true]);
        $this->courier($buyerCourier, 'buyer-courier');
        $this->courier($sellerCourier, 'seller-courier');

        foreach ([$buyer, $seller, $buyerCourier, $sellerCourier] as $shopper) {
            $this->actingAs($shopper)->getJson('/api/cart')->assertOk();
            $this->actingAs($shopper)->getJson('/api/orders')->assertOk();
            $this->actingAs($shopper)->getJson('/api/wishlists')->assertOk();
            $this->actingAs($shopper)->getJson('/api/account/addresses')->assertOk();
        }

        $this->actingAs($seller)->getJson('/api/seller/dashboard')->assertOk();
        $this->actingAs($sellerCourier)->getJson('/api/seller/dashboard')->assertOk();
    }

    public function test_admin_is_forbidden_from_shopper_reads_and_mutations_but_can_browse_catalog(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin)->getJson('/api/products')->assertOk();

        foreach (['/api/cart', '/api/orders', '/api/account/addresses', '/api/wishlists', '/api/reviews', '/api/returns', '/api/messages', '/api/reports'] as $endpoint) {
            $this->actingAs($admin)->getJson($endpoint)
                ->assertForbidden()->assertJsonPath('code', 'marketplace_access_required');
        }

        foreach (['/api/cart/items', '/api/checkout/preview', '/api/checkout', '/api/wishlists', '/api/reviews', '/api/reports'] as $endpoint) {
            $this->actingAs($admin)->postJson($endpoint, [])
                ->assertForbidden()->assertJsonPath('code', 'marketplace_access_required');
        }

        $this->actingAs($admin)->getJson('/api/notifications')->assertOk();
        $this->actingAs($admin)->getJson('/api/admin/dashboard')->assertOk();
    }

    public function test_historical_orders_remain_visible_after_buyer_becomes_seller(): void
    {
        $account = $this->user('buyer');
        $order = $this->orderFor($account);
        $account->update(['role' => 'seller']);
        Seller::factory()->create(['user_id' => $account->id, 'status' => 'approved', 'verified' => true]);

        $this->actingAs($account)->getJson('/api/orders')
            ->assertOk()->assertJsonPath('data.0.order_number', $order->order_number);
    }

    public function test_approved_seller_can_complete_customer_checkout_without_losing_seller_access(): void
    {
        $shopper = $this->user('seller');
        Seller::factory()->create(['user_id' => $shopper->id, 'status' => 'approved', 'verified' => true]);
        $address = Address::create([
            'user_id' => $shopper->id, 'label' => 'Home', 'recipient_name' => $shopper->display_name,
            'phone' => $shopper->phone, 'line1' => '100 Shopper Street', 'city' => 'Makati City',
            'province' => 'Metro Manila', 'postal_code' => '1200', 'is_default' => true,
        ]);

        $merchantUser = $this->user('seller');
        $merchant = Seller::factory()->create(['user_id' => $merchantUser->id, 'status' => 'approved', 'verified' => true]);
        $category = Category::create(['name' => 'Shopper Test', 'slug' => 'shopper-test', 'active' => true]);
        $product = Product::create([
            'seller_id' => $merchant->id, 'category_id' => $category->id, 'name' => 'Shopper Test Product',
            'slug' => 'shopper-test-product', 'sku' => 'SHOPPER-TEST', 'price' => 500, 'status' => 'active',
            'track_inventory' => true, 'stock_quantity' => 5, 'published_at' => now(),
        ]);
        $cart = Cart::create(['user_id' => $shopper->id, 'status' => 'active']);
        $item = CartItem::create([
            'cart_id' => $cart->id, 'seller_id' => $merchant->id, 'product_id' => $product->id,
            'quantity' => 1, 'unit_price' => 500, 'line_total' => 500, 'saved_for_later' => false,
        ]);

        $response = $this->actingAs($shopper)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'mode' => 'cart', 'cart_item_ids' => [$item->id],
        ])->assertCreated();

        $this->assertDatabaseHas('orders', ['id' => $response->json('data.id'), 'buyer_id' => $shopper->id]);
        $this->assertSame('seller', $shopper->refresh()->role);
        $this->actingAs($shopper)->getJson('/api/seller/dashboard')->assertOk();
    }

    public function test_moderation_buyer_target_resolves_seller_shopper_by_identity(): void
    {
        $reporter = $this->user('buyer');
        $sellerShopper = $this->user('seller');

        $this->actingAs($reporter)->postJson('/api/reports', [
            'target_type' => 'buyer',
            'target_id' => $sellerShopper->id,
            'reason' => 'harassment',
            'description' => 'This purchasing account sent inappropriate messages.',
        ])->assertCreated()->assertJsonPath('data.target_name', $sellerShopper->display_name);
    }

    public function test_active_buyer_metric_counts_unique_purchasing_accounts_regardless_of_current_role(): void
    {
        $buyer = $this->user('buyer');
        $seller = $this->user('seller');
        $this->orderFor($buyer);
        $this->orderFor($seller);
        $this->orderFor($seller);

        $this->actingAs($this->user('admin'))->getJson('/api/admin/analytics/platform?section=overview&range=30d')
            ->assertOk()
            ->assertJsonPath('data.kpis.active_buyers.value', 2)
            ->assertJsonPath('data.definitions.active_buyers', 'Unique Maketo accounts that placed an order during the selected period, regardless of current role.');
    }

    private function user(string $role, string $status = 'active'): User
    {
        return User::factory()->create([
            'role' => $role,
            'status' => $status,
            'email_verified_at' => now(),
        ]);
    }

    private function courier(User $user, string $slug): Courier
    {
        return Courier::create([
            'user_id' => $user->id,
            'name' => $user->display_name,
            'slug' => $slug,
            'contact_email' => $user->email,
            'contact_phone' => $user->phone,
            'active' => true,
            'status' => 'active',
            'availability_status' => 'offline',
            'approved_at' => now(),
        ]);
    }

    private function orderFor(User $user): Order
    {
        return Order::create([
            'buyer_id' => $user->id,
            'order_number' => 'SHOPPER-'.str_pad((string) (Order::query()->count() + 1), 4, '0', STR_PAD_LEFT),
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'currency' => 'PHP',
            'shipping_name' => $user->display_name,
            'shipping_phone' => $user->phone,
            'shipping_line1' => '100 Test Street',
            'shipping_city' => 'Makati City',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
            'subtotal' => 0,
            'shipping_total' => 0,
            'discount_total' => 0,
            'tax_total' => 0,
            'grand_total' => 0,
            'placed_at' => now(),
        ]);
    }
}
