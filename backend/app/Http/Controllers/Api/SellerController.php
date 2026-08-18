<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\SellerOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class SellerController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json([
                'data' => [
                    'seller' => null,
                    'summary' => $this->emptyDashboardSummary(),
                    'recent_orders' => [],
                    'recent_products' => [],
                    'top_products' => [],
                    'revenue_series' => [],
                    'order_series' => [],
                    'category_breakdown' => [],
                ],
            ]);
        }

        $seller->load(['categories']);

        $products = Product::query()
            ->with(['category', 'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'), 'variants'])
            ->where('seller_id', $seller->id)
            ->whereNull('deleted_at')
            ->get();

        $sellerOrders = SellerOrder::query()
            ->with(['order.items.product.images', 'order.buyer', 'shipment'])
            ->where('seller_id', $seller->id)
            ->get();

        $summary = [
            'total_products' => $products->count(),
            'active_products' => $products->where('status', 'active')->count(),
            'draft_products' => $products->where('status', 'draft')->count(),
            'archived_products' => $products->where('status', 'archived')->count(),
            'low_stock_products' => $products->filter(fn (Product $product) => (bool) $product->track_inventory && (int) $product->stock_quantity > 0 && (int) $product->stock_quantity <= (int) ($product->low_stock_threshold ?? 10))->count(),
            'out_of_stock_products' => $products->filter(fn (Product $product) => (bool) $product->track_inventory && (int) $product->stock_quantity <= 0)->count(),
            'pending_orders' => $sellerOrders->where('status', 'new')->count(),
            'processing_orders' => $sellerOrders->whereIn('status', ['confirmed', 'preparing', 'ready'])->count(),
            'shipped_orders' => $sellerOrders->whereIn('status', ['picked-up', 'in-transit', 'shipped'])->count(),
            'completed_orders' => $sellerOrders->whereIn('status', ['delivered', 'completed'])->count(),
            'cancelled_orders' => $sellerOrders->whereIn('status', ['cancelled', 'failed'])->count(),
            'total_sales' => (float) $sellerOrders->sum('grand_total'),
            'pending_sales' => (float) $sellerOrders->where('status', 'new')->sum('grand_total'),
            'orders_count' => $sellerOrders->count(),
            'promotions_count' => Promotion::where('seller_id', $seller->id)->count(),
            'recent_activity' => $sellerOrders->sortByDesc('updated_at')->take(5)->values()->all(),
        ];

        return response()->json([
            'data' => [
                'seller' => $this->sellerPayload($seller),
                'summary' => $summary,
                'recent_orders' => $sellerOrders
                    ->sortByDesc(fn (SellerOrder $order) => $order->order?->placed_at ?? $order->created_at)
                    ->take(5)
                    ->values()
                    ->map(fn (SellerOrder $sellerOrder) => $this->sellerOrderPayload($sellerOrder))
                    ->all(),
                'recent_products' => $products
                    ->sortByDesc('created_at')
                    ->take(5)
                    ->values()
                    ->map(fn (Product $product) => $this->productPayload($product))
                    ->all(),
                'top_products' => $this->topProductsPayload($sellerOrders),
                'revenue_series' => $this->seriesPayload($sellerOrders, 'grand_total', 30),
                'order_series' => $this->seriesPayload($sellerOrders, null, 30, true),
                'category_breakdown' => $this->categoryBreakdownPayload($products, $sellerOrders),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        return response()->json([
            'data' => $seller ? $this->sellerPayload($seller->load(['categories', 'user'])) : null,
        ]);
    }

    public function orders(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        $orders = SellerOrder::query()
            ->with(['order.items.product.images', 'order.buyer', 'shipment'])
            ->where('seller_id', $seller->id)
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (SellerOrder $sellerOrder) => $this->sellerOrderPayload($sellerOrder))
            ->values();

        return response()->json([
            'data' => $orders,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        $products = Product::query()
            ->with(['category', 'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'), 'variants'])
            ->where('seller_id', $seller->id)
            ->whereNull('deleted_at')
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (Product $product) => $this->productPayload($product))
            ->values();

        return response()->json([
            'data' => $products,
        ]);
    }

    public function promotions(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        $promotions = Promotion::query()
            ->with(['category'])
            ->where('seller_id', $seller->id)
            ->latest('id')
            ->get()
            ->map(function (Promotion $promotion) {
                return [
                    'id' => $promotion->id,
                    'code' => $promotion->code,
                    'type' => $promotion->type,
                    'value' => (float) $promotion->value,
                    'min_order' => $promotion->min_order !== null ? (float) $promotion->min_order : null,
                    'usage_count' => (int) $promotion->usage_count,
                    'usage_limit' => $promotion->usage_limit !== null ? (int) $promotion->usage_limit : null,
                    'start_date' => optional($promotion->starts_at)->toDateString(),
                    'end_date' => optional($promotion->ends_at)->toDateString(),
                    'status' => $promotion->status,
                    'applies_to' => $promotion->applies_to_label ?? ($promotion->category?->name ?? 'All products'),
                    'category' => $promotion->category ? [
                        'id' => $promotion->category->id,
                        'name' => $promotion->category->name,
                        'slug' => $promotion->category->slug,
                    ] : null,
                    'new_customers_only' => (bool) $promotion->new_customers_only,
                ];
            })
            ->values();

        return response()->json([
            'data' => $promotions,
        ]);
    }

    protected function sellerPayload($seller): array
    {
        return [
            'id' => $seller?->id,
            'slug' => $seller?->slug,
            'business_name' => $seller?->business_name,
            'trade_name' => $seller?->trade_name,
            'tagline' => $seller?->tagline,
            'description' => $seller?->description,
            'contact_email' => $seller?->contact_email,
            'public_email' => $seller?->public_email,
            'contact_phone' => $seller?->contact_phone,
            'messaging_phone' => $seller?->messaging_phone,
            'status' => $seller?->status,
            'verified' => (bool) ($seller?->verified ?? false),
            'address_line1' => $seller?->address_line1,
            'address_line2' => $seller?->address_line2,
            'province' => $seller?->province,
            'city' => $seller?->city,
            'postal_code' => $seller?->postal_code,
            'owner_id_number' => $seller?->owner_id_number,
            'tin' => $seller?->tin,
            'registration_number' => $seller?->registration_number,
            'established_on' => optional($seller?->established_on)->toDateString(),
            'categories' => $seller?->relationLoaded('categories')
                ? $seller->categories->map(fn ($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                ])->values()->all()
                : [],
        ];
    }

    protected function productPayload(Product $product): array
    {
        $primaryImage = $product->images->first();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'sku' => $product->sku,
            'status' => $product->status,
            'price' => (float) $product->price,
            'sale_price' => $product->sale_price !== null ? (float) $product->sale_price : null,
            'stock_quantity' => (int) $product->stock_quantity,
            'low_stock_threshold' => (int) ($product->low_stock_threshold ?? 10),
            'track_inventory' => (bool) $product->track_inventory,
            'free_shipping' => (bool) $product->free_shipping,
            'delivery_type' => $product->delivery_type,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'image' => $primaryImage?->file_path ?? 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
            'images' => $product->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->file_path,
                'alt' => $image->alt_text ?? $product->name,
                'sort_order' => $image->sort_order,
                'is_primary' => (bool) $image->is_primary,
            ])->values()->all(),
            'variants' => $product->variants->map(fn (ProductVariant $variant) => [
                'id' => $variant->id,
                'name' => $variant->name,
                'sku' => $variant->sku,
                'stock_quantity' => (int) $variant->stock_quantity,
                'low_stock_threshold' => (int) ($variant->low_stock_threshold ?? 10),
                'active' => (bool) $variant->active,
            ])->values()->all(),
            'created_at' => optional($product->created_at)->toISOString(),
            'published_at' => optional($product->published_at)->toISOString(),
        ];
    }

    protected function sellerOrderPayload(SellerOrder $sellerOrder): array
    {
        $order = $sellerOrder->order;

        return [
            'id' => $sellerOrder->id,
            'order_number' => $order?->order_number,
            'status' => $sellerOrder->status,
            'subtotal' => (float) $sellerOrder->subtotal,
            'shipping_fee' => (float) $sellerOrder->shipping_fee,
            'discount_total' => (float) $sellerOrder->discount_total,
            'grand_total' => (float) $sellerOrder->grand_total,
            'confirmed_at' => optional($sellerOrder->confirmed_at)->toISOString(),
            'ready_at' => optional($sellerOrder->ready_at)->toISOString(),
            'picked_up_at' => optional($sellerOrder->picked_up_at)->toISOString(),
            'delivered_at' => optional($sellerOrder->delivered_at)->toISOString(),
            'placed_at' => optional($order?->placed_at)->toISOString(),
            'buyer' => $order?->buyer ? [
                'id' => $order->buyer->id,
                'name' => $order->buyer->display_name,
                'email' => $order->buyer->email,
                'mobile' => $order->buyer->mobile,
            ] : null,
            'payment_method' => $order?->payment_method,
            'shipping_address' => $order ? trim(implode(', ', array_filter([
                $order->shipping_name,
                $order->shipping_line1,
                $order->shipping_line2,
                $order->shipping_city,
                $order->shipping_province,
                $order->shipping_postal_code,
            ]))) : null,
            'tracking_number' => $sellerOrder->tracking_number,
            'courier' => $sellerOrder->shipment ? [
                'name' => $sellerOrder->shipment->courier?->name ?? $sellerOrder->shipment->driver_name,
                'tracking' => $sellerOrder->shipment->tracking_number,
                'driver' => $sellerOrder->shipment->driver_name,
                'status' => $sellerOrder->shipment->status,
            ] : null,
            'items' => $order?->items
                ? $order->items
                    ->where('seller_order_id', $sellerOrder->id)
                    ->map(fn ($item) => [
                        'id' => $item->id,
                        'product_name' => $item->product_name,
                        'variant_name' => $item->variant_name,
                        'sku' => $item->sku,
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'subtotal' => (float) $item->subtotal,
                        'image' => $item->product?->images?->first()?->file_path,
                    ])->values()->all()
                : [],
        ];
    }

    private function topProductsPayload(Collection $sellerOrders): array
    {
        $grouped = $sellerOrders
            ->flatMap(fn (SellerOrder $sellerOrder) => $sellerOrder->order?->items?->where('seller_order_id', $sellerOrder->id) ?? collect())
            ->groupBy('product_name')
            ->map(function (Collection $items, string $name) {
                return [
                    'name' => $name,
                    'category' => $items->first()?->product?->category?->name ?? 'Uncategorized',
                    'revenue' => (float) $items->sum('subtotal'),
                    'orders' => (int) $items->sum('quantity'),
                    'returns' => 0,
                    'image' => $items->first()?->product?->images?->first()?->file_path ?? 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
                ];
            })
            ->sortByDesc('revenue')
            ->take(5)
            ->values();

        return $grouped->all();
    }

    private function seriesPayload(Collection $sellerOrders, ?string $field = null, int $days = 30, bool $countOnly = false): array
    {
        $start = Carbon::today()->subDays($days - 1)->startOfDay();
        $dates = collect(range(0, $days - 1))->map(fn (int $day) => $start->copy()->addDays($day));

        return $dates->map(function (Carbon $date) use ($sellerOrders, $field, $countOnly) {
            $matching = $sellerOrders->filter(function (SellerOrder $sellerOrder) use ($date) {
                $placedAt = $sellerOrder->order?->placed_at;

                return $placedAt && Carbon::parse($placedAt)->isSameDay($date);
            });

            $value = $countOnly
                ? $matching->count()
                : (float) $matching->sum($field ?? 'grand_total');

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('M d'),
                'value' => $value,
            ];
        })->all();
    }

    private function categoryBreakdownPayload(Collection $products, Collection $sellerOrders): array
    {
        if ($products->isEmpty()) {
            return [];
        }

        $breakdown = $products->groupBy(fn (Product $product) => $product->category?->name ?? 'Uncategorized')
            ->map(function (Collection $group, string $name) use ($sellerOrders) {
                $productIds = $group->pluck('id');
                $revenue = $sellerOrders
                    ->flatMap(fn (SellerOrder $sellerOrder) => $sellerOrder->order?->items?->whereIn('product_id', $productIds) ?? collect())
                    ->sum('subtotal');

                return [
                    'name' => $name,
                    'revenue' => (float) $revenue,
                    'pct' => 0,
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        $total = max(1, (float) $breakdown->sum('revenue'));

        return $breakdown->map(function (array $row) use ($total) {
            $row['pct'] = round(($row['revenue'] / $total) * 100, 1);

            return $row;
        })->all();
    }

    public function customers(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        $sellerOrders = SellerOrder::query()
            ->with(['order.items.product.images', 'order.buyer'])
            ->where('seller_id', $seller->id)
            ->get();

        $customers = $sellerOrders
            ->groupBy(fn (SellerOrder $sellerOrder) => $sellerOrder->order?->buyer?->id)
            ->filter(fn (Collection $group, $buyerId) => $buyerId !== null)
            ->map(function (Collection $group) {
                /** @var SellerOrder $latestOrder */
                $latestOrder = $group->sortByDesc(fn (SellerOrder $sellerOrder) => $sellerOrder->order?->placed_at ?? $sellerOrder->created_at)->first();
                $buyer = $latestOrder?->order?->buyer;
                $ordersCount = $group->count();
                $totalSpent = (float) $group->sum('grand_total');

                return [
                    'id' => $buyer?->id,
                    'name' => $buyer?->display_name ?? $buyer?->name,
                    'email' => $buyer?->email,
                    'mobile' => $buyer?->mobile,
                    'location' => trim(implode(', ', array_filter([
                        $latestOrder?->order?->shipping_city,
                        $latestOrder?->order?->shipping_province,
                    ]))) ?: null,
                    'total_orders' => $ordersCount,
                    'total_spent' => $totalSpent,
                    'last_order_date' => optional($latestOrder?->order?->placed_at)->toDateString(),
                    'last_order_number' => $latestOrder?->order?->order_number,
                    'last_order_product' => $latestOrder?->order?->items?->first()?->product_name,
                    'joined_at' => optional($buyer?->created_at)->toDateString(),
                    'rating' => null,
                ];
            })
            ->sortByDesc('total_spent')
            ->values();

        return response()->json([
            'data' => $customers,
        ]);
    }

    private function emptyDashboardSummary(): array
    {
        return [
            'total_products' => 0,
            'active_products' => 0,
            'draft_products' => 0,
            'archived_products' => 0,
            'low_stock_products' => 0,
            'out_of_stock_products' => 0,
            'pending_orders' => 0,
            'processing_orders' => 0,
            'shipped_orders' => 0,
            'completed_orders' => 0,
            'cancelled_orders' => 0,
            'total_sales' => 0.0,
            'pending_sales' => 0.0,
            'orders_count' => 0,
            'promotions_count' => 0,
            'recent_activity' => [],
        ];
    }
}
