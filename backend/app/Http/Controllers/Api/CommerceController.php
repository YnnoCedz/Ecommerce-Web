<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommerceController extends Controller
{
    public function cart(Request $request): JsonResponse
    {
        $cart = $this->loadCurrentCart($request);
        $this->recalculateCartTotals($cart);
        $cart = $cart->fresh();

        return response()->json([
            'data' => $this->cartPayload($cart),
        ]);
    }

    public function storeCartItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'saved_for_later' => ['sometimes', 'boolean'],
        ]);

        $quantity = (int) ($data['quantity'] ?? 1);
        $savedForLater = (bool) ($data['saved_for_later'] ?? false);

        $cart = DB::transaction(function () use ($request, $data, $quantity, $savedForLater) {
            $cart = $this->loadCurrentCart($request);

            $product = Product::query()
                ->with(['seller', 'images', 'variants'])
                ->findOrFail($data['product_id']);

            if ($product->status !== 'active') {
                abort(422, 'This product is not available right now.');
            }

            $variant = null;
            if (! empty($data['product_variant_id'])) {
                $variant = $product->variants->firstWhere('id', (int) $data['product_variant_id']);

                if (! $variant) {
                    abort(422, 'The selected variant does not belong to this product.');
                }
            }

            $item = $this->upsertCartItem($cart, $product, $variant, $quantity, $savedForLater);
            $this->recalculateCartTotals($cart);

            return $cart->fresh();
        });

        return response()->json([
            'message' => 'Cart updated.',
            'data' => $this->cartPayload($cart),
        ]);
    }

    public function updateCartItem(Request $request, int $itemId): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'saved_for_later' => ['sometimes', 'boolean'],
        ]);

        $cart = DB::transaction(function () use ($request, $itemId, $data) {
            $cart = $this->loadCurrentCart($request);

            $item = CartItem::query()
                ->where('cart_id', $cart->id)
                ->whereKey($itemId)
                ->firstOrFail();

            if (array_key_exists('quantity', $data)) {
                $item->quantity = (int) $data['quantity'];
                $item->line_total = $item->quantity * (float) $item->unit_price;
            }

            if (array_key_exists('saved_for_later', $data)) {
                $item->saved_for_later = (bool) $data['saved_for_later'];
            }

            $item->save();
            $this->recalculateCartTotals($cart);

            return $cart->fresh();
        });

        return response()->json([
            'message' => 'Cart item updated.',
            'data' => $this->cartPayload($cart),
        ]);
    }

    public function updateCartPromo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'promo_code' => ['nullable', 'string', 'max:50'],
        ]);

        $cart = DB::transaction(function () use ($request, $data) {
            $cart = $this->loadCurrentCart($request);
            $cart->promo_code = $data['promo_code'] ? strtoupper(trim($data['promo_code'])) : null;
            $cart->save();
            $this->recalculateCartTotals($cart);

            return $cart->fresh();
        });

        return response()->json([
            'message' => 'Cart promo updated.',
            'data' => $this->cartPayload($cart),
        ]);
    }

    public function destroyCartItem(Request $request, int $itemId): JsonResponse
    {
        $cart = DB::transaction(function () use ($request, $itemId) {
            $cart = $this->loadCurrentCart($request);

            CartItem::query()
                ->where('cart_id', $cart->id)
                ->whereKey($itemId)
                ->delete();

            $this->recalculateCartTotals($cart);

            return $cart->fresh();
        });

        return response()->json([
            'message' => 'Cart item removed.',
            'data' => $this->cartPayload($cart),
        ]);
    }

    public function checkout(): JsonResponse
    {
        return response()->json(['message' => 'Checkout endpoint scaffolded.']);
    }

    public function orders(Request $request): JsonResponse
    {
        return response()->json([
            'data' => Order::query()
                ->where('buyer_id', $request->user()->id)
                ->latest('id')
                ->limit(25)
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'grand_total' => $order->grand_total,
                    'placed_at' => optional($order->placed_at)->toISOString(),
                ])
                ->values(),
        ]);
    }

    public function order(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->first();

        if (! $order) {
            return response()->json([
                'message' => 'Order not found.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'grand_total' => $order->grand_total,
                'placed_at' => optional($order->placed_at)->toISOString(),
            ],
        ]);
    }

    public function reviews(): JsonResponse
    {
        return response()->json(['data' => []]);
    }

    public function storeReview(): JsonResponse
    {
        return response()->json(['message' => 'Review submitted.'], 201);
    }

    public function wishlists(Request $request): JsonResponse
    {
        return response()->json([
            'data' => WishlistItem::query()
                ->where('user_id', $request->user()->id)
                ->latest('id')
                ->limit(25)
                ->get(),
        ]);
    }

    public function storeWishlist(): JsonResponse
    {
        return response()->json(['message' => 'Wishlist updated.'], 201);
    }

    public function promotions(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        return response()->json([
            'data' => $seller->promotions()->latest('id')->limit(25)->get(),
        ]);
    }

    private function loadCurrentCart(Request $request): Cart
    {
        $cart = Cart::query()->firstOrCreate(
            [
                'user_id' => $request->user()->id,
                'status' => 'active',
            ],
            [
                'promo_code' => null,
                'subtotal' => 0,
                'shipping_total' => 0,
                'discount_total' => 0,
                'grand_total' => 0,
            ]
        );

        return $cart->load([
            'items.seller',
            'items.product.images',
            'items.variant',
            'savedItems.seller',
            'savedItems.product.images',
            'savedItems.variant',
        ]);
    }

    private function upsertCartItem(Cart $cart, Product $product, ?ProductVariant $variant, int $quantity, bool $savedForLater): CartItem
    {
        $unitPrice = $this->unitPriceForProduct($product, $variant);

        $item = CartItem::query()->firstOrNew([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant?->id,
            'saved_for_later' => $savedForLater,
        ]);

        if (! $item->exists) {
            $item->seller_id = $product->seller_id;
        }

        $item->quantity = $item->exists ? $item->quantity + $quantity : $quantity;
        $item->unit_price = $unitPrice;
        $item->line_total = $item->quantity * $unitPrice;
        $item->save();

        return $item;
    }

    private function recalculateCartTotals(Cart $cart): void
    {
        $cart->load([
            'items.seller',
            'items.product.images',
            'items.variant',
        ]);

        $activeItems = $cart->items->where('saved_for_later', false);
        $grouped = $activeItems->groupBy('seller_id');

        $subtotal = 0.0;
        $shipping = 0.0;

        foreach ($grouped as $sellerItems) {
            $sellerSubtotal = (float) $sellerItems->sum('line_total');
            $seller = $sellerItems->first()?->seller;
            if (! $seller instanceof Seller) {
                continue;
            }

            $config = $this->shippingConfigForSeller($seller);
            $subtotal += $sellerSubtotal;
            $shipping += $sellerSubtotal >= $config['free_shipping_threshold'] ? 0 : $config['shipping_fee'];
        }

        $discount = $cart->promo_code === 'WELCOME10'
            ? round($subtotal * 0.10, 2)
            : 0.0;

        $cart->forceFill([
            'subtotal' => $subtotal,
            'shipping_total' => $shipping,
            'discount_total' => $discount,
            'grand_total' => max(0, $subtotal + $shipping - $discount),
            'last_checked_out_at' => $cart->last_checked_out_at,
        ])->save();
    }

    private function cartPayload(Cart $cart): array
    {
        $cart->load([
            'items.seller',
            'items.product.images',
            'items.variant',
            'savedItems.seller',
            'savedItems.product.images',
            'savedItems.variant',
        ]);

        $sellerGroups = $cart->items
            ->where('saved_for_later', false)
            ->groupBy('seller_id')
            ->map(function ($items) {
                $seller = $items->first()?->seller;
                $productItems = $items->map(fn (CartItem $item) => $this->cartItemPayload($item))->values();
                $subtotal = (float) $items->sum('line_total');
                $config = $seller instanceof Seller ? $this->shippingConfigForSeller($seller) : ['free_shipping_threshold' => 1500, 'shipping_fee' => 100];

                return [
                    'slug' => $seller?->slug,
                    'name' => $seller?->trade_name ?? $seller?->business_name ?? 'Seller',
                    'rating' => $seller?->response_rate ? round(((float) $seller->response_rate) / 20, 1) : 4.8,
                    'freeShippingThreshold' => $config['free_shipping_threshold'],
                    'shippingFee' => $config['shipping_fee'],
                    'items' => $productItems,
                    'subtotal' => $subtotal,
                    'shipping' => $subtotal >= $config['free_shipping_threshold'] ? 0 : $config['shipping_fee'],
                ];
            })
            ->values();

        return [
            'id' => $cart->id,
            'status' => $cart->status,
            'promo_code' => $cart->promo_code,
            'subtotal' => (float) $cart->subtotal,
            'shipping_total' => (float) $cart->shipping_total,
            'discount_total' => (float) $cart->discount_total,
            'grand_total' => (float) $cart->grand_total,
            'items' => $cart->items
                ->where('saved_for_later', false)
                ->map(fn (CartItem $item) => $this->cartItemPayload($item))
                ->values(),
            'saved_items' => $cart->savedItems
                ->map(fn (CartItem $item) => $this->cartItemPayload($item, true))
                ->values(),
            'sellers' => $sellerGroups,
        ];
    }

    private function cartItemPayload(CartItem $item, bool $saved = false): array
    {
        $product = $item->product;
        $seller = $item->seller ?? $product?->seller;
        $variant = $item->variant;
        $primaryImage = $product?->images?->sortBy('sort_order')->first();
        $stock = $variant?->stock_quantity ?? $product?->stock_quantity ?? 0;

        return [
            'id' => $item->id,
            'seller_id' => $item->seller_id,
            'seller_slug' => $seller?->slug,
            'seller_name' => $seller?->trade_name ?? $seller?->business_name ?? 'Seller',
            'product_id' => $item->product_id,
            'product_slug' => $product?->slug,
            'product_name' => $product?->name,
            'variant_name' => $variant?->name,
            'image' => $primaryImage?->file_path,
            'quantity' => $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'line_total' => (float) $item->line_total,
            'stock' => (int) $stock,
            'saved_for_later' => $saved || (bool) $item->saved_for_later,
        ];
    }

    private function unitPriceForProduct(Product $product, ?ProductVariant $variant): float
    {
        if ($variant) {
            return (float) ($variant->price_override ?? $variant->sale_price_override ?? $product->sale_price ?? $product->price);
        }

        return (float) ($product->sale_price ?? $product->price);
    }

    private function shippingConfigForSeller(Seller $seller): array
    {
        return match ($seller->slug) {
            'artisan-goods' => [
                'free_shipping_threshold' => 2000,
                'shipping_fee' => 120,
            ],
            'verde-botanics' => [
                'free_shipping_threshold' => 1500,
                'shipping_fee' => 80,
            ],
            default => [
                'free_shipping_threshold' => 1500,
                'shipping_fee' => 100,
            ],
        };
    }
}
