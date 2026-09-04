<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Courier;
use App\Models\DeliveryProof;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use App\Services\CourierDeliveryService;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class DeliveryProofApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_generic_delivered_transition_requires_proof_and_changes_nothing(): void
    {
        $courier = $this->courier('required');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'REQUIRED');
        $events = TrackingEvent::where('shipment_id', $shipment->id)->count();

        $this->actingAs($courier->user)
            ->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => 'delivered'])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'proof_of_delivery_required');
        $admin = $this->user('admin');
        $this->actingAs($admin)
            ->patchJson("/api/admin/seller-orders/{$shipment->seller_order_id}/delivery-status", ['status' => 'delivered'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'status' => 'out-for-delivery']);
        $this->assertDatabaseCount('delivery_proofs', 0);
        $this->assertSame($events, TrackingEvent::where('shipment_id', $shipment->id)->count());
    }

    public function test_valid_private_proof_completes_delivery_without_buyer_completion(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('valid');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'VALID');

        $response = $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage('doorstep.png'), 'note' => 'Received by customer.'],
            ['Accept' => 'application/json'],
        )->assertOk()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.proof_of_delivery.exists', true)
            ->assertJsonPath('data.proof_of_delivery.note', 'Received by customer.');

        $proof = DeliveryProof::firstOrFail();
        Storage::disk('r2')->assertExists($proof->file_path);
        $this->assertSame($courier->id, $proof->courier_id);
        $this->assertNotNull($proof->submitted_at);
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'status' => 'delivered']);
        $this->assertDatabaseHas('seller_orders', ['id' => $shipment->seller_order_id, 'status' => 'delivered']);
        $this->assertDatabaseHas('orders', ['id' => $shipment->sellerOrder->order_id, 'status' => 'delivered']);
        $this->assertDatabaseMissing('orders', ['id' => $shipment->sellerOrder->order_id, 'status' => 'completed']);
        $this->assertDatabaseHas('tracking_events', [
            'shipment_id' => $shipment->id,
            'status' => 'delivered',
            'note' => 'Proof of delivery submitted.',
        ]);
        $this->assertDatabaseHas('notifications', ['user_id' => $shipment->sellerOrder->order->buyer_id, 'title' => 'Order delivered']);
        $this->assertDatabaseHas('notifications', ['user_id' => $shipment->sellerOrder->seller->user_id, 'title' => 'Order delivered successfully']);
        $response->assertJsonMissingPath('data.proof_of_delivery.file_path');
    }

    public function test_deliver_rejects_invalid_status_and_wrong_or_suspended_courier_without_storing_file(): void
    {
        Storage::fake('r2');
        $courierA = $this->courier('owner');
        $courierB = $this->courier('other');
        $ready = $this->delivery($courierA, 'ready', 'READY');
        $out = $this->delivery($courierA, 'out-for-delivery', 'WRONG');
        $image = fn () => $this->proofImage();

        $this->actingAs($courierA->user)->post("/api/courier/deliveries/{$ready->id}/deliver", ['proof_image' => $image()], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonPath('code', 'invalid_delivery_transition');
        $this->actingAs($courierB->user)->post("/api/courier/deliveries/{$out->id}/deliver", ['proof_image' => $image()], ['Accept' => 'application/json'])
            ->assertNotFound()->assertJsonPath('code', 'shipment_not_assigned');

        $courierA->update(['active' => false, 'status' => 'suspended']);
        $this->actingAs($courierA->user)->post("/api/courier/deliveries/{$out->id}/deliver", ['proof_image' => $image()], ['Accept' => 'application/json'])
            ->assertForbidden()->assertJsonPath('code', 'rider_not_active');

        $this->assertDatabaseCount('delivery_proofs', 0);
        $this->assertSame([], Storage::disk('r2')->allFiles());
    }

    public function test_proof_validation_rejects_missing_invalid_and_oversized_files(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('validation');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'VALIDATION');
        $url = "/api/courier/deliveries/{$shipment->id}/deliver";

        $this->actingAs($courier->user)->postJson($url, [])->assertUnprocessable()->assertJsonPath('code', 'proof_of_delivery_required');
        foreach ([
            UploadedFile::fake()->create('proof.pdf', 100, 'application/pdf'),
            UploadedFile::fake()->create('proof.svg', 10, 'image/svg+xml'),
            UploadedFile::fake()->create('proof.gif', 10, 'image/gif'),
        ] as $invalid) {
            $this->actingAs($courier->user)->post($url, ['proof_image' => $invalid], ['Accept' => 'application/json'])
                ->assertUnprocessable()->assertJsonPath('code', 'invalid_delivery_proof');
        }
        $this->actingAs($courier->user)->post($url, [
            'proof_image' => $this->proofImage('large.png', 8193),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonPath('code', 'delivery_proof_too_large');

        $this->assertDatabaseCount('delivery_proofs', 0);
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'status' => 'out-for-delivery']);
    }

    public function test_storage_failure_leaves_delivery_unchanged(): void
    {
        $media = Mockery::mock(MediaStorageService::class);
        $media->shouldReceive('storePrivateFile')->once()->andThrow(new RuntimeException('private storage failed'));
        $this->app->instance(MediaStorageService::class, $media);
        $courier = $this->courier('storage-fail');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'STORAGE-FAIL');

        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage()],
            ['Accept' => 'application/json'],
        )->assertStatus(503)->assertJsonPath('code', 'delivery_proof_storage_failed');

        $this->assertDatabaseCount('delivery_proofs', 0);
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'status' => 'out-for-delivery']);
        $this->assertDatabaseMissing('tracking_events', ['shipment_id' => $shipment->id, 'status' => 'delivered']);
    }

    public function test_database_failure_after_storage_cleans_new_object(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('db-fail');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'DB-FAIL');
        DeliveryProof::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier->id,
            'storage_disk' => 'r2',
            'file_path' => 'delivery-proofs/existing.jpg',
            'original_filename' => 'existing.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 100,
            'submitted_at' => now(),
        ]);
        Storage::disk('r2')->put('delivery-proofs/existing.jpg', 'existing');
        $service = app(CourierDeliveryService::class);

        try {
            $service->deliverWithProof($shipment, $courier, $courier->user, $this->proofImage('new.png'));
            $this->fail('Expected the unique proof constraint to reject a second proof.');
        } catch (\Throwable) {
            $this->assertSame(['delivery-proofs/existing.jpg'], Storage::disk('r2')->allFiles());
        }

        $this->assertDatabaseCount('delivery_proofs', 1);
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id, 'status' => 'out-for-delivery']);
    }

    public function test_double_submission_is_idempotent_and_does_not_duplicate_side_effects(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('double');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'DOUBLE');
        $url = "/api/courier/deliveries/{$shipment->id}/deliver";

        $this->actingAs($courier->user)->post($url, ['proof_image' => $this->proofImage('first.png')], ['Accept' => 'application/json'])->assertOk();
        $events = TrackingEvent::where('shipment_id', $shipment->id)->where('status', 'delivered')->count();
        $notifications = $shipment->sellerOrder->order->buyer->marketplaceNotifications()->count()
            + $shipment->sellerOrder->seller->user->marketplaceNotifications()->count();
        $this->actingAs($courier->user)->post($url, ['proof_image' => $this->proofImage('second.png')], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.status', 'delivered');

        $this->assertDatabaseCount('delivery_proofs', 1);
        $this->assertSame(1, count(Storage::disk('r2')->allFiles()));
        $this->assertSame($events, TrackingEvent::where('shipment_id', $shipment->id)->where('status', 'delivered')->count());
        $this->assertSame($notifications, $shipment->sellerOrder->order->buyer->marketplaceNotifications()->count()
            + $shipment->sellerOrder->seller->user->marketplaceNotifications()->count());
    }

    public function test_proof_access_is_limited_to_owner_seller_delivering_courier_and_admin(): void
    {
        Storage::fake('r2');
        $courier = $this->courier('access');
        $otherCourier = $this->courier('access-other');
        $shipment = $this->delivery($courier, 'out-for-delivery', 'ACCESS');
        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage()],
            ['Accept' => 'application/json'],
        )->assertOk();
        $buyer = $shipment->sellerOrder->order->buyer;
        $seller = $shipment->sellerOrder->seller->user;
        $admin = $this->user('admin');
        $otherBuyer = $this->user('buyer');
        $otherSeller = $this->user('seller');
        $url = "/api/shipments/{$shipment->id}/proof-of-delivery";

        foreach ([$courier->user, $buyer, $seller, $admin] as $authorized) {
            $this->actingAs($authorized)->getJson($url)->assertOk()
                ->assertJsonPath('data.shipment_id', $shipment->id)
                ->assertJsonMissingPath('data.file_path')
                ->assertJsonMissingPath('data.storage_disk');
        }
        foreach ([$otherCourier->user, $otherBuyer, $otherSeller] as $unauthorized) {
            $this->actingAs($unauthorized)->getJson($url)->assertNotFound();
        }
        $this->actingAs($buyer)->get("{$url}/content", ['Accept' => 'image/*'])
            ->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->actingAs($buyer)->getJson('/api/orders/'.$shipment->sellerOrder->order->order_number)
            ->assertOk()
            ->assertJsonPath('data.seller_orders.0.shipment_id', $shipment->id)
            ->assertJsonPath('data.seller_orders.0.proof_of_delivery.exists', true);
        $this->actingAs($seller)->getJson('/api/seller/orders')
            ->assertOk()
            ->assertJsonPath('data.0.shipment_id', $shipment->id)
            ->assertJsonPath('data.0.proof_of_delivery.exists', true);
        $this->actingAs($admin)->getJson('/api/admin/orders/'.$shipment->sellerOrder->order_id)
            ->assertOk()
            ->assertJsonPath('data.seller_orders.0.shipment_id', $shipment->id)
            ->assertJsonPath('data.seller_orders.0.proof_of_delivery.exists', true);
    }

    private function user(string $role): User
    {
        return User::factory()->create(['role' => $role, 'status' => 'active', 'email_verified_at' => now()]);
    }

    private function proofImage(string $name = 'proof.png', ?int $kilobytes = null): UploadedFile
    {
        $content = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
        if ($kilobytes !== null) {
            $content = str_pad($content, $kilobytes * 1024, "\0");
        }

        return UploadedFile::fake()->createWithContent($name, $content);
    }

    private function courier(string $slug): Courier
    {
        $user = $this->user('buyer');

        return Courier::create([
            'user_id' => $user->id,
            'name' => "Courier {$slug}",
            'slug' => $slug,
            'contact_email' => $user->email,
            'active' => true,
            'status' => 'active',
            'availability_status' => 'offline',
            'vehicle_type' => 'motorcycle',
            'approved_at' => now(),
        ])->load('user');
    }

    private function delivery(Courier $courier, string $status, string $suffix): Shipment
    {
        $buyer = $this->user('buyer');
        $sellerUser = $this->user('seller');
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved', 'verified' => true]);
        $category = Category::create(['name' => "POD {$suffix}", 'slug' => strtolower("pod-{$suffix}"), 'active' => true]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => "POD Product {$suffix}",
            'slug' => strtolower("pod-product-{$suffix}"),
            'sku' => "POD-{$suffix}",
            'price' => 500,
            'status' => 'active',
            'stock_quantity' => 5,
        ]);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => "POD-ORDER-{$suffix}",
            'status' => $status,
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'currency' => 'PHP',
            'shipping_name' => "Recipient {$suffix}",
            'shipping_phone' => '+639171234567',
            'shipping_line1' => '123 Example Street',
            'shipping_city' => 'Makati City',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
            'subtotal' => 500,
            'shipping_total' => 50,
            'grand_total' => 550,
            'placed_at' => now(),
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'status' => $status,
            'subtotal' => 500,
            'shipping_fee' => 50,
            'grand_total' => 550,
            'courier_id' => $courier->id,
            'tracking_number' => "POD-TRACK-{$suffix}",
            'ready_at' => now(),
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'seller_order_id' => $sellerOrder->id,
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'unit_price' => 500,
            'quantity' => 1,
            'subtotal' => 500,
        ]);
        $shipment = Shipment::create([
            'seller_order_id' => $sellerOrder->id,
            'courier_id' => $courier->id,
            'tracking_number' => "POD-TRACK-{$suffix}",
            'driver_name' => $courier->name,
            'status' => $status,
        ]);
        TrackingEvent::create([
            'shipment_id' => $shipment->id,
            'status' => $status,
            'note' => 'POD fixture created.',
            'occurred_at' => now(),
        ]);

        return $shipment->load(['sellerOrder.order.buyer', 'sellerOrder.seller.user']);
    }
}
