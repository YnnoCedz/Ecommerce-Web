<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\ReviewReply;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Services\MediaStorageService;
use App\Services\NotificationService;
use App\Services\OrderLifecycleService;
use App\Services\PsgcService;
use App\Services\SellerSalesReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SellerController extends Controller
{
    public function __construct(
        private readonly OrderLifecycleService $orderLifecycle,
        private readonly NotificationService $notifications,
        private readonly SellerSalesReportService $salesReports,
        private readonly MediaStorageService $media,
    ) {}

    public function dashboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => ['nullable', Rule::in([7, 30, 90])],
        ]);
        $days = (int) ($validated['range'] ?? 30);
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
        [$from, $to] = $this->salesReports->presetRange($days);
        $salesReport = $this->salesReports->build($seller, $from, $to);

        $productQuery = Product::query()
            ->where('seller_id', $seller->id)
            ->whereNull('deleted_at');
        $productStats = (clone $productQuery)->selectRaw('COUNT(*) AS total_products')
            ->selectRaw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_products")
            ->selectRaw("SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_products")
            ->selectRaw("SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_products")
            ->selectRaw('SUM(CASE WHEN track_inventory = 1 AND stock_quantity > 0 AND stock_quantity <= COALESCE(low_stock_threshold, 10) THEN 1 ELSE 0 END) AS low_stock_products')
            ->selectRaw('SUM(CASE WHEN track_inventory = 1 AND stock_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock_products')
            ->first();
        $recentProducts = (clone $productQuery)
            ->with(['category', 'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'), 'variants.options'])
            ->latest()
            ->limit(5)
            ->get();

        $orderQuery = SellerOrder::query()->where('seller_id', $seller->id);
        $orderStats = (clone $orderQuery)
            ->selectRaw("SUM(CASE WHEN status IN ('pending', 'new') THEN 1 ELSE 0 END) AS pending_orders")
            ->selectRaw("SUM(CASE WHEN status IN ('confirmed', 'preparing', 'ready') THEN 1 ELSE 0 END) AS processing_orders")
            ->selectRaw("SUM(CASE WHEN status IN ('picked-up', 'in-transit', 'out-for-delivery', 'shipped') THEN 1 ELSE 0 END) AS shipped_orders")
            ->selectRaw("SUM(CASE WHEN status IN ('delivered', 'completed') THEN 1 ELSE 0 END) AS completed_orders")
            ->selectRaw("SUM(CASE WHEN status IN ('cancelled', 'failed') THEN 1 ELSE 0 END) AS cancelled_orders")
            ->selectRaw("SUM(CASE WHEN status IN ('pending', 'new') THEN grand_total ELSE 0 END) AS pending_sales")
            ->first();
        $recentSellerOrders = (clone $orderQuery)
            ->with(['order.items.product.images', 'order.buyer', 'shipment.courier', 'shipment.trackingEvents'])
            ->latest('updated_at')
            ->limit(5)
            ->get();

        $summary = [
            'total_products' => (int) $productStats->total_products,
            'active_products' => (int) $productStats->active_products,
            'draft_products' => (int) $productStats->draft_products,
            'archived_products' => (int) $productStats->archived_products,
            'low_stock_products' => (int) $productStats->low_stock_products,
            'out_of_stock_products' => (int) $productStats->out_of_stock_products,
            'pending_orders' => (int) $orderStats->pending_orders,
            'processing_orders' => (int) $orderStats->processing_orders,
            'shipped_orders' => (int) $orderStats->shipped_orders,
            'completed_orders' => (int) $orderStats->completed_orders,
            'cancelled_orders' => (int) $orderStats->cancelled_orders,
            'total_sales' => $salesReport['summary']['net_product_sales'],
            'pending_sales' => (float) $orderStats->pending_sales,
            'orders_count' => $salesReport['summary']['total_orders'],
            'promotions_count' => Promotion::where('seller_id', $seller->id)->count(),
            'recent_activity' => $recentSellerOrders->values()->all(),
        ];

        return response()->json([
            'data' => [
                'seller' => $this->sellerPayload($seller),
                'summary' => $summary,
                'recent_orders' => $recentSellerOrders
                    ->sortByDesc(fn (SellerOrder $order) => $order->order?->placed_at ?? $order->created_at)
                    ->take(5)
                    ->values()
                    ->map(fn (SellerOrder $sellerOrder) => $this->sellerOrderPayload($sellerOrder))
                    ->all(),
                'recent_products' => $recentProducts
                    ->values()
                    ->map(fn (Product $product) => $this->productPayload($product))
                    ->all(),
                'top_products' => $salesReport['top_products'],
                'revenue_series' => collect($salesReport['series'])->map(fn (array $row) => [
                    'date' => $row['date'],
                    'label' => $row['label'],
                    'value' => $row['revenue'],
                ])->all(),
                'order_series' => collect($salesReport['series'])->map(fn (array $row) => [
                    'date' => $row['date'],
                    'label' => $row['label'],
                    'value' => $row['orders'],
                ])->all(),
                'category_breakdown' => $salesReport['category_breakdown'],
                'sales_summary' => $salesReport['summary'],
                'reporting_period' => $salesReport['period'],
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

    public function updateMe(Request $request, MediaStorageService $storage, PsgcService $psgc): JsonResponse
    {
        $seller = $request->user()->seller;

        if (! $seller) {
            return response()->json([
                'message' => 'Seller profile not found.',
                'code' => 'seller_profile_missing',
            ], 404);
        }

        $data = $request->validate([
            'business_name' => ['nullable', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('sellers', 'slug')->ignore($seller->id)],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'contact_email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'public_email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'messaging_phone' => ['nullable', 'string', 'max:30'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['nullable', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['nullable', 'string', 'size:10'],
            'barangay_code' => ['nullable', 'string', 'size:10'],
            'province' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'regex:/^\d{4}$/'],
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
            'operating_hours' => ['nullable', 'array'],
            'operating_hours.*.day' => ['nullable', 'string', 'max:60'],
            'operating_hours.*.hours' => ['nullable', 'string', 'max:120'],
            'logo_file' => ['nullable', 'image', 'max:5120'],
            'banner_file' => ['nullable', 'image', 'max:10240'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_banner' => ['nullable', 'boolean'],
        ]);

        if (collect(['region_code', 'province_code', 'city_code', 'barangay_code'])
            ->contains(fn (string $key) => filled($data[$key] ?? null))) {
            $location = Validator::make($data, [
                'region_code' => ['required', 'string', 'size:10'],
                'province_code' => ['nullable', 'string', 'size:10'],
                'city_code' => ['required', 'string', 'size:10'],
                'barangay_code' => ['required', 'string', 'size:10'],
                'postal_code' => ['required', 'regex:/^\d{4}$/'],
            ])->validate();
            $data = array_merge($data, $psgc->validateHierarchy($location));
        }

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
            $slug = array_key_exists('slug', $data) ? Str::slug((string) ($data['slug'] ?? '')) : $seller->slug;
            $slug = $slug !== '' ? $slug : $seller->slug;

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
                'slug' => $slug,
                'trade_name' => $optionalText('trade_name', $seller->trade_name),
                'tagline' => $optionalText('tagline', $seller->tagline),
                'description' => $optionalText('description', $seller->description),
                'contact_email' => $optionalText('contact_email', $seller->contact_email),
                'public_email' => $optionalText('public_email', $seller->public_email),
                'contact_phone' => $optionalText('contact_phone', $seller->contact_phone),
                'messaging_phone' => $optionalText('messaging_phone', $seller->messaging_phone),
                'address_line1' => $optionalText('address_line1', $seller->address_line1),
                'address_line2' => $optionalText('address_line2', $seller->address_line2),
                'region' => array_key_exists('region', $data) ? $data['region'] : $seller->region,
                'region_code' => array_key_exists('region_code', $data) ? $data['region_code'] : $seller->region_code,
                'province' => $optionalText('province', $seller->province),
                'province_code' => array_key_exists('province_code', $data) ? $data['province_code'] : $seller->province_code,
                'city' => $optionalText('city', $seller->city),
                'city_code' => array_key_exists('city_code', $data) ? $data['city_code'] : $seller->city_code,
                'barangay' => array_key_exists('barangay', $data) ? $data['barangay'] : $seller->barangay,
                'barangay_code' => array_key_exists('barangay_code', $data) ? $data['barangay_code'] : $seller->barangay_code,
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
                    'stock_quantity' => $data['variants'] === []
                        ? $data['stock_quantity']
                        : (int) collect($data['variants'])->sum(fn (array $variant) => ($variant['active'] ?? true) ? (int) $variant['stock_quantity'] : 0),
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
                    'stock_quantity' => $data['variants'] === []
                        ? $data['stock_quantity']
                        : (int) collect($data['variants'])->sum(fn (array $variant) => ($variant['active'] ?? true) ? (int) $variant['stock_quantity'] : 0),
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
            return response()->json(['data' => [], 'server_time' => now()->toISOString()]);
        }

        $orders = SellerOrder::query()
            ->with(['order.items.product.images', 'order.buyer', 'shipment.courier', 'shipment.trackingEvents'])
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
            'status' => ['required', 'in:confirmed,preparing,ready'],
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
                    'product_image' => $this->optionalImageUrl($review->product?->images?->sortBy('sort_order')->first()),
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

        $query = Product::query()
            ->with(['category', 'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'), 'variants.options'])
            ->where('seller_id', $seller->id)
            ->whereNull('deleted_at');

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhereHas('variants', fn ($variantQuery) => $variantQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%"));
            });
        }

        $countQuery = clone $query;
        $applyStockStatus = function ($builder, string $status) {
            $comparison = match ($status) {
                'in-stock' => fn ($stockQuery) => $stockQuery->whereColumn('stock_quantity', '>', 'low_stock_threshold'),
                'low-stock' => fn ($stockQuery) => $stockQuery->where('stock_quantity', '>', 0)->whereColumn('stock_quantity', '<=', 'low_stock_threshold'),
                default => fn ($stockQuery) => $stockQuery->where('stock_quantity', '<=', 0),
            };

            return $builder->where(function ($statusQuery) use ($comparison) {
                $statusQuery->whereHas('variants', $comparison)
                    ->orWhere(function ($productQuery) use ($comparison) {
                        $productQuery->whereDoesntHave('variants');
                        $comparison($productQuery);
                    });
            });
        };
        $counts = [
            'all' => (clone $countQuery)->count(),
            'in-stock' => $applyStockStatus(clone $countQuery, 'in-stock')->count(),
            'low-stock' => $applyStockStatus(clone $countQuery, 'low-stock')->count(),
            'out-of-stock' => $applyStockStatus(clone $countQuery, 'out-of-stock')->count(),
        ];

        match ($request->input('stock_status')) {
            'in-stock' => $applyStockStatus($query, 'in-stock'),
            'low-stock' => $applyStockStatus($query, 'low-stock'),
            'out-of-stock' => $applyStockStatus($query, 'out-of-stock'),
            default => null,
        };

        if ($request->hasAny(['page', 'per_page', 'search', 'stock_status'])) {
            $perPage = min(100, max(1, (int) $request->input('per_page', 20)));
            $products = $query->latest('id')->paginate($perPage);
            $products->setCollection($products->getCollection()->map(fn (Product $product) => $this->productPayload($product)));

            return response()->json([
                'data' => $products->items(),
                'meta' => [
                    'current_page' => $products->currentPage(),
                    'per_page' => $products->perPage(),
                    'last_page' => $products->lastPage(),
                    'total' => $products->total(),
                    'from' => $products->firstItem(),
                    'to' => $products->lastItem(),
                    'counts' => $counts,
                ],
            ]);
        }

        $products = $query->latest('id')->limit(100)->get()
            ->map(fn (Product $product) => $this->productPayload($product))->values();

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
            ->with(['category', 'product:id,seller_id,name,slug,price,sale_price', 'product.variants:id,product_id,active'])
            ->where('seller_id', $seller->id)
            ->latest('id')
            ->get()
            ->map(fn (Promotion $promotion) => $this->promotionPayload($promotion))
            ->values();

        return response()->json([
            'data' => $promotions,
            'server_time' => now()->toISOString(),
        ]);
    }

    public function storePromotion(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;
        $data = $this->validateTimedPromotion($request, $seller);
        $promotion = DB::transaction(function () use ($data, $seller): Promotion {
            $product = Product::query()->where('seller_id', $seller->id)->where('status', 'active')->whereNull('deleted_at')->lockForUpdate()->findOrFail($data['product_id']);
            $this->ensureNoPromotionOverlap($product, $data['starts_at'], $data['ends_at']);

            return Promotion::create([
                ...$data,
                'seller_id' => $seller->id,
                'kind' => 'deal',
                'code' => 'DEAL-'.strtoupper(Str::random(12)),
                'status' => 'active',
                'applies_to_label' => $product->name,
            ])->load('product.variants');
        });

        return response()->json(['message' => 'Timed promotion created.', 'data' => $this->promotionPayload($promotion)], 201);
    }

    public function updatePromotion(Request $request, Promotion $promotion): JsonResponse
    {
        $seller = $request->user()->seller;
        abort_unless($promotion->seller_id === $seller?->id && $promotion->kind === 'deal', 404);

        if ($promotion->derivedStatus() !== 'scheduled') {
            return response()->json(['message' => 'Only scheduled promotions can be edited.'], 422);
        }

        $data = $this->validateTimedPromotion($request, $seller);
        DB::transaction(function () use ($data, $promotion, $seller): void {
            $product = Product::query()->where('seller_id', $seller->id)->where('status', 'active')->whereNull('deleted_at')->lockForUpdate()->findOrFail($data['product_id']);
            $this->ensureNoPromotionOverlap($product, $data['starts_at'], $data['ends_at'], $promotion->id);
            $promotion->update([...$data, 'applies_to_label' => $product->name]);
        });

        return response()->json(['message' => 'Timed promotion updated.', 'data' => $this->promotionPayload($promotion->fresh('product.variants'))]);
    }

    public function cancelPromotion(Request $request, Promotion $promotion): JsonResponse
    {
        $seller = $request->user()->seller;
        abort_unless($promotion->seller_id === $seller?->id && $promotion->kind === 'deal', 404);
        if (! in_array($promotion->derivedStatus(), ['active', 'scheduled'], true)) {
            return response()->json(['message' => 'Only active or scheduled promotions can be cancelled.'], 422);
        }
        $promotion->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        return response()->json(['message' => 'Promotion cancelled.', 'data' => $this->promotionPayload($promotion->fresh('product.variants'))]);
    }

    private function validateTimedPromotion(Request $request, Seller $seller): array
    {
        // Keep older clients compatible while making the discount contract explicit.
        if (! $request->filled('type') && $request->filled('deal_price')) {
            $request->merge(['type' => 'fixed-price', 'value' => $request->input('deal_price')]);
        }

        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::in(['fixed-price', 'percentage'])],
            'value' => ['required', 'numeric', 'gt:0'],
            'deal_price' => ['nullable', 'numeric', 'gt:0'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);

        $product = Product::query()->where('seller_id', $seller->id)->where('status', 'active')->whereNull('deleted_at')->find($data['product_id']);
        if (! $product) {
            abort(422, 'Select an active product that belongs to your store.');
        }

        $normalPrice = (float) ($product->sale_price ?? $product->price);
        if ($data['type'] === 'percentage') {
            if ((float) $data['value'] >= 100) {
                abort(422, 'The discount percentage must be less than 100.');
            }
            $data['deal_price'] = null;
        } else {
            if ($product->variants()->where('active', true)->exists()) {
                abort(422, 'Products with variants must use a percentage deal so each variant keeps its own price basis.');
            }
            $data['deal_price'] = (float) ($data['deal_price'] ?? $data['value']);
            $data['value'] = $data['deal_price'];
            if ($data['deal_price'] >= $normalPrice) {
                abort(422, 'The deal price must be lower than the current normal price.');
            }
        }

        $data['starts_at'] = Carbon::parse($data['starts_at'])->setTimezone(config('app.timezone'));
        $data['ends_at'] = Carbon::parse($data['ends_at'])->setTimezone(config('app.timezone'));

        return $data;
    }

    private function ensureNoPromotionOverlap(Product $product, mixed $startsAt, mixed $endsAt, ?int $exceptId = null): void
    {
        $overlap = Promotion::query()->where('product_id', $product->id)->where('kind', 'deal')
            ->whereNull('cancelled_at')->where('status', '!=', 'cancelled')
            ->when($exceptId, fn ($query) => $query->whereKeyNot($exceptId))
            ->where('starts_at', '<', $endsAt)->where('ends_at', '>', $startsAt)->exists();

        abort_if($overlap, 422, 'This product already has a promotion scheduled during the selected period.');
    }

    private function promotionPayload(Promotion $promotion): array
    {
        $product = $promotion->product;
        $normalPrice = $product ? (float) ($product->sale_price ?? $product->price) : null;
        $previewPrice = $normalPrice === null ? null : ($promotion->type === 'percentage'
            ? round($normalPrice * (1 - ((float) $promotion->value / 100)), 2)
            : (float) $promotion->deal_price);

        return [
            'id' => $promotion->id, 'code' => $promotion->code, 'kind' => $promotion->kind,
            'name' => $promotion->name ?? $promotion->code, 'type' => $promotion->type,
            'value' => (float) $promotion->value, 'deal_price' => $promotion->deal_price !== null ? (float) $promotion->deal_price : null,
            'regular_price' => $product ? (float) $product->price : null,
            'sale_price' => $product?->sale_price !== null ? (float) $product->sale_price : null,
            'promotion_price' => $previewPrice,
            'variant_pricing' => $product?->relationLoaded('variants') && $product->variants->contains(fn (ProductVariant $variant) => (bool) $variant->active)
                ? 'percentage-applied-per-variant'
                : 'product-price',
            'min_order' => $promotion->min_order !== null ? (float) $promotion->min_order : null,
            'usage_count' => (int) $promotion->usage_count, 'usage_limit' => $promotion->usage_limit !== null ? (int) $promotion->usage_limit : null,
            'starts_at' => $promotion->starts_at?->toISOString(), 'ends_at' => $promotion->ends_at?->toISOString(),
            'start_date' => $promotion->starts_at?->toDateString(), 'end_date' => $promotion->ends_at?->toDateString(),
            'status' => $promotion->kind === 'deal' ? $promotion->derivedStatus() : $promotion->status,
            'applies_to' => $promotion->product?->name ?? $promotion->applies_to_label ?? ($promotion->category?->name ?? 'All products'),
            'product' => $promotion->product ? ['id' => $promotion->product->id, 'name' => $promotion->product->name, 'slug' => $promotion->product->slug] : null,
            'category' => $promotion->category ? ['id' => $promotion->category->id, 'name' => $promotion->category->name, 'slug' => $promotion->category->slug] : null,
            'new_customers_only' => (bool) $promotion->new_customers_only,
        ];
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
            'region' => $seller?->region,
            'region_code' => $seller?->region_code,
            'province' => $seller?->province,
            'province_code' => $seller?->province_code,
            'city' => $seller?->city,
            'city_code' => $seller?->city_code,
            'barangay' => $seller?->barangay,
            'barangay_code' => $seller?->barangay_code,
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
                'option_values' => $variant->relationLoaded('options')
                    ? $variant->options->sortBy('sort_order')->map(fn ($option) => [
                        'name' => $option->option_name ?? $variant->name,
                        'value' => $option->value,
                    ])->values()->all()
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
            'order_id' => $sellerOrder->order_id,
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
                'name' => $sellerOrder->shipment->courier?->name ?? 'Maketo Logistics',
                'tracking' => $sellerOrder->shipment->tracking_number,
                'driver' => $sellerOrder->shipment->driver_name,
                'status' => $sellerOrder->shipment->status,
                'events' => $sellerOrder->shipment->relationLoaded('trackingEvents')
                    ? $sellerOrder->shipment->trackingEvents->sortByDesc('id')->map(fn ($event) => [
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
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'variant_name' => $item->variant_name,
                        'sku' => $item->sku,
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'subtotal' => (float) $item->subtotal,
                        'image' => $this->orderItemImage($item),
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
                    'image' => $this->imageUrl($items->first()?->product?->images?->first()),
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
        $variants = $this->normalizeArrayInput($request->input('variants', []));
        $hasVariants = $variants !== [];
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'category_id' => ['required', Rule::exists('categories', 'id')],
            'tags' => ['nullable'],
            'sku' => [
                $hasVariants ? 'nullable' : 'required',
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
            'images.*' => ['file', 'image', 'max:15360'],
        ]);

        if ($hasVariants) {
            Validator::make(['variants' => $variants], [
                'variants' => ['required', 'array', 'min:1', 'max:200'],
                'variants.*.server_id' => ['nullable', 'integer'],
                'variants.*.name' => ['required', 'string', 'max:255'],
                'variants.*.sku' => ['required', 'string', 'max:255', 'distinct'],
                'variants.*.barcode' => ['nullable', 'string', 'max:255'],
                'variants.*.price_override' => ['required', 'numeric', 'min:0'],
                'variants.*.sale_price_override' => ['nullable', 'numeric', 'min:0'],
                'variants.*.stock_quantity' => ['required', 'integer', 'min:0'],
                'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
                'variants.*.active' => ['sometimes', 'boolean'],
                'variants.*.option_values' => ['required', 'array', 'min:1'],
                'variants.*.option_values.*.name' => ['required', 'string', 'max:100'],
                'variants.*.option_values.*.value' => ['required', 'string', 'max:100'],
            ])->validate();

            $variantErrors = [];
            $payloadSkus = [];
            $combinationKeys = [];
            foreach ($variants as $index => $variantData) {
                $serverId = isset($variantData['server_id']) ? (int) $variantData['server_id'] : null;
                $normalizedSku = Str::lower(trim((string) $variantData['sku']));
                if (isset($payloadSkus[$normalizedSku])) {
                    $variantErrors["variants.{$index}.sku"] = ["{$variantData['name']}: SKU already used by another variant."];
                }
                $payloadSkus[$normalizedSku] = true;

                $optionNames = [];
                $combinationParts = [];
                foreach ($variantData['option_values'] as $optionIndex => $option) {
                    $normalizedName = Str::lower(trim((string) $option['name']));
                    if (isset($optionNames[$normalizedName])) {
                        $variantErrors["variants.{$index}.option_values.{$optionIndex}.name"] = ['Each option group may appear only once in a combination.'];
                    }
                    $optionNames[$normalizedName] = true;
                    $combinationParts[] = $normalizedName.'='.Str::lower(trim((string) $option['value']));
                }
                sort($combinationParts);
                $combinationKey = implode('|', $combinationParts);
                if (isset($combinationKeys[$combinationKey])) {
                    $variantErrors["variants.{$index}.option_values"] = ["{$variantData['name']}: This option combination already exists."];
                }
                $combinationKeys[$combinationKey] = true;

                if ($serverId && (! $product || ! $product->variants()->whereKey($serverId)->exists())) {
                    $variantErrors["variants.{$index}.server_id"] = ['This variant does not belong to the product being edited.'];
                }

                $duplicateSku = ProductVariant::query()
                    ->where('sku', trim((string) $variantData['sku']))
                    ->when($serverId, fn ($query) => $query->whereKeyNot($serverId))
                    ->first();
                if ($duplicateSku && ($serverId || $duplicateSku->product_id !== $product?->id)) {
                    $variantErrors["variants.{$index}.sku"] = ["{$variantData['name']}: SKU already used by another variant."];
                }
            }

            if ($variantErrors !== []) {
                throw ValidationException::withMessages($variantErrors);
            }
        }

        $tags = $this->normalizeTags($request->input('tags', []));
        $productSku = trim((string) ($validated['sku'] ?? ''));
        if ($productSku === '') {
            $productSku = $product?->sku ?? $this->generateUniqueProductSku($validated['name']);
        }

        return [
            'name' => trim($validated['name']),
            'description' => $this->nullableTrim($validated['description'] ?? null),
            'category_id' => (int) $validated['category_id'],
            'tags' => $tags,
            'sku' => $productSku,
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
            $slug = $base.'-'.Str::lower(Str::random(6 + $attempt));
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
            $variant = $variantId
                ? $product->variants()->whereKey($variantId)->first()
                : $product->variants()->where('sku', trim((string) ($variantData['sku'] ?? '')))->first();

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

            $optionValues = $this->normalizeArrayInput($variantData['option_values'] ?? []);
            foreach (array_values($optionValues) as $sortOrder => $option) {
                if (! is_array($option) || trim((string) ($option['name'] ?? '')) === '' || trim((string) ($option['value'] ?? '')) === '') {
                    continue;
                }

                $variant->options()->create([
                    'option_name' => trim((string) $option['name']),
                    'value' => trim((string) $option['value']),
                    'sort_order' => $sortOrder,
                ]);
            }
        }

        if ($shouldSync) {
            $product->variants()->whereNotIn('id', $existingIds)->get()->each(function (ProductVariant $variant) {
                $isReferenced = $variant->cartItems()->exists()
                    || OrderItem::query()->where('product_variant_id', $variant->id)->exists();

                if ($isReferenced) {
                    $variant->forceFill(['active' => false])->save();
                } else {
                    $variant->options()->delete();
                    $variant->delete();
                }
            });
        }
    }

    private function recalculateStockFromVariants(Product $product): void
    {
        if ($product->variants()->where('active', true)->exists()) {
            $product->forceFill([
                'stock_quantity' => (int) $product->variants()->where('active', true)->sum('stock_quantity'),
            ])->save();
        }
    }

    private function generateUniqueProductSku(string $name): string
    {
        $base = strtoupper(Str::slug($name, '-'));
        $base = $base !== '' ? substr($base, 0, 220) : 'PRODUCT';

        do {
            $sku = $base.'-'.strtoupper(Str::random(8));
        } while (Product::query()->where('sku', $sku)->exists());

        return $sku;
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
        return $this->optionalImageUrl($image)
            ?? 'https://images.unsplash.com/photo-1512820790803-83ca734da794';
    }

    private function optionalImageUrl(?ProductImage $image): ?string
    {
        return $image
            ? $this->media->publicUrl($image->file_path, $image->storage_disk ?: 'r2')
            : null;
    }

    private function orderItemImage(OrderItem $item): ?string
    {
        if ($item->product_image_storage_path) {
            return $this->media->publicUrl(
                $item->product_image_storage_path,
                $item->product_image_storage_disk ?: 'r2'
            );
        }

        return $this->optionalImageUrl($item->product?->images?->first());
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

        return $this->media->publicUrl($path);
    }

    private function storeSellerMedia(MediaStorageService $storage, UploadedFile $file, Seller $seller, string $folder): array
    {
        return $storage->storePublicFile($file, "seller-stores/{$seller->id}/{$folder}");
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
