<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\Seller;
use App\Services\MediaStorageService;
use App\Services\ProductPricingService;
use App\Services\ProductSearchService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    public function __construct(
        private readonly ProductSearchService $searchService,
        private readonly MediaStorageService $mediaStorage,
        private readonly ProductPricingService $pricing,
    ) {}

    public function categories(): JsonResponse
    {
        $categories = Cache::remember('catalog.categories.v1', 120, fn () => Category::query()
            ->withCount(['products as product_count' => function ($query) {
                $query->where('status', 'active')->whereNull('deleted_at');
            }])
            ->with(['children' => function ($query) {
                $query->select(['id', 'parent_id', 'name'])->orderBy('sort_order')->orderBy('name');
            }])
            ->whereNull('parent_id')
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => $this->categoryPayload($category))
            ->values()
            ->all());

        return response()->json(['data' => $categories]);
    }

    public function products(Request $request): JsonResponse
    {
        $query = Product::query()
            ->select([
                'id', 'seller_id', 'category_id', 'slug', 'name', 'price', 'sale_price',
                'stock_quantity', 'track_inventory', 'free_shipping', 'status', 'published_at',
            ])
            ->with([
                'activePromotion:id,product_id,name,type,value,deal_price,usage_limit,usage_count,per_buyer_limit,starts_at,ends_at',
                'seller:id,user_id,slug,business_name,trade_name',
                'category:id,slug,name',
                'primaryImage:id,product_id,file_path,storage_disk',
            ])
            ->withExists(['variants as has_active_variants' => fn ($variants) => $variants->where('active', true)])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount(['reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved')])
            ->withSum(['orderItems as sold_count' => fn ($items) => $items->whereHas(
                'sellerOrder',
                fn ($orders) => $orders->whereIn('status', ['delivered', 'completed'])
            )], 'quantity')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereHas('seller', fn (Builder $seller) => $this->applyPublicSellerVisibility($seller));

        if ($request->filled('category')) {
            $categorySlug = (string) $request->query('category');
            $query->whereHas('category', fn ($categoryQuery) => $categoryQuery->where('slug', $categorySlug));
        }

        if ($request->filled('seller')) {
            $sellerSlug = (string) $request->query('seller');
            $query->whereHas('seller', fn ($sellerQuery) => $sellerQuery->where('slug', $sellerSlug));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($productQuery) use ($search) {
                $productQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhere('sku', 'like', '%'.$search.'%')
                    ->orWhereHas('seller', fn ($sellerQuery) => $sellerQuery->where('business_name', 'like', '%'.$search.'%')->orWhere('trade_name', 'like', '%'.$search.'%'))
                    ->orWhereHas('category', fn ($categoryQuery) => $categoryQuery->where('name', 'like', '%'.$search.'%'));
            });
        }

        if ($request->filled('limit')) {
            $query->limit(min(100, max(1, (int) $request->query('limit'))));
        }

        $products = $query
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Product $product) => $this->productPayload($product));

        return response()->json(['data' => $products]);
    }

    public function deals(): JsonResponse
    {
        $products = Product::query()
            ->select(['id', 'seller_id', 'category_id', 'slug', 'name', 'price', 'sale_price', 'stock_quantity', 'track_inventory', 'free_shipping', 'status', 'published_at'])
            ->with([
                'activePromotion:id,product_id,name,type,value,deal_price,usage_limit,usage_count,per_buyer_limit,starts_at,ends_at',
                'seller:id,user_id,slug,business_name,trade_name',
                'category:id,slug,name',
                'primaryImage:id,product_id,file_path,storage_disk',
            ])
            ->withExists(['variants as has_active_variants' => fn ($variants) => $variants->where('active', true)])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount(['reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved')])
            ->withSum('orderItems as sold_count', 'quantity')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereHas('activePromotion')
            ->where(fn (Builder $stock) => $stock->where('track_inventory', false)->orWhere('stock_quantity', '>', 0))
            ->whereHas('seller', fn (Builder $seller) => $this->applyPublicSellerVisibility($seller))
            ->orderByDesc('published_at')
            ->limit(30)
            ->get()
            ->map(fn (Product $product) => $this->productPayload($product))
            ->filter(fn (array $product) => $product['is_deal'])
            ->values();

        return response()->json(['data' => $products, 'server_time' => now()->toISOString()]);
    }

    public function search(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'seller' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0', 'gte:min_price'],
            'min_rating' => ['nullable', 'numeric', 'between:0,5'],
            'free_shipping' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(['relevance', 'price_low_high', 'price_high_low', 'price-asc', 'price-desc', 'newest', 'rating', 'popular', 'sales'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $result = $this->searchService->search($filters);
        $paginator = $result['paginator'];

        return response()->json([
            'data' => collect($paginator->items())->map(fn (Product $product) => $this->productPayload($product))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'query' => [
                'original' => (string) ($filters['q'] ?? ''),
                'normalized' => $result['normalized_query'],
                'suggested' => $result['suggested_query'],
            ],
        ]);
    }

    public function searchSuggestions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $suggestions = $this->searchService
            ->suggestions($data['q'], (int) ($data['limit'] ?? 6))
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'type' => 'product',
                'label' => $product->name,
                'subtitle' => implode(' · ', array_filter([
                    $product->category?->name,
                    $product->seller?->trade_name ?: $product->seller?->business_name,
                ])),
                'slug' => $product->slug,
                'image' => ($image = $product->images->first())
                    ? $this->publicMediaUrl($image->file_path, $image->storage_disk ?? 'r2')
                    : null,
            ])
            ->values();

        return response()->json(['data' => $suggestions]);
    }

    public function product(string $slug): JsonResponse
    {
        $product = Product::query()
            ->with([
                'seller' => fn ($seller) => $seller
                    ->with(['user', 'categories'])
                    ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
                    ->withCount([
                        'reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved'),
                        'followers as actual_follower_count',
                        'products as active_product_count' => fn ($products) => $products->where('status', 'active')->whereNull('deleted_at'),
                        'sellerOrders as fulfilled_order_count' => fn ($orders) => $orders->whereIn('status', ['delivered', 'completed']),
                    ])
                    ->withSum(['orderItems as units_sold' => fn ($items) => $items->whereHas(
                        'sellerOrder',
                        fn ($orders) => $orders->whereIn('status', ['delivered', 'completed'])
                    )], 'quantity'),
                'category.parent',
                'images' => fn ($images) => $images->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id'),
                'variants.options',
                'activePromotion:id,product_id,name,type,value,deal_price,usage_limit,usage_count,per_buyer_limit,starts_at,ends_at',
            ])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount(['reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved')])
            ->withSum(['orderItems as sold_count' => fn ($items) => $items->whereHas(
                'sellerOrder',
                fn ($orders) => $orders->whereIn('status', ['delivered', 'completed'])
            )], 'quantity')
            ->where('slug', $slug)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereHas('seller', fn (Builder $seller) => $this->applyPublicSellerVisibility($seller))
            ->first();

        if (! $product) {
            return response()->json([
                'message' => 'Product not found.',
            ], 404);
        }

        $related = Product::query()
            ->with([
                'seller.user',
                'category',
                'images' => fn ($images) => $images->orderBy('sort_order')->orderBy('id'),
                'activePromotion:id,product_id,name,type,value,deal_price,usage_limit,usage_count,per_buyer_limit,starts_at,ends_at',
            ])
            ->withExists(['variants as has_active_variants' => fn ($variants) => $variants->where('active', true)])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount(['reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved')])
            ->withSum(['orderItems as sold_count' => fn ($items) => $items->whereHas(
                'sellerOrder',
                fn ($orders) => $orders->whereIn('status', ['delivered', 'completed'])
            )], 'quantity')
            ->whereKeyNot($product->id)
            ->where('category_id', $product->category_id)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereHas('seller', fn (Builder $seller) => $this->applyPublicSellerVisibility($seller))
            ->orderByDesc('rating')
            ->orderByDesc('sold_count')
            ->orderByDesc('published_at')
            ->limit(8)
            ->get()
            ->map(fn (Product $relatedProduct) => $this->productPayload($relatedProduct));

        return response()->json([
            'data' => $this->productDetailPayload($product, $related),
            'server_time' => now()->toISOString(),
        ]);
    }

    public function productReviews(Request $request, string $slug): JsonResponse
    {
        $filters = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'sort' => ['nullable', Rule::in(['newest', 'highest_rating', 'lowest_rating', 'most_helpful'])],
        ]);

        $product = Product::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereHas('seller', fn (Builder $seller) => $this->applyPublicSellerVisibility($seller))
            ->first();

        if (! $product) {
            return response()->json(['message' => 'Product not found.'], 404);
        }

        $sort = $filters['sort'] ?? 'newest';
        $reviews = Review::query()
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->with(['user', 'orderItem.order', 'reply.seller'])
            ->when($sort === 'highest_rating', fn ($query) => $query->orderByDesc('rating')->latest('submitted_at'))
            ->when($sort === 'lowest_rating', fn ($query) => $query->orderBy('rating')->latest('submitted_at'))
            ->when($sort === 'most_helpful', fn ($query) => $query->orderByDesc('helpful_count')->latest('submitted_at'))
            ->when($sort === 'newest', fn ($query) => $query->latest('submitted_at'))
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 10));

        return response()->json([
            'data' => collect($reviews->items())->map(fn (Review $review) => $this->publicReviewPayload($review))->values(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    public function sellers(): JsonResponse
    {
        $sellers = Cache::remember('catalog.sellers.v1', 120, fn () => Seller::query()
            ->select([
                'id', 'user_id', 'slug', 'business_name', 'trade_name', 'description',
                'logo_path', 'banner_path', 'verified', 'city', 'province', 'joined_year',
                'created_at',
            ])
            ->with([
                'user:id,avatar_path',
                'categories:id,name',
            ])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount([
                'reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved'),
                'followers as actual_follower_count',
                'products as active_product_count' => fn ($products) => $products->where('status', 'active')->whereNull('deleted_at'),
                'sellerOrders as fulfilled_order_count' => fn ($orders) => $orders->whereIn('status', ['delivered', 'completed']),
            ])
            ->withSum(['orderItems as units_sold' => fn ($items) => $items->whereHas('sellerOrder', fn ($orders) => $orders->whereIn('status', ['delivered', 'completed']))], 'quantity')
            ->where(fn (Builder $seller) => $this->applyPublicSellerVisibility($seller))
            ->orderByDesc('verified')
            ->orderBy('business_name')
            ->get()
            ->map(fn (Seller $seller) => $this->sellerPayload($seller))
            ->values()
            ->all());

        return response()->json(['data' => $sellers]);
    }

    public function seller(string $slug): JsonResponse
    {
        $seller = Seller::query()
            ->with([
                'user',
                'categories',
                'products' => fn ($query) => $query->with([
                    'images' => fn ($images) => $images->orderBy('sort_order')->orderBy('id'),
                    'category',
                    'seller.user',
                    'activePromotion:id,product_id,name,type,value,deal_price,usage_limit,usage_count,per_buyer_limit,starts_at,ends_at',
                ])
                    ->withExists(['variants as has_active_variants' => fn ($variants) => $variants->where('active', true)])
                    ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
                    ->withCount(['reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved')])
                    ->withSum(['orderItems as sold_count' => fn ($items) => $items->whereHas('sellerOrder', fn ($orders) => $orders->whereIn('status', ['delivered', 'completed']))], 'quantity')
                    ->where('status', 'active')
                    ->whereNull('deleted_at'),
            ])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount([
                'reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved'),
                'followers as actual_follower_count',
                'products as active_product_count' => fn ($products) => $products->where('status', 'active')->whereNull('deleted_at'),
                'sellerOrders as fulfilled_order_count' => fn ($orders) => $orders->whereIn('status', ['delivered', 'completed']),
            ])
            ->withSum(['orderItems as units_sold' => fn ($items) => $items->whereHas('sellerOrder', fn ($orders) => $orders->whereIn('status', ['delivered', 'completed']))], 'quantity')
            ->where('slug', $slug)
            ->where(fn (Builder $seller) => $this->applyPublicSellerVisibility($seller))
            ->first();

        if (! $seller) {
            return response()->json([
                'message' => 'Seller not found.',
            ], 404);
        }

        return response()->json([
            'data' => $this->sellerPayload($seller),
        ]);
    }

    protected function categoryPayload(Category $category): array
    {
        return [
            'id' => $category->id,
            'slug' => $category->slug,
            'label' => $category->name,
            'count' => (int) ($category->product_count ?? $category->products()->where('status', 'active')->whereNull('deleted_at')->count()),
            'subs' => $category->children->pluck('name')->all(),
        ];
    }

    protected function productPayload(Product $product): array
    {
        $primaryImage = $product->relationLoaded('primaryImage')
            ? $product->primaryImage
            : $product->images->first();
        $pricing = $this->pricing->for($product);
        $promotion = $pricing['promotion'];

        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'seller_slug' => $product->seller?->slug,
            'seller' => $product->seller?->trade_name
                ?? $product->seller?->business_name
                ?? $product->seller?->user?->display_name
                ?? 'Marketo Seller',
            'category_slug' => $product->category?->slug,
            'category' => $product->category?->name ?? 'Uncategorized',
            'regular_price' => $pricing['regular_price'],
            'sale_price' => $pricing['sale_price'],
            'promotion_price' => $pricing['promotion_price'],
            'price' => $pricing['effective_price'],
            'original_price' => $pricing['original_price'],
            'discount_amount' => $pricing['discount_amount'],
            'discount_percentage' => $pricing['discount_percentage'],
            'pricing_source' => $pricing['pricing_source'],
            'rating' => round((float) ($product->rating ?? 0), 1),
            'rating_count' => (int) ($product->rating_count ?? 0),
            'sold_count' => (int) ($product->sold_count ?? 0),
            'image_path' => $primaryImage?->file_path,
            'image' => $primaryImage
                ? $this->publicMediaUrl($primaryImage->file_path, $primaryImage->storage_disk ?? 'r2')
                : '/images/product-placeholder.svg',
            'badge' => $promotion ? 'DEAL' : ($pricing['pricing_source'] === 'sale' ? 'SALE' : null),
            'is_deal' => (bool) $promotion,
            'promotion' => $promotion ? [
                'id' => $promotion->id,
                'name' => $promotion->name,
                'type' => $promotion->type,
                'value' => (float) $promotion->value,
                'deal_price' => $promotion->deal_price !== null ? (float) $promotion->deal_price : null,
                'promotion_price' => $pricing['promotion_price'],
                'original_price' => $pricing['original_price'],
                'discount_amount' => $pricing['discount_amount'],
                'discount_percentage' => $pricing['discount_percentage'],
                'starts_at' => $promotion->starts_at?->toISOString(),
                'ends_at' => $promotion->ends_at?->toISOString(),
            ] : null,
            'in_stock' => $product->track_inventory ? $product->stock_quantity > 0 : true,
            'free_shipping' => (bool) $product->free_shipping,
        ];
    }

    protected function productDetailPayload(Product $product, iterable $related = []): array
    {
        $ratingDistribution = Review::query()
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->selectRaw('rating, COUNT(*) as review_count')
            ->groupBy('rating')
            ->pluck('review_count', 'rating');

        return array_merge($this->productPayload($product), [
            'description' => $product->description,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'stock_quantity' => $product->stock_quantity,
            'track_inventory' => (bool) $product->track_inventory,
            'weight_grams' => $product->weight_grams,
            'dimensions' => [
                'length_cm' => $product->length_cm,
                'width_cm' => $product->width_cm,
                'height_cm' => $product->height_cm,
            ],
            'seller' => $this->sellerPayload($product->seller),
            'category' => $this->categoryPayload($product->category),
            'images' => $product->images->map(fn ($image) => [
                'id' => $image->id,
                'path' => $image->file_path,
                'url' => $this->publicMediaUrl($image->file_path, $image->storage_disk ?? 'r2'),
                'alt' => $image->alt_text ?? $product->name,
                'sort_order' => $image->sort_order,
                'is_primary' => (bool) $image->is_primary,
            ])->values()->all(),
            'variants' => $product->variants
                ->where('active', true)
                ->map(function ($variant) use ($product): array {
                    $pricing = $this->pricing->for($product, $variant);

                    return [
                        'id' => $variant->id,
                        'name' => $variant->name,
                        'sku' => $variant->sku,
                        'price' => $pricing['effective_price'],
                        'regular_price' => $pricing['regular_price'],
                        'sale_price' => $pricing['sale_price'],
                        'promotion_price' => $pricing['promotion_price'],
                        'original_price' => $pricing['original_price'],
                        'discount_amount' => $pricing['discount_amount'],
                        'discount_percentage' => $pricing['discount_percentage'],
                        'pricing_source' => $pricing['pricing_source'],
                        'is_deal' => $pricing['promotion'] !== null,
                        'stock_quantity' => (int) $variant->stock_quantity,
                        'active' => (bool) $variant->active,
                        'options' => $variant->options->pluck('value')->values()->all(),
                        'option_values' => $variant->options->sortBy('sort_order')->map(fn ($option) => [
                            'name' => $option->option_name ?? $variant->name,
                            'value' => $option->value,
                        ])->values()->all(),
                    ];
                })->values()->all(),
            'review_summary' => [
                'average_rating' => round((float) ($product->rating ?? 0), 2),
                'review_count' => (int) ($product->rating_count ?? 0),
                'rating_distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(
                    fn (int $rating) => [(string) $rating => (int) ($ratingDistribution[$rating] ?? 0)]
                )->all(),
            ],
            'shipping_policy' => $product->seller->shipping_policy ?: config('marketplace.policies.default_shipping'),
            'return_policy' => $product->seller->return_policy ?: config('marketplace.policies.default_returns'),
            'delivery_estimate' => config('marketplace.delivery_estimate_message'),
            'related' => collect($related)->values()->all(),
        ]);
    }

    protected function sellerPayload(Seller $seller): array
    {
        return [
            'id' => $seller->id,
            'slug' => $seller->slug,
            'name' => $seller->trade_name ?: $seller->business_name,
            'initials' => collect(explode(' ', $seller->trade_name ?: $seller->business_name))
                ->filter()
                ->map(fn ($part) => mb_substr($part, 0, 1))
                ->take(2)
                ->implode(''),
            'category' => $seller->categories->first()?->name ?? 'Marketplace Seller',
            'rating' => round((float) ($seller->rating ?? 0), 2),
            'rating_count' => (int) ($seller->rating_count ?? 0),
            'product_count' => (int) ($seller->active_product_count ?? ($seller->relationLoaded('products') ? $seller->products->count() : 0)),
            'follower_count' => isset($seller->actual_follower_count) ? (int) $seller->actual_follower_count : null,
            'fulfilled_order_count' => isset($seller->fulfilled_order_count) ? (int) $seller->fulfilled_order_count : null,
            'units_sold' => isset($seller->units_sold) ? (int) $seller->units_sold : null,
            'joined_year' => (int) ($seller->joined_year ?: $seller->created_at?->year),
            'verified' => (bool) $seller->verified,
            'avatar_path' => $seller->user?->avatar_path,
            'avatar' => $seller->user?->avatar_path ? $this->publicMediaUrl($seller->user->avatar_path) : null,
            'logo_path' => $seller->logo_path,
            'logo' => $seller->logo_path ? $this->publicMediaUrl($seller->logo_path) : null,
            'banner_path' => $seller->banner_path,
            'banner' => $seller->banner_path ? $this->publicMediaUrl($seller->banner_path) : null,
            'location' => trim(implode(', ', array_filter([$seller->city, $seller->province]))),
            'description' => $seller->description,
            'products' => $seller->relationLoaded('products')
                ? $seller->products->map(fn (Product $product) => $this->productPayload($product))->values()->all()
                : [],
        ];
    }

    protected function publicReviewPayload(Review $review): array
    {
        $firstName = trim((string) $review->user?->first_name);
        $lastInitial = mb_substr(trim((string) $review->user?->last_name), 0, 1);
        $displayName = $firstName !== ''
            ? trim($firstName.' '.($lastInitial !== '' ? $lastInitial.'.' : ''))
            : 'Marketo Buyer';
        $order = $review->orderItem?->order;
        $sellerOrder = $review->orderItem?->sellerOrder;
        $verifiedPurchase = $review->order_item_id !== null
            && $order !== null
            && $order->buyer_id === $review->user_id
            && $sellerOrder?->status === 'completed';

        return [
            'id' => $review->id,
            'rating' => (int) $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            'buyer_display_name' => $displayName,
            'buyer_avatar' => $review->user?->avatar_path
                ? $this->publicMediaUrl($review->user->avatar_path)
                : null,
            'verified_purchase' => $verifiedPurchase,
            'helpful_count' => (int) $review->helpful_count,
            'created_at' => optional($review->submitted_at ?? $review->created_at)->toISOString(),
            'updated_at' => optional($review->updated_at)->toISOString(),
            'images' => [],
            'seller_reply' => $review->reply ? [
                'body' => $review->reply->body,
                'seller_name' => $review->reply->seller?->trade_name ?: $review->reply->seller?->business_name,
                'replied_at' => optional($review->reply->replied_at ?? $review->reply->created_at)->toISOString(),
            ] : null,
        ];
    }

    protected function applyPublicSellerVisibility(Builder $query): Builder
    {
        return $query
            ->where('status', 'approved')
            ->whereNull('deleted_at')
            ->whereHas('user', fn (Builder $user) => $user->where('status', 'active'));
    }

    protected function publicMediaUrl(?string $path, string $disk = 'r2'): ?string
    {
        if (! $path || Str::startsWith($path, ['http://', 'https://', 'data:', '/'])) {
            return $path;
        }

        return $this->mediaStorage->publicUrl($path, $disk);
    }
}
