<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\User;

class ProductPricingService
{
    public function for(Product $product, ?ProductVariant $variant = null, ?User $buyer = null): array
    {
        $variantHasRegularPrice = $variant?->price_override !== null;
        $regularPrice = (float) ($variantHasRegularPrice
            ? $variant->price_override
            : $product->price);
        $salePrice = $variantHasRegularPrice
            ? $this->validSalePrice($variant?->sale_price_override, $regularPrice)
            : $this->validSalePrice($product->sale_price, $regularPrice);
        $normalPrice = $salePrice ?? $regularPrice;
        $promotion = $product->relationLoaded('activePromotion')
            ? $product->activePromotion
            : $product->activePromotion()->first();
        $promotionPrice = $this->promotionPrice($product, $variant, $promotion, $normalPrice, $buyer);
        $appliedPromotion = $promotionPrice !== null ? $promotion : null;
        $effectivePrice = $promotionPrice ?? $normalPrice;
        $discountAmount = round(max(0, $regularPrice - $effectivePrice), 2);

        return [
            'regular_price' => $regularPrice,
            'sale_price' => $salePrice,
            'promotion_price' => $promotionPrice,
            'normal_price' => $normalPrice,
            'effective_price' => $effectivePrice,
            'original_price' => $effectivePrice < $regularPrice ? $regularPrice : null,
            'discount_amount' => $discountAmount,
            'discount_percentage' => $regularPrice > 0 && $effectivePrice < $regularPrice
                ? (int) round((1 - ($effectivePrice / $regularPrice)) * 100)
                : 0,
            'pricing_source' => $promotionPrice !== null ? 'promotion' : ($salePrice !== null ? 'sale' : 'regular'),
            'promotion' => $appliedPromotion instanceof Promotion ? $appliedPromotion : null,
        ];
    }

    private function promotionPrice(Product $product, ?ProductVariant $variant, ?Promotion $promotion, float $normalPrice, ?User $buyer): ?float
    {
        if (! $promotion instanceof Promotion || ! $promotion->canBeUsedBy($buyer) || $product->status !== 'active' || $product->trashed()) {
            return null;
        }

        if ($promotion->type === 'percentage') {
            $percentage = is_numeric($promotion->value) ? (float) $promotion->value : 0.0;

            return $percentage > 0 && $percentage < 100
                ? $this->validSalePrice(round($normalPrice * (1 - ($percentage / 100)), 2), $normalPrice)
                : null;
        }

        // A single fixed product price is ambiguous when variants have different prices.
        // Seller validation prevents new records like this; this guard also makes legacy
        // or manually inserted rows fail closed instead of showing an incorrect deal.
        if ($promotion->type !== 'fixed-price' || $variant || $this->hasActiveVariants($product)) {
            return null;
        }

        return $this->validSalePrice($promotion->deal_price ?? $promotion->value, $normalPrice);
    }

    private function hasActiveVariants(Product $product): bool
    {
        if ($product->relationLoaded('variants')) {
            return $product->variants->contains(fn (ProductVariant $variant) => (bool) $variant->active);
        }

        if (array_key_exists('has_active_variants', $product->getAttributes())) {
            return (bool) $product->getAttribute('has_active_variants');
        }

        return $product->variants()->where('active', true)->exists();
    }

    private function validSalePrice(mixed $candidate, float $regularPrice): ?float
    {
        if ($candidate === null || ! is_numeric($candidate)) {
            return null;
        }

        $salePrice = (float) $candidate;

        return $salePrice > 0 && $salePrice < $regularPrice ? $salePrice : null;
    }
}
