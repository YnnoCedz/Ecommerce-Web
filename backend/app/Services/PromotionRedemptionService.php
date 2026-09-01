<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Promotion;
use App\Models\PromotionRedemption;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PromotionRedemptionService
{
    /** @return Collection<int, Promotion> */
    public function lockEligible(iterable $promotionIds, User $buyer): Collection
    {
        return collect($promotionIds)->filter()->unique()->sort()->values()->map(function ($promotionId) use ($buyer) {
            $promotion = Promotion::query()->lockForUpdate()->find($promotionId);
            if (! $promotion || ! $promotion->canBeUsedBy($buyer)) {
                throw ValidationException::withMessages([
                    'cart' => ['A promotion reached its redemption limit. Review your cart before placing the order.'],
                ]);
            }

            return $promotion;
        });
    }

    /** @param Collection<int, Promotion> $promotions */
    public function consumeLocked(Collection $promotions, User $buyer, Order $order): void
    {
        foreach ($promotions as $promotion) {
            $redemption = PromotionRedemption::firstOrCreate(
                ['promotion_id' => $promotion->id, 'order_id' => $order->id],
                ['buyer_id' => $buyer->id, 'redeemed_at' => now()],
            );
            if ($redemption->wasRecentlyCreated) {
                $promotion->increment('usage_count');
            }
        }
    }
}
