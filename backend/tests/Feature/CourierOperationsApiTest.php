<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Courier;
use App\Models\CourierApplication;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CourierOperationsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_active_approved_courier_profiles_can_access_operational_profile(): void
    {
        $active = $this->courier('active-courier');
        $buyer = $this->user('buyer');
        $seller = $this->user('seller');
        $admin = $this->user('admin');
        $this->courierForUser($admin, 'admin-courier');
        $pendingApplicant = $this->user('buyer');
        CourierApplication::create(['user_id' => $pendingApplicant->id, 'status' => 'pending', 'submitted_at' => now()]);
        $suspended = $this->courier('suspended-courier', 'suspended');

        $this->actingAs($active->user)->getJson('/api/courier/profile')
            ->assertOk()
            ->assertJsonPath('data.id', $active->id)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonMissingPath('data.approved_application')
            ->assertJsonMissingPath('data.documents')
            ->assertJsonMissingPath('data.contact_email');

        foreach ([$buyer, $seller, $admin, $pendingApplicant, $suspended->user] as $user) {
            $this->actingAs($user)->getJson('/api/courier/profile')
                ->assertForbidden()->assertJsonPath('code', 'rider_not_active');
        }
    }

    public function test_delivery_list_is_paginated_bounded_and_owned_by_authenticated_courier(): void
    {
        $courierA = $this->courier('courier-a');
        $courierB = $this->courier('courier-b');
        $first = $this->delivery($courierA, 'ready', 'A1');
        $second = $this->delivery($courierA, 'in-transit', 'A2');
        $other = $this->delivery($courierB, 'ready', 'B1');

        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = $this->actingAs($courierA->user)->getJson('/api/courier/deliveries?status=all&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.per_page', 1);
        $this->assertLessThanOrEqual(12, count(DB::getQueryLog()));
        $this->assertNotSame($other->id, $response->json('data.0.id'));

        $this->actingAs($courierA->user)->getJson("/api/courier/deliveries/{$first->id}")
            ->assertOk()->assertJsonPath('data.id', $first->id)
            ->assertJsonMissingPath('data.drop_off.email')
            ->assertJsonMissingPath('data.payment');
        $this->actingAs($courierB->user)->getJson("/api/courier/deliveries/{$first->id}")
            ->assertNotFound()->assertJsonPath('code', 'shipment_not_assigned');

        $this->actingAs($courierA->user)->getJson('/api/courier/deliveries?status=current&search=TRACK-A2')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $second->id);
    }

    public function test_admin_assignment_is_canonical_synchronized_audited_and_reassignment_changes_access(): void
    {
        $admin = $this->user('admin');
        $courierA = $this->courier('assign-a');
        $courierB = $this->courier('assign-b');
        $shipment = $this->delivery(null, 'ready', 'ASSIGN');

        $this->actingAs($admin)->patchJson("/api/admin/shipments/{$shipment->id}/courier", ['courier_id' => $courierA->id])
            ->assertOk()->assertJsonPath('data.courier_id', $courierA->id);
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'courier_id' => $courierA->id]);
        $this->assertDatabaseHas('seller_orders', ['id' => $shipment->seller_order_id, 'courier_id' => $courierA->id]);
        $this->assertDatabaseHas('tracking_events', ['shipment_id' => $shipment->id, 'status' => 'assigned', 'actor_type' => 'admin_dispatch']);
        $this->assertDatabaseHas('notifications', ['user_id' => $courierA->user_id, 'title' => 'New delivery assigned']);

        $this->actingAs($admin)->patchJson("/api/admin/shipments/{$shipment->id}/courier", ['courier_id' => $courierB->id])
            ->assertOk()->assertJsonPath('data.courier_id', $courierB->id);
        $this->actingAs($courierA->user)->getJson("/api/courier/deliveries/{$shipment->id}")->assertNotFound();
        $this->actingAs($courierB->user)->getJson("/api/courier/deliveries/{$shipment->id}")->assertOk();
        $this->assertDatabaseHas('tracking_events', ['shipment_id' => $shipment->id, 'status' => 'reassigned']);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'courier.delivery.reassigned', 'subject_id' => $shipment->id]);
    }

    public function test_admin_can_assign_only_eligible_couriers(): void
    {
        $admin = $this->user('admin');
        $eligible = $this->courier('eligible');
        $pending = $this->courier('pending-approval', 'active', true, false);
        $suspended = $this->courier('suspended', 'suspended');
        $inactive = $this->courier('inactive', 'active', false);
        $inactiveAccount = $this->courier('inactive-account');
        $inactiveAccount->user->update(['status' => 'suspended']);
        $shipment = $this->delivery(null, 'ready', 'ELIGIBLE');

        $this->actingAs($admin)->getJson('/api/admin/couriers/eligible')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $eligible->id);

        foreach ([$pending, $suspended, $inactive, $inactiveAccount] as $courier) {
            $this->actingAs($admin)->patchJson("/api/admin/shipments/{$shipment->id}/courier", ['courier_id' => $courier->id])
                ->assertUnprocessable()->assertJsonValidationErrors('courier_id');
        }
        $this->assertNull($shipment->fresh()->courier_id);
    }

    public function test_courier_transitions_are_transactional_idempotent_and_preserve_buyer_confirmation(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('transition-courier');
        $shipment = $this->delivery($courier, 'ready', 'TRANSITION');
        $initialEvents = TrackingEvent::query()->where('shipment_id', $shipment->id)->count();

        foreach (['picked-up', 'in-transit', 'out-for-delivery'] as $status) {
            $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", [
                'status' => $status, 'note' => "Courier set {$status}.", 'location' => 'Makati City',
            ])->assertOk()->assertJsonPath('data.status', $status);

            $eventCount = TrackingEvent::query()->where('shipment_id', $shipment->id)->count();
            $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => $status])
                ->assertOk()->assertJsonPath('data.status', $status);
            $this->assertSame($eventCount, TrackingEvent::query()->where('shipment_id', $shipment->id)->count());
        }

        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage('proof.png')],
            ['Accept' => 'application/json'],
        )->assertOk()->assertJsonPath('data.status', 'delivered');
        $deliveredEvents = TrackingEvent::query()->where('shipment_id', $shipment->id)->count();
        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage('duplicate.png')],
            ['Accept' => 'application/json'],
        )->assertOk()->assertJsonPath('data.status', 'delivered');
        $this->assertSame($deliveredEvents, TrackingEvent::query()->where('shipment_id', $shipment->id)->count());

        $this->assertSame($initialEvents + 4, TrackingEvent::query()->where('shipment_id', $shipment->id)->count());
        $this->assertDatabaseHas('tracking_events', ['shipment_id' => $shipment->id, 'status' => 'delivered', 'actor_type' => 'courier', 'actor_user_id' => $courier->user_id]);
        $this->assertDatabaseHas('seller_orders', ['id' => $shipment->seller_order_id, 'status' => 'delivered', 'courier_id' => $courier->id]);
        $this->assertDatabaseHas('orders', ['id' => $shipment->sellerOrder->order_id, 'status' => 'delivered']);
        $this->assertDatabaseMissing('orders', ['id' => $shipment->sellerOrder->order_id, 'status' => 'completed']);
        $this->assertDatabaseHas('commission_entries', ['source_key' => "courier_delivery:shipment:{$shipment->id}", 'recipient_id' => $courier->id]);
        $this->assertDatabaseHas('notifications', ['user_id' => $shipment->sellerOrder->order->buyer_id, 'title' => 'Order delivered']);
        $this->assertDatabaseHas('notifications', ['user_id' => $shipment->sellerOrder->seller->user_id, 'title' => 'Order delivered successfully']);
        $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => 'picked-up'])
            ->assertUnprocessable()->assertJsonPath('code', 'invalid_delivery_transition')->assertJsonValidationErrors('status');
    }

    public function test_cancelled_delivery_and_suspended_courier_cannot_continue_operations(): void
    {
        $courier = $this->courier('blocked-courier');
        $shipment = $this->delivery($courier, 'ready', 'BLOCKED');
        $shipment->sellerOrder->update(['status' => 'cancelled']);

        $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => 'picked-up'])
            ->assertUnprocessable()->assertJsonPath('code', 'invalid_delivery_transition')->assertJsonValidationErrors('status');
        $this->assertDatabaseMissing('tracking_events', ['shipment_id' => $shipment->id, 'status' => 'picked-up']);

        $courier->update(['status' => 'suspended', 'active' => false]);
        $this->actingAs($courier->user)->getJson('/api/courier/deliveries')->assertForbidden()->assertJsonPath('code', 'rider_not_active');
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'courier_id' => $courier->id]);
    }

    public function test_availability_dashboard_and_financial_endpoints_use_authoritative_own_records(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('financial-courier');
        $other = $this->courier('financial-other');
        $shipment = $this->delivery($courier, 'ready', 'FINANCE');

        $this->actingAs($courier->user)->patchJson('/api/courier/availability', ['availability' => 'available'])
            ->assertOk()->assertJsonPath('data.availability', 'available');
        $this->actingAs($courier->user)->getJson('/api/courier/dashboard')
            ->assertOk()->assertJsonPath('data.assigned_count', 1)->assertJsonPath('data.current_delivery.id', $shipment->id);

        foreach (['picked-up', 'in-transit', 'out-for-delivery'] as $status) {
            $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => $status])->assertOk();
        }
        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage('finance-proof.png')],
            ['Accept' => 'application/json'],
        )->assertOk();
        Payout::create($this->payoutData($courier, 'OWN-PAYOUT'));
        Payout::create($this->payoutData($other, 'OTHER-PAYOUT'));

        $this->actingAs($courier->user)->getJson('/api/courier/earnings/summary')
            ->assertOk()->assertJsonPath('data.delivery_count', 1)->assertJsonPath('data.currency', 'PHP');
        $this->actingAs($courier->user)->getJson('/api/courier/payouts')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.payout_number', 'OWN-PAYOUT');
    }

    private function user(string $role = 'buyer'): User
    {
        return User::factory()->create(['role' => $role, 'status' => 'active', 'email_verified_at' => now()]);
    }

    private function proofImage(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true),
        );
    }

    private function courier(string $slug, string $status = 'active', bool $active = true, bool $approved = true): Courier
    {
        return $this->courierForUser($this->user('buyer'), $slug, $status, $active, $approved);
    }

    private function courierForUser(User $user, string $slug, string $status = 'active', bool $active = true, bool $approved = true): Courier
    {
        return Courier::create([
            'user_id' => $user->id, 'name' => "Courier {$slug}", 'slug' => $slug,
            'contact_email' => $user->email, 'contact_phone' => $user->phone,
            'active' => $active, 'status' => $status, 'availability_status' => 'offline',
            'vehicle_type' => 'motorcycle', 'vehicle_make' => 'Honda', 'vehicle_model' => 'Click',
            'vehicle_plate_number' => strtoupper(substr($slug, 0, 3)).'-1234',
            'approved_at' => $approved ? now() : null,
        ]);
    }

    private function delivery(?Courier $courier, string $status, string $suffix): Shipment
    {
        $buyer = $this->user('buyer');
        $sellerUser = $this->user('seller');
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved', 'verified' => true]);
        $category = Category::create(['name' => "Courier {$suffix}", 'slug' => strtolower("courier-{$suffix}"), 'active' => true]);
        $product = Product::create([
            'seller_id' => $seller->id, 'category_id' => $category->id,
            'name' => "Courier Product {$suffix}", 'slug' => strtolower("courier-product-{$suffix}"),
            'sku' => "COURIER-{$suffix}", 'price' => 500, 'status' => 'active', 'stock_quantity' => 5,
        ]);
        $order = Order::create([
            'buyer_id' => $buyer->id, 'order_number' => "COURIER-ORDER-{$suffix}",
            'status' => $status === 'ready' ? 'ready-for-pickup' : $status,
            'payment_status' => 'pending', 'payment_method' => 'cod', 'currency' => 'PHP',
            'shipping_name' => "Recipient {$suffix}", 'shipping_phone' => '+639171234567',
            'shipping_line1' => "{$suffix} Delivery Street", 'shipping_city' => 'Makati City',
            'shipping_province' => 'Metro Manila', 'shipping_postal_code' => '1200',
            'subtotal' => 500, 'shipping_total' => 50, 'grand_total' => 550, 'placed_at' => now(),
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id, 'seller_id' => $seller->id, 'status' => $status,
            'subtotal' => 500, 'shipping_fee' => 50, 'grand_total' => 550,
            'courier_id' => $courier?->id, 'tracking_number' => "TRACK-{$suffix}", 'ready_at' => now(),
        ]);
        OrderItem::create([
            'order_id' => $order->id, 'seller_order_id' => $sellerOrder->id,
            'seller_id' => $seller->id, 'product_id' => $product->id,
            'product_name' => $product->name, 'product_slug' => $product->slug,
            'sku' => $product->sku, 'unit_price' => 500, 'quantity' => 2, 'subtotal' => 1000,
        ]);
        $shipment = Shipment::create([
            'seller_order_id' => $sellerOrder->id, 'courier_id' => $courier?->id,
            'tracking_number' => "TRACK-{$suffix}", 'driver_name' => $courier?->name, 'status' => $status,
        ]);
        TrackingEvent::create([
            'shipment_id' => $shipment->id, 'status' => $status,
            'note' => 'Delivery fixture created.', 'occurred_at' => now(),
        ]);

        return $shipment->load(['sellerOrder.order', 'sellerOrder.seller']);
    }

    private function payoutData(Courier $courier, string $number): array
    {
        return [
            'payout_number' => $number, 'recipient_type' => 'courier', 'recipient_id' => $courier->id,
            'period_start' => today()->subWeek(), 'period_end' => today(), 'currency' => 'PHP',
            'gross_amount' => 100, 'commission_amount' => 20, 'adjustment_amount' => 0,
            'net_amount' => 80, 'status' => 'paid', 'paid_at' => now(),
        ];
    }
}
