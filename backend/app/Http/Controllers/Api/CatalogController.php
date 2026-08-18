<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->withCount(['products as product_count' => function ($query) {
                $query->where('status', 'active')->whereNull('deleted_at');
            }])
            ->with(['children' => function ($query) {
                $query->orderBy('sort_order')->orderBy('name');
            }])
            ->whereNull('parent_id')
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => $this->categoryPayload($category));

        return response()->json(['data' => $categories]);
    }

    public function products(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with([
                'seller.user',
                'category',
                'images' => fn ($images) => $images->orderBy('sort_order')->orderBy('id'),
            ])
            ->where('status', 'active')
            ->whereNull('deleted_at');

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
                $productQuery->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('sku', 'like', '%' . $search . '%')
                    ->orWhereHas('seller', fn ($sellerQuery) => $sellerQuery->where('business_name', 'like', '%' . $search . '%')->orWhere('trade_name', 'like', '%' . $search . '%'))
                    ->orWhereHas('category', fn ($categoryQuery) => $categoryQuery->where('name', 'like', '%' . $search . '%'));
            });
        }

        $products = $query
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Product $product) => $this->productPayload($product));

        return response()->json(['data' => $products]);
    }

    public function product(string $slug): JsonResponse
    {
        $product = Product::query()
            ->with([
                'seller.user',
                'seller.categories',
                'category.parent',
                'images' => fn ($images) => $images->orderBy('sort_order')->orderBy('id'),
                'variants.options',
            ])
            ->where('slug', $slug)
            ->where('status', 'active')
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
            ])
            ->whereKeyNot($product->id)
            ->where('category_id', $product->category_id)
            ->where('status', 'active')
            ->limit(8)
            ->get()
            ->map(fn (Product $relatedProduct) => $this->productPayload($relatedProduct));

        return response()->json([
            'data' => $this->productDetailPayload($product, $related),
        ]);
    }

    public function sellers(): JsonResponse
    {
        $sellers = Seller::query()
            ->with([
                'user',
                'categories',
                'products' => fn ($query) => $query->where('status', 'active')->whereNull('deleted_at'),
            ])
            ->where('status', 'approved')
            ->whereNull('deleted_at')
            ->orderByDesc('verified')
            ->orderBy('business_name')
            ->get()
            ->map(fn (Seller $seller) => $this->sellerPayload($seller));

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
                ])->where('status', 'active')->whereNull('deleted_at'),
            ])
            ->where('slug', $slug)
            ->where('status', 'approved')
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
        $primaryImage = $product->images->first()?->file_path;

        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'seller_slug' => $product->seller?->slug,
            'seller' => $product->seller?->trade_name
                ?? $product->seller?->business_name
                ?? $product->seller?->user?->display_name
                ?? 'Maketo Seller',
            'category_slug' => $product->category?->slug,
            'category' => $product->category?->name ?? 'Uncategorized',
            'price' => (float) ($product->sale_price ?? $product->price),
            'original_price' => $product->sale_price ? (float) $product->price : null,
            'rating' => 0,
            'rating_count' => 0,
            'sold_count' => 0,
            'image' => $primaryImage ?: 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
            'badge' => $product->sale_price ? 'SALE' : null,
            'in_stock' => $product->track_inventory ? $product->stock_quantity > 0 : true,
            'free_shipping' => (bool) $product->free_shipping,
        ];
    }

    protected function productDetailPayload(Product $product, iterable $related = []): array
    {
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
                'url' => $image->file_path,
                'alt' => $image->alt_text ?? $product->name,
                'sort_order' => $image->sort_order,
                'is_primary' => (bool) $image->is_primary,
            ])->values()->all(),
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
            'rating' => 0,
            'rating_count' => 0,
            'product_count' => (int) ($seller->product_count ?: $seller->products->count()),
            'follower_count' => (int) $seller->follower_count,
            'response_rate' => (float) $seller->response_rate,
            'response_time' => $seller->response_time_label ?? 'within 1 hour',
            'joined_year' => (int) ($seller->joined_year ?? now()->year),
            'verified' => (bool) $seller->verified,
            'banner' => $seller->banner_path ?: 'https://images.unsplash.com/photo-1780798464793-be53ffd37b79',
            'location' => trim(implode(', ', array_filter([$seller->city, $seller->province]))),
            'description' => $seller->description,
            'products' => $seller->products->map(fn (Product $product) => $this->productPayload($product))->values()->all(),
        ];
    }
}
