<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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

    public function test_wishlist_uses_the_same_active_promotion_price_as_catalog(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('wishlist-deal-product', 1000, 5);
        $product->update(['sale_price' => 900]);
        Promotion::create([
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'kind' => 'deal',
            'code' => 'WISHLIST-DEAL',
            'name' => 'Wishlist Deal',
            'type' => 'fixed-price',
            'value' => 700,
            'deal_price' => 700,
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addHour(),
            'status' => 'active',
        ]);

        $this->actingAs($buyer)->postJson('/api/wishlists', ['product_id' => $product->id])->assertCreated();
        $this->actingAs($buyer)->getJson('/api/wishlists')->assertOk()
            ->assertJsonPath('data.0.product.price', 700)
            ->assertJsonPath('data.0.product.original_price', 1000)
            ->assertJsonPath('data.0.product.pricing_source', 'promotion');
    }

    public function test_cart_rejects_unknown_promo_codes_and_normalizes_the_supported_code(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('promo-code-product', 1000, 5);
        Promotion::create([
            'seller_id' => $product->seller_id, 'kind' => 'coupon', 'code' => 'WELCOME10',
            'name' => 'Welcome 10', 'type' => 'percentage', 'value' => 10, 'status' => 'active',
        ]);
        $this->actingAs($buyer)->postJson('/api/cart/items', ['product_id' => $product->id, 'quantity' => 1])->assertOk();

        $this->actingAs($buyer)->patchJson('/api/cart/promo', ['promo_code' => 'NOTREAL'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('promo_code');

        $this->actingAs($buyer)->patchJson('/api/cart/promo', ['promo_code' => ' welcome10 '])
            ->assertOk()
            ->assertJsonPath('data.promo_code', 'WELCOME10')
            ->assertJsonPath('data.discount_total', 100)
            ->assertJsonPath('data.grand_total', 1000);
    }

    public function test_addresses_are_owned_and_keep_exactly_one_default(): void
    {
        $this->fakePsgc();
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
        Promotion::create([
            'seller_id' => $firstProduct->seller_id, 'kind' => 'coupon', 'code' => 'WELCOME10',
            'name' => 'Welcome 10', 'type' => 'percentage', 'value' => 10, 'status' => 'active',
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active', 'promo_code' => 'WELCOME10']);

        $firstCartItem = CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $firstProduct->seller_id,
            'product_id' => $firstProduct->id,
            'quantity' => 2,
            'unit_price' => 1,
            'line_total' => 2,
            'saved_for_later' => false,
        ]);
        $secondCartItem = CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $secondProduct->seller_id,
            'product_id' => $secondProduct->id,
            'quantity' => 1,
            'unit_price' => 1,
            'line_total' => 1,
            'saved_for_later' => false,
        ]);

        $checkout = [
            'address_id' => $address->id,
            'payment_method' => 'cod',
            'cart_item_ids' => [$firstCartItem->id, $secondCartItem->id],
        ];
        $this->actingAs($buyer)->postJson('/api/checkout', $checkout)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart');
        $this->assertDatabaseHas('cart_items', ['product_id' => $firstProduct->id, 'unit_price' => 1000]);
        $this->assertDatabaseCount('orders', 0);

        $response = $this->actingAs($buyer)->postJson('/api/checkout', $checkout)->assertCreated()
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
        $firstSellerOrder = SellerOrder::where('order_id', $orderId)->where('seller_id', $firstProduct->seller_id)->sole();
        $secondSellerOrder = SellerOrder::where('order_id', $orderId)->where('seller_id', $secondProduct->seller_id)->sole();
        $this->assertSame('pending', $firstSellerOrder->status);
        $this->assertSame('pending', $secondSellerOrder->status);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'seller_order_id' => $firstSellerOrder->id,
            'seller_id' => $firstProduct->seller_id,
            'product_id' => $firstProduct->id,
            'unit_price' => 1000,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'seller_order_id' => $secondSellerOrder->id,
            'seller_id' => $secondProduct->seller_id,
            'product_id' => $secondProduct->id,
        ]);
        $firstSeller = Seller::findOrFail($firstProduct->seller_id);
        $secondSeller = Seller::findOrFail($secondProduct->seller_id);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $firstSeller->user_id,
            'order_id' => $orderId,
            'seller_order_id' => $firstSellerOrder->id,
            'action_type' => 'seller_order',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $secondSeller->user_id,
            'order_id' => $orderId,
            'seller_order_id' => $secondSellerOrder->id,
            'action_type' => 'seller_order',
        ]);
        $this->actingAs($firstSeller->user)->getJson('/api/seller/orders')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstSellerOrder->id)
            ->assertJsonPath('data.0.order_id', $orderId)
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.items.0.product_id', $firstProduct->id);
        $this->actingAs($secondSeller->user)->getJson('/api/seller/orders')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondSellerOrder->id)
            ->assertJsonPath('data.0.items.0.product_id', $secondProduct->id);
        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'method' => 'cod',
            'status' => 'unpaid',
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
        $cartItem = CartItem::create([
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
            'cart_item_ids' => [$cartItem->id],
        ])->assertUnprocessable();

        $ownAddress = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $ownAddress->id,
            'payment_method' => 'bank_transfer',
            'cart_item_ids' => [$cartItem->id],
        ])->assertUnprocessable();

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $ownAddress->id,
            'payment_method' => 'cod',
            'cart_item_ids' => [$cartItem->id],
        ])->assertUnprocessable();

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 1]);
    }

    public function test_checkout_uses_selected_variant_price_and_inventory(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $product = $this->product('variant-product', 900, 3);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'VARIANT-LARGE',
            'price_override' => 1250,
            'stock_quantity' => 3,
            'active' => true,
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $cartItem = CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'quantity' => 2,
            'unit_price' => 1,
            'line_total' => 2,
            'saved_for_later' => false,
        ]);

        $checkout = [
            'address_id' => $address->id,
            'payment_method' => 'cod',
            'cart_item_ids' => [$cartItem->id],
        ];
        $this->actingAs($buyer)->postJson('/api/checkout', $checkout)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart');

        $response = $this->actingAs($buyer)->postJson('/api/checkout', $checkout)
            ->assertCreated()->assertJsonPath('data.subtotal', 2500);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_variant_id' => $variant->id,
            'variant_name' => 'Large',
            'sku' => 'VARIANT-LARGE',
            'unit_price' => 1250,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('product_variants', ['id' => $variant->id, 'stock_quantity' => 1]);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 1]);
    }

    public function test_expired_timed_deal_reprices_cart_requires_review_and_snapshots_fallback_sale(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $product = $this->product('expiring-cart-deal', 1000, 5);
        $product->update(['sale_price' => 900]);
        $promotion = Promotion::create([
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'kind' => 'deal',
            'code' => 'EXPIRING-CART',
            'name' => 'Expiring cart deal',
            'type' => 'fixed-price',
            'value' => 700,
            'deal_price' => 700,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addMinute(),
            'status' => 'active',
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $cartItem = CartItem::create(['cart_id' => $cart->id, 'seller_id' => $product->seller_id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 700, 'line_total' => 700, 'saved_for_later' => false]);
        $promotion->update(['ends_at' => now()->subSecond()]);
        $checkout = ['address_id' => $address->id, 'payment_method' => 'cod', 'cart_item_ids' => [$cartItem->id]];

        $this->actingAs($buyer)->postJson('/api/checkout', $checkout)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart');
        $this->assertDatabaseHas('cart_items', ['cart_id' => $cart->id, 'product_id' => $product->id, 'unit_price' => 900]);
        $this->assertDatabaseCount('orders', 0);

        $response = $this->actingAs($buyer)->postJson('/api/checkout', $checkout)
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 900);
        $this->assertDatabaseHas('order_items', ['order_id' => $response->json('data.id'), 'product_id' => $product->id, 'unit_price' => 900]);
    }

    public function test_checkout_atomically_consumes_a_limited_promotion(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $product = $this->product('limited-checkout-deal', 1000, 5);
        $promotion = Promotion::create([
            'seller_id' => $product->seller_id, 'product_id' => $product->id, 'kind' => 'deal',
            'code' => 'LIMITED-CHECKOUT', 'name' => 'Limited checkout deal', 'type' => 'fixed-price',
            'value' => 700, 'deal_price' => 700, 'starts_at' => now()->subMinute(),
            'ends_at' => now()->addHour(), 'usage_limit' => 1, 'per_buyer_limit' => 1, 'status' => 'active',
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $cartItem = CartItem::create(['cart_id' => $cart->id, 'seller_id' => $product->seller_id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 700, 'line_total' => 700, 'saved_for_later' => false]);

        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'cart_item_ids' => [$cartItem->id],
        ])->assertCreated()->assertJsonPath('data.subtotal', 700);

        $this->assertDatabaseHas('promotion_redemptions', [
            'promotion_id' => $promotion->id, 'order_id' => $response->json('data.id'), 'buyer_id' => $buyer->id,
        ]);
        $this->assertDatabaseHas('order_items', ['order_id' => $response->json('data.id'), 'promotion_id' => $promotion->id]);
        $this->assertDatabaseHas('promotions', ['id' => $promotion->id, 'usage_count' => 1]);
        $this->assertSame('limit_reached', $promotion->fresh()->derivedStatus());
    }

    public function test_cart_uses_primary_product_image_and_resolves_its_storage_url(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('cart-image-product', 35000, 5);
        ProductImage::create([
            'product_id' => $product->id,
            'storage_disk' => 'r2',
            'file_path' => 'products/first.png',
            'sort_order' => 0,
            'is_primary' => false,
        ]);
        ProductImage::create([
            'product_id' => $product->id,
            'storage_disk' => 'r2',
            'file_path' => 'products/primary.png',
            'sort_order' => 1,
            'is_primary' => true,
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 35000,
            'line_total' => 35000,
            'saved_for_later' => false,
        ]);

        $media = \Mockery::mock(MediaStorageService::class);
        $media->shouldReceive('publicUrl')
            ->twice()
            ->with('products/primary.png', 'r2')
            ->andReturn('https://cdn.example.test/products/primary.png');
        $this->app->instance(MediaStorageService::class, $media);

        $this->actingAs($buyer)->getJson('/api/cart')
            ->assertOk()
            ->assertJsonPath('data.items.0.image', 'https://cdn.example.test/products/primary.png')
            ->assertJsonPath('data.sellers.0.items.0.image', 'https://cdn.example.test/products/primary.png');
    }

    public function test_checkout_rolls_back_every_item_when_one_product_or_seller_is_inactive(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $available = $this->product('rollback-available', 400, 4);
        $unavailable = $this->product('rollback-unavailable', 600, 6);
        $unavailable->seller->user->update(['status' => 'suspended']);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);

        $cartItemIds = [];
        foreach ([$available, $unavailable] as $product) {
            $cartItemIds[] = CartItem::create([
                'cart_id' => $cart->id,
                'seller_id' => $product->seller_id,
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_price' => 1,
                'line_total' => 1,
                'saved_for_later' => false,
            ])->id;
        }

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
            'cart_item_ids' => $cartItemIds,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', ['id' => $available->id, 'stock_quantity' => 4]);
        $this->assertDatabaseHas('products', ['id' => $unavailable->id, 'stock_quantity' => 6]);
        $this->assertDatabaseCount('cart_items', 2);
    }

    public function test_checkout_preview_and_order_use_only_explicit_active_selection(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->addressPayload(), 'is_default' => true]);
        $selectedProduct = $this->product('selected-checkout-item', 500, 5);
        $unselectedProduct = $this->product('unselected-checkout-item', 300, 5);
        $savedProduct = $this->product('saved-checkout-item', 200, 5);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $selected = CartItem::create(['cart_id' => $cart->id, 'seller_id' => $selectedProduct->seller_id, 'product_id' => $selectedProduct->id, 'quantity' => 2, 'unit_price' => 500, 'line_total' => 1000, 'saved_for_later' => false]);
        $unselected = CartItem::create(['cart_id' => $cart->id, 'seller_id' => $unselectedProduct->seller_id, 'product_id' => $unselectedProduct->id, 'quantity' => 1, 'unit_price' => 300, 'line_total' => 300, 'saved_for_later' => false]);
        $saved = CartItem::create(['cart_id' => $cart->id, 'seller_id' => $savedProduct->seller_id, 'product_id' => $savedProduct->id, 'quantity' => 1, 'unit_price' => 200, 'line_total' => 200, 'saved_for_later' => true]);

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertUnprocessable()->assertJsonValidationErrors('cart_item_ids');

        $this->actingAs($buyer)->postJson('/api/checkout/preview', ['cart_item_ids' => [$selected->id]])
            ->assertOk()
            ->assertJsonPath('data.cart_item_ids.0', $selected->id)
            ->assertJsonPath('data.item_count', 2)
            ->assertJsonPath('data.subtotal', 1000)
            ->assertJsonPath('data.sellers.0.name', $selectedProduct->seller->trade_name ?? $selectedProduct->seller->business_name)
            ->assertJsonCount(1, 'data.sellers');

        $this->actingAs($buyer)->postJson('/api/checkout/preview', ['cart_item_ids' => [$saved->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart_item_ids');

        $order = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
            'cart_item_ids' => [$selected->id],
        ])->assertCreated()->assertJsonPath('data.item_count', 2);

        $this->assertDatabaseHas('order_items', ['order_id' => $order->json('data.id'), 'product_id' => $selectedProduct->id]);
        $this->assertDatabaseMissing('order_items', ['order_id' => $order->json('data.id'), 'product_id' => $unselectedProduct->id]);
        $this->assertDatabaseMissing('cart_items', ['id' => $selected->id]);
        $this->assertDatabaseHas('cart_items', ['id' => $unselected->id, 'saved_for_later' => false]);
        $this->assertDatabaseHas('cart_items', ['id' => $saved->id, 'saved_for_later' => true]);
        $this->assertDatabaseHas('carts', ['id' => $cart->id, 'status' => 'active']);
    }

    private function addressPayload(): array
    {
        return [
            'label' => 'Home',
            'recipient_name' => 'Buyer Test',
            'phone' => '+639171234567',
            'line1' => '10 Sample Street',
            'line2' => 'Village One',
            'region' => 'National Capital Region (NCR)',
            'region_code' => '1300000000',
            'province' => null,
            'province_code' => null,
            'city' => 'City of Makati',
            'city_code' => '1376020000',
            'barangay' => 'Barangay One',
            'barangay_code' => '1376020001',
            'postal_code' => '1200',
            'is_default' => false,
        ];
    }

    private function fakePsgc(): void
    {
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '1300000000', 'name' => 'National Capital Region (NCR)']]]),
            '*/regions/1300000000/provinces' => Http::response(['data' => []]),
            '*/regions/1300000000/cities-municipalities' => Http::response(['data' => [['code' => '1376020000', 'name' => 'City of Makati', 'zip_code' => '1200']]]),
            '*/cities-municipalities/1376020000/barangays' => Http::response(['data' => [['code' => '1376020001', 'name' => 'Barangay One', 'zip_code' => '1200']]]),
        ]);
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
