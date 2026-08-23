<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MediaStorageService;
use App\Services\NotificationService;
use App\Services\OrderLifecycleService;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\ReviewReply;
use App\Models\Seller;
use App\Models\SellerOrder;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SellerController extends Controller
{
    public function __construct(
        private readonly OrderLifecycleService $orderLifecycle,
        private readonly NotificationService $notifications,
    ) {
    }

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
            ->with(['category', 'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'), 'variants.options'])
            ->where('seller_id', $seller->id)
            ->whereNull('deleted_at')
            ->get();

        $sellerOrders = SellerOrder::query()
            ->with(['order.items.product.images', 'order.buyer', 'shipment.trackingEvents'])
            ->where('seller_id', $seller->id)
            ->get();

        $summary = [
            'total_products' => $products->count(),
            'active_products' => $products->where('status', 'active')->count(),
            'draft_products' => $products->where('status', 'draft')->count(),
            'archived_products' => $products->where('status', 'archived')->count(),
            'low_stock_products' => $products->filter(fn (Product $product) => (bool) $product->track_inventory && (int) $product->stock_quantity > 0 && (int) $product->stock_quantity <= (int) ($product->low_stock_threshold ?? 10))->count(),
            'out_of_stock_products' => $products->filter(fn (Product $product) => (bool) $product->track_inventory && (int) $product->stock_quantity <= 0)->count(),
            'pending_orders' => $sellerOrders->whereIn('status', ['pending', 'new'])->count(),
            'processing_orders' => $sellerOrders->whereIn('status', ['confirmed', 'preparing', 'ready'])->count(),
            'shipped_orders' => $sellerOrders->whereIn('status', ['picked-up', 'in-transit', 'shipped'])->count(),
            'completed_orders' => $sellerOrders->whereIn('status', ['delivered', 'completed'])->count(),
            'cancelled_orders' => $sellerOrders->whereIn('status', ['cancelled', 'failed'])->count(),
            'total_sales' => (float) $sellerOrders->sum('grand_total'),
            'pending_sales' => (float) $sellerOrders->whereIn('status', ['pending', 'new'])->sum('grand_total'),
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

    public function updateMe(Request $request, MediaStorageService $storage): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json([
                'message' => 'Seller profile not found.',
                'code' => 'seller_profile_missing',
            ], 404);
        }

        if (is_string($request->input('brand_colors'))) {
            $decodedBrandColors = json_decode($request->input('brand_colors'), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedBrandColors)) {
                $request->merge(['brand_colors' => $decodedBrandColors]);
            }
        }

        $data = $request->validate([
            'business_name' => ['nullable', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'contact_email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'public_email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'messaging_phone' => ['nullable', 'string', 'max:30'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'payout_method' => ['nullable', 'string', 'max:60'],
            'payout_schedule' => ['nullable', 'string', 'max:60'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_type' => ['nullable', 'string', 'max:30'],
            'bank_account_number' => ['nullable', 'string', 'max:32'],
            'gcash_number' => ['nullable', 'string', 'max:32'],
            'maya_number' => ['nullable', 'string', 'max:32'],
            'account_name' => ['nullable', 'string', 'max:255'],
            'return_policy' => ['nullable', 'string', 'max:10000'],
            'shipping_policy' => ['nullable', 'string', 'max:10000'],
            'privacy_policy' => ['nullable', 'string', 'max:10000'],
            'brand_colors' => ['nullable', 'array', 'max:3'],
            'brand_colors.*' => ['nullable', 'string', 'max:20'],
            'operating_hours' => ['nullable', 'array'],
            'operating_hours.*.day' => ['nullable', 'string', 'max:60'],
            'operating_hours.*.hours' => ['nullable', 'string', 'max:120'],
            'logo_file' => ['nullable', 'image', 'max:5120'],
            'banner_file' => ['nullable', 'image', 'max:10240'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_banner' => ['nullable', 'boolean'],
        ]);

        $oldLogoPath = $seller->logo_path;
        $oldBannerPath = $seller->banner_path;
        $storedLogo = null;
        $storedBanner = null;
        $logoPath = $oldLogoPath;
        $bannerPath = $oldBannerPath;
        $optionalText = function (string $key, ?string $current) use ($data): ?string {
            return array_key_exists($key, $data) ? $this->nullableTrim($data[$key] ?? null) : $current;
        };
        $optionalNumber = function (string $key, ?string $current) use ($data): ?string {
            return array_key_exists($key, $data) ? $this->sanitizeAccountNumber($data[$key] ?? null) : $current;
        };

        try {
            $businessName = $this->nullableTrim($data['business_name'] ?? null) ?? $seller->business_name;

            if ($request->boolean('remove_logo')) {
                $logoPath = null;
            }

            if ($request->boolean('remove_banner')) {
                $bannerPath = null;
            }

            if ($request->hasFile('logo_file')) {
                $storedLogo = $this->storeSellerMedia($storage, $request->file('logo_file'), $seller, 'logo');
                $logoPath = $storedLogo['storage_path'];
            }

            if ($request->hasFile('banner_file')) {
                $storedBanner = $this->storeSellerMedia($storage, $request->file('banner_file'), $seller, 'banner');
                $bannerPath = $storedBanner['storage_path'];
            }

            $seller->forceFill([
                'business_name' => $businessName,
                'trade_name' => $optionalText('trade_name', $seller->trade_name),
                'tagline' => $optionalText('tagline', $seller->tagline),
                'description' => $optionalText('description', $seller->description),
                'contact_email' => $optionalText('contact_email', $seller->contact_email),
                'public_email' => $optionalText('public_email', $seller->public_email),
                'contact_phone' => $optionalText('contact_phone', $seller->contact_phone),
                'messaging_phone' => $optionalText('messaging_phone', $seller->messaging_phone),
                'address_line1' => $optionalText('address_line1', $seller->address_line1),
                'address_line2' => $optionalText('address_line2', $seller->address_line2),
                'province' => $optionalText('province', $seller->province),
                'city' => $optionalText('city', $seller->city),
                'postal_code' => $optionalText('postal_code', $seller->postal_code),
                'payout_method' => $optionalText('payout_method', $seller->payout_method),
                'payout_schedule' => $optionalText('payout_schedule', $seller->payout_schedule),
                'bank_name' => $optionalText('bank_name', $seller->bank_name),
                'account_type' => $optionalText('account_type', $seller->account_type),
                'bank_account_number' => $optionalNumber('bank_account_number', $seller->bank_account_number),
                'gcash_number' => $optionalNumber('gcash_number', $seller->gcash_number),
                'maya_number' => $optionalNumber('maya_number', $seller->maya_number),
                'account_number_last4' => $this->accountLast4(
                    array_key_exists('payout_method', $data)
                        ? (
                            $data['payout_method'] === 'gcash'
                                ? ($data['gcash_number'] ?? null)
                                : ($data['payout_method'] === 'maya'
                                    ? ($data['maya_number'] ?? null)
                                    : ($data['bank_account_number'] ?? null))
                        )
                        : $seller->account_number_last4
                ),
                'account_name' => $optionalText('account_name', $seller->account_name),
                'return_policy' => $optionalText('return_policy', $seller->return_policy),
                'shipping_policy' => $optionalText('shipping_policy', $seller->shipping_policy),
                'privacy_policy' => $optionalText('privacy_policy', $seller->privacy_policy),
                'brand_colors' => array_key_exists('brand_colors', $data) ? $this->normalizeBrandColors($data['brand_colors'] ?? []) : $seller->brand_colors,
                'operating_hours' => array_key_exists('operating_hours', $data) ? $data['operating_hours'] : $seller->operating_hours,
                'logo_path' => $logoPath,
                'banner_path' => $bannerPath,
            ])->save();
        } catch (\Throwable $e) {
            if ($storedLogo && isset($storedLogo['storage_path'])) {
                try {
                    $storage->delete($storedLogo['storage_path'], $storedLogo['storage_disk'] ?? 'r2');
                } catch (\Throwable) {
                }
            }

            if ($storedBanner && isset($storedBanner['storage_path'])) {
                try {
                    $storage->delete($storedBanner['storage_path'], $storedBanner['storage_disk'] ?? 'r2');
                } catch (\Throwable) {
                }
            }

            report($e);

            return response()->json([
                'message' => 'Unable to save seller profile right now.',
                'code' => 'seller_profile_update_failed',
            ], 500);
        }

        if ($storedLogo && is_string($oldLogoPath) && $oldLogoPath !== '' && $oldLogoPath !== $storedLogo['storage_path']) {
            try {
                $storage->delete($oldLogoPath, $storedLogo['storage_disk'] ?? 'r2');
            } catch (\Throwable) {
            }
        }

        if ($storedBanner && is_string($oldBannerPath) && $oldBannerPath !== '' && $oldBannerPath !== $storedBanner['storage_path']) {
            try {
                $storage->delete($oldBannerPath, $storedBanner['storage_disk'] ?? 'r2');
            } catch (\Throwable) {
            }
        }

        if ($request->boolean('remove_logo') && is_string($oldLogoPath) && $oldLogoPath !== '' && ! $storedLogo && $oldLogoPath !== $logoPath) {
            try {
                $storage->delete($oldLogoPath, 'r2');
            } catch (\Throwable) {
            }
        }

        if ($request->boolean('remove_banner') && is_string($oldBannerPath) && $oldBannerPath !== '' && ! $storedBanner && $oldBannerPath !== $bannerPath) {
            try {
                $storage->delete($oldBannerPath, 'r2');
            } catch (\Throwable) {
            }
        }

        return response()->json([
            'message' => 'Seller profile updated.',
            'data' => $this->sellerPayload($seller->fresh(['categories', 'user'])),
        ]);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller || $product->seller_id !== $seller->id) {
            return response()->json([
                'message' => 'Product not found.',
                'code' => 'product_not_found',
            ], 404);
        }

        $product->load([
            'category',
            'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            'variants.options',
        ]);

        return response()->json([
            'data' => $this->productPayload($product),
        ]);
    }

    public function store(Request $request, MediaStorageService $storage): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json([
                'message' => 'Seller profile not found.',
                'code' => 'seller_profile_missing',
            ], 404);
        }

        $data = $this->validateProductRequest($request, null);

        try {
            $product = DB::transaction(function () use ($seller, $data, $request, $storage) {
                $product = Product::create([
                    'seller_id' => $seller->id,
                    'category_id' => $data['category_id'],
                    'name' => trim($data['name']),
                    'slug' => $this->generateUniqueProductSlug(trim($data['name']), null),
                    'description' => $this->nullableTrim($data['description'] ?? null),
                    'tags' => $data['tags'],
                    'sku' => trim($data['sku']),
                    'barcode' => $this->nullableTrim($data['barcode'] ?? null),
                    'price' => $data['price'],
                    'sale_price' => $data['sale_price'],
                    'cost_price' => $data['cost_price'],
                    'status' => $data['status'],
                    'delivery_type' => $data['delivery_type'],
                    'track_inventory' => (bool) ($data['track_inventory'] ?? true),
                    'stock_quantity' => $data['stock_quantity'],
                    'low_stock_threshold' => $data['low_stock_threshold'],
                    'weight_grams' => $data['weight_grams'],
                    'length_cm' => $data['length_cm'],
                    'width_cm' => $data['width_cm'],
                    'height_cm' => $data['height_cm'],
                    'free_shipping' => (bool) ($data['free_shipping'] ?? false),
                    'published_at' => $data['status'] === 'active' ? now() : null,
                ]);

                $this->syncProductImages($product, $request, $storage, true);
                $this->syncProductVariants($product, $data['variants'], $request->has('variants'));
                $this->recalculateStockFromVariants($product);

                return $product->fresh(['category', 'images', 'variants.options']);
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to save product right now. Please try again.',
                'code' => 'product_save_failed',
            ], 500);
        }

        return response()->json([
            'message' => 'Product created.',
            'data' => $this->productPayload($product),
        ], 201);
    }

    public function update(Request $request, Product $product, MediaStorageService $storage): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller || $product->seller_id !== $seller->id) {
            return response()->json([
                'message' => 'Product not found.',
                'code' => 'product_not_found',
            ], 404);
        }

        $data = $this->validateProductRequest($request, $product);

        try {
            $product = DB::transaction(function () use ($product, $data, $request, $storage) {
                $product->forceFill([
                    'category_id' => $data['category_id'],
                    'name' => trim($data['name']),
                    'description' => $this->nullableTrim($data['description'] ?? null),
                    'tags' => $data['tags'],
                    'sku' => trim($data['sku']),
                    'barcode' => $this->nullableTrim($data['barcode'] ?? null),
                    'price' => $data['price'],
                    'sale_price' => $data['sale_price'],
                    'cost_price' => $data['cost_price'],
                    'status' => $data['status'],
                    'delivery_type' => $data['delivery_type'],
                    'track_inventory' => (bool) ($data['track_inventory'] ?? true),
                    'stock_quantity' => $data['stock_quantity'],
                    'low_stock_threshold' => $data['low_stock_threshold'],
                    'weight_grams' => $data['weight_grams'],
                    'length_cm' => $data['length_cm'],
                    'width_cm' => $data['width_cm'],
                    'height_cm' => $data['height_cm'],
                    'free_shipping' => (bool) ($data['free_shipping'] ?? false),
                    'published_at' => $data['status'] === 'active' && ! $product->published_at ? now() : $product->published_at,
                ])->save();

                $this->syncProductImages($product, $request, $storage, false);
                $this->syncProductVariants($product, $data['variants'], $request->has('variants'));
                $this->recalculateStockFromVariants($product);

                return $product->fresh(['category', 'images', 'variants.options']);
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to update product right now. Please try again.',
                'code' => 'product_update_failed',
            ], 500);
        }

        return response()->json([
            'message' => 'Product updated.',
            'data' => $this->productPayload($product),
        ]);
    }

    public function destroy(Request $request, Product $product, MediaStorageService $storage): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller || $product->seller_id !== $seller->id) {
            return response()->json([
                'message' => 'Product not found.',
                'code' => 'product_not_found',
            ], 404);
        }

        try {
            $product->delete();
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to delete product right now. Please try again.',
                'code' => 'product_delete_failed',
            ], 500);
        }

        return response()->json([
            'message' => 'Product deleted.',
        ]);
    }

    public function updateInventory(Request $request, Product $product): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller || $product->seller_id !== $seller->id) {
            return response()->json([
                'message' => 'Product not found.',
                'code' => 'product_not_found',
            ], 404);
        }

        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:0'],
            'variant_id' => ['nullable', 'integer', Rule::exists('product_variants', 'id')],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
        ]);

        if (! empty($data['variant_id'])) {
            $variant = $product->variants()->whereKey((int) $data['variant_id'])->first();

            if (! $variant) {
                return response()->json([
                    'message' => 'Variant not found.',
                    'code' => 'variant_not_found',
                ], 404);
            }

            $variant->forceFill([
                'stock_quantity' => (int) $data['quantity'],
                'low_stock_threshold' => array_key_exists('low_stock_threshold', $data) ? (int) $data['low_stock_threshold'] : $variant->low_stock_threshold,
            ])->save();

            $this->recalculateStockFromVariants($product);

            return response()->json([
                'message' => 'Inventory updated.',
                'data' => [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => (int) $variant->stock_quantity,
                    'low_stock_threshold' => (int) $variant->low_stock_threshold,
                ],
            ]);
        }

        $product->forceFill([
            'stock_quantity' => (int) $data['quantity'],
            'low_stock_threshold' => array_key_exists('low_stock_threshold', $data) ? (int) $data['low_stock_threshold'] : $product->low_stock_threshold,
        ])->save();

        return response()->json([
            'message' => 'Inventory updated.',
            'data' => [
                'product_id' => $product->id,
                'variant_id' => null,
                'quantity' => (int) $product->stock_quantity,
                'low_stock_threshold' => (int) $product->low_stock_threshold,
            ],
        ]);
    }

    public function orders(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        $orders = SellerOrder::query()
            ->with(['order.items.product.images', 'order.buyer', 'shipment.trackingEvents'])
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

    public function updateOrderStatus(Request $request, SellerOrder $sellerOrder): JsonResponse
    {
        $seller = $request->user()->seller;
        if (! $seller || $sellerOrder->seller_id !== $seller->id) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        $data = $request->validate([
            'status' => ['required', 'in:confirmed,preparing,ready,in-transit,delivered'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
        ]);

        $updated = $this->orderLifecycle->transitionBySeller(
            $sellerOrder,
            $seller->id,
            $data['status'],
            $data['tracking_number'] ?? null,
        );

        return response()->json([
            'message' => 'Order status updated.',
            'data' => $this->sellerOrderPayload($updated),
        ]);
    }

    public function replyToReview(Request $request, Review $review): JsonResponse
    {
        $seller = $request->user()->seller;
        if (! $seller || $review->seller_id !== $seller->id) {
            return response()->json(['message' => 'Review not found.'], 404);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:3000'],
        ]);

        $reply = ReviewReply::query()->updateOrCreate(
            ['review_id' => $review->id],
            [
                'seller_id' => $seller->id,
                'body' => trim($data['body']),
                'replied_at' => now(),
            ],
        );

        if ($review->user) {
            $this->notifications->publishToUser($review->user, [
                'category' => 'review',
                'title' => 'Seller replied to your review',
                'body' => 'The seller replied to your review of '.($review->product?->name ?? 'a product').'.',
                'action_type' => 'product',
                'action_label' => 'View product',
                'product_id' => $review->product_id,
                'order_id' => $review->order_id,
            ]);
        }

        return response()->json([
            'message' => 'Reply saved.',
            'data' => [
                'id' => $reply->id,
                'review_id' => $reply->review_id,
                'body' => $reply->body,
                'replied_at' => optional($reply->replied_at)->toISOString(),
            ],
        ]);
    }

    public function reviews(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;
        $reviews = Review::query()
            ->where('seller_id', $seller->id)
            ->with(['user', 'product.images', 'orderItem', 'reply'])
            ->latest('submitted_at')
            ->latest('id')
            ->get()
            ->map(function (Review $review) {
                $firstName = $review->user?->first_name ?: str($review->user?->name)->before(' ')->toString();
                $lastInitial = $review->user?->last_name ? mb_substr($review->user->last_name, 0, 1).'.' : '';

                return [
                    'id' => $review->id,
                    'product_id' => $review->product_id,
                    'product_name' => $review->orderItem?->product_name ?? $review->product?->name,
                    'product_image' => $review->product?->images?->sortBy('sort_order')->first()?->file_path,
                    'buyer_name' => trim($firstName.' '.$lastInitial),
                    'rating' => (int) $review->rating,
                    'title' => $review->title,
                    'body' => $review->body,
                    'status' => $review->status,
                    'verified_purchase' => $review->order_item_id !== null,
                    'submitted_at' => optional($review->submitted_at)->toISOString(),
                    'reply' => $review->reply ? [
                        'id' => $review->reply->id,
                        'body' => $review->reply->body,
                        'replied_at' => optional($review->reply->replied_at)->toISOString(),
                    ] : null,
                ];
            })->values();

        return response()->json(['data' => $reviews]);
    }

    public function destroyReviewReply(Request $request, Review $review): JsonResponse
    {
        $seller = $request->user()->seller;
        abort_unless($seller && $review->seller_id === $seller->id, 404);
        $review->reply()->where('seller_id', $seller->id)->delete();

        return response()->json(['message' => 'Reply removed.']);
    }

    public function products(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json(['data' => []]);
        }

        $products = Product::query()
            ->with(['category', 'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'), 'variants.options'])
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
            'logo_url' => $this->sellerAssetUrl($seller?->logo_path),
            'banner_url' => $this->sellerAssetUrl($seller?->banner_path),
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
            'bank_name' => $seller?->bank_name,
            'account_type' => $seller?->account_type,
            'bank_account_number' => $seller?->bank_account_number,
            'gcash_number' => $seller?->gcash_number,
            'maya_number' => $seller?->maya_number,
            'account_name' => $seller?->account_name,
            'account_number_last4' => $seller?->account_number_last4,
            'payout_method' => $seller?->payout_method,
            'payout_schedule' => $seller?->payout_schedule,
            'operating_hours' => $seller?->operating_hours ?? [],
            'return_policy' => $seller?->return_policy,
            'shipping_policy' => $seller?->shipping_policy,
            'privacy_policy' => $seller?->privacy_policy,
            'brand_colors' => $seller?->brand_colors ?? [],
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
            'cost_price' => $product->cost_price !== null ? (float) $product->cost_price : null,
            'stock_quantity' => (int) $product->stock_quantity,
            'low_stock_threshold' => (int) ($product->low_stock_threshold ?? 10),
            'track_inventory' => (bool) $product->track_inventory,
            'free_shipping' => (bool) $product->free_shipping,
            'delivery_type' => $product->delivery_type,
            'description' => $product->description,
            'tags' => $product->tags ?? [],
            'barcode' => $product->barcode,
            'weight_grams' => $product->weight_grams,
            'dimensions' => [
                'length_cm' => $product->length_cm,
                'width_cm' => $product->width_cm,
                'height_cm' => $product->height_cm,
            ],
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'image' => $this->imageUrl($primaryImage),
            'images' => $product->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $this->imageUrl($image),
                'alt' => $image->alt_text ?? $product->name,
                'sort_order' => $image->sort_order,
                'is_primary' => (bool) $image->is_primary,
            ])->values()->all(),
            'variants' => $product->variants->map(fn (ProductVariant $variant) => [
                'id' => $variant->id,
                'name' => $variant->name,
                'sku' => $variant->sku,
                'barcode' => $variant->barcode,
                'options' => $variant->relationLoaded('options')
                    ? $variant->options->sortBy('sort_order')->pluck('value')->values()->all()
                    : [],
                'price_override' => $variant->price_override !== null ? (float) $variant->price_override : null,
                'sale_price_override' => $variant->sale_price_override !== null ? (float) $variant->sale_price_override : null,
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
            'completed_at' => optional($sellerOrder->completed_at)->toISOString(),
            'next_status' => match ($sellerOrder->status) {
                'pending', 'new' => 'confirmed',
                'confirmed' => 'preparing',
                'preparing' => 'ready',
                'ready' => 'in-transit',
                'in-transit' => 'delivered',
                default => null,
            },
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
                'events' => $sellerOrder->shipment->relationLoaded('trackingEvents')
                    ? $sellerOrder->shipment->trackingEvents->sortByDesc('occurred_at')->map(fn ($event) => [
                        'status' => $event->status,
                        'note' => $event->note,
                        'occurred_at' => optional($event->occurred_at)->toISOString(),
                    ])->values()->all()
                    : [],
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
                        'image' => $item->product_image_storage_path ?? $item->product?->images?->first()?->file_path,
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

    private function validateProductRequest(Request $request, ?Product $product): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'category_id' => ['required', Rule::exists('categories', 'id')],
            'tags' => ['nullable'],
            'sku' => [
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'sku')->ignore($product?->id),
            ],
            'barcode' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['draft', 'active', 'archived'])],
            'delivery_type' => ['required', Rule::in(['standard', 'express', 'both', 'pickup-only'])],
            'track_inventory' => ['sometimes', 'boolean'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'weight_grams' => ['nullable', 'integer', 'min:0'],
            'length_cm' => ['nullable', 'numeric', 'min:0'],
            'width_cm' => ['nullable', 'numeric', 'min:0'],
            'height_cm' => ['nullable', 'numeric', 'min:0'],
            'free_shipping' => ['sometimes', 'boolean'],
            'variants' => ['nullable'],
            'keep_image_ids' => ['nullable'],
            'images' => ['nullable', 'array'],
            'images.*' => ['file', 'image', 'max:5120'],
        ]);

        $variants = $this->normalizeArrayInput($request->input('variants', []));
        $tags = $this->normalizeTags($request->input('tags', []));

        return [
            'name' => trim($validated['name']),
            'description' => $this->nullableTrim($validated['description'] ?? null),
            'category_id' => (int) $validated['category_id'],
            'tags' => $tags,
            'sku' => trim($validated['sku']),
            'barcode' => $this->nullableTrim($validated['barcode'] ?? null),
            'price' => (float) $validated['price'],
            'sale_price' => array_key_exists('sale_price', $validated) && $validated['sale_price'] !== null ? (float) $validated['sale_price'] : null,
            'cost_price' => array_key_exists('cost_price', $validated) && $validated['cost_price'] !== null ? (float) $validated['cost_price'] : null,
            'status' => $validated['status'],
            'delivery_type' => $validated['delivery_type'],
            'track_inventory' => (bool) ($validated['track_inventory'] ?? true),
            'stock_quantity' => (int) $validated['stock_quantity'],
            'low_stock_threshold' => array_key_exists('low_stock_threshold', $validated) && $validated['low_stock_threshold'] !== null ? (int) $validated['low_stock_threshold'] : 0,
            'weight_grams' => array_key_exists('weight_grams', $validated) && $validated['weight_grams'] !== null ? (int) $validated['weight_grams'] : null,
            'length_cm' => array_key_exists('length_cm', $validated) && $validated['length_cm'] !== null ? (float) $validated['length_cm'] : null,
            'width_cm' => array_key_exists('width_cm', $validated) && $validated['width_cm'] !== null ? (float) $validated['width_cm'] : null,
            'height_cm' => array_key_exists('height_cm', $validated) && $validated['height_cm'] !== null ? (float) $validated['height_cm'] : null,
            'free_shipping' => (bool) ($validated['free_shipping'] ?? false),
            'variants' => $variants,
            'keep_image_ids' => $this->normalizeIntegerList($request->input('keep_image_ids', [])),
        ];
    }

    private function normalizeArrayInput(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value)) {
            return [];
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return [];
        }

        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return array_values(array_filter(array_map('trim', explode(',', $trimmed))));
    }

    private function normalizeTags(mixed $value): array
    {
        $items = $this->normalizeArrayInput($value);

        return array_values(array_filter(array_map(function ($item) {
            if (! is_string($item)) {
                return null;
            }

            $tag = trim($item);

            return $tag !== '' ? $tag : null;
        }, $items)));
    }

    private function normalizeIntegerList(mixed $value): array
    {
        return array_values(array_filter(array_map(static function ($item): ?int {
            if (is_int($item)) {
                return $item;
            }

            if (is_string($item) && is_numeric($item)) {
                return (int) $item;
            }

            return null;
        }, $this->normalizeArrayInput($value))));
    }

    private function generateUniqueProductSlug(string $name, ?Product $ignoreProduct = null): string
    {
        $base = Str::slug($name);
        $slug = $base !== '' ? $base : 'product';
        $attempt = 0;

        while (
            Product::query()
                ->when($ignoreProduct, fn ($query) => $query->whereKeyNot($ignoreProduct->id))
                ->where('slug', $slug)
                ->exists()
        ) {
            $attempt++;
            $slug = $base . '-' . Str::lower(Str::random(6 + $attempt));
        }

        return $slug;
    }

    private function syncProductImages(Product $product, Request $request, MediaStorageService $storage, bool $isNew): void
    {
        $keepIds = $request->has('keep_image_ids')
            ? $this->normalizeIntegerList($request->input('keep_image_ids', []))
            : null;

        if ($keepIds !== null) {
            $existing = $product->images()->orderBy('sort_order')->orderBy('id')->get();
            $keepSet = array_flip($keepIds);

            foreach ($existing as $image) {
                if (! isset($keepSet[$image->id])) {
                    $this->deleteStoredImage($image, $storage);
                }
            }

            foreach ($keepIds as $sortOrder => $imageId) {
                $image = $product->images()->whereKey($imageId)->first();
                if (! $image) {
                    continue;
                }

                $image->forceFill([
                    'sort_order' => $sortOrder,
                    'is_primary' => $sortOrder === 0,
                ])->save();
            }
        } elseif ($isNew) {
            $product->images()->delete();
        }

        $currentMaxSortOrder = (int) $product->images()->max('sort_order');
        $uploadedFiles = $request->file('images', []);

        foreach (is_array($uploadedFiles) ? $uploadedFiles : [] as $offset => $file) {
            $stored = $storage->storePublicFile($file, "products/{$product->id}");

            $product->images()->create([
                'storage_disk' => $stored['storage_disk'],
                'file_path' => $stored['storage_path'],
                'original_filename' => $stored['original_filename'],
                'mime_type' => $stored['mime_type'],
                'file_size' => $stored['file_size'],
                'visibility' => $stored['visibility'],
                'alt_text' => $product->name,
                'sort_order' => $currentMaxSortOrder + $offset + 1,
                'is_primary' => $product->images()->count() === 0 && $offset === 0,
            ]);
        }

        $images = $product->images()->orderBy('sort_order')->orderBy('id')->get();
        foreach ($images as $index => $image) {
            $image->forceFill([
                'sort_order' => $index,
                'is_primary' => $index === 0,
            ])->save();
        }
    }

    private function syncProductVariants(Product $product, array $variants, bool $shouldSync): void
    {
        $existingIds = [];

        foreach ($variants as $index => $variantData) {
            if (! is_array($variantData)) {
                continue;
            }

            $variantId = isset($variantData['server_id']) && is_numeric($variantData['server_id']) ? (int) $variantData['server_id'] : null;
            $variant = $variantId ? $product->variants()->whereKey($variantId)->first() : null;

            if (! $variant) {
                $variant = $product->variants()->create([
                    'name' => trim((string) ($variantData['name'] ?? 'Variant')),
                    'sku' => $this->nullableTrim($variantData['sku'] ?? null),
                    'barcode' => $this->nullableTrim($variantData['barcode'] ?? null),
                    'price_override' => isset($variantData['price_override']) && $variantData['price_override'] !== '' ? (float) $variantData['price_override'] : null,
                    'sale_price_override' => isset($variantData['sale_price_override']) && $variantData['sale_price_override'] !== '' ? (float) $variantData['sale_price_override'] : null,
                    'stock_quantity' => isset($variantData['stock_quantity']) ? (int) $variantData['stock_quantity'] : (int) $product->stock_quantity,
                    'low_stock_threshold' => isset($variantData['low_stock_threshold']) ? (int) $variantData['low_stock_threshold'] : (int) $product->low_stock_threshold,
                    'active' => array_key_exists('active', $variantData) ? (bool) $variantData['active'] : true,
                ]);
            } else {
                $variant->forceFill([
                    'name' => trim((string) ($variantData['name'] ?? $variant->name)),
                    'sku' => $this->nullableTrim($variantData['sku'] ?? null),
                    'barcode' => $this->nullableTrim($variantData['barcode'] ?? null),
                    'price_override' => array_key_exists('price_override', $variantData) && $variantData['price_override'] !== '' ? (float) $variantData['price_override'] : null,
                    'sale_price_override' => array_key_exists('sale_price_override', $variantData) && $variantData['sale_price_override'] !== '' ? (float) $variantData['sale_price_override'] : null,
                    'stock_quantity' => array_key_exists('stock_quantity', $variantData) ? (int) $variantData['stock_quantity'] : $variant->stock_quantity,
                    'low_stock_threshold' => array_key_exists('low_stock_threshold', $variantData) ? (int) $variantData['low_stock_threshold'] : $variant->low_stock_threshold,
                    'active' => array_key_exists('active', $variantData) ? (bool) $variantData['active'] : $variant->active,
                ])->save();
            }

            $existingIds[] = $variant->id;

            $variant->options()->delete();

            $options = $this->normalizeArrayInput($variantData['options'] ?? []);
            foreach (array_values($options) as $sortOrder => $option) {
                if (! is_string($option) || trim($option) === '') {
                    continue;
                }

                $variant->options()->create([
                    'value' => trim($option),
                    'sort_order' => $sortOrder,
                ]);
            }
        }

        if ($shouldSync) {
            $product->variants()->whereNotIn('id', $existingIds)->get()->each(function (ProductVariant $variant) {
                $variant->options()->delete();
                $variant->delete();
            });
        }
    }

    private function recalculateStockFromVariants(Product $product): void
    {
        if ($product->variants()->exists()) {
            $product->forceFill([
                'stock_quantity' => (int) $product->variants()->sum('stock_quantity'),
            ])->save();
        }
    }

    private function deleteStoredImage(ProductImage $image, MediaStorageService $storage): void
    {
        if ($image->file_path) {
            try {
                $storage->delete($image->file_path, $image->storage_disk ?: 'r2');
            } catch (\Throwable) {
                // Ignore storage cleanup failures so the product mutation still completes.
            }
        }

        $image->delete();
    }

    private function imageUrl(?ProductImage $image): string
    {
        if (! $image) {
            return 'https://images.unsplash.com/photo-1512820790803-83ca734da794';
        }

        if (is_string($image->file_path) && Str::startsWith($image->file_path, ['http://', 'https://'])) {
            return $image->file_path;
        }

        try {
            $disk = $image->storage_disk ?: 'r2';
            $diskInstance = Storage::disk($disk);

            return method_exists($diskInstance, 'url')
                ? (string) $diskInstance->url($image->file_path)
                : $image->file_path;
        } catch (\Throwable) {
            return $image->file_path;
        }
    }

    private function sanitizeAccountNumber(?string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?: '';

        return $digits !== '' ? $digits : null;
    }

    private function accountLast4(?string $value): ?string
    {
        $digits = $this->sanitizeAccountNumber($value);

        return $digits ? substr($digits, -4) : null;
    }

    private function nullableTrim(?string $value): ?string
    {
        $trimmed = is_string($value) ? trim($value) : '';

        return $trimmed !== '' ? $trimmed : null;
    }

    private function sellerAssetUrl(?string $path): ?string
    {
        if (! is_string($path) || trim($path) === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        try {
            $disk = Storage::disk('r2');
            $url = method_exists($disk, 'url') ? (string) $disk->url($path) : $path;

            if ($url !== '' && ! Str::startsWith($url, ['/'])) {
                return $url;
            }

            return method_exists($disk, 'temporaryUrl')
                ? (string) $disk->temporaryUrl($path, now()->addHours(12))
                : $path;
        } catch (\Throwable) {
            return $path;
        }
    }

    private function storeSellerMedia(MediaStorageService $storage, UploadedFile $file, Seller $seller, string $folder): array
    {
        return $storage->storePublicFile($file, "seller-stores/{$seller->id}/{$folder}");
    }

    private function normalizeBrandColors(array $colors): array
    {
        return array_values(array_filter(array_map(static function ($color): ?string {
            if (! is_string($color)) {
                return null;
            }

            $trimmed = trim($color);
            if ($trimmed === '') {
                return null;
            }

            if (! preg_match('/^#?[0-9a-fA-F]{6}$/', $trimmed)) {
                return null;
            }

            return str_starts_with($trimmed, '#') ? strtoupper($trimmed) : '#' . strtoupper($trimmed);
        }, $colors)));
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
