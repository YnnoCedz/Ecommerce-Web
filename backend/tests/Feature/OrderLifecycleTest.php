<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Courier;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_admin_and_buyer_complete_the_authorized_order_lifecycle_before_reviewing(): void
    {
        Storage::fake('r2');
        [$buyer, $sellerUser, $sellerOrder, $item] = $this->orderPortion('LIFECYCLE-1');
        $otherSeller = $this->approvedSeller('other-lifecycle-seller');
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $courier = $this->courier('lifecycle-courier');

        $this->actingAs($sellerUser)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", [
            'status' => 'delivered',
        ])->assertUnprocessable();

        $this->actingAs($otherSeller->user)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", [
            'status' => 'confirmed',
        ])->assertNotFound();

        foreach (['confirmed', 'preparing', 'ready'] as $status) {
            $this->actingAs($sellerUser)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", [
                'status' => $status,
            ])->assertOk()->assertJsonPath('data.status', $status);
        }

        $this->actingAs($sellerUser)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", ['status' => 'in-transit'])
            ->assertUnprocessable();
        $this->actingAs($buyer)->patchJson("/api/admin/seller-orders/{$sellerOrder->id}/delivery-status", ['status' => 'picked-up'])
            ->assertForbidden();
        $this->actingAs($admin)->patchJson("/api/admin/seller-orders/{$sellerOrder->id}/delivery-status", ['status' => 'delivered'])
            ->assertUnprocessable();

        $shipment = $sellerOrder->fresh()->shipment;
        $this->actingAs($admin)->patchJson("/api/admin/shipments/{$shipment->id}/courier", ['courier_id' => $courier->id])->assertOk();
        foreach (['picked-up', 'in-transit', 'out-for-delivery'] as $status) {
            $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", [
                'status' => $status,
            ])->assertOk()->assertJsonPath('data.status', $status);
        }
        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage('lifecycle.png')],
            ['Accept' => 'application/json'],
        )->assertOk()->assertJsonPath('data.status', 'delivered');

        $this->assertDatabaseHas('shipments', [
            'seller_order_id' => $sellerOrder->id,
            'status' => 'delivered',
        ]);
        $this->assertDatabaseCount('tracking_events', 6);
        $this->assertDatabaseHas('shipments', ['seller_order_id' => $sellerOrder->id, 'courier_id' => $courier->id]);
        $this->assertDatabaseHas('tracking_events', ['status' => 'out-for-delivery', 'actor_type' => 'courier', 'actor_user_id' => $courier->user_id]);
        $this->assertDatabaseHas('orders', [
            'id' => $sellerOrder->order_id,
            'status' => 'delivered',
            'payment_status' => 'paid',
        ]);

        $otherBuyer = User::factory()->create();
        $this->actingAs($otherBuyer)->postJson("/api/orders/LIFECYCLE-1/seller-orders/{$sellerOrder->id}/complete")
            ->assertNotFound();

        $this->actingAs($buyer)->getJson('/api/orders/LIFECYCLE-1')
            ->assertOk()
            ->assertJsonPath('data.seller_orders.0.can_mark_received', true);

        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 5,
        ])->assertUnprocessable();

        $this->actingAs($buyer)->postJson("/api/orders/LIFECYCLE-1/seller-orders/{$sellerOrder->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.order_status', 'completed');

        $this->assertNotNull($sellerOrder->fresh()->completed_at);
        $this->assertNotNull($sellerOrder->order->fresh()->completed_at);

        $this->actingAs($buyer)->getJson('/api/reviews/eligible')
            ->assertOk()
            ->assertJsonPath('data.0.order_item_id', $item->id);

        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 0,
        ])->assertUnprocessable();
        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 6,
        ])->assertUnprocessable();

        $reviewResponse = $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 5,
        ])->assertCreated()->assertJsonPath('data.verified_purchase', true);
        $reviewId = $reviewResponse->json('data.id');

        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 4,
        ])->assertConflict();

        $this->actingAs($otherSeller->user)->postJson("/api/seller/reviews/{$reviewId}/reply", [
            'body' => 'Not this seller review.',
        ])->assertNotFound();
        $this->actingAs($sellerUser)->postJson("/api/seller/reviews/{$reviewId}/reply", [
            'body' => 'Thank you for your feedback.',
        ])->assertOk()->assertJsonPath('data.review_id', $reviewId);

        $this->getJson('/api/products/'.$item->product_slug.'/reviews')
            ->assertOk()
            ->assertJsonPath('data.0.id', $reviewId)
            ->assertJsonPath('data.0.verified_purchase', true)
            ->assertJsonPath('data.0.seller_reply.body', 'Thank you for your feedback.');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'title' => 'Order status updated',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $sellerUser->id,
            'title' => 'New product review',
        ]);
    }

    public function test_multi_seller_portions_complete_and_become_reviewable_independently(): void
    {
        Storage::fake('r2');
        [$buyer, $firstSellerUser, $firstSellerOrder, $firstItem] = $this->orderPortion('MULTI-1');
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $courier = $this->courier('multi-courier');
        $order = $firstSellerOrder->order;
        $secondSeller = $this->approvedSeller('second-multi-seller');
        $secondProduct = $this->productFor($secondSeller, 'second-multi-product');
        $secondSellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $secondSeller->id,
            'status' => 'pending',
        ]);
        $secondItem = OrderItem::create([
            'order_id' => $order->id,
            'seller_order_id' => $secondSellerOrder->id,
            'seller_id' => $secondSeller->id,
            'product_id' => $secondProduct->id,
            'product_name' => $secondProduct->name,
            'product_slug' => $secondProduct->slug,
            'sku' => $secondProduct->sku,
            'unit_price' => 500,
            'quantity' => 1,
            'subtotal' => 500,
        ]);

        foreach (['confirmed', 'preparing', 'ready'] as $status) {
            $this->actingAs($firstSellerUser)->patchJson("/api/seller/orders/{$firstSellerOrder->id}/status", ['status' => $status])->assertOk();
        }
        $shipment = $firstSellerOrder->fresh()->shipment;
        $this->actingAs($admin)->patchJson("/api/admin/shipments/{$shipment->id}/courier", ['courier_id' => $courier->id])->assertOk();
        foreach (['picked-up', 'in-transit', 'out-for-delivery'] as $status) {
            $this->actingAs($courier->user)->patchJson("/api/courier/deliveries/{$shipment->id}/status", ['status' => $status])->assertOk();
        }
        $this->actingAs($courier->user)->post(
            "/api/courier/deliveries/{$shipment->id}/deliver",
            ['proof_image' => $this->proofImage('multi.png')],
            ['Accept' => 'application/json'],
        )->assertOk();
        $this->actingAs($buyer)->postJson("/api/orders/MULTI-1/seller-orders/{$firstSellerOrder->id}/complete")->assertOk();

        $eligible = $this->actingAs($buyer)->getJson('/api/reviews/eligible')->assertOk();
        $this->assertSame([$firstItem->id], collect($eligible->json('data'))->pluck('order_item_id')->all());

        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $secondItem->id,
            'rating' => 5,
        ])->assertUnprocessable();
        $this->assertDatabaseHas('seller_orders', ['id' => $secondSellerOrder->id, 'status' => 'pending']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
    }

    public function test_admin_delivery_api_is_real_filtered_idempotent_and_visible_to_buyer_and_seller(): void
    {
        [$buyer, $sellerUser, $sellerOrder] = $this->orderPortion('ADMIN-DELIVERY-1');
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        foreach (['confirmed', 'preparing', 'ready'] as $status) {
            $this->actingAs($sellerUser)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", ['status' => $status])->assertOk();
        }

        $this->actingAs($sellerUser)->getJson('/api/admin/orders')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/admin/orders?status=ready')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', 'ADMIN-DELIVERY-1')
            ->assertJsonPath('data.0.seller_orders.0.next_delivery_status', 'picked-up')
            ->assertJsonPath('data.0.seller_orders.0.delivery_handler', 'Maketo Logistics')
            ->assertJsonPath('data.0.seller_orders.0.courier_id', null)
            ->assertJsonPath('data.0.seller_orders.0.tracking_events.0.status', 'ready');

        $this->actingAs($admin)->patchJson("/api/admin/seller-orders/{$sellerOrder->id}/delivery-status", ['status' => 'picked-up'])
            ->assertOk()
            ->assertJsonPath('data.status', 'picked-up')
            ->assertJsonPath('data.seller_orders.0.status', 'picked-up');
        $this->actingAs($admin)->patchJson("/api/admin/seller-orders/{$sellerOrder->id}/delivery-status", ['status' => 'picked-up'])
            ->assertUnprocessable();

        $this->assertDatabaseCount('tracking_events', 2);
        $this->actingAs($sellerUser)->getJson('/api/seller/orders')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'picked-up')
            ->assertJsonPath('data.0.courier.name', 'Maketo Logistics');
        $this->actingAs($buyer)->getJson('/api/orders/ADMIN-DELIVERY-1')
            ->assertOk()
            ->assertJsonPath('data.status', 'picked-up')
            ->assertJsonPath('data.seller_orders.0.courier_name', 'Maketo Logistics')
            ->assertJsonPath('data.seller_orders.0.tracking_events.0.status', 'picked-up');
    }

    private function orderPortion(string $orderNumber): array
    {
        $buyer = User::factory()->create(['role' => 'customer', 'status' => 'active']);
        $seller = $this->approvedSeller(strtolower($orderNumber).'-seller');
        $product = $this->productFor($seller, strtolower($orderNumber).'-product');
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => $orderNumber,
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'shipping_name' => 'Lifecycle Buyer',
            'shipping_phone' => '+639171234567',
            'shipping_line1' => '10 Lifecycle Street',
            'shipping_city' => 'Makati',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
            'grand_total' => 500,
            'placed_at' => now(),
        ]);
        Payment::create([
            'order_id' => $order->id,
            'method' => 'cod',
            'status' => 'pending',
            'amount' => 500,
            'currency' => 'PHP',
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'status' => 'pending',
            'grand_total' => 500,
        ]);
        $item = OrderItem::create([
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

        return [$buyer, $seller->user, $sellerOrder, $item];
    }

    private function courier(string $slug): Courier
    {
        $user = User::factory()->create(['role' => 'buyer', 'status' => 'active', 'email_verified_at' => now()]);

        return Courier::create([
            'user_id' => $user->id,
            'name' => "Courier {$slug}",
            'slug' => $slug,
            'contact_email' => $user->email,
            'active' => true,
            'status' => 'active',
            'availability_status' => 'offline',
            'approved_at' => now(),
        ])->load('user');
    }

    private function proofImage(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true),
        );
    }

    private function approvedSeller(string $slug): Seller
    {
        $user = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        return Seller::factory()->create([
            'user_id' => $user->id,
            'slug' => $slug,
            'status' => 'approved',
        ]);
    }

    private function productFor(Seller $seller, string $slug): Product
    {
        $category = Category::create([
            'name' => str($slug)->headline(),
            'slug' => $slug.'-category',
            'active' => true,
        ]);

        return Product::create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => str($slug)->headline(),
            'slug' => $slug,
            'sku' => strtoupper($slug),
            'price' => 500,
            'status' => 'active',
            'track_inventory' => true,
            'stock_quantity' => 5,
            'published_at' => now(),
        ]);
    }
}
