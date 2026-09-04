<?php

namespace App\Http\Resources;

use App\Services\CourierDeliveryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourierDeliveryDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sellerOrder = $this->sellerOrder;
        $seller = $sellerOrder?->seller;
        $order = $sellerOrder?->order;
        $pickup = $this->pickup($sellerOrder, $seller);

        return [
            'id' => $this->id,
            'tracking_number' => $this->tracking_number,
            'status' => $this->status,
            'allowed_transitions' => CourierDeliveryService::allowedTransitionsFor($this->status),
            'pickup' => $pickup,
            'drop_off' => [
                'recipient_name' => $order?->shipping_name,
                'recipient_phone' => $order?->shipping_phone,
                'address' => trim(implode(', ', array_filter([
                    $order?->shipping_line1, $order?->shipping_line2, $order?->shipping_city,
                    $order?->shipping_province, $order?->shipping_postal_code,
                ]))),
                'delivery_note' => $order?->buyer_notes,
            ],
            'items' => $sellerOrder?->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->product_name,
                'variant' => $item->variant_name,
                'sku' => $item->sku,
                'quantity' => (int) $item->quantity,
            ])->values() ?? [],
            'delivery' => [
                'shipping_fee' => $sellerOrder?->shipping_fee === null ? null : (string) $sellerOrder->shipping_fee,
                'expected_delivery_at' => optional($this->expected_delivery_at)->toISOString(),
                'picked_up_at' => optional($this->picked_up_at)->toISOString(),
                'in_transit_at' => optional($this->in_transit_at)->toISOString(),
                'delivered_at' => optional($this->delivered_at)->toISOString(),
            ],
            'proof_of_delivery' => $this->deliveryProof ? [
                'exists' => true,
                'submitted_at' => optional($this->deliveryProof->submitted_at)->toISOString(),
                'note' => $this->deliveryProof->note,
            ] : ['exists' => false],
            'tracking_events' => $this->trackingEvents->map(fn ($event) => [
                'id' => $event->id,
                'status' => $event->status,
                'location' => $event->location,
                'note' => $event->note,
                'actor_type' => $event->actor_type,
                'occurred_at' => optional($event->occurred_at)->toISOString(),
            ])->values(),
        ];
    }

    private function pickup($sellerOrder, $seller): array
    {
        if ($this->currentHub) {
            return [
                'store_name' => $this->currentHub->name,
                'contact_name' => $this->currentHub->contact_name,
                'contact_phone' => $this->currentHub->contact_phone,
                'address' => $this->currentHub->displayAddress(),
            ];
        }

        if ($this->hub_received_at) {
            $events = $this->trackingEvents->sortByDesc('id');
            $event = $events->first(fn ($event) => $event->status === 'picked-up' && filled($event->location))
                ?? $events->first(fn ($event) => $event->actor_type === 'logistics_staff' && filled($event->location));

            return [
                'store_name' => 'Logistics hub pickup',
                'contact_name' => null,
                'contact_phone' => null,
                'address' => (string) ($event?->location ?: 'Recorded in shipment tracking history'),
            ];
        }

        if ($sellerOrder?->pickup_address_line1) {
            return [
                'store_name' => $sellerOrder->pickup_store_name,
                'contact_name' => $sellerOrder->pickup_contact_name,
                'contact_phone' => $sellerOrder->pickup_contact_phone,
                'address' => trim(implode(', ', array_filter([
                    $sellerOrder->pickup_address_line1, $sellerOrder->pickup_address_line2,
                    $sellerOrder->pickup_barangay_label, $sellerOrder->pickup_city_label,
                    $sellerOrder->pickup_province_label, $sellerOrder->pickup_postal_code,
                ]))),
            ];
        }

        return [
            'store_name' => $seller?->trade_name ?: $seller?->business_name,
            'contact_name' => $seller?->contact_name,
            'contact_phone' => $seller?->contact_phone,
            'address' => trim(implode(', ', array_filter([
                $seller?->address_line1, $seller?->address_line2, $seller?->city,
                $seller?->province, $seller?->postal_code,
            ]))),
        ];
    }
}
