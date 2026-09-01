<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Review;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MarketplaceResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_simulated_payment_uses_backend_total_and_order_image_is_snapshotted(): void
    {
        Storage::fake('r2');
        [$buyer, $seller, $product, $address, $cartItem] = $this->checkoutFixture(1200, 2);
        Storage::disk('r2')->put('products/original.jpg', 'original-image');
        ProductImage::create(['product_id' => $product->id, 'storage_disk' => 'r2', 'file_path' => 'products/original.jpg', 'sort_order' => 0, 'is_primary' => true]);

        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'gcash',
            'mode' => 'cart', 'cart_item_ids' => [$cartItem->id],
            'payment_details' => ['mobile_number' => '+639171234567'],
        ])->assertCreated()->assertJsonPath('data.payment_status', 'paid')->assertJsonPath('data.payment.provider', 'simulated');

        $this->assertSame(2400.0, (float) $response->json('data.grand_total'));
        $this->assertDatabaseHas('payments', ['order_id' => $response->json('data.id'), 'amount' => 2400, 'status' => 'paid', 'provider' => 'simulated']);
        $snapshot = Order::findOrFail($response->json('data.id'))->items()->firstOrFail()->product_image_storage_path;
        $this->assertNotSame('products/original.jpg', $snapshot);
        Storage::disk('r2')->delete('products/original.jpg');
        $this->assertTrue(Storage::disk('r2')->exists($snapshot));
    }

    public function test_failed_simulated_payment_is_persisted_and_retry_preserves_attempts(): void
    {
        config()->set('payments.simulated.outcome', 'failure');
        [$buyer, , , $address, $cartItem] = $this->checkoutFixture();
        $response = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'maya',
            'mode' => 'cart', 'cart_item_ids' => [$cartItem->id],
            'payment_details' => ['mobile_number' => '+639171234567'],
        ])->assertCreated()->assertJsonPath('data.payment_status', 'failed');

        config()->set('payments.simulated.outcome', 'success');
        $this->actingAs($buyer)->postJson('/api/orders/'.$response->json('data.order_number').'/payments/retry')
            ->assertCreated()->assertJsonPath('data.status', 'paid');
        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('orders', ['id' => $response->json('data.id'), 'payment_status' => 'paid']);
    }

    public function test_cancellation_restores_inventory_once_and_creates_partial_refund(): void
    {
        [$buyer, , $product, $address, $cartItem] = $this->checkoutFixture(1000, 2);
        $checkout = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'gcash',
            'mode' => 'cart', 'cart_item_ids' => [$cartItem->id],
            'payment_details' => ['mobile_number' => '+639171234567'],
        ])->assertCreated();
        $order = Order::with('sellerOrders')->findOrFail($checkout->json('data.id'));
        $sellerOrder = $order->sellerOrders->first();

        $url = "/api/orders/{$order->order_number}/seller-orders/{$sellerOrder->id}/cancel";
        $this->actingAs($buyer)->postJson($url, ['reason' => 'I ordered the wrong quantity.'])->assertCreated();
        $this->actingAs($buyer)->postJson($url, ['reason' => 'I ordered the wrong quantity.'])->assertCreated();

        $this->assertDatabaseCount('order_cancellations', 1);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 10]);
        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('payments', ['type' => 'refund', 'amount' => $sellerOrder->grand_total, 'status' => 'refunded']);
    }

    public function test_return_partial_refund_and_dispute_are_seller_scoped(): void
    {
        [$buyer, $seller, , $address, $cartItem] = $this->checkoutFixture(800, 2);
        $checkout = $this->actingAs($buyer)->postJson('/api/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'card',
            'mode' => 'cart', 'cart_item_ids' => [$cartItem->id],
            'payment_details' => ['cardholder_name' => 'Buyer Test', 'card_last4' => '4242', 'card_brand' => 'Visa'],
        ])->assertCreated();
        $order = Order::with(['sellerOrders', 'items'])->findOrFail($checkout->json('data.id'));
        $sellerOrder = $order->sellerOrders->first();
        $sellerOrder->update(['status' => 'delivered', 'delivered_at' => now()]);
        $item = $order->items->first();

        $return = $this->actingAs($buyer)->postJson("/api/orders/{$order->order_number}/seller-orders/{$sellerOrder->id}/returns", [
            'reason' => 'damaged_item',
            'buyer_statement' => 'The first unit arrived damaged.',
            'items' => [['order_item_id' => $item->id, 'quantity' => 1]],
        ])->assertCreated();
        $returnId = $return->json('data.id');

        $this->actingAs($buyer)->postJson("/api/returns/{$returnId}/dispute", ['reason' => 'Need admin help'])->assertCreated();
        $sellerUser = $seller->user;
        foreach (['approved', 'return_in_transit', 'received', 'refunded'] as $status) {
            $this->actingAs($sellerUser)->patchJson("/api/seller/returns/{$returnId}", ['status' => $status])->assertOk();
        }

        $this->assertDatabaseHas('return_requests', ['id' => $returnId, 'status' => 'refunded', 'refunded_amount' => 800]);
        $this->assertDatabaseHas('payments', ['type' => 'refund', 'amount' => 800, 'status' => 'refunded']);
        $this->assertDatabaseHas('disputes', ['return_request_id' => $returnId, 'status' => 'open']);
    }

    public function test_context_conversations_attachments_and_seller_review_reply_are_persisted(): void
    {
        Storage::fake('r2');
        [$buyer, $seller, $product] = $this->checkoutFixture();
        $payload = ['seller_id' => $seller->id, 'product_id' => $product->id];
        $first = $this->actingAs($buyer)->postJson('/api/messages/conversations', $payload)->assertCreated();
        $second = $this->actingAs($buyer)->postJson('/api/messages/conversations', $payload)->assertOk();
        $this->assertSame($first->json('data.id'), $second->json('data.id'));

        $this->actingAs($buyer)->post('/api/messages/'.$first->json('data.id'), [
            'body' => 'Please check the attached file.',
            'attachments' => [UploadedFile::fake()->create('sample.jpg', 10, 'image/jpeg')],
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonCount(1, 'data.attachments');
        $this->assertDatabaseCount('message_attachments', 1);

        $review = Review::create(['user_id' => $buyer->id, 'seller_id' => $seller->id, 'product_id' => $product->id, 'rating' => 5, 'status' => 'approved', 'submitted_at' => now()]);
        $this->actingAs($seller->user)->getJson('/api/seller/reviews')->assertOk()->assertJsonPath('data.0.id', $review->id);
        $this->actingAs($seller->user)->postJson("/api/seller/reviews/{$review->id}/reply", ['body' => 'Thank you for your review.'])->assertOk();
        $this->assertDatabaseHas('review_replies', ['review_id' => $review->id, 'body' => 'Thank you for your review.']);
    }

    private function checkoutFixture(float $price = 1000, int $quantity = 1): array
    {
        $buyer = User::factory()->create();
        $sellerUser = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved']);
        $category = Category::create(['name' => 'Resolution tests', 'slug' => 'resolution-'.str()->random(8), 'active' => true]);
        $product = Product::create(['seller_id' => $seller->id, 'category_id' => $category->id, 'name' => 'Resolution product', 'slug' => 'resolution-'.str()->random(8), 'sku' => 'RES-'.str()->random(8), 'price' => $price, 'status' => 'active', 'track_inventory' => true, 'stock_quantity' => 10, 'published_at' => now()]);
        $address = Address::create(['user_id' => $buyer->id, 'label' => 'Home', 'recipient_name' => 'Buyer Test', 'phone' => '+639171234567', 'line1' => '10 Test Street', 'city' => 'Makati', 'province' => 'Metro Manila', 'postal_code' => '1200', 'is_default' => true]);
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        $cartItem = CartItem::create(['cart_id' => $cart->id, 'seller_id' => $seller->id, 'product_id' => $product->id, 'quantity' => $quantity, 'unit_price' => $price, 'line_total' => $price * $quantity, 'saved_for_later' => false]);

        return [$buyer, $seller, $product, $address, $cartItem];
    }
}
