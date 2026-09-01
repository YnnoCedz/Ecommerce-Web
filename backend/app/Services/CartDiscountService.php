<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class CartDiscountService
{
    /**
     * Resolve every item in one batch so cart and checkout do not issue one
     * eligibility query per row.
     *
     * @param  Collection<int, CartItem>  $items
     * @return Collection<int, array<string, mixed>>
     */
    public function quoteItems(Collection $items, User $buyer, bool $strict = false, bool $lock = false): Collection
    {
        if ($items->isEmpty()) {
            return collect();
        }

        (new EloquentCollection($items->all()))->loadMissing(['product.variants', 'variant']);
        $productIds = $items->pluck('product_id')->filter()->unique();
        $sellerIds = $items->pluck('seller_id')->filter()->unique();
        $categoryIds = $items->pluck('product.category_id')->filter()->unique();
        $query = Promotion::query()
            ->whereIn('seller_id', $sellerIds)
            ->whereIn('kind', ['deal', 'coupon'])
            ->whereNull('cancelled_at')
            ->where('status', '!=', 'cancelled')
            ->where(function ($builder) use ($productIds, $categoryIds) {
                $builder->where(function ($deals) use ($productIds) {
                    $deals->where('kind', 'deal')->whereIn('product_id', $productIds);
                })->orWhere(function ($vouchers) use ($productIds, $categoryIds) {
                    $vouchers->where('kind', 'coupon')
                        ->where(fn ($scope) => $scope->whereNull('product_id')->orWhereIn('product_id', $productIds))
                        ->where(fn ($scope) => $scope->whereNull('category_id')->orWhereIn('category_id', $categoryIds));
                });
            })
            ->withCount(['redemptions as buyer_usage_count' => fn ($redemptions) => $redemptions->where('buyer_id', $buyer->id)]);
        if ($lock) {
            $query->lockForUpdate();
        }
        $promotions = $query->get();
        $priorSellerIds = Order::query()->where('buyer_id', $buyer->id)->where('payment_status', '!=', 'failed')
            ->join('seller_orders', 'seller_orders.order_id', '=', 'orders.id')
            ->whereIn('seller_orders.seller_id', $sellerIds)->pluck('seller_orders.seller_id')->unique();

        return $items->mapWithKeys(function (CartItem $item) use ($promotions, $priorSellerIds, $strict): array {
            $basePrice = $this->basePrice($item);
            $lineBase = round($basePrice * $item->quantity, 2);
            $options = $promotions->filter(fn (Promotion $promotion) => $this->eligible($promotion, $item, $lineBase, $priorSellerIds))
                ->map(fn (Promotion $promotion) => $this->option($promotion, $item, $basePrice))
                ->filter(fn (array $option) => $option['estimated_discount'] > 0)
                ->sortByDesc('estimated_discount')->values();

            $selected = null;
            $selectedModel = null;
            if ($item->selected_discount_type && $item->selected_discount_id) {
                $selected = $options->first(fn (array $option) => $option['type'] === $item->selected_discount_type && $option['id'] === (int) $item->selected_discount_id);
                $selectedModel = $selected ? $promotions->firstWhere('id', $selected['id']) : null;
                if (! $selected && $strict) {
                    throw ValidationException::withMessages([
                        "discounts.{$item->id}" => ['The selected discount is no longer available. Your totals have been updated; review them before placing the order.'],
                    ]);
                }
            }

            $unitPrice = $selected ? (float) $selected['estimated_final_price'] : $basePrice;

            return [$item->id => [
                'options' => $options->all(),
                'selected' => $selected,
                'selected_model' => $selectedModel,
                'base_unit_price' => $basePrice,
                'unit_price' => round($unitPrice, 2),
                'discount_amount' => round(max(0, ($basePrice - $unitPrice) * $item->quantity), 2),
            ]];
        });
    }

    private function eligible(Promotion $promotion, CartItem $item, float $lineBase, Collection $priorSellerIds): bool
    {
        if ($promotion->derivedStatus() !== 'active'
            || ($promotion->per_buyer_limit !== null && (int) $promotion->buyer_usage_count >= (int) $promotion->per_buyer_limit)) {
            return false;
        }
        if ($promotion->kind === 'deal') {
            return (int) $promotion->product_id === (int) $item->product_id;
        }

        return (int) $promotion->seller_id === (int) $item->seller_id
            && (! $promotion->product_id || (int) $promotion->product_id === (int) $item->product_id)
            && (! $promotion->category_id || (int) $promotion->category_id === (int) $item->product?->category_id)
            && ($promotion->min_order === null || $lineBase >= (float) $promotion->min_order)
            && (! $promotion->new_customers_only || ! $priorSellerIds->contains($promotion->seller_id))
            && in_array($promotion->type, ['percentage', 'fixed', 'fixed-amount'], true);
    }

    private function option(Promotion $promotion, CartItem $item, float $basePrice): array
    {
        $final = match ($promotion->type) {
            'percentage' => round($basePrice * (1 - min(99.99, max(0, (float) $promotion->value)) / 100), 2),
            'fixed-price' => $item->variant ? $basePrice : (float) ($promotion->deal_price ?? $promotion->value),
            'fixed', 'fixed-amount' => round(max(0, $basePrice - ((float) $promotion->value / max(1, $item->quantity))), 2),
            default => $basePrice,
        };
        $final = $final > 0 && $final < $basePrice ? $final : $basePrice;

        return [
            'type' => $promotion->kind === 'deal' ? 'promotion' : 'voucher',
            'id' => $promotion->id,
            'name' => $promotion->name ?? $promotion->code,
            'discount_type' => $promotion->type,
            'discount_value' => (float) $promotion->value,
            'estimated_discount' => round(($basePrice - $final) * $item->quantity, 2),
            'estimated_final_price' => $final,
            'ends_at' => $promotion->ends_at?->toISOString(),
            'minimum_spend' => $promotion->min_order !== null ? (float) $promotion->min_order : null,
        ];
    }

    private function basePrice(CartItem $item): float
    {
        $variant = $item->variant;
        $regular = (float) ($variant?->price_override ?? $item->product?->price ?? 0);
        $sale = $variant?->price_override !== null ? $variant->sale_price_override : $item->product?->sale_price;

        return $sale !== null && (float) $sale > 0 && (float) $sale < $regular ? (float) $sale : $regular;
    }
}
