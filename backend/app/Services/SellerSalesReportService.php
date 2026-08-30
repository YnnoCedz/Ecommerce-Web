<?php

namespace App\Services;

use App\Models\Seller;
use App\Models\SellerOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SellerSalesReportService
{
    public const MAX_RANGE_DAYS = 366;

    private const SALE_STATUSES = ['delivered', 'completed'];

    private const PAYMENT_STATUSES = ['paid', 'partially_refunded', 'refunded'];

    public function presetRange(int $days): array
    {
        $to = Carbon::today(config('app.timezone'))->endOfDay();

        return [$to->copy()->subDays($days - 1)->startOfDay(), $to];
    }

    public function build(Seller $seller, Carbon $from, Carbon $to): array
    {
        $orders = SellerOrder::query()
            ->select('seller_orders.*')
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->with([
                'order:id,order_number,status,payment_status,payment_method,currency,placed_at',
                'items:id,order_id,seller_order_id,seller_id,product_id,product_name,variant_name,sku,unit_price,quantity,subtotal',
                'items.product:id,category_id',
                'items.product.category:id,name',
                'items.product.images' => fn ($query) => $query->select('id', 'product_id', 'file_path', 'sort_order')->orderBy('sort_order')->orderBy('id'),
                'returnRequests:id,seller_order_id,seller_id,status,refunded_amount',
                'returnRequests.items:id,return_request_id,order_item_id,refund_amount',
            ])
            ->where('seller_orders.seller_id', $seller->id)
            ->whereIn('seller_orders.status', self::SALE_STATUSES)
            ->whereIn('orders.payment_status', self::PAYMENT_STATUSES)
            ->whereBetween('orders.placed_at', [$from, $to])
            ->orderBy('orders.placed_at')
            ->orderBy('seller_orders.id')
            ->get();

        $rows = collect();
        $summary = [
            'total_orders' => $orders->count(),
            'total_units_sold' => 0,
            'gross_product_sales' => 0.0,
            'discounts' => 0.0,
            'refunds' => 0.0,
            'shipping_collected' => 0.0,
            'net_product_sales' => 0.0,
            'average_order_value' => 0.0,
        ];

        foreach ($orders as $sellerOrder) {
            $items = $sellerOrder->items->values();
            $gross = round((float) $items->sum('subtotal'), 2);
            $discount = min($gross, round((float) $sellerOrder->discount_total, 2));
            $refund = min(
                max(0, $gross - $discount),
                round((float) $sellerOrder->returnRequests->sum('refunded_amount'), 2),
            );
            $discountAllocation = $this->allocate($items, $discount);
            $refundAllocation = $this->refundAllocation($items, $sellerOrder, $refund);

            $summary['total_units_sold'] += (int) $items->sum('quantity');
            $summary['gross_product_sales'] += $gross;
            $summary['discounts'] += $discount;
            $summary['refunds'] += $refund;
            $summary['shipping_collected'] += round((float) $sellerOrder->shipping_fee, 2);

            foreach ($items as $index => $item) {
                $lineTotal = round((float) $item->subtotal, 2);
                $lineDiscount = $discountAllocation[$item->id] ?? 0.0;
                $lineRefund = $refundAllocation[$item->id] ?? 0.0;
                $net = max(0, round($lineTotal - $lineDiscount - $lineRefund, 2));

                $rows->push([
                    'order_date' => $sellerOrder->order->placed_at,
                    'order_number' => $sellerOrder->order->order_number,
                    'seller_order_reference' => 'SO-'.str_pad((string) $sellerOrder->id, 8, '0', STR_PAD_LEFT),
                    'order_status' => $sellerOrder->status,
                    'payment_status' => $sellerOrder->order->payment_status,
                    'payment_method' => $sellerOrder->order->payment_method,
                    'product' => $item->product_name,
                    'variant' => $item->variant_name,
                    'sku' => $item->sku,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => round((float) $item->unit_price, 2),
                    'discount' => $lineDiscount,
                    'refund' => $lineRefund,
                    'line_total' => $lineTotal,
                    'shipping' => $index === 0 ? round((float) $sellerOrder->shipping_fee, 2) : 0.0,
                    'net_amount' => $net,
                    'category' => $item->product?->category?->name ?? 'Uncategorized',
                    'product_image' => $item->product?->images?->first()?->file_path,
                ]);
            }
        }

        foreach (['gross_product_sales', 'discounts', 'refunds', 'shipping_collected'] as $key) {
            $summary[$key] = round((float) $summary[$key], 2);
        }
        $summary['net_product_sales'] = round(
            $summary['gross_product_sales'] - $summary['discounts'] - $summary['refunds'],
            2,
        );
        $summary['average_order_value'] = $summary['total_orders'] > 0
            ? round($summary['net_product_sales'] / $summary['total_orders'], 2)
            : 0.0;

        return [
            'seller' => [
                'id' => $seller->id,
                'identifier' => 'SEL-'.str_pad((string) $seller->id, 6, '0', STR_PAD_LEFT),
                'store_name' => $seller->business_name ?: ($seller->trade_name ?: 'Seller'),
                'slug' => $seller->slug ?: 'seller-'.$seller->id,
                'location' => implode(', ', array_filter([$seller->city, $seller->province])),
            ],
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label' => $from->format('F j, Y').' - '.$to->format('F j, Y'),
            ],
            'generated_at' => Carbon::now(config('app.timezone')),
            'currency' => 'PHP',
            'summary' => $summary,
            'rows' => $rows,
            'series' => $this->series($rows, $from, $to),
            'top_products' => $this->topProducts($rows),
            'category_breakdown' => $this->categoryBreakdown($rows),
        ];
    }

    private function allocate(Collection $items, float $amount): array
    {
        if ($amount <= 0 || $items->isEmpty()) {
            return [];
        }

        $total = max(0.01, (float) $items->sum('subtotal'));
        $remaining = $amount;
        $allocation = [];

        foreach ($items as $index => $item) {
            $share = $index === $items->count() - 1
                ? $remaining
                : round($amount * ((float) $item->subtotal / $total), 2);
            $share = min($remaining, max(0, $share));
            $allocation[$item->id] = $share;
            $remaining = round($remaining - $share, 2);
        }

        return $allocation;
    }

    private function refundAllocation(Collection $items, SellerOrder $sellerOrder, float $refund): array
    {
        if ($refund <= 0) {
            return [];
        }

        $itemRefunds = $sellerOrder->returnRequests
            ->flatMap->items
            ->groupBy('order_item_id')
            ->map(fn (Collection $lines) => round((float) $lines->sum('refund_amount'), 2));

        if (abs((float) $itemRefunds->sum() - $refund) <= 0.01) {
            return $itemRefunds->all();
        }

        return $this->allocate($items, $refund);
    }

    private function series(Collection $rows, Carbon $from, Carbon $to): array
    {
        $days = collect(range(0, $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay())))
            ->map(fn (int $offset) => $from->copy()->startOfDay()->addDays($offset));

        return collect($days)->map(function (Carbon $date) use ($rows) {
            $matching = $rows->filter(fn (array $row) => $row['order_date']?->isSameDay($date));

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('M d'),
                'revenue' => round((float) $matching->sum('net_amount'), 2),
                'orders' => $matching->pluck('order_number')->unique()->count(),
            ];
        })->values()->all();
    }

    private function topProducts(Collection $rows): array
    {
        return $rows->groupBy(fn (array $row) => $row['product'].'|'.($row['variant'] ?? ''))
            ->map(fn (Collection $items) => [
                'name' => $items->first()['product'].($items->first()['variant'] ? ' - '.$items->first()['variant'] : ''),
                'category' => $items->first()['category'],
                'revenue' => round((float) $items->sum('net_amount'), 2),
                'orders' => (int) $items->sum('quantity'),
                'returns' => (int) $items->where('refund', '>', 0)->count(),
                'image' => $items->first()['product_image'] ?? '/images/product-placeholder.svg',
            ])->sortByDesc('revenue')->take(5)->values()->all();
    }

    private function categoryBreakdown(Collection $rows): array
    {
        $groups = $rows->groupBy('category')->map(fn (Collection $items, string $name) => [
            'name' => $name,
            'revenue' => round((float) $items->sum('net_amount'), 2),
            'pct' => 0.0,
        ])->sortByDesc('revenue')->values();
        $total = max(0.01, (float) $groups->sum('revenue'));

        return $groups->map(function (array $row) use ($total) {
            $row['pct'] = round(($row['revenue'] / $total) * 100, 1);

            return $row;
        })->all();
    }
}
