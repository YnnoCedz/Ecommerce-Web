<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\Seller;
use App\Models\User;
use App\Services\ProductPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimedPromotionsTest extends TestCase
{
    use RefreshDatabase;

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
