<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly PaymentService $payments,
        private readonly MediaStorageService $media,
        private readonly PromotionRedemptionService $redemptions,
        private readonly CartDiscountService $cartDiscounts,
    ) {}

    public function checkout(User $buyer, array $data): Order
    {
        $isCartCheckout = $data['mode'] === 'cart';
        $priceChanges = $isCartCheckout ? $this->synchronizeCartPrices($buyer, $data) : [];
        if ($priceChanges !== []) {
            throw ValidationException::withMessages([
                'cart' => ['Prices changed for: '.implode(', ', $priceChanges).'. Your cart was updated; please review it before placing the order.'],
            ]);
        }

        return DB::transaction(function () use ($buyer, $data, $isCartCheckout) {
            $address = Address::query()
                ->where('user_id', $buyer->id)
                ->whereKey($data['address_id'])
                ->lockForUpdate()
                ->first();

            if (! $address) {
                throw ValidationException::withMessages([
                    'address_id' => ['The selected delivery address is not available.'],
                ]);
            }

            if (collect([$address->recipient_name, $address->phone, $address->line1, $address->city, $address->postal_code])
                ->contains(fn ($value) => blank($value))) {
                throw ValidationException::withMessages([
                    'address_id' => ['Complete the required shipping details for the selected address before placing the order.'],
                ]);
            }

            [$cart, $cartItems] = $this->resolveCheckoutItems($buyer, $data, true);

            $checkoutLines = $this->buildCheckoutLines($cartItems, $buyer, true);
            $groups = $checkoutLines->groupBy(fn (array $line) => $line['seller']->id);
            $subtotal = round((float) $checkoutLines->sum('subtotal'), 2);
            $shippingBySeller = $groups->map(fn (Collection $lines) => $this->shippingForGroup($lines));
            $shippingTotal = round((float) $shippingBySeller->sum(), 2);
            $discountTotal = 0.0;
            $productPromotionDiscountTotal = round((float) $checkoutLines->sum('promotion_discount'), 2);
            $voucherDiscountTotal = round((float) $checkoutLines->sum('voucher_discount'), 2);
            $grandTotal = round($subtotal + $shippingTotal, 2);

            $order = Order::create([
                'buyer_id' => $buyer->id,
                'voucher_promotion_id' => null,
                'voucher_code' => null,
                'order_number' => $this->nextOrderNumber(),
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $data['payment_method'],
                'currency' => 'PHP',
                'shipping_name' => $address->recipient_name,
                'shipping_phone' => $address->phone,
                'shipping_line1' => $address->line1,
                'shipping_line2' => $address->line2,
                'shipping_city' => $address->city,
                'shipping_province' => $address->province ?: $address->region,
                'shipping_postal_code' => $address->postal_code,
                'subtotal' => $subtotal,
                'shipping_total' => $shippingTotal,
                'discount_total' => $discountTotal,
                'product_promotion_discount_total' => $productPromotionDiscountTotal,
                'voucher_discount_total' => $voucherDiscountTotal,
                'tax_total' => 0,
                'grand_total' => $grandTotal,
                'buyer_notes' => $data['buyer_notes'] ?? null,
                'placed_at' => now(),
            ]);

            foreach ($groups as $lines) {
                $seller = $lines->first()['seller'];
                $sellerSubtotal = round((float) $lines->sum('subtotal'), 2);
                $shippingFee = $this->shippingForGroup($lines);
                $sellerDiscount = 0.0;
                $sellerPromotionDiscount = round((float) $lines->sum('promotion_discount'), 2);
                $sellerVoucherDiscount = round((float) $lines->sum('voucher_discount'), 2);

                $sellerOrder = SellerOrder::create([
                    'order_id' => $order->id,
                    'seller_id' => $seller->id,
                    'status' => 'pending',
                    'subtotal' => $sellerSubtotal,
                    'shipping_fee' => $shippingFee,
                    'discount_total' => $sellerDiscount,
                    'product_promotion_discount_total' => $sellerPromotionDiscount,
                    'voucher_discount_total' => $sellerVoucherDiscount,
                    'grand_total' => round($sellerSubtotal + $shippingFee - $sellerDiscount, 2),
                ]);

                foreach ($lines as $line) {
                    $product = $line['product'];
                    $variant = $line['variant'];
                    $primaryImage = $product->images->sortBy('sort_order')->first();
                    $snapshot = $primaryImage
                        ? $this->media->snapshotPublicFile(
                            (string) $primaryImage->file_path,
                            "orders/{$order->id}/items",
                            $primaryImage->storage_disk ?: 'r2',
                        )
                        : null;

                    $order->items()->create([
                        'seller_order_id' => $sellerOrder->id,
                        'seller_id' => $seller->id,
                        'product_id' => $product->id,
                        'product_variant_id' => $variant?->id,
                        'promotion_id' => $line['promotion']?->id,
                        'discount_source_type' => $line['discount_source_type'],
                        'promotion_name' => $line['promotion']?->name ?? $line['promotion']?->code,
                        'discount_type' => $line['selected_discount_details']['discount_type'] ?? null,
                        'discount_value' => $line['selected_discount_details']['discount_value'] ?? null,
                        'product_name' => $product->name,
                        'product_slug' => $product->slug,
                        'variant_name' => $variant?->name,
                        'sku' => $variant?->sku ?? $product->sku,
                        'product_image_storage_disk' => $snapshot['storage_disk'] ?? $primaryImage?->storage_disk,
                        'product_image_storage_path' => $snapshot['storage_path'] ?? $primaryImage?->file_path,
                        'unit_price' => $line['unit_price'],
                        'regular_unit_price' => $line['normal_price'],
                        'promotion_discount' => $line['promotion_discount'],
                        'voucher_discount' => $line['voucher_discount'],
                        'quantity' => $line['quantity'],
                        'subtotal' => $line['subtotal'],
                    ]);

                    if ($product->track_inventory) {
                        if ($variant) {
                            $variant->decrement('stock_quantity', $line['quantity']);
                            $product->decrement('stock_quantity', $line['quantity']);
                        } else {
                            $product->decrement('stock_quantity', $line['quantity']);
                        }
                    }
                }

                if ($seller->user) {
                    $this->notifications->publishToUser($seller->user, [
                        'category' => 'order',
                        'title' => 'New order received',
                        'body' => "Order {$order->order_number} is ready for seller review.",
                        'action_type' => 'seller_order',
                        'action_label' => 'View order',
                        'order_id' => $order->id,
                        'seller_order_id' => $sellerOrder->id,
                    ]);
                }
            }

            $payment = $this->payments->charge($order, $buyer, $data['payment_method'], $data['payment_details'] ?? []);
            $order->forceFill(['payment_status' => $payment->status])->save();

            if ($payment->status !== 'failed') {
                $promotions = $this->redemptions->lockEligible([
                    ...$checkoutLines->pluck('promotion.id')->filter()->all(),
                    ...$checkoutLines->where('discount_source_type', 'voucher')->pluck('promotion.id')->filter()->all(),
                ], $buyer);
                $this->redemptions->consumeLocked($promotions, $buyer, $order);
            }

            $this->notifications->publishToUser($buyer, [
                'category' => 'order',
                'title' => $payment->status === 'failed' ? 'Payment failed' : 'Order placed',
                'body' => $payment->status === 'failed'
                    ? "The demo payment for {$order->order_number} failed. You can retry from the order page."
                    : "Your order {$order->order_number} was placed successfully.",
                'action_type' => 'buyer_order',
                'action_label' => 'View order',
                'order_id' => $order->id,
            ]);

            if (! $isCartCheckout) {
                return $order->fresh()->load(['items', 'sellerOrders.seller', 'payments']);
            }

            CartItem::query()->whereIn('id', $cartItems->modelKeys())->delete();

            if (! CartItem::query()->where('cart_id', $cart->id)->exists()) {
                $cart->update([
                    'status' => 'checked_out',
                    'subtotal' => 0,
                    'shipping_total' => 0,
                    'discount_total' => 0,
                    'grand_total' => 0,
                    'last_checked_out_at' => now(),
                ]);
            } else {
                $this->refreshRemainingCartTotals($cart);
            }

            return $order->fresh()->load(['items', 'sellerOrders.seller', 'payments']);
        }, 3);
    }

    /**
     * Return a server-authoritative quote for exactly the cart rows selected by
     * the buyer. No order, payment, inventory, or cart mutation occurs here.
     */
    public function preview(User $buyer, array $data, ?string $voucherCode = null): array
    {
        $changes = $data['mode'] === 'cart' ? $this->synchronizeCartPrices($buyer, $data) : [];

        return DB::transaction(function () use ($buyer, $data, $changes): array {
            [, $cartItems] = $this->resolveCheckoutItems($buyer, $data, false);
            $requestedIds = $data['mode'] === 'cart'
                ? collect($data['cart_item_ids'])->map(fn ($id) => (int) $id)->unique()->values()
                : collect();

            $lines = $this->buildCheckoutLines($cartItems, $buyer);
            $groups = $lines->groupBy(fn (array $line) => $line['seller']->id);
            $subtotal = round((float) $lines->sum('subtotal'), 2);
            $shippingBySeller = $groups->map(fn (Collection $sellerLines) => $this->shippingForGroup($sellerLines));
            $shipping = round((float) $shippingBySeller->sum(), 2);
            $discount = 0.0;
            $productPromotionDiscount = round((float) $lines->sum('promotion_discount'), 2);
            $voucherDiscount = round((float) $lines->sum('voucher_discount'), 2);

            return [
                'warnings' => $changes,
                'mode' => $data['mode'],
                'cart_item_ids' => $requestedIds->all(),
                'promo_code' => null,
                'voucher' => null,
                'sellers' => $groups->map(function (Collection $sellerLines): array {
                    $seller = $sellerLines->first()['seller'];
                    $sellerSubtotal = round((float) $sellerLines->sum('subtotal'), 2);

                    return [
                        'slug' => $seller->slug,
                        'name' => $seller->trade_name ?? $seller->business_name ?? 'Seller',
                        'subtotal' => $sellerSubtotal,
                        'shipping' => $this->shippingForGroup($sellerLines),
                        'items' => $sellerLines->map(function (array $line): array {
                            $product = $line['product'];
                            $image = $product->images->sortBy([
                                ['is_primary', 'desc'],
                                ['sort_order', 'asc'],
                                ['id', 'asc'],
                            ])->first();

                            return [
                                'id' => $line['cart_item']->id,
                                'product_id' => $product->id,
                                'product_slug' => $product->slug,
                                'product_name' => $product->name,
                                'product_variant_id' => $line['variant']?->id,
                                'variant_name' => $line['variant']?->name,
                                'image' => $image
                                    ? (Str::startsWith($image->file_path, ['http://', 'https://', 'data:', '/'])
                                        ? $image->file_path
                                        : $this->media->publicUrl($image->file_path, $image->storage_disk ?: 'r2'))
                                    : null,
                                'quantity' => $line['quantity'],
                                'unit_price' => $line['unit_price'],
                                'regular_unit_price' => $line['normal_price'],
                                'line_total' => $line['subtotal'],
                                'automatic_promotion' => $line['discount_source_type'] === 'promotion' ? [
                                    'id' => $line['promotion']->id,
                                    'name' => $line['promotion']->name ?? $line['promotion']->code,
                                    'discount' => $line['promotion_discount'],
                                    'ends_at' => $line['promotion']->ends_at?->toISOString(),
                                ] : null,
                                'eligible_discounts' => $line['eligible_discounts'],
                                'selected_discount' => $line['selected_discount'],
                                'selected_discount_details' => $line['selected_discount_details'],
                                'discount_amount' => $line['promotion_discount'] + $line['voucher_discount'],
                            ];
                        })->values()->all(),
                    ];
                })->values()->all(),
                'subtotal' => $subtotal,
                'merchandise_total' => round($subtotal + $productPromotionDiscount + $voucherDiscount, 2),
                'product_promotion_discount_total' => $productPromotionDiscount,
                'voucher_discount_total' => $voucherDiscount,
                'shipping_total' => $shipping,
                'discount_total' => $discount,
                'grand_total' => round($subtotal + $shipping, 2),
                'item_count' => (int) $lines->sum('quantity'),
            ];
        }, 3);
    }

    /** @return array{0: Cart|null, 1: Collection<int, CartItem>} */
    private function resolveCheckoutItems(User $buyer, array $data, bool $lock): array
    {
        if ($data['mode'] === 'buy_now') {
            $productQuery = Product::query()->with(['variants', 'seller.user']);
            if ($lock) {
                $productQuery->lockForUpdate();
            }
            $product = $productQuery->find($data['item']['product_id']);
            if (! $product) {
                throw ValidationException::withMessages(['item.product_id' => ['The selected product is not available.']]);
            }
            $variant = null;
            if (! empty($data['item']['product_variant_id'])) {
                $variantQuery = ProductVariant::query();
                if ($lock) {
                    $variantQuery->lockForUpdate();
                }
                $variant = $variantQuery->find($data['item']['product_variant_id']);
                if (! $variant || (int) $variant->product_id !== (int) $product->id || ! $variant->active) {
                    throw ValidationException::withMessages(['item.product_variant_id' => ['The selected product variant is not available.']]);
                }
            }
            if ($product->variants->where('active', true)->isNotEmpty() && ! $variant) {
                throw ValidationException::withMessages(['item.product_variant_id' => ['Select an available product variant.']]);
            }

            $item = new CartItem([
                'seller_id' => $product->seller_id,
                'product_id' => $product->id,
                'product_variant_id' => $variant?->id,
                'quantity' => $data['item']['quantity'],
                'selected_discount_type' => $data['item']['selected_discount']['type'] ?? null,
                'selected_discount_id' => $data['item']['selected_discount']['id'] ?? null,
            ]);
            $item->id = -1;
            $item->setRelation('product', $product)->setRelation('variant', $variant);
            $quote = $this->cartDiscounts->quoteItems(collect([$item]), $buyer, $lock, $lock)->get(-1);
            $item->unit_price = $quote['unit_price'];
            $item->line_total = round($quote['unit_price'] * $item->quantity, 2);

            return [null, collect([$item])];
        }

        $cartQuery = Cart::query()->where('user_id', $buyer->id)->where('status', 'active');
        if ($lock) {
            $cartQuery->lockForUpdate();
        }
        $cart = $cartQuery->first();
        if (! $cart) {
            throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
        }
        $requestedIds = collect($data['cart_item_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        $itemsQuery = CartItem::query()->where('cart_id', $cart->id)->where('saved_for_later', false)
            ->whereIn('id', $requestedIds)->orderBy('id');
        if ($lock) {
            $itemsQuery->lockForUpdate();
        }
        $items = $itemsQuery->get();
        if ($items->isEmpty() || $items->count() !== $requestedIds->count()) {
            throw ValidationException::withMessages(['cart_item_ids' => ['One or more selected cart items are not available.']]);
        }

        return [$cart, $items];
    }

    /**
     * Persist a fresh server-authoritative quote before checkout. If a timed deal
     * ended while the cart was open, the buyer gets a review step instead of a
     * silently changed order total. The subsequent checkout still rechecks prices.
     *
     * @return list<string>
     */
    private function synchronizeCartPrices(User $buyer, array $data): array
    {
        return DB::transaction(function () use ($buyer, $data): array {
            $cart = Cart::query()
                ->where('user_id', $buyer->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (! $cart) {
                return [];
            }

            $items = CartItem::query()
                ->where('cart_id', $cart->id)
                ->where('saved_for_later', false)
                ->whereIn('id', $data['cart_item_ids'])
                ->lockForUpdate()
                ->get();
            $changes = [];

            foreach ($items as $item) {
                $product = Product::query()->with('variants')->find($item->product_id);
                $variant = $item->product_variant_id ? ProductVariant::query()->find($item->product_variant_id) : null;
                if (! $product) {
                    continue;
                }

                $item->setRelation('product', $product)->setRelation('variant', $variant);
                $quote = $this->cartDiscounts->quoteItems(collect([$item]), $buyer)->get($item->id);
                $currentPrice = round((float) $quote['unit_price'], 2);
                $storedPrice = round((float) $item->unit_price, 2);
                $selectionInvalid = $item->selected_discount_id && ! $quote['selected'];
                if ($storedPrice === $currentPrice && ! $selectionInvalid) {
                    continue;
                }

                $item->forceFill([
                    'unit_price' => $currentPrice,
                    'line_total' => round($currentPrice * $item->quantity, 2),
                    ...($selectionInvalid ? ['selected_discount_type' => null, 'selected_discount_id' => null] : []),
                ])->save();
                $changes[] = $selectionInvalid
                    ? "{$product->name} (selected discount is no longer available)"
                    : sprintf('%s (PHP %s to PHP %s)', $product->name, number_format($storedPrice, 2), number_format($currentPrice, 2));
            }

            if ($changes !== []) {
                $this->refreshRemainingCartTotals($cart);
            }

            return $changes;
        }, 3);
    }

    private function buildCheckoutLines(Collection $cartItems, User $buyer, bool $strict = false): Collection
    {
        $quotes = $this->cartDiscounts->quoteItems($cartItems, $buyer, $strict, $strict);

        return $cartItems->map(function (CartItem $cartItem) use ($quotes) {
            $product = Product::query()->with(['seller.user', 'images'])->lockForUpdate()->find($cartItem->product_id);
            $variant = $cartItem->product_variant_id
                ? ProductVariant::query()->lockForUpdate()->find($cartItem->product_variant_id)
                : null;

            if (! $product || $product->status !== 'active' || ! $product->seller || ! $product->seller->isApproved() || $product->seller->user?->status !== 'active') {
                throw ValidationException::withMessages([
                    'cart' => ["{$cartItem->product_id} is no longer available."],
                ]);
            }

            if ($variant && ($variant->product_id !== $product->id || ! $variant->active)) {
                throw ValidationException::withMessages(['cart' => ['A selected product variant is no longer available.']]);
            }

            $availableStock = $variant?->stock_quantity ?? $product->stock_quantity;
            if ($product->track_inventory && $cartItem->quantity > $availableStock) {
                throw ValidationException::withMessages([
                    'cart' => ["Only {$availableStock} unit(s) of {$product->name} are available."],
                ]);
            }

            $quote = $quotes->get($cartItem->id);
            $promotion = $quote['selected_model'];
            $unitPrice = $quote['unit_price'];
            if (round((float) $cartItem->unit_price, 2) !== round((float) $unitPrice, 2)) {
                throw ValidationException::withMessages([
                    'cart' => ["The price for {$product->name} changed. Review your cart before placing the order."],
                ]);
            }

            return [
                'cart_item' => $cartItem,
                'product' => $product,
                'variant' => $variant,
                'seller' => $product->seller,
                'quantity' => (int) $cartItem->quantity,
                'unit_price' => round($unitPrice, 2),
                'subtotal' => round($unitPrice * $cartItem->quantity, 2),
                'promotion' => $promotion,
                'normal_price' => $quote['base_unit_price'],
                'promotion_discount' => ($quote['selected']['type'] ?? null) === 'promotion' ? $quote['discount_amount'] : 0.0,
                'voucher_discount' => ($quote['selected']['type'] ?? null) === 'voucher' ? $quote['discount_amount'] : 0.0,
                'discount_source_type' => $quote['selected']['type'] ?? null,
                'eligible_discounts' => $quote['options'],
                'selected_discount' => $quote['selected'] ? ['type' => $quote['selected']['type'], 'id' => $quote['selected']['id']] : null,
                'selected_discount_details' => $quote['selected'],
            ];
        });
    }

    private function shippingForGroup(Collection $lines): float
    {
        $seller = $lines->first()['seller'];
        $subtotal = (float) $lines->sum('subtotal');
        $config = $this->shippingConfigForSeller($seller);

        return $subtotal >= $config['free_shipping_threshold'] ? 0.0 : (float) $config['shipping_fee'];
    }

    private function refreshRemainingCartTotals(Cart $cart): void
    {
        $remainingItems = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('saved_for_later', false)
            ->with('seller')
            ->get();
        $groups = $remainingItems->groupBy('seller_id');
        $subtotal = round((float) $remainingItems->sum('line_total'), 2);
        $shipping = round((float) $groups->sum(function (Collection $items) {
            $seller = $items->first()?->seller;
            if (! $seller) {
                return 0;
            }

            $sellerSubtotal = (float) $items->sum('line_total');
            $config = $this->shippingConfigForSeller($seller);

            return $sellerSubtotal >= $config['free_shipping_threshold'] ? 0 : $config['shipping_fee'];
        }), 2);
        $cart->update([
            'subtotal' => $subtotal,
            'shipping_total' => $shipping,
            'promo_code' => null,
            'discount_total' => 0,
            'grand_total' => round($subtotal + $shipping, 2),
            'last_checked_out_at' => now(),
        ]);
    }

    private function shippingConfigForSeller(Seller $seller): array
    {
        return match ($seller->slug) {
            'artisan-goods' => ['free_shipping_threshold' => 2000, 'shipping_fee' => 120],
            'verde-botanics' => ['free_shipping_threshold' => 1500, 'shipping_fee' => 80],
            default => ['free_shipping_threshold' => 1500, 'shipping_fee' => 100],
        };
    }

    private function nextOrderNumber(): string
    {
        do {
            $number = 'MKT-'.now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }
}
