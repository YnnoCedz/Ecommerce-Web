<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Dispute;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\ReturnRequestItem;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminModerationDisputeTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_is_persisted_listed_and_moderated_with_private_attachment(): void
    {
        Storage::fake('r2');
        $buyer = User::factory()->create();
        $seller = Seller::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $created = $this->actingAs($buyer)->post('/api/reports', [
            'target_type' => 'seller',
            'target_id' => $seller->id,
            'reason' => 'fraud',
            'description' => 'The seller requested payment outside the marketplace.',
            'attachments' => [UploadedFile::fake()->create('proof.jpg', 10, 'image/jpeg')],
        ], ['Accept' => 'application/json']);

        $created->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.target_id', $seller->id)
            ->assertJsonPath('data.attachment_count', 1);
        $reportId = $created->json('data.id');

        $this->assertDatabaseHas('reports', [
            'id' => $reportId,
            'reporter_user_id' => $buyer->id,
            'target_type' => 'seller',
            'target_id' => $seller->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('report_attachments', 1);
        $path = (string) \DB::table('report_attachments')->value('file_path');
        Storage::disk('r2')->assertExists($path);

        $this->actingAs($admin)->getJson('/api/admin/reports')
            ->assertOk()
            ->assertJsonPath('data.0.id', $reportId)
            ->assertJsonPath('meta.pending_count', 1);

        $this->actingAs($admin)->getJson("/api/admin/reports/{$reportId}")
            ->assertOk()
            ->assertJsonCount(1, 'data.attachments');

        $this->actingAs($admin)->patchJson("/api/admin/reports/{$reportId}", [
            'status' => 'resolved',
            'moderation_notes' => 'Evidence reviewed and the seller was referred for account action.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.resolved_by.id', $admin->id);

        $this->assertDatabaseHas('reports', [
            'id' => $reportId,
            'status' => 'resolved',
            'resolved_by' => $admin->id,
            'moderation_notes' => 'Evidence reviewed and the seller was referred for account action.',
        ]);
        $this->assertDatabaseHas('notifications', ['user_id' => $buyer->id, 'title' => 'Report reviewed']);
    }

    public function test_admin_report_access_rejects_guests_buyers_and_sellers(): void
    {
        $this->getJson('/api/admin/reports')->assertUnauthorized();

        foreach (['buyer', 'seller'] as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->actingAs($user)->getJson('/api/admin/reports')->assertForbidden();
        }
    }

    public function test_admin_can_list_and_view_complete_dispute_context(): void
    {
        [$admin, , , $dispute] = $this->disputeFixture();

        $this->actingAs($admin)->getJson('/api/admin/disputes')
            ->assertOk()
            ->assertJsonPath('data.0.id', $dispute->id)
            ->assertJsonPath('meta.open_count', 1);

        $this->actingAs($admin)->getJson("/api/admin/disputes/{$dispute->id}")
            ->assertOk()
            ->assertJsonPath('data.buyer.email', $dispute->returnRequest->buyer->email)
            ->assertJsonPath('data.seller_order.id', $dispute->returnRequest->seller_order_id)
            ->assertJsonCount(1, 'data.items')
            ->assertJsonCount(1, 'data.payments')
            ->assertJsonStructure(['data' => ['return_request', 'buyer_statement', 'seller_response', 'evidence', 'payments']]);
    }

    public function test_dispute_admin_access_and_resolution_reject_unauthorized_roles(): void
    {
        [, $buyer, $sellerUser, $dispute] = $this->disputeFixture();
        $payload = ['resolution_type' => 'reject', 'resolution_notes' => 'The submitted evidence does not support the claim.'];

        $this->getJson('/api/admin/disputes')->assertUnauthorized();
        $this->actingAs($buyer)->getJson('/api/admin/disputes')->assertForbidden();
        $this->actingAs($sellerUser)->getJson("/api/admin/disputes/{$dispute->id}")->assertForbidden();
        $this->actingAs($buyer)->patchJson("/api/admin/disputes/{$dispute->id}/resolve", $payload)->assertForbidden();
        $this->actingAs($sellerUser)->patchJson("/api/admin/disputes/{$dispute->id}/resolve", $payload)->assertForbidden();
    }

    public function test_admin_full_simulated_refund_synchronizes_dispute_return_payment_and_notifications(): void
    {
        [$admin, $buyer, $sellerUser, $dispute] = $this->disputeFixture(800);

        $response = $this->actingAs($admin)->patchJson("/api/admin/disputes/{$dispute->id}/resolve", [
            'resolution_type' => 'full_refund',
            'resolution_notes' => 'Buyer evidence confirms the returned item was materially defective.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.resolution_type', 'full_refund')
            ->assertJsonPath('data.refund_amount', 800)
            ->assertJsonPath('data.return_request.status', 'refunded')
            ->assertJsonCount(2, 'data.payments');

        $this->assertSame('Buyer evidence confirms the returned item was materially defective.', $response->json('data.resolution_notes'));
        $this->assertDatabaseHas('disputes', ['id' => $dispute->id, 'resolved_by' => $admin->id, 'refund_amount' => 800]);
        $this->assertDatabaseHas('return_requests', ['id' => $dispute->return_request_id, 'status' => 'refunded', 'refunded_amount' => 800]);
        $this->assertDatabaseHas('payments', ['type' => 'refund', 'provider' => 'simulated', 'status' => 'refunded', 'amount' => 800]);
        $this->assertDatabaseHas('notifications', ['user_id' => $buyer->id, 'title' => 'Dispute resolved']);
        $this->assertDatabaseHas('notifications', ['user_id' => $sellerUser->id, 'title' => 'Dispute resolved']);
    }

    public function test_admin_partial_simulated_refund_persists_exact_amount_and_history(): void
    {
        [$admin, , , $dispute] = $this->disputeFixture(800);

        $this->actingAs($admin)->patchJson("/api/admin/disputes/{$dispute->id}/resolve", [
            'resolution_type' => 'partial_refund',
            'resolution_notes' => 'Only one of the two affected units qualifies for reimbursement.',
            'refund_amount' => 300,
        ])->assertOk()
            ->assertJsonPath('data.refund_amount', 300)
            ->assertJsonPath('data.order.payment_status', 'partially_refunded');

        $this->assertDatabaseHas('return_requests', ['id' => $dispute->return_request_id, 'status' => 'refunded', 'refunded_amount' => 300]);
        $this->assertDatabaseHas('payments', ['type' => 'refund', 'amount' => 300, 'status' => 'refunded']);
        $this->assertDatabaseHas('payments', ['type' => 'charge', 'amount' => 1000, 'refunded_amount' => 300, 'status' => 'partially_refunded']);
        $this->assertDatabaseCount('payments', 2);
    }

    public function test_admin_rejection_synchronizes_return_without_creating_refund(): void
    {
        [$admin, $buyer, $sellerUser, $dispute] = $this->disputeFixture();

        $this->actingAs($admin)->patchJson("/api/admin/disputes/{$dispute->id}/resolve", [
            'resolution_type' => 'seller_side',
            'resolution_notes' => 'Delivery and seller evidence show the fulfilled item matched the listing.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.return_request.status', 'rejected');

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('disputes', ['id' => $dispute->id, 'status' => 'rejected', 'resolution_type' => 'seller_side']);
        $this->assertDatabaseHas('return_requests', ['id' => $dispute->return_request_id, 'status' => 'rejected']);
        $this->assertDatabaseHas('notifications', ['user_id' => $buyer->id, 'title' => 'Dispute resolved']);
        $this->assertDatabaseHas('notifications', ['user_id' => $sellerUser->id, 'title' => 'Dispute resolved']);
    }

    private function disputeFixture(float $requestedAmount = 800): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved']);
        $category = Category::factory()->create();
        $product = Product::factory()->create(['seller_id' => $seller->id, 'category_id' => $category->id, 'price' => 1000]);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => 'ORD-'.str()->upper(str()->random(10)),
            'status' => 'completed',
            'payment_status' => 'paid',
            'payment_method' => 'gcash',
            'currency' => 'PHP',
            'shipping_name' => 'Buyer Test',
            'shipping_phone' => '+639171234567',
            'shipping_line1' => '10 Test Street',
            'shipping_city' => 'Makati',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
            'subtotal' => 1000,
            'grand_total' => 1000,
            'placed_at' => now(),
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'status' => 'completed',
            'subtotal' => 1000,
            'grand_total' => 1000,
        ]);
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'seller_order_id' => $sellerOrder->id,
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'unit_price' => 1000,
            'quantity' => 1,
            'subtotal' => 1000,
        ]);
        Payment::create([
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'type' => 'charge',
            'method' => 'gcash',
            'provider' => 'simulated',
            'status' => 'paid',
            'amount' => 1000,
            'currency' => 'PHP',
            'provider_reference' => 'PAY-TEST-'.str()->random(10),
            'paid_at' => now(),
            'metadata' => ['sandbox' => true],
        ]);
        $return = ReturnRequest::create([
            'order_id' => $order->id,
            'seller_order_id' => $sellerOrder->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'status' => 'under_review',
            'reason' => 'damaged_item',
            'buyer_statement' => 'The product arrived damaged and cannot be used.',
            'seller_response' => 'The parcel left our store in good condition.',
            'requested_amount' => $requestedAmount,
            'requested_at' => now(),
        ]);
        ReturnRequestItem::create([
            'return_request_id' => $return->id,
            'order_item_id' => $orderItem->id,
            'quantity' => 1,
            'unit_price' => $requestedAmount,
            'refund_amount' => $requestedAmount,
        ]);
        $dispute = Dispute::create([
            'return_request_id' => $return->id,
            'opened_by' => $buyer->id,
            'status' => 'open',
            'reason' => 'Seller rejected valid evidence',
            'buyer_statement' => 'Please review the attached photos and return request.',
            'seller_response' => 'We disagree with the requested refund.',
            'opened_at' => now(),
        ]);

        return [$admin, $buyer, $sellerUser, $dispute->load('returnRequest.buyer')];
    }
}
