<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Review;
use App\Models\WishlistItem;
use App\Services\CheckoutService;
use App\Services\NotificationService;
use App\Services\OrderLifecycleService;
use App\Services\MediaStorageService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommerceController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkoutService,
        private readonly OrderLifecycleService $orderLifecycle,
        private readonly NotificationService $notifications,
        private readonly PaymentService $payments,
        private readonly MediaStorageService $media,
    ) {
    }

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

            if (
                $product->status !== 'active'
                || ! $product->seller?->isApproved()
                || $product->seller?->trashed()
                || $product->seller?->user?->status !== 'active'
            ) {
                abort(422, 'This product is not available right now.');
            }

            $variant = null;
            if (! empty($data['product_variant_id'])) {
                $variant = $product->variants->firstWhere('id', (int) $data['product_variant_id']);

                if (! $variant) {
                    abort(422, 'The selected variant does not belong to this product.');
                }

                if (! $variant->active) {
                    abort(422, 'The selected variant is not available right now.');
                }
            } elseif ($product->variants->contains('active', true)) {
                abort(422, 'Select a product option before adding this item to your cart.');
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
                $item->load(['product', 'variant']);
                $availableStock = $item->variant?->stock_quantity ?? $item->product?->stock_quantity ?? 0;
                if ($item->product?->track_inventory && (int) $data['quantity'] > $availableStock) {
                    abort(422, "Only {$availableStock} unit(s) are available.");
                }
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

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'address_id' => ['required', 'integer'],
            'payment_method' => ['required', 'in:cod,gcash,maya,card'],
            'payment_details' => ['nullable', 'array'],
            'payment_details.mobile_number' => ['nullable', 'regex:/^\+639\d{9}$/'],
            'payment_details.cardholder_name' => ['nullable', 'string', 'max:120'],
            'payment_details.card_last4' => ['nullable', 'digits:4'],
            'payment_details.card_brand' => ['nullable', 'string', 'max:30'],
            'cart_item_ids' => ['sometimes', 'array', 'min:1'],
            'cart_item_ids.*' => ['integer', 'distinct'],
            'buyer_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (in_array($data['payment_method'], ['gcash', 'maya'], true) && empty($data['payment_details']['mobile_number'])) {
            return response()->json(['message' => 'A Philippine mobile number is required for this demo payment.'], 422);
        }

        if ($data['payment_method'] === 'card' && (empty($data['payment_details']['cardholder_name']) || empty($data['payment_details']['card_last4']))) {
            return response()->json(['message' => 'Demo cardholder and last four digits are required.'], 422);
        }

        $order = $this->checkoutService->checkout($request->user(), $data);

        return response()->json([
            'message' => 'Order placed successfully.',
            'data' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'subtotal' => (float) $order->subtotal,
                'shipping_total' => (float) $order->shipping_total,
                'discount_total' => (float) $order->discount_total,
                'grand_total' => (float) $order->grand_total,
                'seller_order_count' => $order->sellerOrders->count(),
                'item_count' => (int) $order->items->sum('quantity'),
                'payment' => $this->paymentPayload($order->payments->last()),
                'sandbox' => $order->payment_method !== 'cod',
            ],
        ], 201);
    }

    public function retryPayment(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::query()->where('buyer_id', $request->user()->id)->where('order_number', $orderNumber)->firstOrFail();
        $data = $request->validate([
            'payment_details' => ['nullable', 'array'],
            'payment_details.mobile_number' => ['nullable', 'regex:/^\+639\d{9}$/'],
            'payment_details.cardholder_name' => ['nullable', 'string', 'max:120'],
            'payment_details.card_last4' => ['nullable', 'digits:4'],
            'payment_details.card_brand' => ['nullable', 'string', 'max:30'],
        ]);
        $payment = DB::transaction(fn () => $this->payments->retry($order, $request->user(), $data['payment_details'] ?? []));
        $order->forceFill(['payment_status' => $payment->status])->save();

        return response()->json([
            'message' => $payment->status === 'paid' ? 'Demo payment successful.' : 'Demo payment attempt saved.',
            'data' => $this->paymentPayload($payment),
        ], 201);
    }

    public function orders(Request $request): JsonResponse
    {
        return response()->json([
            'data' => Order::query()
                ->where('buyer_id', $request->user()->id)
                ->with(['items.product.images', 'sellerOrders.seller'])
                ->latest('id')
                ->limit(25)
                ->get()
                ->map(function (Order $order) {
                    $firstItem = $order->items->first();
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'status' => $order->status,
                        'payment_status' => $order->payment_status,
                        'grand_total' => $order->grand_total,
                        'placed_at' => optional($order->placed_at)->toISOString(),
                        'item_count' => (int) $order->items->sum('quantity'),
                        'main_product' => $firstItem?->product_name,
                        'main_image' => $firstItem ? $this->orderItemImage($firstItem) : null,
                        'seller_names' => $order->sellerOrders
                            ->map(fn ($sellerOrder) => $sellerOrder->seller?->trade_name ?? $sellerOrder->seller?->business_name ?? 'Seller')
                            ->filter()
                            ->values(),
                        'tracking_number' => $order->sellerOrders->first()?->tracking_number,
                        'seller_orders' => $order->sellerOrders->map(fn ($sellerOrder) => [
                            'id' => $sellerOrder->id,
                            'status' => $sellerOrder->status,
                            'seller_name' => $sellerOrder->seller?->trade_name ?? $sellerOrder->seller?->business_name ?? 'Seller',
                        ])->values(),
                    ];
                })
                ->values(),
        ]);
    }

    public function order(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->with([
                'items.product.images',
                'items.review',
                'sellerOrders.seller',
                'sellerOrders.cancellation',
                'sellerOrders.returnRequests.items',
                'sellerOrders.shipment.courier',
                'sellerOrders.shipment.trackingEvents',
                'payments',
            ])
            ->first();

        if (! $order) {
            return response()->json([
                'message' => 'Order not found.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'subtotal' => (float) $order->subtotal,
                'shipping_total' => (float) $order->shipping_total,
                'discount_total' => (float) $order->discount_total,
                'grand_total' => $order->grand_total,
                'placed_at' => optional($order->placed_at)->toISOString(),
                'completed_at' => optional($order->completed_at)->toISOString(),
                'shipping_name' => $order->shipping_name,
                'shipping_phone' => $order->shipping_phone,
                'shipping_line1' => $order->shipping_line1,
                'shipping_line2' => $order->shipping_line2,
                'shipping_city' => $order->shipping_city,
                'shipping_province' => $order->shipping_province,
                'shipping_postal_code' => $order->shipping_postal_code,
                'item_count' => (int) $order->items->sum('quantity'),
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'product_slug' => $item->product_slug,
                    'variant_name' => $item->variant_name,
                    'sku' => $item->sku,
                    'unit_price' => (float) $item->unit_price,
                    'quantity' => (int) $item->quantity,
                    'subtotal' => (float) $item->subtotal,
                    'image' => $this->orderItemImage($item),
                    'seller_name' => $item->sellerOrder?->seller?->trade_name ?? $item->sellerOrder?->seller?->business_name ?? 'Seller',
                    'seller_order_id' => $item->seller_order_id,
                    'reviewed' => $item->review !== null,
                    'review_id' => $item->review?->id,
                ])->values(),
                'seller_orders' => $order->sellerOrders->map(fn ($sellerOrder) => [
                    'id' => $sellerOrder->id,
                    'seller_id' => $sellerOrder->seller_id,
                    'seller_name' => $sellerOrder->seller?->trade_name ?? $sellerOrder->seller?->business_name ?? 'Seller',
                    'status' => $sellerOrder->status,
                    'subtotal' => (float) $sellerOrder->subtotal,
                    'shipping_fee' => (float) $sellerOrder->shipping_fee,
                    'discount_total' => (float) $sellerOrder->discount_total,
                    'grand_total' => (float) $sellerOrder->grand_total,
                    'tracking_number' => $sellerOrder->tracking_number,
                    'driver_name' => $sellerOrder->shipment?->driver_name,
                    'courier_name' => $sellerOrder->shipment?->courier?->name,
                    'delivered_at' => optional($sellerOrder->delivered_at)->toISOString(),
                    'completed_at' => optional($sellerOrder->completed_at)->toISOString(),
                    'can_mark_received' => $sellerOrder->status === 'delivered',
                    'can_cancel' => in_array($sellerOrder->status, ['pending', 'new'], true) && ! $sellerOrder->cancellation,
                    'can_return' => in_array($sellerOrder->status, ['delivered', 'completed'], true),
                    'cancellation' => $sellerOrder->cancellation ? [
                        'reason' => $sellerOrder->cancellation->reason,
                        'refunded_amount' => (float) $sellerOrder->cancellation->refunded_amount,
                        'cancelled_at' => optional($sellerOrder->cancellation->cancelled_at)->toISOString(),
                    ] : null,
                    'return_requests' => $sellerOrder->returnRequests->map(fn ($return) => [
                        'id' => $return->id,
                        'status' => $return->status,
                        'reason' => $return->reason,
                        'requested_amount' => (float) $return->requested_amount,
                        'refunded_amount' => (float) $return->refunded_amount,
                        'requested_at' => optional($return->requested_at)->toISOString(),
                    ])->values(),
                    'tracking_events' => $sellerOrder->shipment?->trackingEvents
                        ?->sortByDesc('occurred_at')
                        ->map(fn ($event) => [
                            'id' => $event->id,
                            'status' => $event->status,
                            'location' => $event->location,
                            'note' => $event->note,
                            'occurred_at' => optional($event->occurred_at)->toISOString(),
                        ])->values() ?? [],
                ])->values(),
                'payments' => $order->payments->map(fn ($payment) => $this->paymentPayload($payment))->values(),
            ],
        ]);
    }

    public function completeSellerOrder(Request $request, string $orderNumber, SellerOrder $sellerOrder): JsonResponse
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->first();

        if (! $order || $sellerOrder->order_id !== $order->id) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        $completed = $this->orderLifecycle->completeByBuyer($sellerOrder, $request->user());

        return response()->json([
            'message' => 'Order marked as received. You can now review the purchased products.',
            'data' => [
                'id' => $completed->id,
                'status' => $completed->status,
                'completed_at' => optional($completed->completed_at)->toISOString(),
                'order_status' => $completed->order?->status,
            ],
        ]);
    }

    public function reviews(Request $request): JsonResponse
    {
        $reviews = Review::query()
            ->where('user_id', $request->user()->id)
            ->with(['product.images', 'seller', 'orderItem'])
            ->latest('submitted_at')
            ->latest('id')
            ->get()
            ->map(fn (Review $review) => $this->reviewPayload($review))
            ->values();

        return response()->json(['data' => $reviews]);
    }

    public function eligibleReviews(Request $request): JsonResponse
    {
        $items = OrderItem::query()
            ->whereHas('order', fn ($query) => $query->where('buyer_id', $request->user()->id))
            ->whereHas('sellerOrder', fn ($query) => $query->where('status', 'completed'))
            ->whereDoesntHave('review')
            ->with(['product.images', 'sellerOrder.seller', 'order'])
            ->latest('id')
            ->get()
            ->map(fn (OrderItem $item) => [
                'order_item_id' => $item->id,
                'order_number' => $item->order?->order_number,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'product_slug' => $item->product_slug,
                'product_image' => $item->product?->images?->sortBy('sort_order')->first()?->file_path,
                'seller_name' => $item->sellerOrder?->seller?->trade_name ?? $item->sellerOrder?->seller?->business_name ?? 'Seller',
            ])
            ->values();

        return response()->json(['data' => $items]);
    }

    public function storeReview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['nullable', 'string', 'max:3000'],
        ]);

        $item = OrderItem::query()
            ->whereKey($data['order_item_id'])
            ->whereHas('order', fn ($query) => $query->where('buyer_id', $request->user()->id))
            ->whereHas('sellerOrder', fn ($query) => $query->where('status', 'completed'))
            ->with(['order', 'product.images', 'sellerOrder.seller'])
            ->first();

        if (! $item) {
            return response()->json([
                'message' => 'Mark this delivered order as received before reviewing its products.',
                'code' => 'review_not_eligible',
            ], 422);
        }

        if (Review::query()->where('order_item_id', $item->id)->exists()) {
            return response()->json([
                'message' => 'This order item has already been reviewed.',
                'code' => 'review_already_exists',
            ], 409);
        }

        try {
            $review = Review::create([
                'user_id' => $request->user()->id,
                'seller_id' => $item->seller_id,
                'product_id' => $item->product_id,
                'order_id' => $item->order_id,
                'order_item_id' => $item->id,
                'rating' => $data['rating'],
                'title' => $data['title'] ?? null,
                'body' => trim((string) ($data['body'] ?? '')) ?: null,
                'status' => 'approved',
                'submitted_at' => now(),
            ]);
        } catch (QueryException $exception) {
            if (($exception->errorInfo[0] ?? null) === '23000') {
                return response()->json([
                    'message' => 'This order item has already been reviewed.',
                    'code' => 'review_already_exists',
                ], 409);
            }

            throw $exception;
        }
        $review->load(['product.images', 'seller', 'orderItem']);

        if ($item->sellerOrder?->seller?->user) {
            $this->notifications->publishToUser($item->sellerOrder->seller->user, [
                'category' => 'review',
                'title' => 'New product review',
                'body' => "{$item->product_name} received a {$review->rating}-star review.",
                'action_type' => 'product',
                'action_label' => 'View product',
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
            ]);
        }

        return response()->json([
            'message' => 'Review submitted.',
            'data' => $this->reviewPayload($review),
        ], 201);
    }

    public function updateReview(Request $request, Review $review): JsonResponse
    {
        abort_unless($review->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['nullable', 'string', 'max:3000'],
        ]);

        $review->update([
            ...$data,
            'body' => trim((string) ($data['body'] ?? '')) ?: null,
            'status' => 'approved',
            'moderated_at' => null,
            'moderation_note' => null,
        ]);
        $review->load(['product.images', 'seller', 'orderItem']);

        return response()->json([
            'message' => 'Review updated.',
            'data' => $this->reviewPayload($review),
        ]);
    }

    public function destroyReview(Request $request, Review $review): JsonResponse
    {
        abort_unless($review->user_id === $request->user()->id, 404);
        $review->delete();

        return response()->json(['message' => 'Review removed.']);
    }

    public function wishlists(Request $request): JsonResponse
    {
        return response()->json([
            'data' => WishlistItem::query()
                ->where('user_id', $request->user()->id)
                ->with(['product.seller', 'product.images'])
                ->latest('id')
                ->limit(25)
                ->get(),
        ]);
    }

    public function storeWishlist(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $product = Product::query()->with('seller')->findOrFail($data['product_id']);
        if ($product->status !== 'active' || ! $product->seller?->isApproved() || $product->seller->user?->status !== 'active') {
            abort(422, 'This product cannot be added to a wishlist right now.');
        }

        $item = WishlistItem::query()->firstOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $product->id],
            ['added_at' => now()],
        );

        return response()->json([
            'message' => 'Product added to your wishlist.',
            'data' => ['wishlisted' => true, 'id' => $item->id, 'product_id' => $product->id],
        ], $item->wasRecentlyCreated ? 201 : 200);
    }

    public function wishlistStatus(Request $request, int $productId): JsonResponse
    {
        return response()->json([
            'data' => [
                'product_id' => $productId,
                'wishlisted' => WishlistItem::query()
                    ->where('user_id', $request->user()->id)
                    ->where('product_id', $productId)
                    ->exists(),
            ],
        ]);
    }

    public function destroyWishlist(Request $request, int $productId): JsonResponse
    {
        WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->delete();

        return response()->json([
            'message' => 'Product removed from your wishlist.',
            'data' => ['wishlisted' => false, 'product_id' => $productId],
        ]);
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

    private function reviewPayload(Review $review): array
    {
        return [
            'id' => $review->id,
            'order_item_id' => $review->order_item_id,
            'order_id' => $review->order_id,
            'product_id' => $review->product_id,
            'product_name' => $review->orderItem?->product_name ?? $review->product?->name,
            'product_slug' => $review->orderItem?->product_slug ?? $review->product?->slug,
            'product_image' => $review->product?->images?->sortBy('sort_order')->first()?->file_path,
            'seller_name' => $review->seller?->trade_name ?? $review->seller?->business_name ?? 'Seller',
            'rating' => (int) $review->rating,
            'title' => $review->title,
            'body' => $review->body ?? '',
            'status' => $review->status,
            'verified_purchase' => (bool) $review->order_item_id,
            'submitted_at' => optional($review->submitted_at)->toISOString(),
            'updated_at' => optional($review->updated_at)->toISOString(),
        ];
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

        $nextQuantity = $item->exists ? $item->quantity + $quantity : $quantity;
        $availableStock = $variant?->stock_quantity ?? $product->stock_quantity;
        if ($product->track_inventory && $nextQuantity > $availableStock) {
            abort(422, "Only {$availableStock} unit(s) are available.");
        }

        $item->quantity = $nextQuantity;
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
            'product_variant_id' => $item->product_variant_id,
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
            return (float) ($variant->sale_price_override ?? $variant->price_override ?? $product->sale_price ?? $product->price);
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

    private function paymentPayload($payment): ?array
    {
        if (! $payment) {
            return null;
        }

        return [
            'id' => $payment->id,
            'type' => $payment->type,
            'method' => $payment->method,
            'provider' => $payment->provider,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'refunded_amount' => (float) $payment->refunded_amount,
            'currency' => $payment->currency,
            'reference' => $payment->provider_reference,
            'card_brand' => $payment->card_brand,
            'card_last4' => $payment->card_last4,
            'failure_reason' => $payment->failure_reason,
            'paid_at' => optional($payment->paid_at)->toISOString(),
            'created_at' => optional($payment->created_at)->toISOString(),
            'sandbox' => $payment->provider === 'simulated',
        ];
    }

    private function orderItemImage(OrderItem $item): ?string
    {
        $path = $item->product_image_storage_path;
        if ($path) {
            return Str::startsWith($path, ['http://', 'https://'])
                ? $path
                : $this->media->publicUrl($path, $item->product_image_storage_disk ?: 'r2');
        }

        return $item->product?->images?->sortBy('sort_order')->first()?->file_path;
    }
}
