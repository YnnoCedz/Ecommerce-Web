<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\DeliveryProof;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CourierDeliveryService
{
    private const TRANSITIONS = [
        'ready' => 'picked-up',
        'picked-up' => 'in-transit',
        'in-transit' => 'out-for-delivery',
        'out-for-delivery' => 'delivered',
    ];

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly CommissionService $commissions,
        private readonly ActivityLogger $activity,
        private readonly MediaStorageService $media,
    ) {}

    public static function allowedTransitionsFor(string $status): array
    {
        $next = self::TRANSITIONS[$status] ?? null;

        return $next ? [$next] : [];
    }

    public function transitionByCourier(
        Shipment $shipment,
        Courier $courier,
        User $actor,
        string $status,
        ?string $note = null,
        ?string $location = null,
    ): Shipment {
        return $this->transition(
            $shipment->seller_order_id,
            $actor,
            $status,
            'courier',
            $courier->id,
            $note,
            $location,
        );
    }

    public function transitionByAdmin(
        SellerOrder $sellerOrder,
        User $actor,
        string $status,
        ?string $reason = null,
    ): Shipment {
        return $this->transition(
            $sellerOrder->id,
            $actor,
            $status,
            'admin_logistics',
            null,
            $reason,
            null,
        );
    }

    public function deliverWithProof(
        Shipment $shipment,
        Courier $courier,
        User $actor,
        UploadedFile $proofImage,
        ?string $note = null,
    ): Shipment {
        $current = Shipment::query()->with('deliveryProof')->findOrFail($shipment->id);
        if ($current->courier_id !== $courier->id) {
            abort(404, 'This delivery is not assigned to your courier account.');
        }
        if ($current->status === 'delivered' && $current->deliveryProof) {
            return $this->freshShipment($current);
        }
        if ($current->status !== 'out-for-delivery') {
            throw ValidationException::withMessages([
                'status' => ["Delivery cannot move from {$current->status} to delivered. Refresh the delivery and try again."],
            ]);
        }

        $disk = (string) config('courier.delivery_proof_disk', 'r2');
        $stored = $this->media->storePrivateFile(
            $proofImage,
            "delivery-proofs/{$current->id}",
            $disk,
        );

        try {
            $result = DB::transaction(function () use ($current, $courier, $actor, $note, $stored) {
                $locked = Shipment::query()->with('deliveryProof')->whereKey($current->id)->lockForUpdate()->firstOrFail();
                if ($locked->courier_id !== $courier->id) {
                    abort(404, 'This delivery is not assigned to your courier account.');
                }
                if ($locked->status === 'delivered' && $locked->deliveryProof) {
                    return ['shipment' => $this->freshShipment($locked), 'stored' => false];
                }
                if ($locked->status !== 'out-for-delivery') {
                    throw ValidationException::withMessages([
                        'status' => ["Delivery cannot move from {$locked->status} to delivered. Refresh the delivery and try again."],
                    ]);
                }
                $freshCourier = $courier->fresh(['user']);
                if (! $freshCourier || ! $freshCourier->active || $freshCourier->status !== 'active' || ! $freshCourier->approved_at || $freshCourier->user?->status !== 'active') {
                    abort(403, 'This courier account is not active.');
                }

                $proof = DeliveryProof::create([
                    'shipment_id' => $locked->id,
                    'courier_id' => $courier->id,
                    'storage_disk' => $stored['storage_disk'],
                    'file_path' => $stored['storage_path'],
                    'original_filename' => $stored['original_filename'],
                    'mime_type' => $stored['mime_type'],
                    'file_size' => $stored['file_size'],
                    'note' => trim((string) $note) ?: null,
                    'submitted_at' => now(),
                ]);

                $updated = $this->transitionByCourier(
                    $locked,
                    $courier,
                    $actor,
                    'delivered',
                    'Proof of delivery submitted.',
                );
                $this->activity->log(
                    'courier.delivery.proof_submitted',
                    'delivery',
                    'Courier submitted proof of delivery.',
                    $actor,
                    null,
                    $proof,
                    ['shipment_id' => $locked->id, 'courier_id' => $courier->id],
                );

                return ['shipment' => $updated, 'stored' => true];
            }, 3);

            if (! $result['stored']) {
                $this->media->delete($stored['storage_path'], $stored['storage_disk']);
            }

            return $result['shipment'];
        } catch (\Throwable $exception) {
            $this->media->delete($stored['storage_path'], $stored['storage_disk']);

            throw $exception;
        }
    }

    private function transition(
        int $sellerOrderId,
        User $actor,
        string $status,
        string $actorType,
        ?int $requiredCourierId,
        ?string $note,
        ?string $location,
    ): Shipment {
        return DB::transaction(function () use ($sellerOrderId, $actor, $status, $actorType, $requiredCourierId, $note, $location) {
            $sellerOrder = SellerOrder::query()
                ->with(['order.buyer', 'seller.user'])
                ->whereKey($sellerOrderId)
                ->lockForUpdate()
                ->firstOrFail();

            $shipment = Shipment::query()->where('seller_order_id', $sellerOrder->id)->lockForUpdate()->first();
            if (! $shipment && $actorType === 'admin_logistics') {
                $shipment = Shipment::create([
                    'seller_order_id' => $sellerOrder->id,
                    'courier_id' => $sellerOrder->courier_id,
                    'tracking_number' => $sellerOrder->tracking_number ?: $this->trackingNumber(),
                    'status' => $sellerOrder->status,
                ]);
            }

            if (! $shipment) {
                throw ValidationException::withMessages([
                    'shipment' => ['This seller order does not have an operational shipment.'],
                ]);
            }

            if ($requiredCourierId !== null) {
                $courier = Courier::query()->with('user')->whereKey($requiredCourierId)->lockForUpdate()->first();
                if (! $courier || $shipment->courier_id !== $courier->id) {
                    abort(404, 'This delivery is not assigned to your courier account.');
                }
                if (! $courier->active || $courier->status !== 'active' || ! $courier->approved_at || $courier->user?->status !== 'active') {
                    abort(403, 'This courier account is not active.');
                }
            }

            if ($status === 'delivered' && ! DeliveryProof::query()->where('shipment_id', $shipment->id)->exists()) {
                throw ValidationException::withMessages([
                    'proof_image' => ['A proof-of-delivery image is required before completing this delivery.'],
                ]);
            }

            if ($shipment->status === $status) {
                if ($actorType === 'admin_logistics') {
                    throw ValidationException::withMessages([
                        'status' => ["Delivery is already {$status}."],
                    ]);
                }

                return $this->freshShipment($shipment);
            }

            if (in_array($sellerOrder->status, ['cancelled', 'failed', 'completed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['This delivery can no longer be updated.'],
                ]);
            }

            $expected = self::TRANSITIONS[$shipment->status] ?? null;
            if ($expected !== $status) {
                throw ValidationException::withMessages([
                    'status' => ["Delivery cannot move from {$shipment->status} to {$status}. Refresh the delivery and try again."],
                ]);
            }

            $now = now();
            $releasedHub = $status === 'picked-up' && $shipment->current_hub_id
                ? $shipment->currentHub()->first()
                : null;
            $shipment->forceFill([
                'status' => $status,
                'current_hub_id' => $status === 'picked-up' ? null : $shipment->current_hub_id,
                'picked_up_at' => $status === 'picked-up' ? ($shipment->picked_up_at ?? $now) : $shipment->picked_up_at,
                'in_transit_at' => $status === 'in-transit' ? ($shipment->in_transit_at ?? $now) : $shipment->in_transit_at,
                'delivered_at' => $status === 'delivered' ? ($shipment->delivered_at ?? $now) : $shipment->delivered_at,
            ])->save();

            $sellerOrder->forceFill([
                'courier_id' => $shipment->courier_id,
                'tracking_number' => $shipment->tracking_number,
                'status' => $status,
                'picked_up_at' => $status === 'picked-up' ? ($sellerOrder->picked_up_at ?? $now) : $sellerOrder->picked_up_at,
                'delivered_at' => $status === 'delivered' ? ($sellerOrder->delivered_at ?? $now) : $sellerOrder->delivered_at,
            ])->save();

            TrackingEvent::create([
                'shipment_id' => $shipment->id,
                'status' => $status,
                'location' => $releasedHub?->displayAddress() ?: $location,
                'note' => trim((string) $note) ?: ($releasedHub
                    ? "Package collected from {$releasedHub->name} ({$releasedHub->code}) by the assigned courier."
                    : $this->defaultNote($status)),
                'actor_type' => $actorType,
                'actor_user_id' => $actor->id,
                'occurred_at' => $now,
            ]);

            $order = $this->synchronizeOrder($sellerOrder->order_id);
            if ($status === 'delivered') {
                $this->commissions->courier($shipment);
            }
            $this->updateAvailability($shipment, $status);
            $this->notifyProgress($sellerOrder, $order, $status);

            $this->activity->log(
                $status === 'delivered' ? 'courier.delivery.delivered' : 'courier.delivery.status_updated',
                'delivery',
                'Shipment delivery status updated.',
                $actor,
                null,
                $shipment,
                [
                    'courier_id' => $shipment->courier_id,
                    'old_status' => array_search($status, self::TRANSITIONS, true) ?: null,
                    'new_status' => $status,
                    'actor_type' => $actorType,
                    'released_hub_id' => $releasedHub?->id,
                ],
            );

            return $this->freshShipment($shipment);
        }, 3);
    }

    private function synchronizeOrder(int $orderId): Order
    {
        $order = Order::query()->with(['sellerOrders', 'buyer'])->whereKey($orderId)->lockForUpdate()->firstOrFail();
        $statuses = $order->sellerOrders->pluck('status');
        $status = match (true) {
            $statuses->every(fn (string $value) => $value === 'completed') => 'completed',
            $statuses->every(fn (string $value) => in_array($value, ['delivered', 'completed'], true)) => 'delivered',
            $statuses->contains('out-for-delivery') => 'out-for-delivery',
            $statuses->contains(fn (string $value) => in_array($value, ['in-transit', 'shipped'], true)) => 'in-transit',
            $statuses->contains('picked-up') => 'picked-up',
            $statuses->contains('ready') => 'ready-for-pickup',
            $statuses->contains(fn (string $value) => in_array($value, ['confirmed', 'preparing'], true)) => 'processing',
            $statuses->every(fn (string $value) => in_array($value, ['cancelled', 'failed'], true)) => 'cancelled',
            default => 'pending',
        };
        $allDelivered = $statuses->every(fn (string $value) => in_array($value, ['delivered', 'completed'], true));

        $order->forceFill([
            'status' => $status,
            'payment_status' => $allDelivered && $order->payment_method === 'cod' ? 'paid' : $order->payment_status,
            'completed_at' => $status === 'completed' ? ($order->completed_at ?? now()) : null,
        ])->save();

        if ($allDelivered && $order->payment_method === 'cod') {
            $order->payments()->whereIn('status', ['pending', 'unpaid'])->update(['status' => 'paid', 'paid_at' => now()]);
        }

        return $order->fresh(['buyer']);
    }

    private function updateAvailability(Shipment $shipment, string $status): void
    {
        if (! $shipment->courier_id) {
            return;
        }
        $courier = Courier::query()->find($shipment->courier_id);
        if (! $courier) {
            return;
        }
        if (in_array($status, ['picked-up', 'in-transit', 'out-for-delivery'], true)) {
            $courier->update(['availability_status' => 'busy']);

            return;
        }
        if ($status === 'delivered' && $courier->availability_status === 'busy') {
            $hasActive = Shipment::query()->where('courier_id', $courier->id)->whereKeyNot($shipment->id)
                ->whereIn('status', ['picked-up', 'in-transit', 'out-for-delivery'])->exists();
            $courier->update(['availability_status' => $hasActive ? 'busy' : 'available']);
        }
    }

    private function notifyProgress(SellerOrder $sellerOrder, Order $order, string $status): void
    {
        $labels = [
            'picked-up' => ['Order picked up', 'Your order was picked up by Marketo Logistics.'],
            'in-transit' => ['Order in transit', 'Your order is in transit with Marketo Logistics.'],
            'out-for-delivery' => ['Order out for delivery', 'Your order is out for delivery.'],
            'delivered' => ['Order delivered', 'Your order has been delivered.'],
        ];
        [$title, $body] = $labels[$status];

        if ($order->buyer) {
            $this->notifications->publishToUser($order->buyer, [
                'category' => 'order', 'title' => $title, 'body' => $body,
                'action_type' => 'buyer_order', 'action_label' => 'Track order',
                'order_id' => $order->id, 'seller_order_id' => $sellerOrder->id,
            ]);
        }
        if (in_array($status, ['picked-up', 'delivered'], true) && $sellerOrder->seller?->user) {
            $this->notifications->publishToUser($sellerOrder->seller->user, [
                'category' => 'order',
                'title' => $status === 'picked-up' ? 'Order picked up' : 'Order delivered successfully',
                'body' => "Order {$order->order_number} was ".($status === 'picked-up' ? 'collected by Marketo Logistics.' : 'delivered.'),
                'action_type' => 'seller_order', 'action_label' => 'View order',
                'order_id' => $order->id, 'seller_order_id' => $sellerOrder->id,
            ]);
        }
    }

    private function freshShipment(Shipment $shipment): Shipment
    {
        return $shipment->fresh([
            'courier.user', 'sellerOrder.order.buyer', 'sellerOrder.seller.user',
            'sellerOrder.items', 'trackingEvents.actor', 'deliveryProof',
            'logisticsProvider', 'currentHub',
        ]);
    }

    private function defaultNote(string $status): string
    {
        return match ($status) {
            'picked-up' => 'Package collected from the seller by the assigned courier.',
            'in-transit' => 'Package is moving through delivery.',
            'out-for-delivery' => 'Package is on its way to the recipient.',
            'delivered' => 'Package was delivered to the recipient.',
        };
    }

    private function trackingNumber(): string
    {
        return 'MKT-'.Str::upper(Str::random(12));
    }
}
