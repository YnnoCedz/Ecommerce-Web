<?php

namespace App\Http\Resources;

use App\Services\CourierDeliveryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourierDeliveryListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sellerOrder = $this->sellerOrder;
        $seller = $sellerOrder?->seller;
        $order = $sellerOrder?->order;
        $pickupSummary = $this->pickupSummary($sellerOrder, $seller);

        return [
            'id' => $this->id,
            'tracking_number' => $this->tracking_number,
            'status' => $this->status,
            'allowed_transitions' => CourierDeliveryService::allowedTransitionsFor($this->status),
            'seller' => [
                'name' => $seller?->trade_name ?: $seller?->business_name,
                'pickup_summary' => $pickupSummary,
            ],
            'recipient' => [
                'name' => $order?->shipping_name,
                'delivery_summary' => trim(implode(', ', array_filter([$order?->shipping_city, $order?->shipping_province, $order?->shipping_postal_code]))),
            ],
            'package' => [
                'item_count' => (int) ($this->items_sum_quantity ?? 0),
            ],
            'delivery' => [
                'shipping_fee' => $sellerOrder?->shipping_fee === null ? null : (string) $sellerOrder->shipping_fee,
                'assigned_at' => optional($this->updated_at)->toISOString(),
                'expected_delivery_at' => optional($this->expected_delivery_at)->toISOString(),
                'delivered_at' => optional($this->delivered_at)->toISOString(),
            ],
        ];
    }

    private function pickupSummary($sellerOrder, $seller): string
    {
        if ($this->currentHub) {
            return trim(implode(', ', array_filter([$this->currentHub->name, $this->currentHub->city_label, $this->currentHub->province_label])));
        }
        if ($this->hub_received_at) {
            $events = $this->trackingEvents->sortByDesc('id');
            $event = $events->first(fn ($event) => $event->status === 'picked-up' && filled($event->location))
                ?? $events->first(fn ($event) => $event->actor_type === 'logistics_staff' && filled($event->location));

            return (string) ($event?->location ?: 'Logistics hub pickup');
        }
        if ($sellerOrder?->pickup_address_line1) {
            return trim(implode(', ', array_filter([$sellerOrder->pickup_city_label, $sellerOrder->pickup_province_label])));
        }

        return trim(implode(', ', array_filter([$seller?->city, $seller?->province])));
    }
}
