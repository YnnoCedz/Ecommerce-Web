<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\CommissionEntry;
use App\Models\Courier;
use App\Models\CourierApplication;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\PayoutItem;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use App\Services\CommissionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class CourierE2ESeeder extends Seeder
{
    public function run(): void
    {
        $this->assertSafeLocalTarget();
        config(['mail.default' => 'array']);

        $password = (string) env('COURIER_E2E_PASSWORD');
        if (strlen($password) < 12) {
            throw new RuntimeException('COURIER_E2E_PASSWORD must contain at least 12 characters.');
        }

        DB::transaction(function () use ($password): void {
            $admin = $this->user('admin@example.test', 'Maketo E2E Admin', 'admin', 'active', '0001', $password);
            $buyer = $this->user('buyer@example.test', 'Maketo E2E Buyer', 'buyer', 'active', '0002', $password);
            $sellerUser = $this->user('seller@example.test', 'Maketo E2E Seller', 'seller', 'active', '0003', $password);
            $sellerCourierUser = $this->user('seller.courier@example.test', 'Maketo E2E Seller Courier', 'seller', 'active', '0004', $password);
            $activeUser = $this->user('active.courier@example.test', 'Maketo E2E Courier A', 'buyer', 'active', '0005', $password);
            $courierBUser = $this->user('courier.b@example.test', 'Maketo E2E Courier B', 'buyer', 'active', '0006', $password);
            $pendingUser = $this->user('pending.courier@example.test', 'Maketo E2E Pending Courier', 'buyer', 'active', '0007', $password);
            $rejectedUser = $this->user('rejected.courier@example.test', 'Maketo E2E Rejected Courier', 'buyer', 'active', '0008', $password);
            $inactiveUser = $this->user('inactive.courier@example.test', 'Maketo E2E Inactive Courier', 'buyer', 'active', '0009', $password);
            $suspendedUser = $this->user('suspended.courier@example.test', 'Maketo E2E Suspended Courier', 'buyer', 'active', '0010', $password);

            $seller = $this->seller($sellerUser, 'maketo-e2e-seller');
            $this->seller($sellerCourierUser, 'maketo-e2e-seller-courier');

            $activeCourier = $this->approvedCourier($activeUser, 'maketo-e2e-courier-a');
            $courierB = $this->approvedCourier($courierBUser, 'maketo-e2e-courier-b');
            $this->approvedCourier($sellerCourierUser, 'maketo-e2e-seller-courier');
            $this->approvedCourier($inactiveUser, 'maketo-e2e-inactive', 'inactive', false);
            $this->approvedCourier($suspendedUser, 'maketo-e2e-suspended', 'suspended', false);
            $this->application($pendingUser, 'pending');
            $this->application($rejectedUser, 'rejected');

            $category = Category::query()->firstOrCreate(
                ['slug' => 'maketo-e2e-courier'],
                ['name' => 'Maketo E2E Courier', 'active' => true, 'sort_order' => 999],
            );
            $product = Product::query()->firstOrCreate(
                ['sku' => 'MKT-E2E-COURIER-001'],
                [
                    'seller_id' => $seller->id,
                    'category_id' => $category->id,
                    'name' => 'Maketo E2E Parcel',
                    'slug' => 'maketo-e2e-parcel',
                    'description' => 'Clearly fake local courier E2E fixture.',
                    'price' => '500.00',
                    'status' => 'active',
                    'delivery_type' => 'delivery',
                    'stock_quantity' => 100,
                    'published_at' => now(),
                ],
            );

            foreach (['ready', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered'] as $status) {
                $this->delivery($buyer, $seller, $product, $activeCourier, "STATE-{$status}", $status);
            }
            $this->delivery($buyer, $seller, $product, $activeCourier, 'WORKFLOW', 'ready');
            $this->delivery($buyer, $seller, $product, $activeCourier, 'REASSIGN', 'ready');
            $this->delivery($buyer, $seller, $product, $courierB, 'COURIER-B', 'ready');

            $delivered = Shipment::query()->where('tracking_number', 'MKT-E2E-STATE-DELIVERED')->firstOrFail();
            $entry = app(CommissionService::class)->courier($delivered);
            if ($entry) {
                $this->paidPayout($activeCourier, $admin, $entry);
            }

            $activeCourier->update(['availability_status' => 'offline']);
            $courierB->update(['availability_status' => 'offline']);
        });
    }

    private function assertSafeLocalTarget(): void
    {
        $host = strtolower((string) config('database.connections.mysql.host'));
        if (! app()->environment('local')
            || ! in_array($host, ['127.0.0.1', 'localhost'], true)) {
            throw new RuntimeException('CourierE2ESeeder is restricted to local maketo_local on a loopback host.');
        }

        $database = (string) DB::connection()->getDatabaseName();
        if ($database !== 'maketo_local') {
            throw new RuntimeException('CourierE2ESeeder is restricted to local maketo_local on a loopback host.');
        }
    }

    private function user(
        string $email,
        string $name,
        string $role,
        string $status,
        string $mobileSuffix,
        string $password,
    ): User {
        return User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'first_name' => Str::beforeLast($name, ' '),
                'last_name' => Str::afterLast($name, ' '),
                'mobile' => "+6391700{$mobileSuffix}",
                'phone' => "+6391700{$mobileSuffix}",
                'password' => Hash::make($password),
                'role' => $role,
                'status' => $status,
                'location_label' => 'Local E2E Fixture',
                'email_verified_at' => now(),
                'two_factor_enabled' => false,
            ],
        );
    }

    private function seller(User $user, string $slug): Seller
    {
        return Seller::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'business_name' => "{$user->name} Store",
                'trade_name' => "{$user->name} Store",
                'slug' => $slug,
                'description' => 'Clearly fake local E2E seller fixture.',
                'address_line1' => '100 Example Test Street',
                'region' => 'National Capital Region',
                'province' => 'Metro Manila',
                'city' => 'Makati City',
                'barangay' => 'Test Barangay',
                'postal_code' => '1200',
                'contact_name' => $user->name,
                'contact_email' => $user->email,
                'contact_phone' => $user->mobile,
                'verified' => true,
                'status' => 'approved',
                'joined_year' => 2026,
            ],
        );
    }

    private function application(User $user, string $status): CourierApplication
    {
        return CourierApplication::query()->updateOrCreate(
            ['user_id' => $user->id, 'status' => $status],
            [
                'mobile' => $user->mobile,
                'address_line1' => '200 Example Courier Avenue',
                'region' => 'National Capital Region',
                'province' => 'Metro Manila',
                'city' => 'Makati City',
                'barangay' => 'Test Barangay',
                'postal_code' => '1200',
                'vehicle_type' => 'motorcycle',
                'vehicle_make' => 'Honda',
                'vehicle_model' => 'Click',
                'vehicle_year' => 2025,
                'vehicle_plate_number' => 'E2E-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
                'vehicle_color' => 'Black',
                'submitted_at' => now()->subDay(),
                'reviewed_at' => $status === 'pending' ? null : now()->subHours(12),
                'rejection_reason' => $status === 'rejected' ? 'Development fixture: application requirements were not met.' : null,
            ],
        );
    }

    private function approvedCourier(User $user, string $slug, string $status = 'active', bool $active = true): Courier
    {
        $application = $this->application($user, 'approved');
        $courier = Courier::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'name' => $user->name,
                'slug' => $slug,
                'contact_email' => $user->email,
                'contact_phone' => $user->mobile,
                'service_area' => 'Metro Manila',
                'active' => $active,
                'status' => $status,
                'availability_status' => 'offline',
                'vehicle_type' => 'motorcycle',
                'vehicle_make' => 'Honda',
                'vehicle_model' => 'Click',
                'vehicle_year' => 2025,
                'vehicle_plate_number' => 'E2E-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
                'vehicle_color' => 'Black',
                'approved_at' => now()->subDay(),
            ],
        );

        $application->update(['approved_courier_id' => $courier->id]);
        $courier->update(['approved_application_id' => $application->id]);

        return $courier;
    }

    private function delivery(
        User $buyer,
        Seller $seller,
        Product $product,
        Courier $courier,
        string $suffix,
        string $status,
    ): Shipment {
        $number = 'MKT-E2E-'.strtoupper($suffix);
        $existing = Shipment::query()->where('tracking_number', $number)->first();
        if ($existing) {
            return $existing;
        }

        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => "ORDER-{$number}",
            'status' => $status === 'ready' ? 'ready-for-pickup' : $status,
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'currency' => 'PHP',
            'shipping_name' => 'Maketo E2E Recipient',
            'shipping_phone' => '+639170099999',
            'shipping_line1' => '300 Example Drop-off Road',
            'shipping_city' => 'Taguig City',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1630',
            'subtotal' => '1000.00',
            'shipping_total' => '50.00',
            'grand_total' => '1050.00',
            'placed_at' => now()->subDay(),
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'status' => $status,
            'subtotal' => '1000.00',
            'shipping_fee' => '50.00',
            'grand_total' => '1050.00',
            'courier_id' => $courier->id,
            'tracking_number' => $number,
            'confirmed_at' => now()->subHours(22),
            'ready_at' => now()->subHours(20),
            'picked_up_at' => in_array($status, ['picked-up', 'in-transit', 'out-for-delivery', 'delivered'], true) ? now()->subHours(10) : null,
            'delivered_at' => $status === 'delivered' ? now()->subHour() : null,
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'seller_order_id' => $sellerOrder->id,
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'unit_price' => '500.00',
            'regular_unit_price' => '500.00',
            'quantity' => 2,
            'subtotal' => '1000.00',
        ]);
        $shipment = Shipment::create([
            'seller_order_id' => $sellerOrder->id,
            'courier_id' => $courier->id,
            'tracking_number' => $number,
            'driver_name' => $courier->name,
            'status' => $status,
            'expected_delivery_at' => now()->addDay(),
            'picked_up_at' => in_array($status, ['picked-up', 'in-transit', 'out-for-delivery', 'delivered'], true) ? now()->subHours(10) : null,
            'in_transit_at' => in_array($status, ['in-transit', 'out-for-delivery', 'delivered'], true) ? now()->subHours(8) : null,
            'delivered_at' => $status === 'delivered' ? now()->subHour() : null,
        ]);

        $timeline = ['ready'];
        foreach (['picked-up', 'in-transit', 'out-for-delivery', 'delivered'] as $step) {
            if (in_array($status, [$step, ...array_slice(['picked-up', 'in-transit', 'out-for-delivery', 'delivered'], array_search($step, ['picked-up', 'in-transit', 'out-for-delivery', 'delivered'], true) + 1)], true)) {
                $timeline[] = $step;
            }
        }
        foreach ($timeline as $index => $step) {
            TrackingEvent::create([
                'shipment_id' => $shipment->id,
                'status' => $step,
                'location' => 'Metro Manila',
                'note' => "Local E2E {$step} fixture event.",
                'actor_type' => $step === 'ready' ? 'admin_logistics' : 'courier',
                'actor_user_id' => $step === 'ready' ? null : $courier->user_id,
                'occurred_at' => now()->subHours(20 - ($index * 4)),
            ]);
        }

        return $shipment;
    }

    private function paidPayout(Courier $courier, User $admin, CommissionEntry $entry): void
    {
        $payout = Payout::query()->firstOrCreate(
            ['payout_number' => 'MKT-E2E-PAID-001'],
            [
                'recipient_type' => 'courier',
                'recipient_id' => $courier->id,
                'period_start' => today()->subWeek(),
                'period_end' => today(),
                'currency' => 'PHP',
                'gross_amount' => $entry->gross_amount,
                'commission_amount' => $entry->commission_amount,
                'net_amount' => $entry->net_amount,
                'status' => 'paid',
                'payment_method' => 'development_fixture',
                'payment_reference' => 'MKT-E2E-REFERENCE-001',
                'approved_by' => $admin->id,
                'requested_at' => now()->subHours(4),
                'approved_at' => now()->subHours(3),
                'processing_at' => now()->subHours(2),
                'paid_at' => now()->subHour(),
            ],
        );
        PayoutItem::query()->firstOrCreate(
            ['source_key' => "payout:courier_delivery:shipment:{$entry->source_id}"],
            [
                'payout_id' => $payout->id,
                'source_type' => 'commission_entry',
                'source_id' => $entry->id,
                'commission_entry_id' => $entry->id,
                'description' => 'Local E2E delivered shipment payout.',
                'gross_amount' => $entry->gross_amount,
                'commission_amount' => $entry->commission_amount,
                'net_amount' => $entry->net_amount,
            ],
        );
        $entry->update(['payout_id' => $payout->id, 'status' => 'paid']);
    }
}
