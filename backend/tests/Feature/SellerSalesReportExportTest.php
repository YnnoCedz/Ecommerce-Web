<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\ReturnRequestItem;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use App\Services\SellerSalesReportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

class SellerSalesReportExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_uses_historical_lines_and_calculates_discount_refund_and_shipping_once(): void
    {
        [, $seller, $product] = $this->sellerFixture('Verde Botanics');
        [$sellerOrder, $items] = $this->sale($seller, $product, [
            ['name' => 'Historical Product Name', 'variant' => 'Blue / 64GB', 'sku' => 'HIST-BLU-64', 'price' => 1000, 'quantity' => 2],
            ['name' => 'Second Item', 'variant' => null, 'sku' => 'SECOND-1', 'price' => 500, 'quantity' => 1],
        ], discount: 250, shipping: 100);
        $return = ReturnRequest::create([
            'order_id' => $sellerOrder->order_id,
            'seller_order_id' => $sellerOrder->id,
            'buyer_id' => $sellerOrder->order->buyer_id,
            'seller_id' => $seller->id,
            'status' => 'refunded',
            'reason' => 'damaged_item',
            'requested_amount' => 500,
            'refunded_amount' => 500,
            'requested_at' => now(),
            'resolved_at' => now(),
        ]);
        ReturnRequestItem::create([
            'return_request_id' => $return->id,
            'order_item_id' => $items[0]->id,
            'quantity' => 1,
            'unit_price' => 1000,
            'refund_amount' => 500,
        ]);

        $report = $this->report($seller);

        $this->assertSame(1, $report['summary']['total_orders']);
        $this->assertSame(3, $report['summary']['total_units_sold']);
        $this->assertSame(2500.0, $report['summary']['gross_product_sales']);
        $this->assertSame(250.0, $report['summary']['discounts']);
        $this->assertSame(500.0, $report['summary']['refunds']);
        $this->assertSame(100.0, $report['summary']['shipping_collected']);
        $this->assertSame(1750.0, $report['summary']['net_product_sales']);
        $this->assertSame(100.0, (float) $report['rows']->sum('shipping'));
        $this->assertSame('Historical Product Name', $report['rows']->first()['product']);
        $this->assertSame('Blue / 64GB', $report['rows']->first()['variant']);
        $this->assertSame('HIST-BLU-64', $report['rows']->first()['sku']);
    }

    public function test_report_excludes_cancelled_unpaid_and_out_of_range_orders(): void
    {
        [, $seller, $product] = $this->sellerFixture();
        $this->sale($seller, $product, [['price' => 1000, 'quantity' => 1]]);
        $this->sale($seller, $product, [['price' => 900, 'quantity' => 1]], status: 'cancelled');
        $this->sale($seller, $product, [['price' => 800, 'quantity' => 1]], paymentStatus: 'pending');
        $this->sale($seller, $product, [['price' => 700, 'quantity' => 1]], placedAt: now()->subDays(40));

        $report = $this->report($seller);

        $this->assertSame(1, $report['summary']['total_orders']);
        $this->assertSame(1000.0, $report['summary']['net_product_sales']);
        $this->assertCount(1, $report['rows']);
    }

    public function test_report_is_strictly_scoped_to_the_authenticated_seller(): void
    {
        [$sellerUser, $seller, $product] = $this->sellerFixture('Seller A');
        [, $otherSeller, $otherProduct] = $this->sellerFixture('Seller B');
        $this->sale($seller, $product, [['name' => 'Seller A Product', 'price' => 1200, 'quantity' => 1]]);
        $this->sale($otherSeller, $otherProduct, [['name' => 'Seller B Product', 'price' => 9900, 'quantity' => 1]]);

        $response = $this->actingAs($sellerUser)->get('/api/seller/reports/sales/export?from='.now()->subDay()->toDateString().'&to='.now()->toDateString().'&format=pdf');

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertSame(1200.0, $this->report($seller)['summary']['net_product_sales']);
    }

    public function test_xlsx_export_contains_typed_sales_data_totals_and_expected_sheets(): void
    {
        [$sellerUser, $seller, $product] = $this->sellerFixture('Verde Botanics');
        $this->sale($seller, $product, [['name' => 'iPad Air', 'variant' => 'Blue / 64GB', 'sku' => 'IPA5-BLU-64', 'price' => 35990, 'quantity' => 1]], discount: 5000, shipping: 120);
        $url = '/api/seller/reports/sales/export?from='.now()->subDay()->toDateString().'&to='.now()->toDateString().'&format=xlsx';

        $response = $this->actingAs($sellerUser)->get($url);

        $response->assertOk()->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);
        $path = $response->baseResponse->getFile()->getPathname();
        $this->assertSame('PK', substr((string) file_get_contents($path), 0, 2));
        $workbook = IOFactory::load($path);
        $this->assertSame(['Summary', 'Sales Details'], $workbook->getSheetNames());
        $this->assertSame('Verde Botanics', $workbook->getSheetByName('Summary')->getCell('B4')->getValue());
        $this->assertSame(35990.0, (float) $workbook->getSheetByName('Sales Details')->getCell('L2')->getValue());
        $this->assertSame('IPA5-BLU-64', $workbook->getSheetByName('Sales Details')->getCell('J2')->getValue());
        $this->assertStringContainsString('SUM(', (string) $workbook->getSheetByName('Sales Details')->getCell('Q3')->getValue());
        $workbook->disconnectWorksheets();
    }

    public function test_export_validates_dates_range_and_format(): void
    {
        [$sellerUser] = $this->sellerFixture();

        $this->actingAs($sellerUser)->getJson('/api/seller/reports/sales/export?from=2026-08-31&to=2026-08-01&format=csv')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to', 'format']);
        $this->actingAs($sellerUser)->getJson('/api/seller/reports/sales/export?from=2025-01-01&to=2026-08-01&format=pdf')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_dashboard_and_export_use_the_same_selected_period_definition(): void
    {
        [$sellerUser, $seller, $product] = $this->sellerFixture();
        $this->sale($seller, $product, [['price' => 1500, 'quantity' => 1]], discount: 200);

        $response = $this->actingAs($sellerUser)->getJson('/api/seller/dashboard?range=7')->assertOk();

        $response->assertJsonPath('data.sales_summary.net_product_sales', 1300)
            ->assertJsonPath('data.summary.total_sales', 1300)
            ->assertJsonCount(7, 'data.revenue_series');
        $this->assertSame(1300.0, $this->report($seller, 7)['summary']['net_product_sales']);
    }

    private function sellerFixture(string $businessName = 'Test Store'): array
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active', 'email_verified_at' => now()]);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'business_name' => $businessName, 'trade_name' => $businessName, 'status' => 'approved']);
        $product = Product::factory()->create(['seller_id' => $seller->id, 'name' => 'Current Product Name', 'price' => 1000, 'status' => 'active']);

        return [$user, $seller, $product];
    }

    private function sale(
        Seller $seller,
        Product $product,
        array $lines,
        float $discount = 0,
        float $shipping = 0,
        string $status = 'completed',
        string $paymentStatus = 'paid',
        ?Carbon $placedAt = null,
    ): array {
        $subtotal = collect($lines)->sum(fn (array $line) => ($line['price'] ?? 1000) * ($line['quantity'] ?? 1));
        $buyer = User::factory()->create();
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => 'MK-'.str()->upper(str()->random(12)),
            'status' => $status,
            'payment_status' => $paymentStatus,
            'payment_method' => 'gcash',
            'currency' => 'PHP',
            'shipping_name' => 'Test Buyer',
            'shipping_phone' => '+639171234567',
            'shipping_line1' => '10 Test Street',
            'shipping_city' => 'Makati',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
            'subtotal' => $subtotal,
            'shipping_total' => $shipping,
            'discount_total' => $discount,
            'grand_total' => $subtotal - $discount + $shipping,
            'placed_at' => $placedAt ?? now(),
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'status' => $status,
            'subtotal' => $subtotal,
            'shipping_fee' => $shipping,
            'discount_total' => $discount,
            'grand_total' => $subtotal - $discount + $shipping,
            'completed_at' => in_array($status, ['completed', 'delivered'], true) ? now() : null,
        ]);
        $items = collect($lines)->map(function (array $line) use ($order, $sellerOrder, $seller, $product) {
            $price = $line['price'] ?? 1000;
            $quantity = $line['quantity'] ?? 1;

            return OrderItem::create([
                'order_id' => $order->id,
                'seller_order_id' => $sellerOrder->id,
                'seller_id' => $seller->id,
                'product_id' => $product->id,
                'product_name' => $line['name'] ?? 'Historical Product',
                'product_slug' => 'historical-product',
                'variant_name' => $line['variant'] ?? null,
                'sku' => $line['sku'] ?? 'HIST-SKU',
                'unit_price' => $price,
                'quantity' => $quantity,
                'subtotal' => $price * $quantity,
            ]);
        })->all();

        return [$sellerOrder->load('order'), $items];
    }

    private function report(Seller $seller, int $days = 30): array
    {
        [$from, $to] = app(SellerSalesReportService::class)->presetRange($days);

        return app(SellerSalesReportService::class)->build($seller, $from, $to);
    }
}
