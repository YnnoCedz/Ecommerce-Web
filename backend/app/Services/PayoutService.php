<?php

namespace App\Services;

use App\Models\CommissionEntry;
use App\Models\Payout;
use App\Models\PayoutItem;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\User;
use App\Support\Money;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayoutService
{
    private const TRANSITIONS = [
        'draft' => ['pending', 'cancelled'], 'pending' => ['approved', 'withheld', 'cancelled'],
        'approved' => ['processing', 'withheld', 'cancelled'], 'processing' => ['paid', 'failed'],
        'failed' => ['processing', 'cancelled'], 'withheld' => ['pending', 'cancelled'],
    ];

    public function __construct(private readonly CommissionService $commissions, private readonly ActivityLogger $activity) {}

    public function generate(string $type, int $recipientId, CarbonInterface $from, CarbonInterface $to, User $admin): Payout
    {
        return DB::transaction(function () use ($type, $recipientId, $from, $to, $admin) {
            $payout = Payout::create(['payout_number' => 'PAY-'.now()->format('YmdHis').'-'.strtoupper(bin2hex(random_bytes(3))), 'recipient_type' => $type,
                'recipient_id' => $recipientId, 'period_start' => $from->toDateString(), 'period_end' => $to->toDateString(), 'status' => 'draft']);

            if ($type === 'seller') {
                $orders = SellerOrder::query()->with('order')->where('seller_id', $recipientId)->where('status', 'completed')
                    ->whereBetween('completed_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])->lockForUpdate()->get();
                foreach ($orders as $order) {
                    if (! in_array($order->order?->payment_status, ['paid', 'partially_refunded', 'refunded'], true)) {
                        continue;
                    }
                    if (PayoutItem::query()->where('source_key', "seller_order:{$order->id}")->exists()) {
                        continue;
                    }
                    $entry = $this->commissions->marketplace($order);
                    $this->addItem($payout, "seller_order:{$order->id}", 'seller_order', $order->id, $entry, "Order {$order->order?->order_number}");
                }
                CommissionEntry::query()->where('recipient_type', 'seller')->where('recipient_id', $recipientId)->where('source_type', 'return_request')
                    ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
                    ->whereNull('payout_id')->lockForUpdate()->get()->each(fn ($entry) => $this->addItem($payout, "refund:{$entry->source_id}", 'return_request', $entry->source_id, $entry, "Refund adjustment {$entry->reference}"));
            } else {
                $shipments = Shipment::query()->with('sellerOrder.order')->where('courier_id', $recipientId)->where('status', 'delivered')
                    ->whereBetween('delivered_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])->lockForUpdate()->get();
                foreach ($shipments as $shipment) {
                    if (PayoutItem::query()->where('source_key', "shipment:{$shipment->id}")->exists()) {
                        continue;
                    }
                    $entry = $this->commissions->courier($shipment);
                    if ($entry) {
                        $this->addItem($payout, "shipment:{$shipment->id}", 'shipment', $shipment->id, $entry, "Delivery {$shipment->tracking_number}");
                    }
                }
            }
            if ($payout->items()->count() === 0) {
                $payout->delete();
                throw ValidationException::withMessages(['period' => ['No unpaid eligible items exist for this recipient and period.']]);
            }
            $this->recalculate($payout);
            $this->activity->log('payout.generated', 'financial', 'Payout generated.', $admin, request(), $payout, ['recipient_type' => $type, 'recipient_id' => $recipientId]);

            return $payout->fresh('items');
        }, 3);
    }

    public function transition(Payout $payout, string $status, User $admin, array $details = []): Payout
    {
        return DB::transaction(function () use ($payout, $status, $admin, $details) {
            $locked = Payout::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'paid') {
                throw ValidationException::withMessages(['status' => ['A paid payout is immutable.']]);
            }
            if (! in_array($status, self::TRANSITIONS[$locked->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => ["Payout cannot move from {$locked->status} to {$status}."]]);
            }
            if ($status === 'paid' && blank($details['payment_reference'] ?? null)) {
                throw ValidationException::withMessages(['payment_reference' => ['A payment reference is required.']]);
            }
            $timestamp = match ($status) {
                'pending' => 'requested_at', 'approved' => 'approved_at', 'processing' => 'processing_at', 'paid' => 'paid_at', 'failed' => 'failed_at', 'cancelled' => 'cancelled_at', default => null
            };
            $values = ['status' => $status, 'notes' => $details['notes'] ?? $locked->notes, 'payment_method' => $details['payment_method'] ?? $locked->payment_method, 'payment_reference' => $details['payment_reference'] ?? $locked->payment_reference];
            if ($timestamp) {
                $values[$timestamp] = now();
            }
            if ($status === 'approved') {
                $values['approved_by'] = $admin->id;
            }
            $locked->forceFill($values)->save();
            if ($status === 'paid') {
                CommissionEntry::query()->where('payout_id', $locked->id)->where('status', 'pending')->lockForUpdate()->get()->each(function (CommissionEntry $entry) use ($admin, $locked) {
                    $entry->update(['status' => 'taken', 'commission_taken' => true, 'taken_at' => now(), 'taken_by' => $admin->id, 'taken_reference' => $locked->payment_reference]);
                    $this->activity->log('commission.taken', 'financial', 'Commission collected through paid payout.', $admin, request(), $entry, ['reference' => $entry->reference, 'payout_number' => $locked->payout_number, 'commission_amount' => $entry->commission_amount]);
                });
            }
            $this->activity->log("payout.{$status}", 'financial', "Payout moved to {$status}.", $admin, request(), $locked, ['payout_number' => $locked->payout_number]);

            return $locked->fresh('items');
        }, 3);
    }

    private function addItem(Payout $payout, string $sourceKey, string $sourceType, int $sourceId, CommissionEntry $entry, string $description): void
    {
        $item = PayoutItem::create(['payout_id' => $payout->id, 'source_key' => $sourceKey, 'source_type' => $sourceType, 'source_id' => $sourceId,
            'commission_entry_id' => $entry->id, 'description' => $description, 'gross_amount' => $sourceType === 'return_request' ? '0.00' : $entry->gross_amount,
            'commission_amount' => $entry->commission_amount, 'adjustment_amount' => $sourceType === 'return_request' ? $entry->gross_amount : '0.00', 'net_amount' => $entry->net_amount]);
        $entry->update(['payout_id' => $payout->id]);
    }

    private function recalculate(Payout $payout): void
    {
        $gross = $commission = $adjustment = $net = 0;
        foreach ($payout->items()->get() as $item) {
            $gross += Money::cents($item->gross_amount);
            $commission += Money::cents($item->commission_amount);
            $adjustment += Money::cents($item->adjustment_amount);
            $net += Money::cents($item->net_amount);
        }
        $payout->update(['gross_amount' => Money::decimal($gross), 'commission_amount' => Money::decimal($commission), 'adjustment_amount' => Money::decimal($adjustment), 'net_amount' => Money::decimal($net)]);
    }
}
