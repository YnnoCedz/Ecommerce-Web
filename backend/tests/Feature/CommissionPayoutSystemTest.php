<?php

namespace Tests\Feature;

use App\Models\CommissionRate;
use App\Models\Courier;
use App\Models\Order;
use App\Models\Payout;
use App\Models\ReturnRequest;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\User;
use App\Services\CommissionService;
use App\Services\PayoutService;
use App\Support\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CommissionPayoutSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_money_and_marketplace_snapshot_are_decimal_precise_and_idempotent(): void
    {
        $this->assertSame('0.50', Money::percentage('10.01', '5.0000'));
        $this->assertSame('500.00', Money::percentage('10000.00', '5.0000'));
        $this->assertSame('-10.05', Money::decimal(Money::cents('-10.05')));
        [, $sellerOrder] = $this->completedSellerOrder('100.10', '0.10');
        $service = app(CommissionService::class);
        $first = $service->marketplace($sellerOrder);
        $second = $service->marketplace($sellerOrder);
        $this->assertSame($first->id, $second->id);
        $this->assertSame('100.00', $first->gross_amount);
        $this->assertSame('5.00', $first->commission_amount);
        $this->assertSame('95.00', $first->net_amount);
        $this->assertDatabaseCount('commission_entries', 1);
    }

    public function test_new_rate_does_not_change_historical_snapshot(): void
    {
        [, $firstOrder] = $this->completedSellerOrder('1000.00', '0.00');
        $service = app(CommissionService::class);
        $historical = $service->marketplace($firstOrder);
        CommissionRate::query()->where('commission_type', 'marketplace')->update(['effective_until' => now()]);
        CommissionRate::create(['commission_type' => 'marketplace', 'calculation_type' => 'percentage', 'percentage_rate' => '7.0000', 'fixed_amount' => '0.00', 'effective_from' => now(), 'is_active' => true]);
        [, $secondOrder] = $this->completedSellerOrder('1000.00', '0.00');
        $current = $service->marketplace($secondOrder);
        $this->assertSame('5.0000', $historical->fresh()->percentage_rate);
        $this->assertSame('50.00', $historical->fresh()->commission_amount);
        $this->assertSame('7.0000', $current->percentage_rate);
        $this->assertSame('70.00', $current->commission_amount);
    }

    public function test_zero_rate_is_explicitly_waived(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        CommissionRate::query()->where('commission_type', 'marketplace')->update(['is_active' => false]);
        CommissionRate::create(['commission_type' => 'marketplace', 'calculation_type' => 'percentage', 'percentage_rate' => '0.0000', 'fixed_amount' => '0.00', 'effective_from' => now()->subMinute(), 'is_active' => true, 'created_by' => $admin->id]);
        [, $sellerOrder] = $this->completedSellerOrder('50.00', '0.00');
        $entry = app(CommissionService::class)->marketplace($sellerOrder);
        $this->assertSame('waived', $entry->status);
        $this->assertFalse($entry->commission_taken);
        $this->assertNotNull($entry->waiver_reason);
    }

    public function test_courier_share_and_platform_delivery_commission_are_snapshotted(): void
    {
        [, $sellerOrder] = $this->completedSellerOrder('100.00', '0.00', '75.00');
        $courier = Courier::create(['name' => 'Test Courier', 'slug' => 'test-courier', 'active' => true]);
        $shipment = Shipment::create(['seller_order_id' => $sellerOrder->id, 'courier_id' => $courier->id, 'tracking_number' => 'TRACK-1', 'status' => 'delivered', 'delivered_at' => now()]);
        $entry = app(CommissionService::class)->courier($shipment);
        $this->assertSame('15.00', $entry?->commission_amount);
        $this->assertSame('60.00', $entry?->net_amount);
        $this->assertSame('80.0000', $entry?->percentage_rate);
    }

    public function test_multiple_deliveries_are_paid_once_and_cancelled_delivery_is_excluded(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $courier = Courier::create(['name' => 'Batch Courier', 'slug' => 'batch-courier', 'active' => true]);
        foreach (['100.00', '50.00'] as $index => $fee) {
            [, $sellerOrder] = $this->completedSellerOrder('20.00', '0.00', $fee);
            Shipment::create(['seller_order_id' => $sellerOrder->id, 'courier_id' => $courier->id, 'tracking_number' => 'BATCH-'.$index, 'status' => 'delivered', 'delivered_at' => now()]);
        }
        [, $cancelledOrder] = $this->completedSellerOrder('20.00', '0.00', '90.00');
        Shipment::create(['seller_order_id' => $cancelledOrder->id, 'courier_id' => $courier->id, 'tracking_number' => 'CANCELLED', 'status' => 'cancelled']);
        $service = app(PayoutService::class);
        $payout = $service->generate('courier', $courier->id, now()->subDay(), now()->addDay(), $admin);
        $this->assertCount(2, $payout->items);
        $this->assertSame('120.00', $payout->net_amount);
        $this->assertSame('30.00', $payout->commission_amount);
        $this->expectException(ValidationException::class);
        $service->generate('courier', $courier->id, now()->subDay(), now()->addDay(), $admin);
    }

    public function test_refund_creates_linked_reversal_without_mutating_original(): void
    {
        [$seller, $sellerOrder, $order] = $this->completedSellerOrder('100.00', '0.00');
        $service = app(CommissionService::class);
        $original = $service->marketplace($sellerOrder);
        $return = ReturnRequest::create(['order_id' => $order->id, 'seller_order_id' => $sellerOrder->id, 'buyer_id' => $order->buyer_id, 'seller_id' => $seller->id, 'status' => 'refunded', 'reason' => 'defective_item', 'requested_amount' => '40.00', 'refunded_amount' => '40.00', 'requested_at' => now(), 'resolved_at' => now()]);
        $reversal = $service->refund($return);
        $this->assertSame($original->id, $reversal?->reversal_of_id);
        $this->assertSame('-40.00', $reversal?->gross_amount);
        $this->assertSame('-2.00', $reversal?->commission_amount);
        $this->assertSame('-38.00', $reversal?->net_amount);
        $this->assertSame('5.00', $original->fresh()->commission_amount);
    }

    public function test_payout_generation_prevents_double_payout_and_paid_is_immutable(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        [$seller] = $this->completedSellerOrder('200.00', '0.00');
        $service = app(PayoutService::class);
        $payout = $service->generate('seller', $seller->id, now()->subDay(), now()->addDay(), $admin);
        $this->assertSame('190.00', $payout->net_amount);
        $this->assertCount(1, $payout->items);
        try {
            $service->generate('seller', $seller->id, now()->subDay(), now()->addDay(), $admin);
            $this->fail('Expected duplicate protection.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('period', $exception->errors());
        }
        foreach (['pending', 'approved', 'processing'] as $status) {
            $payout = $service->transition($payout, $status, $admin);
        }
        $payout = $service->transition($payout, 'paid', $admin, ['payment_reference' => 'BANK-123']);
        $this->assertSame('paid', $payout->status);
        $this->assertDatabaseHas('commission_entries', ['payout_id' => $payout->id, 'status' => 'taken', 'commission_taken' => true, 'taken_reference' => 'BANK-123']);
        $this->expectException(ValidationException::class);
        $service->transition($payout, 'failed', $admin);
    }

    public function test_admin_authorization_and_seller_ownership_are_enforced(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$seller] = $this->completedSellerOrder('100.00', '0.00');
        $other = Seller::factory()->create(['user_id' => User::factory()->create(['role' => 'seller'])->id, 'status' => 'approved']);
        $payout = app(PayoutService::class)->generate('seller', $seller->id, now()->subDay(), now()->addDay(), $admin);
        $this->postJson('/api/admin/payouts/generate')->assertUnauthorized();
        $this->actingAs($seller->user)->getJson('/api/admin/payouts')->assertForbidden();
        $this->actingAs($seller->user)->postJson("/api/admin/payouts/{$payout->id}/transition", ['status' => 'paid', 'payment_reference' => 'INVALID'])->assertForbidden();
        $this->actingAs($seller->user)->getJson('/api/seller/payouts')->assertOk()->assertJsonPath('data.0.id', $payout->id);
        $this->actingAs($other->user)->getJson("/api/seller/payouts/{$payout->id}")->assertNotFound();
        $this->actingAs($admin)->getJson('/api/admin/commissions')->assertOk();
        $this->actingAs($admin)->get("/api/admin/payouts/{$payout->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_exception_states_and_sensitive_rate_versioning_are_controlled(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'two_factor_enabled' => false]);
        $payout = Payout::create(['payout_number' => 'PAY-EXCEPTIONS', 'recipient_type' => 'seller', 'recipient_id' => 999, 'period_start' => now()->toDateString(), 'period_end' => now()->toDateString(), 'status' => 'draft']);
        $service = app(PayoutService::class);
        $payout = $service->transition($payout, 'pending', $admin);
        $payout = $service->transition($payout, 'withheld', $admin);
        $payout = $service->transition($payout, 'pending', $admin);
        $payout = $service->transition($payout, 'approved', $admin);
        $payout = $service->transition($payout, 'processing', $admin);
        $payout = $service->transition($payout, 'failed', $admin);
        $payout = $service->transition($payout, 'processing', $admin);
        $this->assertSame('processing', $payout->status);
        $cancelled = Payout::create(['payout_number' => 'PAY-CANCELLED', 'recipient_type' => 'courier', 'recipient_id' => 999, 'period_start' => now()->toDateString(), 'period_end' => now()->toDateString(), 'status' => 'draft']);
        $cancelled = $service->transition($cancelled, 'cancelled', $admin);
        $this->assertSame('cancelled', $cancelled->status);

        $effective = now()->addDay()->seconds(0)->toISOString();
        $this->actingAs($admin)->postJson('/api/admin/commission-rates', ['commission_type' => 'marketplace', 'calculation_type' => 'percentage', 'percentage_rate' => '6.2500', 'fixed_amount' => '0.00', 'effective_from' => $effective, 'current_password' => 'wrong'])->assertUnprocessable();
        $this->actingAs($admin)->postJson('/api/admin/commission-rates', ['commission_type' => 'marketplace', 'calculation_type' => 'percentage', 'percentage_rate' => '6.2500', 'fixed_amount' => '0.00', 'effective_from' => $effective, 'current_password' => 'password'])->assertCreated()->assertJsonPath('data.percentage_rate', '6.2500');
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'commission.rate.changed', 'user_id' => $admin->id]);
    }

    private function completedSellerOrder(string $subtotal, string $discount, string $shipping = '0.00'): array
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = Seller::factory()->create(['user_id' => User::factory()->create(['role' => 'seller', 'status' => 'active'])->id, 'status' => 'approved']);
        $order = Order::create(['buyer_id' => $buyer->id, 'order_number' => 'PAY-'.strtoupper(bin2hex(random_bytes(4))), 'status' => 'completed', 'payment_status' => 'paid', 'payment_method' => 'card', 'shipping_name' => 'Buyer', 'shipping_phone' => '+639171234567', 'shipping_line1' => 'Street', 'shipping_city' => 'Makati', 'shipping_province' => 'Metro Manila', 'shipping_postal_code' => '1200', 'grand_total' => $subtotal, 'placed_at' => now(), 'completed_at' => now()]);
        $sellerOrder = SellerOrder::create(['order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'completed', 'subtotal' => $subtotal, 'discount_total' => $discount, 'shipping_fee' => $shipping, 'grand_total' => $subtotal, 'completed_at' => now()]);

        return [$seller, $sellerOrder, $order];
    }
}
