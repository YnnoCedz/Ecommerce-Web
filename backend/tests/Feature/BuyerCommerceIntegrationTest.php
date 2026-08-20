<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuyerCommerceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_wishlist_add_is_idempotent_and_remove_is_persisted(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('wishlist-product', 499, 5);

        $this->actingAs($buyer)->postJson('/api/wishlists', ['product_id' => $product->id])
            ->assertCreated()
            ->assertJsonPath('data.wishlisted', true);

        $this->actingAs($buyer)->postJson('/api/wishlists', ['product_id' => $product->id])
            ->assertOk();

        $this->assertDatabaseCount('wishlist_items', 1);

        $this->actingAs($buyer)->getJson("/api/wishlists/{$product->id}/status")
            ->assertOk()
            ->assertJsonPath('data.wishlisted', true);

        $this->actingAs($buyer)->deleteJson("/api/wishlists/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.wishlisted', false);

        $this->assertDatabaseMissing('wishlist_items', [
            'user_id' => $buyer->id,
            'product_id' => $product->id,
        ]);
    }

    public function test_addresses_are_owned_and_keep_exactly_one_default(): void
    {
        $buyer = User::factory()->create();
        $otherBuyer = User::factory()->create();

        $firstResponse = $this->actingAs($buyer)->postJson('/api/account/addresses', $this->addressPayload())
            ->assertCreated()
            ->assertJsonPath('data.is_default', true);
        $firstId = $firstResponse->json('data.id');

        $secondResponse = $this->actingAs($buyer)->postJson('/api/account/addresses', [
            ...$this->addressPayload(),
            'label' => 'Office',
            'line1' => '12 Office Street',
            'is_default' => true,
        ])->assertCreated();
        $secondId = $secondResponse->json('data.id');

        $this->assertDatabaseHas('addresses', ['id' => $firstId, 'is_default' => false]);
        $this->assertDatabaseHas('addresses', ['id' => $secondId, 'is_default' => true]);

        $this->actingAs($otherBuyer)->patchJson("/api/account/addresses/{$secondId}", $this->addressPayload())
            ->assertNotFound();

        $this->actingAs($buyer)->deleteJson("/api/account/addresses/{$secondId}")
            ->assertOk();

        $this->assertSoftDeleted('addresses', ['id' => $secondId]);
        $this->assertDatabaseHas('addresses', ['id' => $firstId, 'is_default' => true]);
    }

    public function test_checkout_creates_multi_seller_order_from_authoritative_data(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create([
            'user_id' => $buyer->id,
            ...$this->addressPayload(),
            'is_default' => true,
        ]);
        $firstProduct = $this->product('first-checkout-product', 1000, 5);
        $secondProduct = $this->product('second-checkout-product', 750, 8);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active', 'promo_code' => 'WELCOME10']);

        CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $firstProduct->seller_id,
            'product_id' => $firstProduct->id,
            'quantity' => 2,
            'unit_price' => 1,
            'line_total' => 2,
            'saved_for_later' => false,
        ]);
        CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $secondProduct->seller_id,
            'product_id' => $secondProduct->id,
            'quantity' => 1,
            'unit_price' => 1,
            'line_total' => 1,
            'saved_for_later' => false,
        ]);

        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertCreated()
            ->assertJsonPath('data.seller_order_count', 2)
            ->assertJsonPath('data.item_count', 3)
            ->assertJsonPath('data.subtotal', 2750);

        $orderId = $response->json('data.id');
        $orderNumber = $response->json('data.order_number');
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'buyer_id' => $buyer->id,
            'shipping_line1' => '10 Sample Street',
            'payment_method' => 'cod',
        ]);
        $this->assertDatabaseCount('seller_orders', 2);
        $this->assertDatabaseCount('order_items', 2);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $firstProduct->id,
            'unit_price' => 1000,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'method' => 'cod',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('products', ['id' => $firstProduct->id, 'stock_quantity' => 3]);
        $this->assertDatabaseHas('products', ['id' => $secondProduct->id, 'stock_quantity' => 7]);
        $this->assertDatabaseHas('carts', ['id' => $cart->id, 'status' => 'checked_out']);

        $this->actingAs($buyer)->getJson("/api/orders/{$orderNumber}")
            ->assertOk()
            ->assertJsonPath('data.order_number', $orderNumber)
            ->assertJsonPath('data.item_count', 3);
    }

    public function test_checkout_rejects_foreign_address_unsupported_payment_and_insufficient_stock(): void
    {
        $buyer = User::factory()->create();
        $otherBuyer = User::factory()->create();
        $foreignAddress = Address::create(['user_id' => $otherBuyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $product = $this->product('limited-product', 300, 1);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 300,
            'line_total' => 600,
            'saved_for_later' => false,
        ]);

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $foreignAddress->id,
            'payment_method' => 'cod',
        ])->assertUnprocessable();

        $ownAddress = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $ownAddress->id,
            'payment_method' => 'bank_transfer',
        ])->assertUnprocessable();

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $ownAddress->id,
            'payment_method' => 'cod',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 1]);
    }

    public function test_checkout_uses_selected_variant_price_and_inventory(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $product = $this->product('variant-product', 900, 99);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'VARIANT-LARGE',
            'price_override' => 1250,
            'stock_quantity' => 3,
            'active' => true,
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'quantity' => 2,
            'unit_price' => 1,
            'line_total' => 2,
            'saved_for_later' => false,
        ]);

        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertCreated()->assertJsonPath('data.subtotal', 2500);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_variant_id' => $variant->id,
            'unit_price' => 1250,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('product_variants', ['id' => $variant->id, 'stock_quantity' => 1]);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 99]);
    }

    private function addressPayload(): array
    {
        return [
            'label' => 'Home',
            'recipient_name' => 'Buyer Test',
            'phone' => '+639171234567',
            'line1' => '10 Sample Street',
            'line2' => 'Barangay One',
            'city' => 'Makati',
            'province' => 'Metro Manila',
            'postal_code' => '1200',
            'is_default' => false,
        ];
    }

    private function product(string $slug, float $price, int $stock): Product
    {
        $sellerUser = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'slug' => $slug.'-seller',
            'status' => 'approved',
        ]);
        $category = Category::create([
            'name' => 'Category '.$slug,
            'slug' => 'category-'.$slug,
            'active' => true,
        ]);

        return Product::create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => str($slug)->headline(),
            'slug' => $slug,
            'sku' => strtoupper($slug),
            'price' => $price,
            'status' => 'active',
            'track_inventory' => true,
            'stock_quantity' => $stock,
            'published_at' => now(),
        ]);
    }
}
