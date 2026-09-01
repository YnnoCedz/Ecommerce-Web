<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\PromotionRedemption;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutVoucherTest extends TestCase
{
    use RefreshDatabase;

    public function test_preview_combines_automatic_deal_and_seller_scoped_voucher_without_consuming_usage(): void
    {
        $buyer = User::factory()->create();
        $first = $this->product('voucher-first', 1000);
        $second = $this->product('voucher-second', 500);
        $deal = Promotion::create([
            'seller_id' => $first->seller_id, 'product_id' => $first->id, 'kind' => 'deal',
            'code' => 'AUTO20', 'name' => 'Automatic 20', 'type' => 'percentage', 'value' => 20,
            'starts_at' => now()->subMinute(), 'ends_at' => now()->addHour(), 'status' => 'active',
        ]);
        $voucher = $this->voucher($first->seller, 'SAVE10', ['value' => 10]);
        [$cart, $items] = $this->cart($buyer, [[$first, 800], [$second, 500]]);

        $response = $this->actingAs($buyer)->postJson('/api/checkout/preview', [
            'cart_item_ids' => $items->pluck('id')->all(), 'voucher_code' => 'save10',
        ])->assertOk()
            ->assertJsonPath('data.merchandise_total', 1500)
            ->assertJsonPath('data.product_promotion_discount_total', 200)
            ->assertJsonPath('data.voucher_discount_total', 80)
            ->assertJsonPath('data.voucher.code', 'SAVE10')
            ->assertJsonPath('data.sellers.0.items.0.automatic_promotion.id', $deal->id);

        $this->assertSame(0, $voucher->fresh()->usage_count);
        $this->assertDatabaseCount('promotion_redemptions', 0);
        $this->assertSame('active', $cart->fresh()->status);
        $this->assertGreaterThan(0, $response->json('data.grand_total'));
    }

    public function test_voucher_validation_reports_expired_exhausted_per_buyer_and_wrong_seller_states(): void
    {
        $buyer = User::factory()->create();
        $product = $this->product('voucher-validation', 1000);
        [, $items] = $this->cart($buyer, [[$product, 1000]]);
        $payload = ['cart_item_ids' => $items->pluck('id')->all()];

        $expired = $this->voucher($product->seller, 'EXPIRED', ['ends_at' => now()->subMinute()]);
        $this->actingAs($buyer)->postJson('/api/checkout/preview', [...$payload, 'voucher_code' => $expired->code])
            ->assertUnprocessable()->assertJsonPath('errors.voucher_code.0', 'This voucher has expired.');

        $exhausted = $this->voucher($product->seller, 'USEDUP', ['usage_limit' => 1, 'usage_count' => 1]);
        $this->actingAs($buyer)->postJson('/api/checkout/preview', [...$payload, 'voucher_code' => $exhausted->code])
            ->assertUnprocessable()->assertJsonPath('errors.voucher_code.0', 'This voucher has reached its usage limit.');

        $perBuyer = $this->voucher($product->seller, 'ONCE', ['per_buyer_limit' => 1]);
        $order = $this->historicalOrder($buyer);
        PromotionRedemption::create(['promotion_id' => $perBuyer->id, 'order_id' => $order->id, 'buyer_id' => $buyer->id, 'redeemed_at' => now()]);
        $this->actingAs($buyer)->postJson('/api/checkout/preview', [...$payload, 'voucher_code' => $perBuyer->code])
            ->assertUnprocessable()->assertJsonPath('errors.voucher_code.0', 'You have already reached the usage limit for this voucher.');

        $other = $this->product('voucher-other-seller', 1000);
        $wrongSeller = $this->voucher($other->seller, 'OTHERSTORE');
        $this->actingAs($buyer)->postJson('/api/checkout/preview', [...$payload, 'voucher_code' => $wrongSeller->code])
            ->assertUnprocessable()->assertJsonPath('errors.voucher_code.0', 'This voucher does not apply to the products in this checkout.');
    }

    public function test_successful_checkout_consumes_once_and_preserves_discount_snapshots(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->address(), 'is_default' => true]);
        $product = $this->product('voucher-snapshot', 1000);
        $deal = Promotion::create([
            'seller_id' => $product->seller_id, 'product_id' => $product->id, 'kind' => 'deal',
            'code' => 'SNAPDEAL', 'name' => 'Snapshot Deal', 'type' => 'percentage', 'value' => 20,
            'starts_at' => now()->subMinute(), 'ends_at' => now()->addHour(), 'status' => 'active',
        ]);
        $voucher = $this->voucher($product->seller, 'SNAP10', ['usage_limit' => 5, 'per_buyer_limit' => 1]);
        [, $items] = $this->cart($buyer, [[$product, 800]]);
        $itemId = $items->first()->id;

        $this->actingAs($buyer)->postJson('/api/checkout/preview', ['cart_item_ids' => [$itemId], 'voucher_code' => 'SNAP10'])->assertOk();
        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'cart_item_ids' => [$itemId], 'voucher_code' => 'SNAP10',
        ])->assertCreated();
        $orderId = $response->json('data.id');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId, 'voucher_promotion_id' => $voucher->id, 'voucher_code' => 'SNAP10',
            'product_promotion_discount_total' => 200, 'voucher_discount_total' => 80,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId, 'promotion_id' => $deal->id, 'promotion_name' => 'Snapshot Deal',
            'unit_price' => 800, 'regular_unit_price' => 1000, 'promotion_discount' => 200, 'voucher_discount' => 80,
        ]);
        $this->assertDatabaseHas('seller_orders', [
            'order_id' => $orderId, 'seller_id' => $product->seller_id,
            'product_promotion_discount_total' => 200, 'voucher_discount_total' => 80,
        ]);
        $this->assertDatabaseHas('promotion_redemptions', ['promotion_id' => $deal->id, 'order_id' => $orderId]);
        $this->assertDatabaseHas('promotion_redemptions', ['promotion_id' => $voucher->id, 'order_id' => $orderId]);
        $this->assertSame(1, $deal->fresh()->usage_count);
        $this->assertSame(1, $voucher->fresh()->usage_count);

        $deal->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $voucher->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $this->assertDatabaseHas('orders', ['id' => $orderId, 'voucher_code' => 'SNAP10', 'grand_total' => $response->json('data.grand_total')]);
        $this->assertDatabaseHas('order_items', ['order_id' => $orderId, 'promotion_name' => 'Snapshot Deal', 'unit_price' => 800]);
    }

    public function test_final_checkout_revalidates_voucher_after_preview(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->address(), 'is_default' => true]);
        $product = $this->product('voucher-race', 1000);
        $voucher = $this->voucher($product->seller, 'LASTONE', ['usage_limit' => 1]);
        [, $items] = $this->cart($buyer, [[$product, 1000]]);
        $itemId = $items->first()->id;

        $this->actingAs($buyer)->postJson('/api/checkout/preview', ['cart_item_ids' => [$itemId], 'voucher_code' => 'LASTONE'])->assertOk();
        $voucher->update(['usage_count' => 1]);

        $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'cart_item_ids' => [$itemId], 'voucher_code' => 'LASTONE',
        ])->assertUnprocessable()->assertJsonValidationErrors('voucher_code');
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('cart_items', ['id' => $itemId]);
    }

    public function test_explicitly_removed_voucher_is_not_restored_from_cart_during_checkout(): void
    {
        $buyer = User::factory()->create();
        $address = Address::create(['user_id' => $buyer->id, ...$this->address(), 'is_default' => true]);
        $product = $this->product('voucher-remove', 1000);
        $voucher = $this->voucher($product->seller, 'REMOVE10');
        [$cart, $items] = $this->cart($buyer, [[$product, 1000]]);
        $cart->update(['promo_code' => $voucher->code]);
        $itemId = $items->first()->id;

        $this->actingAs($buyer)->postJson('/api/checkout/preview', ['cart_item_ids' => [$itemId], 'voucher_code' => null])
            ->assertOk()->assertJsonPath('data.voucher', null)->assertJsonPath('data.voucher_discount_total', 0);
        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'cart_item_ids' => [$itemId], 'voucher_code' => null,
        ])->assertCreated()->assertJsonPath('data.discount_total', 0);

        $this->assertDatabaseHas('orders', ['id' => $response->json('data.id'), 'voucher_code' => null, 'voucher_discount_total' => 0]);
        $this->assertDatabaseMissing('promotion_redemptions', ['promotion_id' => $voucher->id]);
    }

    private function product(string $slug, float $price): Product
    {
        $sellerUser = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'slug' => $slug.'-seller', 'status' => 'approved']);
        $category = Category::create(['name' => str($slug)->headline(), 'slug' => $slug.'-category', 'active' => true]);

        return Product::create([
            'seller_id' => $seller->id, 'category_id' => $category->id, 'name' => str($slug)->headline(),
            'slug' => $slug, 'sku' => strtoupper($slug), 'price' => $price, 'status' => 'active',
            'track_inventory' => true, 'stock_quantity' => 10, 'published_at' => now(),
        ]);
    }

    private function voucher(Seller $seller, string $code, array $overrides = []): Promotion
    {
        return Promotion::create([
            'seller_id' => $seller->id, 'kind' => 'coupon', 'code' => $code, 'name' => $code,
            'type' => 'percentage', 'value' => 10, 'status' => 'active', ...$overrides,
        ]);
    }

    private function cart(User $buyer, array $products): array
    {
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $items = collect($products)->map(fn (array $entry) => CartItem::create([
            'cart_id' => $cart->id, 'seller_id' => $entry[0]->seller_id, 'product_id' => $entry[0]->id,
            'quantity' => 1, 'unit_price' => $entry[1], 'line_total' => $entry[1], 'saved_for_later' => false,
        ]));

        return [$cart, $items];
    }

    private function historicalOrder(User $buyer): Order
    {
        return Order::create([
            'buyer_id' => $buyer->id, 'order_number' => 'OLD-'.str()->random(8), 'status' => 'completed',
            'payment_status' => 'paid', 'payment_method' => 'cod', 'currency' => 'PHP',
            'shipping_name' => 'Buyer', 'shipping_phone' => '+639171234567', 'shipping_line1' => '1 Test',
            'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_postal_code' => '1000',
        ]);
    }

    private function address(): array
    {
        return [
            'label' => 'Home', 'recipient_name' => 'Buyer', 'phone' => '+639171234567',
            'line1' => '1 Test Street', 'region' => 'National Capital Region', 'province' => 'Metro Manila',
            'city' => 'Manila', 'barangay' => 'Barangay 1', 'postal_code' => '1000',
        ];
    }
}
