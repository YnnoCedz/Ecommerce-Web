<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class VoucherService
{
    /**
     * Validate and price one buyer-entered voucher against the selected checkout
     * lines. Product promotions have already been applied to each line subtotal.
     *
     * @param  Collection<int, array<string, mixed>>  $lines
     * @param  Collection<int|string, float|int>  $shippingBySeller
     * @return array{promotion: Promotion|null, code: string|null, discount_total: float, seller_discounts: array<int, float>, line_discounts: array<int, float>}
     */
    public function quote(?string $code, Collection $lines, User $buyer, Collection $shippingBySeller, bool $lock = false): array
    {
        $normalized = strtoupper(trim((string) $code));
        if ($normalized === '') {
            return $this->emptyQuote();
        }

        $query = Promotion::query()->where('kind', 'coupon')->whereRaw('UPPER(code) = ?', [$normalized]);
        if ($lock) {
            $query->lockForUpdate();
        }
        $voucher = $query->first();
        if (! $voucher) {
            $this->invalid('This voucher is invalid or unavailable.');
        }

        $status = $voucher->derivedStatus();
        if ($status === 'scheduled') {
            $this->invalid('This voucher is not active yet.');
        }
        if ($status === 'expired') {
            $this->invalid('This voucher has expired.');
        }
        if ($status === 'limit_reached') {
            $this->invalid('This voucher has reached its usage limit.');
        }
        if ($status !== 'active') {
            $this->invalid('This voucher is invalid or unavailable.');
        }
        if (! $voucher->canBeUsedBy($buyer)) {
            $this->invalid('You have already reached the usage limit for this voucher.');
        }

        $eligibleLines = $lines->filter(function (array $line) use ($voucher): bool {
            $product = $line['product'];

            return (int) $line['seller']->id === (int) $voucher->seller_id
                && (! $voucher->product_id || (int) $product->id === (int) $voucher->product_id)
                && (! $voucher->category_id || (int) $product->category_id === (int) $voucher->category_id);
        });
        if ($eligibleLines->isEmpty()) {
            $this->invalid('This voucher does not apply to the products in this checkout.');
        }

        if ($voucher->new_customers_only && Order::query()
            ->where('buyer_id', $buyer->id)
            ->where('payment_status', '!=', 'failed')
            ->whereHas('sellerOrders', fn ($query) => $query->where('seller_id', $voucher->seller_id))
            ->exists()) {
            $this->invalid('This voucher is available to new customers only.');
        }

        $eligibleSubtotal = round((float) $eligibleLines->sum('subtotal'), 2);
        if ($voucher->min_order !== null && $eligibleSubtotal < (float) $voucher->min_order) {
            $this->invalid('Minimum order of PHP '.number_format((float) $voucher->min_order, 2).' required.');
        }

        $discount = match ($voucher->type) {
            'percentage' => round($eligibleSubtotal * min(100, max(0, (float) $voucher->value)) / 100, 2),
            'fixed', 'fixed-amount' => round(min($eligibleSubtotal, max(0, (float) $voucher->value)), 2),
            'free-shipping' => round((float) ($shippingBySeller->get($voucher->seller_id) ?? 0), 2),
            default => 0.0,
        };
        if ($discount <= 0) {
            $this->invalid('This voucher is invalid or unavailable.');
        }

        $sellerId = (int) $voucher->seller_id;
        $lineDiscounts = [];
        if ($voucher->type !== 'free-shipping') {
            $allocated = 0.0;
            $eligibleLines->values()->each(function (array $line, int $index) use ($eligibleLines, $eligibleSubtotal, $discount, &$allocated, &$lineDiscounts): void {
                $amount = $index === $eligibleLines->count() - 1
                    ? round($discount - $allocated, 2)
                    : round($discount * ((float) $line['subtotal'] / max($eligibleSubtotal, 0.01)), 2);
                $allocated += $amount;
                $lineDiscounts[(int) $line['cart_item']->id] = $amount;
            });
        }

        return [
            'promotion' => $voucher,
            'code' => $normalized,
            'discount_total' => $discount,
            'seller_discounts' => [$sellerId => $discount],
            'line_discounts' => $lineDiscounts,
        ];
    }

    private function emptyQuote(): array
    {
        return ['promotion' => null, 'code' => null, 'discount_total' => 0.0, 'seller_discounts' => [], 'line_discounts' => []];
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['voucher_code' => [$message]]);
    }
}
