<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\PromotionRedemption;
use App\Models\Seller;
use App\Models\User;
use App\Services\ProductPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimedPromotionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_promotions_listing_is_authorized_scoped_and_historical_record_safe(): void
    {
        [$user, $seller, $product] = $this->sellerProduct();
        [, $otherSeller, $otherProduct] = $this->sellerProduct();

        Promotion::create([
            'seller_id' => $seller->id,
            'product_id' => null,
            'kind' => 'coupon',
            'code' => 'LEGACY-UNLIMITED',
            'name' => 'Historical unlimited promotion',
            'type' => 'percentage',
            'value' => 10,
            'usage_limit' => null,
            'per_buyer_limit' => null,
            'status' => 'active',
            'applies_to_label' => 'Historical products',
        ]);
        $limited = $this->promotion($seller, $product, now()->subMinute(), now()->addHour(), 700);
        $limited->update(['usage_limit' => 20, 'per_buyer_limit' => 1]);
        $this->promotion($otherSeller, $otherProduct, now()->subMinute(), now()->addHour(), 600);

        $this->getJson('/api/seller/promotions')->assertUnauthorized();
        $this->actingAs(User::factory()->create(['role' => 'buyer', 'status' => 'active']))
            ->getJson('/api/seller/promotions')->assertForbidden();

        $response = $this->actingAs($user)->getJson('/api/seller/promotions')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($limited->id));
        $this->assertFalse($ids->contains(Promotion::where('seller_id', $otherSeller->id)->value('id')));
        $response->assertJsonFragment([
            'name' => 'Historical unlimited promotion',
            'usage_limit' => null,
            'per_buyer_limit' => null,
            'product' => null,
        ]);
    }

    public function test_seller_with_no_promotions_receives_an_empty_list(): void
    {
        [$user] = $this->sellerProduct();

        $this->actingAs($user)->getJson('/api/seller/promotions')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_deleted_promotion_product_is_serialized_as_null(): void
    {
        [$user, $seller, $product] = $this->sellerProduct();
        $promotion = $this->promotion($seller, $product, now()->subMinute(), now()->addHour(), 700);
        $promotion->update(['applies_to_label' => $product->name]);
        $product->forceDelete();

        $this->actingAs($user)->getJson('/api/seller/promotions')
            ->assertOk()
            ->assertJsonPath('data.0.id', $promotion->id)
            ->assertJsonPath('data.0.product', null)
            ->assertJsonPath('data.0.applies_to', $product->name);
    }

    public function test_seller_can_create_a_scheduled_deal_for_owned_product(): void
    {
        [$user, $seller, $product] = $this->sellerProduct();

        $this->actingAs($user)->postJson('/api/seller/promotions', [
            'product_id' => $product->id, 'name' => 'Weekend Deal', 'deal_price' => 700,
            'starts_at' => now()->addHour()->toISOString(), 'ends_at' => now()->addHours(3)->toISOString(),
        ])->assertCreated()->assertJsonPath('data.status', 'scheduled')->assertJsonPath('data.deal_price', 700);

        $this->assertDatabaseHas('promotions', ['seller_id' => $seller->id, 'product_id' => $product->id, 'kind' => 'deal']);
    }

    public function test_seller_cannot_promote_another_sellers_product_or_overlap_periods(): void
    {
        [$user, , $product] = $this->sellerProduct();
        [, , $otherProduct] = $this->sellerProduct();
        $payload = ['name' => 'Deal', 'deal_price' => 700, 'starts_at' => now()->addHour()->toISOString(), 'ends_at' => now()->addHours(3)->toISOString()];

        $this->actingAs($user)->postJson('/api/seller/promotions', [...$payload, 'product_id' => $otherProduct->id])->assertUnprocessable();
        $this->actingAs($user)->postJson('/api/seller/promotions', [...$payload, 'product_id' => $product->id])->assertCreated();
        $this->actingAs($user)->postJson('/api/seller/promotions', [...$payload, 'product_id' => $product->id])->assertUnprocessable();
    }

    public function test_only_active_non_cancelled_deals_are_public_and_priced(): void
    {
        [, $seller, $active] = $this->sellerProduct();
        $active->update(['sale_price' => 900]);
        [, , $scheduled] = $this->sellerProduct();
        [, , $expired] = $this->sellerProduct();
        $this->promotion($seller, $active, now()->subHour(), now()->addHour(), 700);
        $this->promotion($scheduled->seller, $scheduled, now()->addHour(), now()->addHours(2), 600);
        $this->promotion($expired->seller, $expired, now()->subHours(2), now()->subHour(), 500);

        $this->getJson('/api/deals')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $active->id)->assertJsonPath('data.0.price', 700)->assertJsonPath('data.0.badge', 'DEAL');
        $this->assertSame(700.0, app(ProductPricingService::class)->for($active)['effective_price']);

        Promotion::where('product_id', $active->id)->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $this->assertSame(900.0, app(ProductPricingService::class)->for($active->fresh())['effective_price']);
        $this->getJson('/api/deals')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_percentage_deal_uses_each_variant_price_and_returns_normalized_metadata(): void
    {
        [, $seller, $product] = $this->sellerProduct();
        $first = ProductVariant::create(['product_id' => $product->id, 'name' => '64 GB', 'sku' => 'DEAL-64', 'price_override' => 35990, 'stock_quantity' => 5, 'active' => true]);
        $second = ProductVariant::create(['product_id' => $product->id, 'name' => '256 GB', 'sku' => 'DEAL-256', 'price_override' => 45990, 'stock_quantity' => 5, 'active' => true]);
        Promotion::create(['seller_id' => $seller->id, 'product_id' => $product->id, 'kind' => 'deal', 'code' => 'VARIANT20', 'name' => 'Variant Deal', 'type' => 'percentage', 'value' => 20, 'deal_price' => null, 'starts_at' => now()->subMinute(), 'ends_at' => now()->addHour(), 'status' => 'active']);

        $pricing = app(ProductPricingService::class);
        $this->assertSame(28792.0, $pricing->for($product->fresh(), $first)['effective_price']);
        $this->assertSame(36792.0, $pricing->for($product->fresh(), $second)['effective_price']);

        $response = $this->getJson("/api/products/{$product->slug}")->assertOk();
        $response->assertJsonPath('data.variants.0.pricing_source', 'promotion')
            ->assertJsonPath('data.variants.0.discount_percentage', 20)
            ->assertJsonPath('data.variants.1.price', 36792)
            ->assertJsonPath('data.promotion.type', 'percentage');
    }

    public function test_fixed_price_deal_is_rejected_for_variant_products(): void
    {
        [$user, , $product] = $this->sellerProduct();
        ProductVariant::create(['product_id' => $product->id, 'name' => 'Large', 'sku' => 'FIXED-L', 'price_override' => 1200, 'stock_quantity' => 5, 'active' => true]);

        $this->actingAs($user)->postJson('/api/seller/promotions', [
            'product_id' => $product->id,
            'name' => 'Ambiguous fixed deal',
            'type' => 'fixed-price',
            'value' => 700,
            'deal_price' => 700,
            'starts_at' => now()->addHour()->toISOString(),
            'ends_at' => now()->addHours(2)->toISOString(),
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Products with variants must use a percentage deal so each variant keeps its own price basis.');

        $this->assertDatabaseCount('promotions', 0);
    }

    public function test_sale_price_resumes_after_a_promotion_expires(): void
    {
        [, $seller, $product] = $this->sellerProduct();
        $product->update(['price' => 35990, 'sale_price' => 33990]);
        $promotion = $this->promotion($seller, $product, now()->subHour(), now()->addHour(), 30990);
        $pricing = app(ProductPricingService::class);

        $active = $pricing->for($product->fresh());
        $this->assertSame(30990.0, $active['effective_price']);
        $this->assertSame(35990.0, $active['original_price']);
        $this->assertSame('promotion', $active['pricing_source']);

        $promotion->update(['ends_at' => now()->subSecond()]);
        $expired = $pricing->for($product->fresh());
        $this->assertSame(33990.0, $expired['effective_price']);
        $this->assertSame(35990.0, $expired['original_price']);
        $this->assertSame('sale', $expired['pricing_source']);
    }

    public function test_out_of_stock_and_ambiguous_legacy_fixed_deals_are_not_listed(): void
    {
        [, $seller, $outOfStock] = $this->sellerProduct();
        $outOfStock->update(['stock_quantity' => 0, 'track_inventory' => true]);
        $this->promotion($seller, $outOfStock, now()->subHour(), now()->addHour(), 700);

        [, $otherSeller, $variantProduct] = $this->sellerProduct();
        ProductVariant::create(['product_id' => $variantProduct->id, 'name' => 'Large', 'sku' => 'LEGACY-L', 'price_override' => 1200, 'stock_quantity' => 5, 'active' => true]);
        $this->promotion($otherSeller, $variantProduct, now()->subHour(), now()->addHour(), 700);

        $this->getJson('/api/deals')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_seller_can_create_combined_time_and_usage_limits(): void
    {
        [$user, $seller, $product] = $this->sellerProduct();

        $this->actingAs($user)->postJson('/api/seller/promotions', [
            'product_id' => $product->id,
            'name' => 'Five minute limited deal',
            'type' => 'percentage',
            'value' => 20,
            'starts_at' => now()->toISOString(),
            'ends_at' => now()->addMinutes(5)->toISOString(),
            'usage_limit' => 20,
            'per_buyer_limit' => 1,
        ])->assertCreated()
            ->assertJsonPath('data.usage_limit', 20)
            ->assertJsonPath('data.per_buyer_limit', 1);

        $this->assertDatabaseHas('promotions', [
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'usage_limit' => 20,
            'per_buyer_limit' => 1,
        ]);
    }

    public function test_invalid_usage_limits_are_rejected(): void
    {
        [$user, , $product] = $this->sellerProduct();
        $payload = [
            'product_id' => $product->id,
            'name' => 'Limited deal',
            'type' => 'percentage',
            'value' => 20,
            'starts_at' => now()->addMinute()->toISOString(),
            'ends_at' => now()->addHour()->toISOString(),
        ];

        $this->actingAs($user)->postJson('/api/seller/promotions', [...$payload, 'usage_limit' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('usage_limit');
        $this->actingAs($user)->postJson('/api/seller/promotions', [...$payload, 'usage_limit' => 2, 'per_buyer_limit' => 3])
            ->assertUnprocessable()->assertJsonPath('message', 'The per-buyer limit cannot exceed the total redemption limit.');
    }

    public function test_exhausted_and_buyer_limited_promotions_fail_closed_in_pricing(): void
    {
        [, $seller, $product] = $this->sellerProduct();
        $buyer = User::factory()->create(['role' => 'buyer']);
        $promotion = $this->promotion($seller, $product, now()->subMinute(), now()->addHour(), 700);
        $promotion->update(['usage_limit' => 2, 'usage_count' => 1, 'per_buyer_limit' => 1]);
        $order = Order::create([
            'buyer_id' => $buyer->id, 'order_number' => 'PROMO-TEST-'.uniqid(), 'status' => 'pending',
            'payment_status' => 'paid', 'currency' => 'PHP', 'shipping_name' => 'Test Buyer',
            'shipping_phone' => '+639171234567', 'shipping_line1' => 'Test Address',
            'shipping_city' => 'Makati', 'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200', 'subtotal' => 700, 'grand_total' => 700,
        ]);
        PromotionRedemption::create(['promotion_id' => $promotion->id, 'order_id' => $order->id, 'buyer_id' => $buyer->id, 'redeemed_at' => now()]);

        $pricing = app(ProductPricingService::class);
        $this->assertSame(700.0, $pricing->for($product->fresh())['effective_price']);
        $this->assertSame(1000.0, $pricing->for($product->fresh(), null, $buyer)['effective_price']);

        $promotion->update(['usage_count' => 2]);
        $this->assertSame('limit_reached', $promotion->fresh()->derivedStatus());
        $this->assertSame(1000.0, $pricing->for($product->fresh())['effective_price']);
    }

    public function test_active_and_scheduled_promotions_can_be_cancelled_once_and_are_audited(): void
    {
        [$user, $seller, $activeProduct] = $this->sellerProduct();
        $active = $this->promotion($seller, $activeProduct, now()->subMinute(), now()->addHour(), 700);
        [, , $scheduledProduct] = $this->sellerProduct();
        $scheduledProduct->update(['seller_id' => $seller->id]);
        $scheduled = $this->promotion($seller, $scheduledProduct, now()->addHour(), now()->addHours(2), 600);

        $this->assertSame(700.0, app(ProductPricingService::class)->for($activeProduct)['effective_price']);
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$active->id}/cancel")
            ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.can_reactivate', true);
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$scheduled->id}/cancel")
            ->assertOk()->assertJsonPath('data.status', 'cancelled');

        $this->assertSame(1000.0, app(ProductPricingService::class)->for($activeProduct->fresh())['effective_price']);
        $this->assertDatabaseHas('promotions', ['id' => $active->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'promotion.cancelled', 'subject_id' => $active->id, 'user_id' => $user->id]);
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$active->id}/cancel")->assertStatus(409);
    }

    public function test_reactivation_derives_active_or_scheduled_and_preserves_usage_history(): void
    {
        [$user, $seller, $activeProduct] = $this->sellerProduct();
        $active = $this->promotion($seller, $activeProduct, now()->subMinute(), now()->addHour(), 700);
        $active->update(['usage_limit' => 20, 'usage_count' => 7]);
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$active->id}/cancel")->assertOk();
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$active->id}/reactivate")
            ->assertOk()->assertJsonPath('data.status', 'active')->assertJsonPath('data.usage_count', 7);

        [, , $futureProduct] = $this->sellerProduct();
        $futureProduct->update(['seller_id' => $seller->id]);
        $future = $this->promotion($seller, $futureProduct, now()->addHour(), now()->addHours(2), 600);
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$future->id}/cancel")->assertOk();
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$future->id}/reactivate")
            ->assertOk()->assertJsonPath('data.status', 'scheduled');

        $this->assertDatabaseHas('activity_logs', ['event_type' => 'promotion.reactivated', 'subject_id' => $active->id, 'user_id' => $user->id]);
        $this->assertSame(7, $active->fresh()->usage_count);
    }

    public function test_reactivation_rejects_expired_exhausted_and_invalid_product_promotions(): void
    {
        [$user, $seller, $expiredProduct] = $this->sellerProduct();
        $expired = $this->promotion($seller, $expiredProduct, now()->subHours(2), now()->subHour(), 700);
        $expired->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        [, , $exhaustedProduct] = $this->sellerProduct();
        $exhaustedProduct->update(['seller_id' => $seller->id]);
        $exhausted = $this->promotion($seller, $exhaustedProduct, now()->subMinute(), now()->addHour(), 600);
        $exhausted->update(['status' => 'cancelled', 'cancelled_at' => now(), 'usage_limit' => 20, 'usage_count' => 20]);

        [, , $deletedProduct] = $this->sellerProduct();
        $deletedProduct->update(['seller_id' => $seller->id]);
        $invalid = $this->promotion($seller, $deletedProduct, now()->subMinute(), now()->addHour(), 500);
        $invalid->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $deletedProduct->forceDelete();

        $this->actingAs($user)->patchJson("/api/seller/promotions/{$expired->id}/reactivate")
            ->assertStatus(409)->assertJsonPath('message', 'Promotion schedule has already ended. Set a new schedule before reactivating.');
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$exhausted->id}/reactivate")
            ->assertStatus(409)->assertJsonPath('message', 'Promotion usage limit has been reached. Increase the limit before reactivating.');
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$invalid->id}/reactivate")
            ->assertStatus(409)->assertJsonPath('message', 'The promotion product is no longer active or available.');

        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_reactivation_preserves_per_buyer_redemption_history(): void
    {
        [$user, $seller, $product] = $this->sellerProduct();
        $buyer = User::factory()->create(['role' => 'buyer']);
        $promotion = $this->promotion($seller, $product, now()->subMinute(), now()->addHour(), 700);
        $promotion->update(['usage_limit' => 20, 'usage_count' => 1, 'per_buyer_limit' => 1]);
        $order = Order::create([
            'buyer_id' => $buyer->id, 'order_number' => 'REACTIVATE-'.uniqid(), 'status' => 'pending',
            'payment_status' => 'paid', 'currency' => 'PHP', 'shipping_name' => 'Test Buyer',
            'shipping_phone' => '+639171234567', 'shipping_line1' => 'Test Address',
            'shipping_city' => 'Makati', 'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200', 'subtotal' => 700, 'grand_total' => 700,
        ]);
        PromotionRedemption::create(['promotion_id' => $promotion->id, 'order_id' => $order->id, 'buyer_id' => $buyer->id, 'redeemed_at' => now()]);

        $this->actingAs($user)->patchJson("/api/seller/promotions/{$promotion->id}/cancel")->assertOk();
        $this->actingAs($user)->patchJson("/api/seller/promotions/{$promotion->id}/reactivate")->assertOk();

        $this->assertDatabaseCount('promotion_redemptions', 1);
        $this->assertSame(1000.0, app(ProductPricingService::class)->for($product->fresh(), null, $buyer)['effective_price']);
    }

    public function test_promotion_lifecycle_endpoints_enforce_role_and_ownership(): void
    {
        [$owner, $seller, $product] = $this->sellerProduct();
        $promotion = $this->promotion($seller, $product, now()->subMinute(), now()->addHour(), 700);
        [$otherSellerUser] = $this->sellerProduct();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->patchJson("/api/seller/promotions/{$promotion->id}/cancel")->assertUnauthorized();
        $this->actingAs($buyer)->patchJson("/api/seller/promotions/{$promotion->id}/cancel")->assertForbidden();
        $this->actingAs($otherSellerUser)->patchJson("/api/seller/promotions/{$promotion->id}/cancel")->assertNotFound();
        $this->actingAs($owner)->patchJson("/api/seller/promotions/{$promotion->id}/cancel")->assertOk();
        $this->actingAs($otherSellerUser)->patchJson("/api/seller/promotions/{$promotion->id}/reactivate")->assertNotFound();
    }

    private function sellerProduct(): array
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active', 'email_verified_at' => now()]);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);
        $product = Product::factory()->create(['seller_id' => $seller->id, 'status' => 'active', 'price' => 1000, 'sale_price' => null, 'track_inventory' => true, 'stock_quantity' => 10]);

        return [$user, $seller, $product];
    }

    private function promotion(Seller $seller, Product $product, $startsAt, $endsAt, float $price): Promotion
    {
        return Promotion::create(['seller_id' => $seller->id, 'product_id' => $product->id, 'kind' => 'deal', 'code' => 'D'.uniqid(), 'name' => 'Timed Deal', 'type' => 'fixed-price', 'value' => $price, 'deal_price' => $price, 'starts_at' => $startsAt, 'ends_at' => $endsAt, 'status' => 'active']);
    }
}
