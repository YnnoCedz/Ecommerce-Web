<?php

namespace App\Services;

use App\Models\CommissionEntry;
use App\Models\CommissionRate;
use App\Models\ReturnRequest;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Support\Money;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

class CommissionService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function marketplace(SellerOrder $sellerOrder): CommissionEntry
    {
        $sellerOrder->loadMissing('order');
        $gross = Money::decimal(max(0, Money::cents((string) ($sellerOrder->subtotal ?? '0.00')) - Money::cents((string) ($sellerOrder->discount_total ?? '0.00'))));

        return $this->snapshot('marketplace', 'seller_order', $sellerOrder->id, 'seller', $sellerOrder->seller_id, $gross, $sellerOrder->completed_at ?? now());
    }

    public function courier(Shipment $shipment): ?CommissionEntry
    {
        $shipment->loadMissing('sellerOrder');
        if (! $shipment->courier_id || ! $shipment->sellerOrder) {
            return null;
        }
        $fee = (string) ($shipment->sellerOrder->shipping_fee ?? '0.00');
        $rate = $this->rate('courier_delivery', $shipment->delivered_at ?? now());
        $courierShare = $this->calculate($fee, $rate);
        $platformRetained = Money::decimal(max(0, Money::cents($fee) - Money::cents($courierShare)));

        $entry = CommissionEntry::query()->firstOrCreate(
            ['source_key' => "courier_delivery:shipment:{$shipment->id}"],
            $this->attributes($rate, 'courier_delivery', 'shipment', $shipment->id, 'courier', $shipment->courier_id, $fee, $platformRetained, $courierShare),
        );
        $this->logCreated($entry);

        return $entry;
    }

    public function refund(ReturnRequest $return): ?CommissionEntry
    {
        if (Money::cents($return->refunded_amount) <= 0) {
            return null;
        }
        $return->loadMissing('sellerOrder');
        if (! $return->sellerOrder) {
            return null;
        }
        $original = $this->marketplace($return->sellerOrder);
        $originalGross = max(1, Money::cents($original->gross_amount));
        $refundCents = min(Money::cents($return->refunded_amount), $originalGross);
        $commissionCents = intdiv((Money::cents($original->commission_amount) * $refundCents) + intdiv($originalGross, 2), $originalGross);

        $entry = CommissionEntry::query()->firstOrCreate(
            ['source_key' => "marketplace:return_request:{$return->id}:reversal"],
            [
                'reference' => $this->reference('REV'), 'commission_type' => 'marketplace', 'source_type' => 'return_request', 'source_id' => $return->id,
                'recipient_type' => 'seller', 'recipient_id' => $return->seller_id, 'rate_id' => $original->rate_id,
                'gross_amount' => Money::decimal(-$refundCents), 'calculation_type' => $original->calculation_type,
                'percentage_rate' => $original->percentage_rate, 'fixed_amount' => '0.00',
                'commission_amount' => Money::decimal(-$commissionCents), 'net_amount' => Money::decimal(-$refundCents + $commissionCents),
                'status' => 'reversed', 'commission_taken' => false, 'reversal_of_id' => $original->id, 'reversed_at' => now(),
                'metadata' => ['return_status' => $return->status],
            ],
        );
        if ($entry->wasRecentlyCreated) {
            $this->activity->log('commission.reversed', 'financial', 'Commission reversal recorded.', null, null, $entry, ['reference' => $entry->reference, 'reversal_of_id' => $original->id, 'commission_amount' => $entry->commission_amount]);
        }

        return $entry;
    }

    public function rate(string $type, CarbonInterface $at): CommissionRate
    {
        $rate = CommissionRate::query()->where('commission_type', $type)->where('is_active', true)
            ->where('effective_from', '<=', $at)->where(fn ($query) => $query->whereNull('effective_until')->orWhere('effective_until', '>', $at))
            ->latest('effective_from')->latest('id')->first();
        if (! $rate) {
            throw ValidationException::withMessages(['commission_rate' => ["No effective {$type} commission rate is configured."]]);
        }

        return $rate;
    }

    private function snapshot(string $type, string $sourceType, int $sourceId, string $recipientType, int $recipientId, string $gross, CarbonInterface $at): CommissionEntry
    {
        $key = "{$type}:{$sourceType}:{$sourceId}";
        if ($existing = CommissionEntry::query()->where('source_key', $key)->first()) {
            return $existing;
        }
        $rate = $this->rate($type, $at);
        $commission = $this->calculate($gross, $rate);
        $net = Money::decimal(Money::cents($gross) - Money::cents($commission));

        $entry = CommissionEntry::query()->firstOrCreate(['source_key' => $key], $this->attributes($rate, $type, $sourceType, $sourceId, $recipientType, $recipientId, $gross, $commission, $net));
        $this->logCreated($entry);

        return $entry;
    }

    private function calculate(string $gross, CommissionRate $rate): string
    {
        $percentage = in_array($rate->calculation_type, ['percentage', 'hybrid'], true) ? Money::percentage($gross, (string) ($rate->percentage_rate ?? '0')) : '0.00';
        $fixed = in_array($rate->calculation_type, ['fixed', 'hybrid'], true) ? (string) $rate->fixed_amount : '0.00';

        return Money::decimal(Money::cents($percentage) + Money::cents($fixed));
    }

    private function attributes(CommissionRate $rate, string $type, string $sourceType, int $sourceId, string $recipientType, int $recipientId, string $gross, string $commission, string $net): array
    {
        $zero = Money::cents($commission) === 0;

        return ['reference' => $this->reference('COM'), 'commission_type' => $type, 'source_type' => $sourceType, 'source_id' => $sourceId,
            'recipient_type' => $recipientType, 'recipient_id' => $recipientId, 'rate_id' => $rate->id, 'gross_amount' => $gross,
            'calculation_type' => $rate->calculation_type, 'percentage_rate' => $rate->percentage_rate, 'fixed_amount' => $rate->fixed_amount,
            'commission_amount' => $commission, 'net_amount' => $net, 'status' => $zero ? 'waived' : 'pending', 'commission_taken' => false,
            'waiver_reason' => $zero ? 'Effective configured rate produced zero commission.' : null];
    }

    private function reference(string $prefix): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.strtoupper(bin2hex(random_bytes(3)));
    }

    private function logCreated(CommissionEntry $entry): void
    {
        if (! $entry->wasRecentlyCreated) {
            return;
        }
        $event = $entry->status === 'waived' ? 'commission.waived' : 'commission.calculated';
        $this->activity->log($event, 'financial', $entry->status === 'waived' ? 'Commission explicitly waived.' : 'Commission calculated and pending collection.', null, null, $entry, ['reference' => $entry->reference, 'commission_type' => $entry->commission_type, 'commission_amount' => $entry->commission_amount]);
    }
}
