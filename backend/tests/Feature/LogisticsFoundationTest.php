<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Courier;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsHub;
use App\Models\LogisticsProvider;
use App\Models\LogisticsStaff;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LogisticsFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_manages_provider_and_staff_while_logistics_access_remains_capability_based(): void
    {
        $admin = $this->user('admin');
        $staffUser = $this->user('seller');

        $providerResponse = $this->actingAs($admin)->postJson('/api/admin/logistics/providers', [
            'code' => 'lex-lag', 'company_name' => 'Laguna Express Logistics', 'status' => 'active',
        ])->assertCreated()->assertJsonPath('data.code', 'LEX-LAG')->assertJsonPath('data.status', 'active');
        $provider = LogisticsProvider::findOrFail($providerResponse->json('data.id'));
        $hub = $this->hub($provider, 'LAG-PGS');

        $this->actingAs($admin)->postJson("/api/admin/logistics/providers/{$provider->id}/staff", [
            'user_id' => $staffUser->id, 'staff_type' => 'dispatcher', 'primary_hub_id' => $hub->id,
        ])->assertCreated()->assertJsonPath('data.user_id', $staffUser->id);

        $this->actingAs($staffUser)->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('user.role', 'seller')
            ->assertJsonPath('user.logistics_access', true)
            ->assertJsonPath('user.logistics_staff_type', 'dispatcher');
        $this->actingAs($staffUser)->getJson('/api/logistics/context')
            ->assertOk()->assertJsonPath('data.provider.id', $provider->id)
            ->assertJsonCount(1, 'data.authorized_hubs');

        $this->actingAs($admin)->getJson('/api/logistics/context')
            ->assertForbidden()->assertJsonPath('code', 'logistics_access_denied');
        $this->assertSame('seller', $staffUser->fresh()->role);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'logistics.provider.created', 'subject_id' => $provider->id]);

        $this->actingAs($admin)->postJson('/api/admin/logistics/providers', [
            'code' => 'PENDING-3PL', 'company_name' => 'Pending Logistics',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');
    }

    public function test_inactive_staff_and_non_active_provider_are_denied_without_deleting_history(): void
    {
        $provider = $this->provider();
        $staff = $this->staff($provider, 'provider_manager');
        $buyer = $this->user('buyer');

        $this->actingAs($buyer)->getJson('/api/logistics/context')->assertForbidden();
        $staff->update(['status' => 'suspended', 'suspended_at' => now()]);
        $this->actingAs($staff->user)->getJson('/api/logistics/context')->assertForbidden();
        $staff->update(['status' => 'active', 'suspended_at' => null]);
        $provider->update(['status' => 'suspended', 'suspended_at' => now()]);
        $this->actingAs($staff->user)->getJson('/api/logistics/context')->assertForbidden();

        $this->assertDatabaseHas('logistics_staff', ['id' => $staff->id]);
        $this->assertDatabaseHas('logistics_providers', ['id' => $provider->id, 'status' => 'suspended']);
    }

    public function test_buyers_sellers_couriers_and_inactive_staff_have_no_implicit_logistics_access(): void
    {
        $buyer = $this->user('buyer');
        $seller = $this->user('seller');
        $courier = $this->courier('no-staff');
        $provider = $this->provider('AUTH-MATRIX');
        $inactiveStaff = $this->staff($provider, 'provider_manager');
        $inactiveStaff->update(['status' => 'inactive']);

        foreach ([$buyer, $seller, $courier->user, $inactiveStaff->user] as $user) {
            $this->actingAs($user)->getJson('/api/logistics/context')
                ->assertForbidden()
                ->assertJsonPath('code', 'logistics_access_denied');
        }
    }

    public function test_provider_manager_can_manage_only_own_hubs_and_normalized_service_areas(): void
    {
        $providerA = $this->provider('PRO-A');
        $providerB = $this->provider('PRO-B');
        $managerA = $this->staff($providerA, 'provider_manager');
        $managerB = $this->staff($providerB, 'provider_manager');
        $this->fakePsgc();

        $response = $this->actingAs($managerA->user)->postJson('/api/logistics/hubs', [
            'code' => 'pro-a-pgs', 'name' => 'Pagsanjan Hub', 'address_line1' => '1 Hub Road',
            'region_code' => '0400000000', 'province_code' => '0434000000', 'city_code' => '0434150000',
            'postal_code' => '4008', 'active' => true,
        ])->assertCreated()->assertJsonPath('data.code', 'PRO-A-PGS')->assertJsonPath('data.city_label', 'Pagsanjan');
        $hub = LogisticsHub::findOrFail($response->json('data.id'));

        $this->actingAs($managerA->user)->putJson("/api/logistics/hubs/{$hub->id}/service-areas", ['areas' => [
            ['municipality_code' => '0434150000', 'municipality_label' => 'untrusted label', 'priority' => 1],
            ['municipality_code' => '0434120000', 'municipality_label' => 'Lumban', 'priority' => 2],
        ]])->assertOk()->assertJsonPath('data.service_areas.0.municipality_label', 'Pagsanjan');
        $this->assertDatabaseCount('hub_service_areas', 2);

        $this->actingAs($managerB->user)->patchJson("/api/logistics/hubs/{$hub->id}", ['name' => 'Stolen Hub'])->assertNotFound();
        $this->actingAs($managerB->user)->getJson('/api/logistics/hubs')->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('logistics_hubs', ['id' => $hub->id, 'name' => 'Pagsanjan Hub', 'logistics_provider_id' => $providerA->id]);
    }

    public function test_dispatcher_is_scoped_to_one_hub_while_manager_sees_all_provider_hubs(): void
    {
        $provider = $this->provider();
        $hubA = $this->hub($provider, 'HUB-A');
        $hubB = $this->hub($provider, 'HUB-B');
        $manager = $this->staff($provider, 'provider_manager');
        $dispatcher = $this->staff($provider, 'dispatcher', $hubA);

        $this->actingAs($manager->user)->getJson('/api/logistics/hubs')->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($dispatcher->user)->getJson('/api/logistics/hubs')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $hubA->id);
        $this->actingAs($dispatcher->user)->patchJson("/api/logistics/hubs/{$hubA->id}", ['name' => 'No'])->assertForbidden();
        $this->actingAs($dispatcher->user)->postJson('/api/logistics/shipments/999/check-in', ['hub_id' => $hubB->id])->assertNotFound();
    }

    public function test_courier_affiliations_are_historical_single_active_and_never_self_assigned(): void
    {
        $providerA = $this->provider('AFF-A');
        $providerB = $this->provider('AFF-B');
        $hubA = $this->hub($providerA, 'AFF-HUB-A');
        $hubB = $this->hub($providerB, 'AFF-HUB-B');
        $managerA = $this->staff($providerA, 'provider_manager');
        $managerB = $this->staff($providerB, 'provider_manager');
        $courier = $this->courier('affiliated');

        $first = $this->actingAs($managerA->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubA->id])
            ->assertCreated()->assertJsonPath('data.logistics_provider_id', $providerA->id);
        $this->actingAs($managerB->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubB->id])
            ->assertUnprocessable();
        $this->actingAs($courier->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubA->id])
            ->assertForbidden();

        $affiliationId = $first->json('data.id');
        $this->actingAs($managerA->user)->postJson("/api/logistics/affiliations/{$affiliationId}/end", ['reason' => 'Moved provider'])
            ->assertOk()->assertJsonPath('data.status', 'inactive');
        $this->actingAs($managerB->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubB->id])
            ->assertCreated()->assertJsonPath('data.logistics_provider_id', $providerB->id);

        $this->assertDatabaseCount('courier_logistics_affiliations', 2);
        $this->assertDatabaseHas('courier_logistics_affiliations', ['id' => $affiliationId, 'status' => 'inactive']);
        $this->assertSame(1, CourierLogisticsAffiliation::where('courier_id', $courier->id)->where('status', 'active')->whereNull('ended_at')->count());
    }

    public function test_affiliation_requires_an_approved_courier_and_an_owned_active_hub(): void
    {
        $providerA = $this->provider('AFF-VALID-A');
        $providerB = $this->provider('AFF-VALID-B');
        $hubA = $this->hub($providerA, 'AFF-VALID-HUB-A');
        $hubB = $this->hub($providerB, 'AFF-VALID-HUB-B');
        $manager = $this->staff($providerA, 'provider_manager');
        $courier = $this->courier('unapproved');
        $courier->update(['status' => 'pending', 'active' => false, 'approved_at' => null]);

        $this->actingAs($manager->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubA->id])
            ->assertUnprocessable();
        $courier->update(['status' => 'active', 'active' => true, 'approved_at' => now()]);
        $this->actingAs($manager->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubB->id])
            ->assertNotFound();
        $hubA->update(['active' => false]);
        $this->actingAs($manager->user)->postJson("/api/logistics/riders/{$courier->id}/affiliate", ['primary_hub_id' => $hubA->id])
            ->assertUnprocessable();
        $this->assertDatabaseMissing('courier_logistics_affiliations', ['courier_id' => $courier->id]);
    }

    public function test_admin_provider_assignment_controls_visibility_and_rejects_conflicting_ownership(): void
    {
        $admin = $this->user('admin');
        $providerA = $this->provider('SHIP-A');
        $providerB = $this->provider('SHIP-B');
        $managerA = $this->staff($providerA, 'provider_manager');
        $managerB = $this->staff($providerB, 'provider_manager');
        $shipment = $this->shipment();

        $this->actingAs($managerA->user)->getJson('/api/logistics/shipments')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($admin)->patchJson("/api/admin/logistics/shipments/{$shipment->id}/provider", ['logistics_provider_id' => $providerA->id])
            ->assertOk()->assertJsonPath('data.logistics_provider_id', $providerA->id)
            ->assertJsonPath('data.status', 'ready')->assertJsonPath('data.courier_id', null);
        $this->actingAs($managerA->user)->getJson('/api/logistics/shipments')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($managerB->user)->getJson('/api/logistics/shipments')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($admin)->patchJson("/api/admin/logistics/shipments/{$shipment->id}/provider", ['logistics_provider_id' => $providerB->id])
            ->assertStatus(409)->assertJsonPath('code', 'shipment_provider_conflict');
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'logistics_provider_id' => $providerA->id, 'status' => 'ready', 'courier_id' => null]);
    }

    public function test_provider_assignment_rejects_suspended_providers_and_terminal_shipments(): void
    {
        $admin = $this->user('admin');
        $activeProvider = $this->provider('ASSIGN-ACTIVE');
        $suspendedProvider = $this->provider('ASSIGN-SUSPENDED');
        $suspendedProvider->update(['status' => 'suspended', 'suspended_at' => now()]);
        $ready = $this->shipment();
        $terminal = $this->shipment('delivered');

        $this->actingAs($admin)->patchJson("/api/admin/logistics/shipments/{$ready->id}/provider", [
            'logistics_provider_id' => $suspendedProvider->id,
        ])->assertUnprocessable();
        $this->actingAs($admin)->patchJson("/api/admin/logistics/shipments/{$terminal->id}/provider", [
            'logistics_provider_id' => $activeProvider->id,
        ])->assertUnprocessable();
        $this->assertNull($ready->fresh()->logistics_provider_id);
        $this->assertNull($terminal->fresh()->logistics_provider_id);
    }

    public function test_hub_check_in_is_tenant_scoped_idempotent_and_does_not_change_status_or_courier(): void
    {
        $provider = $this->provider('CHECK');
        $otherProvider = $this->provider('OTHER');
        $hubA = $this->hub($provider, 'CHECK-A');
        $hubB = $this->hub($provider, 'CHECK-B');
        $otherHub = $this->hub($otherProvider, 'OTHER-HUB');
        $dispatcher = $this->staff($provider, 'dispatcher', $hubA);
        $shipment = $this->shipment('ready', null, $provider);

        $this->actingAs($dispatcher->user)->postJson("/api/logistics/shipments/{$shipment->id}/check-in", ['hub_id' => $hubA->id])
            ->assertOk()->assertJsonPath('data.current_hub.id', $hubA->id)->assertJsonPath('data.status', 'ready');
        $receivedAt = $shipment->fresh()->hub_received_at;
        $eventCount = TrackingEvent::where('shipment_id', $shipment->id)->count();
        $this->actingAs($dispatcher->user)->postJson("/api/logistics/shipments/{$shipment->id}/check-in", ['hub_id' => $hubA->id])->assertOk();
        $this->assertEquals($receivedAt, $shipment->fresh()->hub_received_at);
        $this->assertSame($eventCount, TrackingEvent::where('shipment_id', $shipment->id)->count());

        $manager = $this->staff($provider, 'provider_manager');
        $this->actingAs($manager->user)->postJson("/api/logistics/shipments/{$shipment->id}/check-in", ['hub_id' => $hubB->id])
            ->assertStatus(409)->assertJsonPath('code', 'shipment_already_at_different_hub');
        $this->actingAs($manager->user)->postJson("/api/logistics/shipments/{$shipment->id}/check-in", ['hub_id' => $otherHub->id])
            ->assertUnprocessable();
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'current_hub_id' => $hubA->id, 'status' => 'ready', 'courier_id' => null]);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'logistics.shipment.hub_checked_in', 'subject_id' => $shipment->id]);
    }

    public function test_hub_check_in_rejects_unassigned_terminal_inactive_and_out_of_scope_operations(): void
    {
        $providerA = $this->provider('CHECK-RULE-A');
        $providerB = $this->provider('CHECK-RULE-B');
        $hubA = $this->hub($providerA, 'CHECK-RULE-HUB-A');
        $hubA2 = $this->hub($providerA, 'CHECK-RULE-HUB-A2');
        $hubB = $this->hub($providerB, 'CHECK-RULE-HUB-B');
        $dispatcher = $this->staff($providerA, 'dispatcher', $hubA);
        $manager = $this->staff($providerA, 'provider_manager');
        $unassigned = $this->shipment();
        $terminal = $this->shipment('delivered', null, $providerA);
        $wrongProvider = $this->shipment('ready', null, $providerB);

        $this->actingAs($dispatcher->user)->postJson("/api/logistics/shipments/{$unassigned->id}/check-in", ['hub_id' => $hubA->id])
            ->assertNotFound();
        $this->actingAs($manager->user)->postJson("/api/logistics/shipments/{$terminal->id}/check-in", ['hub_id' => $hubA->id])
            ->assertUnprocessable();
        $this->actingAs($dispatcher->user)->postJson("/api/logistics/shipments/{$wrongProvider->id}/check-in", ['hub_id' => $hubB->id])
            ->assertNotFound();

        $ready = $this->shipment('ready', null, $providerA);
        $this->actingAs($dispatcher->user)->postJson("/api/logistics/shipments/{$ready->id}/check-in", ['hub_id' => $hubA2->id])
            ->assertUnprocessable();
        $hubA->update(['active' => false]);
        $this->actingAs($dispatcher->user)->postJson("/api/logistics/shipments/{$ready->id}/check-in", ['hub_id' => $hubA->id])
            ->assertUnprocessable();
        $this->assertNull($ready->fresh()->current_hub_id);
    }

    public function test_dispatch_policy_allows_same_provider_hub_and_blocks_cross_provider_rider(): void
    {
        $providerA = $this->provider('DISP-A');
        $providerB = $this->provider('DISP-B');
        $hubA = $this->hub($providerA, 'DISP-HUB-A');
        $hubB = $this->hub($providerB, 'DISP-HUB-B');
        $dispatcher = $this->staff($providerA, 'dispatcher', $hubA);
        $courierA = $this->courier('dispatch-a');
        $courierB = $this->courier('dispatch-b');
        $this->affiliation($courierA, $providerA, $hubA, $dispatcher->user);
        $this->affiliation($courierB, $providerB, $hubB, $dispatcher->user);
        $shipmentA = $this->shipment('ready', null, $providerA, $hubA);
        $shipmentB = $this->shipment('ready', null, $providerA, $hubA);
        $hubA2 = $this->hub($providerA, 'DISP-HUB-A2');
        $courierA2 = $this->courier('dispatch-a2');
        $this->affiliation($courierA2, $providerA, $hubA2, $dispatcher->user);
        $shipmentAtA2 = $this->shipment('ready', null, $providerA, $hubA2);

        $this->actingAs($dispatcher->user)->patchJson("/api/logistics/shipments/{$shipmentA->id}/courier", ['courier_id' => $courierA->id])
            ->assertOk()->assertJsonPath('data.courier.id', $courierA->id);
        $this->actingAs($dispatcher->user)->patchJson("/api/logistics/shipments/{$shipmentB->id}/courier", ['courier_id' => $courierB->id])
            ->assertForbidden()->assertJsonPath('code', 'cross_provider_assignment_forbidden');
        $this->actingAs($dispatcher->user)->patchJson("/api/logistics/shipments/{$shipmentB->id}/courier", ['courier_id' => $courierA2->id])
            ->assertUnprocessable();
        $this->actingAs($dispatcher->user)->patchJson("/api/logistics/shipments/{$shipmentAtA2->id}/courier", ['courier_id' => $courierA2->id])
            ->assertUnprocessable();

        $this->assertDatabaseHas('tracking_events', ['shipment_id' => $shipmentA->id, 'status' => 'assigned', 'actor_type' => 'logistics_dispatch']);
        $this->assertDatabaseHas('seller_orders', ['id' => $shipmentA->seller_order_id, 'courier_id' => $courierA->id]);
        $this->assertNull($shipmentB->fresh()->courier_id);
    }

    public function test_courier_pickup_releases_hub_but_retains_provider_and_truthful_pickup_history(): void
    {
        $provider = $this->provider('RELEASE');
        $hub = $this->hub($provider, 'RELEASE-HUB');
        $courier = $this->courier('release');
        $shipment = $this->shipment('ready', $courier, $provider, $hub);
        $shipment->update(['hub_received_at' => now()]);
        TrackingEvent::create([
            'shipment_id' => $shipment->id, 'status' => 'ready', 'actor_type' => 'logistics_staff',
            'location' => $hub->displayAddress(), 'note' => 'Received at hub.', 'occurred_at' => now(),
        ]);

        $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => 'picked-up'])
            ->assertOk()->assertJsonPath('data.status', 'picked-up')
            ->assertJsonPath('data.pickup.store_name', 'Logistics hub pickup');
        $fresh = $shipment->fresh();
        $this->assertNull($fresh->current_hub_id);
        $this->assertSame($provider->id, $fresh->logistics_provider_id);
        $this->assertNotNull($fresh->hub_received_at);
        $this->assertStringContainsString($hub->name, (string) TrackingEvent::where('shipment_id', $shipment->id)->where('status', 'picked-up')->value('location'));
        $this->actingAs($courier->user)->getJson("/api/courier/deliveries/{$shipment->id}")
            ->assertOk()->assertJsonPath('data.pickup.store_name', 'Logistics hub pickup')
            ->assertJsonPath('data.pickup.address', $hub->displayAddress());
    }

    public function test_checkout_snapshots_seller_pickup_and_buyer_destination_geography_immutably(): void
    {
        [$buyer, $seller, $address, $item] = $this->checkoutFixture();
        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id, 'payment_method' => 'cod', 'mode' => 'cart', 'cart_item_ids' => [$item->id],
        ])->assertCreated();
        $order = Order::with('sellerOrders')->findOrFail($response->json('data.id'));
        $sellerOrder = $order->sellerOrders->firstOrFail();

        $seller->update(['address_line1' => '99 Changed Seller Road', 'city' => 'Changed City', 'city_code' => '9999999999']);
        $address->update(['line1' => '99 Changed Buyer Road', 'city' => 'Changed City', 'city_code' => '9999999999']);

        $this->assertDatabaseHas('seller_orders', [
            'id' => $sellerOrder->id, 'pickup_address_line1' => '10 Original Seller Road',
            'pickup_city_code' => '0434150000', 'pickup_city_label' => 'Pagsanjan',
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id, 'shipping_line1' => '20 Original Buyer Road',
            'shipping_region_code' => '0400000000', 'shipping_province_code' => '0434000000',
            'shipping_city_code' => '0434120000', 'shipping_barangay_code' => '0434120001',
        ]);
    }

    public function test_legacy_courier_and_direct_shipment_remain_valid_without_guessed_logistics_values(): void
    {
        $courier = $this->courier('legacy');
        $shipment = $this->shipment('ready', $courier);

        $this->assertTrue($courier->user->hasActiveCourierProfile());
        $this->assertNull($courier->current_area_code);
        $this->assertNull($courier->activeLogisticsAffiliation);
        $this->assertNull($shipment->logistics_provider_id);
        $this->assertNull($shipment->current_hub_id);
        $response = $this->actingAs($courier->user)->getJson("/api/courier/deliveries/{$shipment->id}")
            ->assertOk();
        $this->assertStringContainsString(
            $shipment->sellerOrder->pickup_address_line1,
            (string) $response->json('data.pickup.address')
        );
    }

    public function test_provider_scoping_occurs_before_pagination_with_bounded_queries(): void
    {
        $providerA = $this->provider('PERF-A');
        $providerB = $this->provider('PERF-B');
        $manager = $this->staff($providerA, 'provider_manager');
        foreach (range(1, 3) as $number) {
            $this->shipment('ready', null, $providerA, null, "PA-{$number}");
            $this->shipment('ready', null, $providerB, null, "PB-{$number}");
        }

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($manager->user)->getJson('/api/logistics/shipments?per_page=2')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 3);
        $this->assertLessThanOrEqual(14, count(DB::getQueryLog()));
    }

    private function user(string $role = 'buyer'): User
    {
        return User::factory()->create(['role' => $role, 'status' => 'active', 'email_verified_at' => now()]);
    }

    private function provider(string $code = 'LEX-LAG'): LogisticsProvider
    {
        return LogisticsProvider::create(['code' => $code, 'company_name' => "Provider {$code}", 'status' => 'active', 'approved_at' => now()]);
    }

    private function hub(LogisticsProvider $provider, string $code): LogisticsHub
    {
        return LogisticsHub::create([
            'logistics_provider_id' => $provider->id, 'code' => $code, 'name' => "Hub {$code}",
            'address_line1' => "1 {$code} Road", 'region_code' => '0400000000', 'region_label' => 'Region IV-A',
            'province_code' => '0434000000', 'province_label' => 'Laguna',
            'city_code' => '0434150000', 'city_label' => 'Pagsanjan', 'postal_code' => '4008', 'active' => true,
        ]);
    }

    private function staff(LogisticsProvider $provider, string $type, ?LogisticsHub $hub = null): LogisticsStaff
    {
        $staff = LogisticsStaff::create([
            'user_id' => $this->user('buyer')->id, 'logistics_provider_id' => $provider->id,
            'primary_hub_id' => $type === 'provider_manager' ? null : $hub?->id,
            'staff_type' => $type, 'status' => 'active', 'approved_at' => now(),
        ]);

        return $staff->load(['user', 'provider', 'primaryHub']);
    }

    private function courier(string $slug): Courier
    {
        $user = $this->user('buyer');

        return Courier::create([
            'user_id' => $user->id, 'name' => "Courier {$slug}", 'slug' => $slug,
            'contact_email' => $user->email, 'contact_phone' => $user->phone,
            'active' => true, 'status' => 'active', 'availability_status' => 'available',
            'vehicle_type' => 'motorcycle', 'vehicle_plate_number' => strtoupper(substr($slug, 0, 3)).'-1234',
            'approved_at' => now(),
        ])->load('user');
    }

    private function affiliation(Courier $courier, LogisticsProvider $provider, LogisticsHub $hub, User $actor): CourierLogisticsAffiliation
    {
        return CourierLogisticsAffiliation::create([
            'courier_id' => $courier->id, 'logistics_provider_id' => $provider->id,
            'primary_hub_id' => $hub->id, 'status' => 'active', 'assigned_at' => now(), 'assigned_by' => $actor->id,
        ]);
    }

    private function shipment(
        string $status = 'ready',
        ?Courier $courier = null,
        ?LogisticsProvider $provider = null,
        ?LogisticsHub $hub = null,
        ?string $suffix = null,
    ): Shipment {
        $suffix ??= strtoupper(str()->random(8));
        $buyer = $this->user('buyer');
        $seller = Seller::factory()->create(['user_id' => $this->user('seller')->id, 'status' => 'approved']);
        $order = Order::create([
            'buyer_id' => $buyer->id, 'order_number' => "LOG-{$suffix}",
            'status' => $status === 'ready' ? 'ready-for-pickup' : $status,
            'payment_status' => 'pending', 'payment_method' => 'cod', 'currency' => 'PHP',
            'shipping_name' => 'Recipient', 'shipping_phone' => '+639171234567',
            'shipping_line1' => '20 Buyer Road', 'shipping_city' => 'Lumban',
            'shipping_province' => 'Laguna', 'shipping_postal_code' => '4014',
            'subtotal' => 500, 'shipping_total' => 50, 'grand_total' => 550, 'placed_at' => now(),
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id, 'seller_id' => $seller->id, 'status' => $status,
            'subtotal' => 500, 'shipping_fee' => 50, 'grand_total' => 550,
            'courier_id' => $courier?->id, 'tracking_number' => "TRACK-{$suffix}",
            'pickup_store_name' => $seller->business_name, 'pickup_contact_name' => $seller->contact_name,
            'pickup_contact_phone' => $seller->contact_phone, 'pickup_address_line1' => $seller->address_line1,
            'pickup_city_label' => $seller->city, 'pickup_province_label' => $seller->province,
            'pickup_postal_code' => $seller->postal_code, 'ready_at' => now(),
        ]);
        $shipment = Shipment::create([
            'seller_order_id' => $sellerOrder->id, 'logistics_provider_id' => $provider?->id,
            'courier_id' => $courier?->id, 'current_hub_id' => $hub?->id,
            'tracking_number' => "TRACK-{$suffix}", 'driver_name' => $courier?->name, 'status' => $status,
        ]);
        TrackingEvent::create(['shipment_id' => $shipment->id, 'status' => $status, 'note' => 'Fixture created.', 'occurred_at' => now()]);

        return $shipment->load(['sellerOrder.order', 'sellerOrder.seller', 'logisticsProvider', 'currentHub', 'courier']);
    }

    private function checkoutFixture(): array
    {
        $buyer = $this->user('buyer');
        $seller = Seller::factory()->create([
            'user_id' => $this->user('seller')->id, 'business_name' => 'Original Store', 'trade_name' => null,
            'address_line1' => '10 Original Seller Road', 'address_line2' => 'Unit A',
            'region' => 'Region IV-A', 'region_code' => '0400000000',
            'province' => 'Laguna', 'province_code' => '0434000000',
            'city' => 'Pagsanjan', 'city_code' => '0434150000',
            'barangay' => 'Barangay Uno', 'barangay_code' => '0434150001', 'postal_code' => '4008',
        ]);
        $category = Category::create(['name' => 'Logistics Snapshot', 'slug' => 'logistics-snapshot', 'active' => true]);
        $product = Product::create([
            'seller_id' => $seller->id, 'category_id' => $category->id, 'name' => 'Snapshot Product',
            'slug' => 'snapshot-product', 'sku' => 'SNAP-1', 'price' => 500, 'status' => 'active',
            'track_inventory' => true, 'stock_quantity' => 10, 'published_at' => now(),
        ]);
        $address = Address::create([
            'user_id' => $buyer->id, 'label' => 'Home', 'recipient_name' => 'Buyer', 'phone' => '+639171234567',
            'line1' => '20 Original Buyer Road', 'region' => 'Region IV-A', 'region_code' => '0400000000',
            'province' => 'Laguna', 'province_code' => '0434000000', 'city' => 'Lumban', 'city_code' => '0434120000',
            'barangay' => 'Barangay Dos', 'barangay_code' => '0434120001', 'postal_code' => '4014', 'is_default' => true,
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $item = CartItem::create([
            'cart_id' => $cart->id, 'seller_id' => $seller->id, 'product_id' => $product->id,
            'quantity' => 1, 'unit_price' => 500, 'line_total' => 500, 'saved_for_later' => false,
        ]);

        return [$buyer, $seller, $address, $item];
    }

    private function fakePsgc(): void
    {
        Http::fake(function ($request) {
            $url = $request->url();
            $data = match (true) {
                str_ends_with($url, '/regions') => [['code' => '0400000000', 'name' => 'Region IV-A']],
                str_ends_with($url, '/regions/0400000000/provinces') => [['code' => '0434000000', 'name' => 'Laguna']],
                str_ends_with($url, '/provinces/0434000000/cities-municipalities') => [
                    ['code' => '0434150000', 'name' => 'Pagsanjan', 'zip_code' => '4008'],
                    ['code' => '0434120000', 'name' => 'Lumban', 'zip_code' => '4014'],
                ],
                str_ends_with($url, '/cities-municipalities/0434150000') => ['code' => '0434150000', 'name' => 'Pagsanjan', 'zip_code' => '4008'],
                str_ends_with($url, '/cities-municipalities/0434120000') => ['code' => '0434120000', 'name' => 'Lumban', 'zip_code' => '4014'],
                default => [],
            };

            return Http::response(['data' => $data]);
        });
    }
}
