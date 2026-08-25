<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Dispute;
use App\Models\Order;
use App\Models\Product;
use App\Models\Report;
use App\Models\Seller;
use App\Models\SellerApplication;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function dashboard(Request $request): JsonResponse
    {
        $days = $this->validatedDays($request);
        $from = now()->subDays($days - 1)->startOfDay();

        return response()->json(['data' => [
            'range_days' => $days,
            'generated_at' => now()->toISOString(),
            // Retain the original summary keys for existing admin clients.
            'users' => User::count(),
            'buyers' => User::where('role', 'buyer')->count(),
            'sellers' => Seller::count(),
            'approved_sellers' => Seller::where('status', 'approved')->count(),
            'products' => Product::count(),
            'orders' => Order::count(),
            'reports' => Report::count(),
            'metrics' => [
                'gmv' => (float) Order::whereIn('payment_status', ['paid', 'partially_refunded'])->where('created_at', '>=', $from)->sum('grand_total'),
                'total_users' => User::count(),
                'active_users' => User::where('status', 'active')->count(),
                'total_sellers' => Seller::count(),
                'approved_sellers' => Seller::where('status', 'approved')->count(),
                'pending_seller_applications' => SellerApplication::whereIn('status', ['pending', 'reviewing'])->count(),
                'total_products' => Product::count(),
                'active_products' => Product::where('status', 'active')->count(),
                'total_orders' => Order::count(),
                'pending_orders' => Order::whereIn('status', ['pending', 'processing'])->count(),
                'completed_orders' => Order::whereIn('status', ['delivered', 'completed'])->count(),
                'cancelled_orders' => Order::whereIn('status', ['cancelled', 'failed', 'returned', 'refunded'])->count(),
                'open_reports' => Report::whereIn('status', ['pending', 'reviewing'])->count(),
                'open_disputes' => Dispute::whereIn('status', ['open', 'reviewing'])->count(),
            ],
            'series' => $this->timeSeries($from, $days),
            'recent_users' => User::query()->latest()->limit(5)->get()->map(fn (User $user) => $this->userPayload($user))->values(),
            'recent_orders' => Order::query()->with('buyer:id,name,first_name,last_name,email')->latest()->limit(5)->get()->map(fn (Order $order) => $this->orderSummary($order))->values(),
            'recent_reports' => Report::query()->latest()->limit(5)->get()->map(fn (Report $report) => [
                'id' => $report->id,
                'reference' => 'RPT-'.str_pad((string) $report->id, 6, '0', STR_PAD_LEFT),
                'reason' => $report->reason,
                'status' => $report->status,
                'created_at' => optional($report->created_at)->toISOString(),
            ])->values(),
        ]]);
    }

    public function users(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::in(['buyer', 'seller', 'admin'])],
            'status' => ['nullable', 'string', 'max:40'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = User::query()->withCount('orders')->withSum('orders', 'grand_total');
        $query->when($data['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role));
        $query->when($data['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status));
        $query->when(trim((string) ($data['search'] ?? '')), function (Builder $query, string $search) {
            $query->where(fn (Builder $nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('mobile', 'like', "%{$search}%"));
        });
        $users = $query->latest('id')->paginate($data['per_page'] ?? 25);

        return response()->json(['data' => $users->getCollection()->map(fn (User $user) => $this->userPayload($user))->values(), 'meta' => $this->paginationMeta($users)]);
    }

    public function updateUserStatus(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'suspended', 'restricted'])], 'reason' => ['required_unless:status,active', 'nullable', 'string', 'min:5', 'max:500']]);
        abort_if($request->user()->is($user) && $data['status'] !== 'active', 422, 'You cannot restrict your own administrator account.');

        DB::transaction(function () use ($user, $data) {
            $user->update(['status' => $data['status']]);
            if ($data['status'] !== 'active') {
                $user->tokens()->delete();
            }
            $this->notifications->publishToUser($user, ['category' => 'account', 'title' => 'Account status updated', 'body' => $data['status'] === 'active' ? 'Your Maketo account is active.' : (string) $data['reason']]);
        });

        return response()->json(['message' => 'User status updated.', 'data' => $this->userPayload($user->fresh())]);
    }

    public function sellers(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', 'string', 'max:40'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $query = Seller::query()->with(['user:id,name,first_name,last_name,email,mobile,status', 'categories:id,name'])->withCount(['products', 'sellerOrders'])->withSum('sellerOrders', 'grand_total')->withAvg('reviews', 'rating');
        $query->when($data['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status));
        $query->when(trim((string) ($data['search'] ?? '')), fn (Builder $query, string $search) => $query->where(fn (Builder $nested) => $nested->where('business_name', 'like', "%{$search}%")->orWhere('trade_name', 'like', "%{$search}%")->orWhereHas('user', fn (Builder $user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))));
        $sellers = $query->latest('id')->paginate($data['per_page'] ?? 25);

        return response()->json(['data' => $sellers->getCollection()->map(fn (Seller $seller) => $this->sellerPayload($seller))->values(), 'meta' => $this->paginationMeta($sellers)]);
    }

    public function updateSellerStatus(Request $request, Seller $seller): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['approved', 'suspended', 'rejected'])], 'reason' => ['required_unless:status,approved', 'nullable', 'string', 'min:5', 'max:500']]);
        DB::transaction(function () use ($seller, $data) {
            $seller->update(['status' => $data['status'], 'verified' => $data['status'] === 'approved']);
            $seller->user()->update(['status' => $data['status'] === 'suspended' ? 'suspended' : 'active']);
            if ($data['status'] === 'suspended') {
                $seller->user->tokens()->delete();
            }
            $this->notifications->publishToUser($seller->user, ['category' => 'seller', 'title' => 'Seller status updated', 'body' => $data['status'] === 'approved' ? 'Your seller account is approved.' : (string) $data['reason']]);
        });

        $fresh = $seller->fresh()->load(['user', 'categories'])->loadCount(['products', 'sellerOrders'])->loadSum('sellerOrders', 'grand_total')->loadAvg('reviews', 'rating');

        return response()->json(['message' => 'Seller status updated.', 'data' => $this->sellerPayload($fresh)]);
    }

    public function products(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', 'string', 'max:40'], 'category_id' => ['nullable', 'integer', 'exists:categories,id'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $query = Product::query()->with(['seller:id,user_id,business_name,trade_name,slug', 'seller.user:id', 'category:id,name', 'images' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('sort_order')])->withSum('orderItems', 'quantity');
        $query->when($data['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status));
        $query->when($data['category_id'] ?? null, fn (Builder $query, int $category) => $query->where('category_id', $category));
        $query->when(trim((string) ($data['search'] ?? '')), fn (Builder $query, string $search) => $query->where(fn (Builder $nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")->orWhereHas('seller', fn (Builder $seller) => $seller->where('business_name', 'like', "%{$search}%"))));
        $products = $query->latest('id')->paginate($data['per_page'] ?? 25);

        return response()->json(['data' => $products->getCollection()->map(fn (Product $product) => $this->productPayload($product))->values(), 'meta' => $this->paginationMeta($products)]);
    }

    public function updateProductStatus(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'draft', 'archived', 'flagged', 'under-review', 'removed'])], 'note' => ['required_unless:status,active', 'nullable', 'string', 'min:5', 'max:500']]);
        $product->update(['status' => $data['status'], 'published_at' => $data['status'] === 'active' ? ($product->published_at ?? now()) : $product->published_at]);
        $this->notifications->publishToUser($product->seller->user, ['category' => 'product', 'title' => 'Product status updated', 'body' => $data['status'] === 'active' ? "{$product->name} is active." : (string) $data['note'], 'product_id' => $product->id]);
        $fresh = $product->fresh()->load(['seller', 'category', 'images'])->loadSum('orderItems', 'quantity');

        return response()->json(['message' => 'Product status updated.', 'data' => $this->productPayload($fresh)]);
    }

    public function orders(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', 'string', 'max:40'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $query = Order::query()->with(['buyer:id,name,first_name,last_name,email,mobile', 'sellerOrders.seller:id,business_name,trade_name', 'sellerOrders.shipment', 'items:id,order_id,seller_order_id,product_name,sku,quantity,unit_price,subtotal', 'payments' => fn ($query) => $query->latest()]);
        $query->when($data['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status));
        $query->when(trim((string) ($data['search'] ?? '')), fn (Builder $query, string $search) => $query->where(fn (Builder $nested) => $nested->where('order_number', 'like', "%{$search}%")->orWhereHas('buyer', fn (Builder $buyer) => $buyer->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))->orWhereHas('sellerOrders.seller', fn (Builder $seller) => $seller->where('business_name', 'like', "%{$search}%"))));
        $orders = $query->latest('id')->paginate($data['per_page'] ?? 25);

        return response()->json(['data' => $orders->getCollection()->map(fn (Order $order) => $this->orderPayload($order))->values(), 'meta' => array_merge($this->paginationMeta($orders), ['gmv' => (float) Order::whereIn('payment_status', ['paid', 'partially_refunded'])->sum('grand_total'), 'open_disputes' => Dispute::whereIn('status', ['open', 'reviewing'])->count()])]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::query()->whereNull('parent_id')->withCount('products')->with(['children' => fn ($query) => $query->withCount('products')->orderBy('sort_order')->orderBy('name')])->orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['data' => $categories->map(fn (Category $category) => $this->categoryPayload($category))->values()]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $category = Category::create($this->categoryData($request));

        return response()->json(['message' => 'Category created.', 'data' => $this->categoryPayload($category->loadCount('products'))], 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $category->update($this->categoryData($request, $category));

        return response()->json(['message' => 'Category updated.', 'data' => $this->categoryPayload($category->fresh()->loadCount('products'))]);
    }

    public function analytics(Request $request): JsonResponse
    {
        $days = $this->validatedDays($request);
        $from = now()->subDays($days - 1)->startOfDay();
        $categoryRows = DB::table('categories')->leftJoin('products', 'products.category_id', '=', 'categories.id')->leftJoin('order_items', 'order_items.product_id', '=', 'products.id')->whereNull('categories.deleted_at')->groupBy('categories.id', 'categories.name')->select('categories.id', 'categories.name', DB::raw('COALESCE(SUM(order_items.subtotal), 0) as gmv'), DB::raw('COALESCE(SUM(order_items.quantity), 0) as units'))->orderByDesc('gmv')->limit(10)->get();
        $sellerRows = Seller::query()->withCount('sellerOrders')->withSum('sellerOrders', 'grand_total')->withAvg('reviews', 'rating')->orderByDesc('seller_orders_sum_grand_total')->limit(10)->get();

        return response()->json(['data' => [
            'range_days' => $days,
            'series' => $this->timeSeries($from, $days),
            'totals' => ['gmv' => (float) Order::where('created_at', '>=', $from)->whereIn('payment_status', ['paid', 'partially_refunded'])->sum('grand_total'), 'orders' => Order::where('created_at', '>=', $from)->count(), 'users' => User::where('created_at', '>=', $from)->count(), 'sellers' => Seller::where('created_at', '>=', $from)->count()],
            'categories' => $categoryRows->map(fn ($row) => ['id' => (int) $row->id, 'name' => $row->name, 'gmv' => (float) $row->gmv, 'units' => (int) $row->units])->values(),
            'top_sellers' => $sellerRows->map(fn (Seller $seller) => ['id' => $seller->id, 'name' => $seller->trade_name ?: $seller->business_name, 'gmv' => (float) ($seller->seller_orders_sum_grand_total ?? 0), 'orders' => (int) $seller->seller_orders_count, 'rating' => round((float) ($seller->reviews_avg_rating ?? 0), 1)])->values(),
            'order_statuses' => Order::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
        ]]);
    }

    private function userPayload(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->display_name, 'email' => $user->email, 'mobile' => $user->mobile, 'role' => $user->role, 'status' => $user->status, 'location' => $user->location_label, 'verified' => $user->email_verified_at !== null, 'orders' => (int) ($user->orders_count ?? 0), 'total_spent' => (float) ($user->orders_sum_grand_total ?? 0), 'joined_at' => optional($user->created_at)->toISOString(), 'last_active_at' => optional($user->last_active_at)->toISOString()];
    }

    private function sellerPayload(Seller $seller): array
    {
        return ['id' => $seller->id, 'slug' => $seller->slug, 'business_name' => $seller->business_name, 'trade_name' => $seller->trade_name, 'status' => $seller->status, 'verified' => (bool) $seller->verified, 'city' => $seller->city, 'province' => $seller->province, 'categories' => $seller->categories->pluck('name')->values(), 'products' => (int) ($seller->products_count ?? 0), 'orders' => (int) ($seller->seller_orders_count ?? 0), 'gmv' => (float) ($seller->seller_orders_sum_grand_total ?? 0), 'rating' => round((float) ($seller->reviews_avg_rating ?? 0), 1), 'created_at' => optional($seller->created_at)->toISOString(), 'user' => $seller->user ? ['id' => $seller->user->id, 'name' => $seller->user->display_name, 'email' => $seller->user->email, 'mobile' => $seller->user->mobile, 'status' => $seller->user->status] : null];
    }

    private function productPayload(Product $product): array
    {
        return ['id' => $product->id, 'name' => $product->name, 'slug' => $product->slug, 'sku' => $product->sku, 'price' => (float) $product->price, 'sale_price' => $product->sale_price === null ? null : (float) $product->sale_price, 'stock' => (int) $product->stock_quantity, 'status' => $product->status, 'sales' => (int) ($product->order_items_sum_quantity ?? 0), 'seller' => $product->seller ? ['id' => $product->seller->id, 'name' => $product->seller->trade_name ?: $product->seller->business_name] : null, 'category' => $product->category ? ['id' => $product->category->id, 'name' => $product->category->name] : null, 'image_path' => $product->images->first()?->file_path, 'created_at' => optional($product->created_at)->toISOString(), 'updated_at' => optional($product->updated_at)->toISOString()];
    }

    private function orderSummary(Order $order): array
    {
        return ['id' => $order->id, 'order_number' => $order->order_number, 'status' => $order->status, 'payment_status' => $order->payment_status, 'grand_total' => (float) $order->grand_total, 'currency' => $order->currency, 'buyer_name' => $order->buyer?->display_name, 'created_at' => optional($order->created_at)->toISOString()];
    }

    private function orderPayload(Order $order): array
    {
        return array_merge($this->orderSummary($order), ['payment_method' => $order->payment_method, 'placed_at' => optional($order->placed_at)->toISOString(), 'shipping' => ['name' => $order->shipping_name, 'phone' => $order->shipping_phone, 'address' => trim("{$order->shipping_line1} {$order->shipping_line2}, {$order->shipping_city}, {$order->shipping_province} {$order->shipping_postal_code}")], 'buyer' => $order->buyer ? ['id' => $order->buyer->id, 'name' => $order->buyer->display_name, 'email' => $order->buyer->email] : null, 'seller_orders' => $order->sellerOrders->map(fn ($sellerOrder) => ['id' => $sellerOrder->id, 'status' => $sellerOrder->status, 'total' => (float) $sellerOrder->grand_total, 'tracking_number' => $sellerOrder->tracking_number, 'seller' => $sellerOrder->seller ? ['id' => $sellerOrder->seller->id, 'name' => $sellerOrder->seller->trade_name ?: $sellerOrder->seller->business_name] : null])->values(), 'items' => $order->items->map(fn ($item) => ['id' => $item->id, 'seller_order_id' => $item->seller_order_id, 'product_name' => $item->product_name, 'sku' => $item->sku, 'quantity' => (int) $item->quantity, 'unit_price' => (float) $item->unit_price, 'subtotal' => (float) $item->subtotal])->values(), 'payments' => $order->payments->map(fn ($payment) => ['id' => $payment->id, 'type' => $payment->type ?? 'charge', 'method' => $payment->method, 'status' => $payment->status, 'amount' => (float) $payment->amount, 'reference' => $payment->provider_reference, 'created_at' => optional($payment->created_at)->toISOString()])->values()]);
    }

    private function categoryPayload(Category $category): array
    {
        return ['id' => $category->id, 'parent_id' => $category->parent_id, 'name' => $category->name, 'slug' => $category->slug, 'icon' => $category->icon, 'active' => (bool) $category->active, 'sort_order' => (int) $category->sort_order, 'product_count' => (int) ($category->products_count ?? 0), 'children' => $category->relationLoaded('children') ? $category->children->map(fn (Category $child) => $this->categoryPayload($child))->values() : []];
    }

    private function categoryData(Request $request, ?Category $category = null): array
    {
        return $request->validate(['parent_id' => ['nullable', 'integer', 'exists:categories,id', Rule::notIn(array_filter([$category?->id]))], 'name' => ['required', 'string', 'max:120'], 'slug' => ['required', 'string', 'max:140', Rule::unique('categories', 'slug')->ignore($category)], 'icon' => ['nullable', 'string', 'max:255'], 'active' => ['required', 'boolean'], 'sort_order' => ['required', 'integer', 'min:0']]);
    }

    private function validatedDays(Request $request): int
    {
        return (int) ($request->validate(['days' => ['nullable', 'integer', Rule::in([7, 30, 90])]])['days'] ?? 30);
    }

    private function timeSeries(Carbon $from, int $days): array
    {
        $orders = Order::query()->where('created_at', '>=', $from)->get(['created_at', 'grand_total', 'payment_status'])->groupBy(fn (Order $order) => $order->created_at->toDateString());
        $users = User::query()->where('created_at', '>=', $from)->get(['created_at'])->countBy(fn (User $user) => $user->created_at->toDateString());
        $sellers = Seller::query()->where('created_at', '>=', $from)->get(['created_at'])->countBy(fn (Seller $seller) => $seller->created_at->toDateString());

        return collect(range(0, $days - 1))->map(function (int $offset) use ($from, $orders, $users, $sellers) {
            $date = $from->copy()->addDays($offset)->toDateString();
            $dailyOrders = $orders->get($date, collect());

            return ['date' => $date, 'orders' => $dailyOrders->count(), 'gmv' => (float) $dailyOrders->whereIn('payment_status', ['paid', 'partially_refunded'])->sum('grand_total'), 'users' => (int) $users->get($date, 0), 'sellers' => (int) $sellers->get($date, 0)];
        })->values()->all();
    }

    private function paginationMeta($paginator): array
    {
        return ['current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(), 'per_page' => $paginator->perPage(), 'total' => $paginator->total()];
    }
}
