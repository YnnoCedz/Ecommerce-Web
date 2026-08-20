<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Payment;
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
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    public function checkout(User $buyer, array $data): Order
    {
        return DB::transaction(function () use ($buyer, $data) {
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

            $cart = Cart::query()
                ->where('user_id', $buyer->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (! $cart) {
                throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
            }

            $itemsQuery = CartItem::query()
                ->where('cart_id', $cart->id)
                ->where('saved_for_later', false)
                ->orderBy('id')
                ->lockForUpdate();

            if (! empty($data['cart_item_ids'])) {
                $requestedIds = collect($data['cart_item_ids'])->map(fn ($id) => (int) $id)->unique()->values();
                $itemsQuery->whereIn('id', $requestedIds);
            } else {
                $requestedIds = collect();
            }

            $cartItems = $itemsQuery->get();

            if ($cartItems->isEmpty() || ($requestedIds->isNotEmpty() && $cartItems->count() !== $requestedIds->count())) {
                throw ValidationException::withMessages([
                    'cart_item_ids' => ['One or more selected cart items are not available.'],
                ]);
            }

            $checkoutLines = $this->buildCheckoutLines($cartItems);
            $groups = $checkoutLines->groupBy(fn (array $line) => $line['seller']->id);
            $subtotal = round((float) $checkoutLines->sum('subtotal'), 2);
            $shippingTotal = round((float) $groups->sum(fn (Collection $lines) => $this->shippingForGroup($lines)), 2);
            $discountTotal = strtoupper((string) $cart->promo_code) === 'WELCOME10'
                ? round($subtotal * 0.10, 2)
                : 0.0;
            $grandTotal = round(max(0, $subtotal + $shippingTotal - $discountTotal), 2);

            $order = Order::create([
                'buyer_id' => $buyer->id,
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
                'shipping_province' => $address->province,
                'shipping_postal_code' => $address->postal_code,
                'subtotal' => $subtotal,
                'shipping_total' => $shippingTotal,
                'discount_total' => $discountTotal,
                'tax_total' => 0,
                'grand_total' => $grandTotal,
                'buyer_notes' => $data['buyer_notes'] ?? null,
                'placed_at' => now(),
            ]);

            $allocatedDiscount = 0.0;
            $groupCount = $groups->count();
            $groupIndex = 0;

            foreach ($groups as $lines) {
                $groupIndex++;
                $seller = $lines->first()['seller'];
                $sellerSubtotal = round((float) $lines->sum('subtotal'), 2);
                $shippingFee = $this->shippingForGroup($lines);
                $sellerDiscount = $groupIndex === $groupCount
                    ? round($discountTotal - $allocatedDiscount, 2)
                    : round($discountTotal * ($sellerSubtotal / max($subtotal, 0.01)), 2);
                $allocatedDiscount += $sellerDiscount;

                $sellerOrder = SellerOrder::create([
                    'order_id' => $order->id,
                    'seller_id' => $seller->id,
                    'status' => 'pending',
                    'subtotal' => $sellerSubtotal,
                    'shipping_fee' => $shippingFee,
                    'discount_total' => $sellerDiscount,
                    'grand_total' => round($sellerSubtotal + $shippingFee - $sellerDiscount, 2),
                ]);

                foreach ($lines as $line) {
                    $product = $line['product'];
                    $variant = $line['variant'];

                    $order->items()->create([
                        'seller_order_id' => $sellerOrder->id,
                        'seller_id' => $seller->id,
                        'product_id' => $product->id,
                        'product_variant_id' => $variant?->id,
                        'product_name' => $product->name,
                        'product_slug' => $product->slug,
                        'variant_name' => $variant?->name,
                        'sku' => $variant?->sku ?? $product->sku,
                        'unit_price' => $line['unit_price'],
                        'quantity' => $line['quantity'],
                        'subtotal' => $line['subtotal'],
                    ]);

                    if ($product->track_inventory) {
                        if ($variant) {
                            $variant->decrement('stock_quantity', $line['quantity']);
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
                    ]);
                }
            }

            Payment::create([
                'order_id' => $order->id,
                'method' => $data['payment_method'],
                'status' => 'pending',
                'amount' => $grandTotal,
                'currency' => 'PHP',
            ]);

            $this->notifications->publishToUser($buyer, [
                'category' => 'order',
                'title' => 'Order placed',
                'body' => "Your order {$order->order_number} was placed successfully.",
                'action_type' => 'buyer_order',
                'action_label' => 'View order',
                'order_id' => $order->id,
            ]);

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

            return $order->load(['items', 'sellerOrders.seller', 'payments']);
        }, 3);
    }

    private function buildCheckoutLines(Collection $cartItems): Collection
    {
        return $cartItems->map(function (CartItem $cartItem) {
            $product = Product::query()->with(['seller.user'])->lockForUpdate()->find($cartItem->product_id);
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

            $unitPrice = $variant
                ? (float) ($variant->sale_price_override ?? $variant->price_override ?? $product->sale_price ?? $product->price)
                : (float) ($product->sale_price ?? $product->price);

            return [
                'cart_item' => $cartItem,
                'product' => $product,
                'variant' => $variant,
                'seller' => $product->seller,
                'quantity' => (int) $cartItem->quantity,
                'unit_price' => round($unitPrice, 2),
                'subtotal' => round($unitPrice * $cartItem->quantity, 2),
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
        $discount = strtoupper((string) $cart->promo_code) === 'WELCOME10'
            ? round($subtotal * 0.10, 2)
            : 0.0;

        $cart->update([
            'subtotal' => $subtotal,
            'shipping_total' => $shipping,
            'discount_total' => $discount,
            'grand_total' => round(max(0, $subtotal + $shipping - $discount), 2),
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
