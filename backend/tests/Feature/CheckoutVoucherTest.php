<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutVoucherTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_combined_selector_replaces_or_removes_an_item_discount(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('selector', 1000);
        $deal = $this->deal($product, 'DEAL20', 20);
        $voucher = $this->voucher($product->seller, 'SAVE100', 100);
        $item = $this->cartItem($buyer, $product);

        $this->actingAs($buyer)->getJson('/api/cart')->assertOk()
            ->assertJsonCount(2, 'data.items.0.eligible_discounts')
            ->assertJsonPath('data.items.0.selected_discount', null);

        $this->select($buyer, $item, 'promotion', $deal->id)->assertOk()
            ->assertJsonPath('data.items.0.selected_discount.type', 'promotion')
            ->assertJsonPath('data.items.0.unit_price', 800);
        $this->select($buyer, $item, 'voucher', $voucher->id)->assertOk()
            ->assertJsonPath('data.items.0.selected_discount.type', 'voucher')
            ->assertJsonPath('data.items.0.unit_price', 900);
        $this->actingAs($buyer)->patchJson("/api/cart/items/{$item->id}/discount", ['selected_discount' => null])
            ->assertOk()->assertJsonPath('data.items.0.selected_discount', null)->assertJsonPath('data.items.0.unit_price', 1000);

        $this->actingAs($buyer)->patchJson("/api/cart/items/{$item->id}/discount", [
            'selected_discount' => ['type' => 'promotion', 'id' => $deal->id], 'voucher_id' => $voucher->id,
        ])->assertUnprocessable();
    }

    public function test_different_items_allow_different_discounts_and_keep_seller_scope(): void
    {
        $buyer = User::factory()->create();
        $first = $this->product('first-seller', 1000);
        $second = $this->product('second-seller', 600);
        $deal = $this->deal($first, 'FIRST20', 20);
        $voucher = $this->voucher($second->seller, 'SECOND50', 50);
        $firstItem = $this->cartItem($buyer, $first);
        $secondItem = $this->cartItem($buyer, $second, $firstItem->cart);

        $cart = $this->actingAs($buyer)->getJson('/api/cart')->assertOk();
        $this->assertNotContains($voucher->id, collect($cart->json('data.items.0.eligible_discounts'))->pluck('id'));
        $this->select($buyer, $firstItem, 'promotion', $deal->id)->assertOk();
        $this->select($buyer, $secondItem, 'voucher', $voucher->id)->assertOk();

        $this->assertDatabaseHas('cart_items', ['id' => $firstItem->id, 'selected_discount_type' => 'promotion', 'selected_discount_id' => $deal->id]);
        $this->assertDatabaseHas('cart_items', ['id' => $secondItem->id, 'selected_discount_type' => 'voucher', 'selected_discount_id' => $voucher->id]);
    }

    public function test_cart_selection_survives_checkout_and_success_snapshots_and_consumes_once(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->address(), 'is_default' => true]);
        $product = $this->product('snapshot', 1000);
        $voucher = $this->voucher($product->seller, 'ITEM100', 100);
        $item = $this->cartItem($buyer, $product);
        $this->select($buyer, $item, 'voucher', $voucher->id)->assertOk();

        $this->actingAs($buyer)->postJson('/api/checkout/preview', ['mode' => 'cart', 'cart_item_ids' => [$item->id]])
            ->assertOk()->assertJsonPath('data.sellers.0.items.0.selected_discount.type', 'voucher')
            ->assertJsonPath('data.sellers.0.items.0.unit_price', 900);
        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'mode' => 'cart', 'cart_item_ids' => [$item->id],
        ])->assertCreated();

        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'), 'promotion_id' => $voucher->id,
            'discount_source_type' => 'voucher', 'promotion_name' => 'ITEM100', 'discount_type' => 'fixed-amount',
            'discount_value' => 100, 'regular_unit_price' => 1000, 'unit_price' => 900, 'voucher_discount' => 100,
        ]);
        $this->assertDatabaseHas('promotion_redemptions', ['promotion_id' => $voucher->id, 'order_id' => $response->json('data.id')]);
        $this->assertSame(1, $voucher->fresh()->usage_count);
    }

    public function test_cancelled_or_exhausted_selection_is_removed_and_final_checkout_requires_review(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->address(), 'is_default' => true]);
        $product = $this->product('invalidated', 1000);
        $deal = $this->deal($product, 'ENDING20', 20);
        $item = $this->cartItem($buyer, $product);
        $this->select($buyer, $item, 'promotion', $deal->id)->assertOk();
        $deal->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'mode' => 'cart', 'cart_item_ids' => [$item->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('cart');
        $this->assertDatabaseHas('cart_items', ['id' => $item->id, 'selected_discount_id' => null, 'unit_price' => 1000]);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_quantity_change_removes_a_voucher_that_no_longer_meets_minimum_spend(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('quantity-rule', 1000);
        $voucher = $this->voucher($product->seller, 'MIN1500', 100, ['min_order' => 1500]);
        $item = $this->cartItem($buyer, $product);
        $item->update(['quantity' => 2, 'line_total' => 2000]);
        $this->select($buyer, $item, 'voucher', $voucher->id)->assertOk();

        $this->actingAs($buyer)->patchJson("/api/cart/items/{$item->id}", ['quantity' => 1])
            ->assertOk()->assertJsonPath('data.items.0.selected_discount', null)
            ->assertJsonPath('data.items.0.unit_price', 1000);
        $this->assertDatabaseHas('cart_items', ['id' => $item->id, 'selected_discount_id' => null]);
    }

    public function test_buy_now_previews_and_orders_only_transient_item_without_mutating_existing_cart(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->address(), 'is_default' => true]);
        $cartProduct = $this->product('kept-in-cart', 500);
        $buyNowProduct = $this->product('buy-now-only', 1000);
        $sameProductCartItem = $this->cartItem($buyer, $buyNowProduct);
        $otherCartItem = $this->cartItem($buyer, $cartProduct, $sameProductCartItem->cart);
        $voucher = $this->voucher($buyNowProduct->seller, 'NOW100', 100);
        $source = [
            'mode' => 'buy_now',
            'item' => [
                'product_id' => $buyNowProduct->id,
                'product_variant_id' => null,
                'quantity' => 2,
                'selected_discount' => ['type' => 'voucher', 'id' => $voucher->id],
            ],
        ];

        $this->actingAs($buyer)->postJson('/api/checkout/preview', $source)
            ->assertOk()
            ->assertJsonPath('data.mode', 'buy_now')
            ->assertJsonPath('data.cart_item_ids', [])
            ->assertJsonCount(1, 'data.sellers.0.items')
            ->assertJsonPath('data.sellers.0.items.0.product_id', $buyNowProduct->id)
            ->assertJsonPath('data.sellers.0.items.0.quantity', 2)
            ->assertJsonPath('data.sellers.0.items.0.selected_discount.type', 'voucher');

        $this->assertDatabaseCount('cart_items', 2);
        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            ...$source,
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertCreated()->assertJsonPath('data.item_count', 2);

        $this->assertDatabaseHas('cart_items', ['id' => $sameProductCartItem->id, 'quantity' => 1]);
        $this->assertDatabaseHas('cart_items', ['id' => $otherCartItem->id, 'quantity' => 1]);
        $this->assertDatabaseCount('cart_items', 2);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_id' => $buyNowProduct->id,
            'quantity' => 2,
            'discount_source_type' => 'voucher',
        ]);
        $this->assertDatabaseMissing('order_items', [
            'order_id' => $response->json('data.id'),
            'product_id' => $cartProduct->id,
        ]);
    }

    private function select(User $buyer, CartItem $item, string $type, int $id)
    {
        return $this->actingAs($buyer)->patchJson("/api/cart/items/{$item->id}/discount", [
            'selected_discount' => ['type' => $type, 'id' => $id],
        ]);
    }

    private function product(string $slug, float $price): Product
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'slug' => $slug.'-seller', 'status' => 'approved']);
        $category = Category::create(['name' => $slug, 'slug' => $slug, 'active' => true]);

        return Product::create(['seller_id' => $seller->id, 'category_id' => $category->id, 'name' => $slug, 'slug' => $slug, 'sku' => strtoupper($slug), 'price' => $price, 'status' => 'active', 'track_inventory' => true, 'stock_quantity' => 10, 'published_at' => now()]);
    }

    private function deal(Product $product, string $code, float $percent): Promotion
    {
        return Promotion::create(['seller_id' => $product->seller_id, 'product_id' => $product->id, 'kind' => 'deal', 'code' => $code, 'name' => $code, 'type' => 'percentage', 'value' => $percent, 'starts_at' => now()->subMinute(), 'ends_at' => now()->addHour(), 'status' => 'active']);
    }

    private function voucher(Seller $seller, string $code, float $amount, array $overrides = []): Promotion
    {
        return Promotion::create(['seller_id' => $seller->id, 'kind' => 'coupon', 'code' => $code, 'name' => $code, 'type' => 'fixed-amount', 'value' => $amount, 'usage_limit' => 10, 'per_buyer_limit' => 1, 'status' => 'active', ...$overrides]);
    }

    private function cartItem(User $buyer, Product $product, ?Cart $cart = null): CartItem
    {
        $cart ??= Cart::create(['user_id' => $buyer->id, 'status' => 'active']);

        return CartItem::create(['cart_id' => $cart->id, 'seller_id' => $product->seller_id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => $product->price, 'line_total' => $product->price]);
    }

    private function address(): array
    {
        return ['label' => 'Home', 'recipient_name' => 'Buyer', 'phone' => '+639171234567', 'line1' => '1 Test Street', 'region' => 'NCR', 'province' => 'Metro Manila', 'city' => 'Manila', 'barangay' => 'One', 'postal_code' => '1000'];
    }
}
