<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_and_buyer_complete_the_authorized_order_lifecycle_before_reviewing(): void
    {
        [$buyer, $sellerUser, $sellerOrder, $item] = $this->orderPortion('LIFECYCLE-1');
        $otherSeller = $this->approvedSeller('other-lifecycle-seller');

        $this->actingAs($sellerUser)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", [
            'status' => 'delivered',
        ])->assertUnprocessable();

        $this->actingAs($otherSeller->user)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", [
            'status' => 'confirmed',
        ])->assertNotFound();

        foreach (['confirmed', 'preparing', 'ready', 'in-transit', 'delivered'] as $status) {
            $this->actingAs($sellerUser)->patchJson("/api/seller/orders/{$sellerOrder->id}/status", [
                'status' => $status,
            ])->assertOk()->assertJsonPath('data.status', $status);
        }

        $this->assertDatabaseHas('shipments', [
            'seller_order_id' => $sellerOrder->id,
            'status' => 'delivered',
        ]);
        $this->assertDatabaseCount('tracking_events', 2);
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
        [$buyer, $firstSellerUser, $firstSellerOrder, $firstItem] = $this->orderPortion('MULTI-1');
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

        foreach (['confirmed', 'preparing', 'ready', 'in-transit', 'delivered'] as $status) {
            $this->actingAs($firstSellerUser)->patchJson("/api/seller/orders/{$firstSellerOrder->id}/status", ['status' => $status])->assertOk();
        }
        $this->actingAs($buyer)->postJson("/api/orders/MULTI-1/seller-orders/{$firstSellerOrder->id}/complete")->assertOk();

        $eligible = $this->actingAs($buyer)->getJson('/api/reviews/eligible')->assertOk();
        $this->assertSame([$firstItem->id], collect($eligible->json('data'))->pluck('order_item_id')->all());

        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $secondItem->id,
            'rating' => 5,
        ])->assertUnprocessable();
        $this->assertDatabaseHas('seller_orders', ['id' => $secondSellerOrder->id, 'status' => 'pending']);
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
