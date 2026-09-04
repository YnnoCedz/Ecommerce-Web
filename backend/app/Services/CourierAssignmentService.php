<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CourierAssignmentService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogger $activity,
    ) {}

    public function assign(Shipment $shipment, Courier $courier, User $actor, array $context = []): Shipment
    {
        return DB::transaction(function () use ($shipment, $courier, $actor, $context) {
            $lockedShipment = Shipment::query()->with('sellerOrder.order')->whereKey($shipment->id)->lockForUpdate()->firstOrFail();
            $lockedCourier = Courier::query()->with('user')->whereKey($courier->id)->lockForUpdate()->firstOrFail();

            if (! $lockedCourier->active || $lockedCourier->status !== 'active' || ! $lockedCourier->approved_at || $lockedCourier->user?->status !== 'active') {
                throw ValidationException::withMessages([
                    'courier_id' => ['Only an approved active courier with an active Marketo account can be assigned.'],
                ]);
            }
            if (in_array($lockedShipment->status, ['delivered', 'cancelled', 'failed'], true)
                || in_array($lockedShipment->sellerOrder?->status, ['delivered', 'completed', 'cancelled', 'failed'], true)) {
                throw ValidationException::withMessages([
                    'shipment' => ['This shipment can no longer be assigned.'],
                ]);
            }

            $oldCourierId = $lockedShipment->courier_id;
            if ($oldCourierId === $lockedCourier->id) {
                return $this->freshShipment($lockedShipment);
            }

            $lockedShipment->forceFill([
                'courier_id' => $lockedCourier->id,
                'driver_name' => $lockedCourier->name,
            ])->save();
            $lockedShipment->sellerOrder?->forceFill(['courier_id' => $lockedCourier->id])->save();

            $reassigned = $oldCourierId !== null;
            $actorType = $context['actor_type'] ?? 'admin_dispatch';
            $assignmentSource = $actorType === 'logistics_dispatch' ? 'authorized logistics staff' : 'an administrator';
            TrackingEvent::create([
                'shipment_id' => $lockedShipment->id,
                'status' => $reassigned ? 'reassigned' : 'assigned',
                'note' => $reassigned ? "Delivery reassigned by {$assignmentSource}." : "Delivery assigned by {$assignmentSource}.",
                'actor_type' => $actorType,
                'actor_user_id' => $actor->id,
                'occurred_at' => now(),
            ]);

            $orderNumber = $lockedShipment->sellerOrder?->order?->order_number;
            $this->notifications->publishToUser($lockedCourier->user, [
                'category' => 'delivery',
                'title' => $reassigned ? 'Delivery reassigned to you' : 'New delivery assigned',
                'body' => $orderNumber ? "Delivery for order {$orderNumber} is assigned to you." : 'A delivery is assigned to you.',
                'action_type' => 'courier_delivery',
                'action_label' => 'Open delivery',
                'order_id' => $lockedShipment->sellerOrder?->order_id,
                'seller_order_id' => $lockedShipment->seller_order_id,
            ]);

            if ($reassigned) {
                $oldCourier = Courier::query()->with('user')->find($oldCourierId);
                if ($oldCourier?->user) {
                    $this->notifications->publishToUser($oldCourier->user, [
                        'category' => 'delivery',
                        'title' => 'Delivery reassigned',
                        'body' => $orderNumber ? "Delivery for order {$orderNumber} was reassigned." : 'A delivery was reassigned.',
                        'action_type' => 'courier_delivery',
                        'action_label' => 'View deliveries',
                    ]);
                }
            }

            $this->activity->log(
                $reassigned ? 'courier.delivery.reassigned' : 'courier.delivery.assigned',
                'delivery',
                $reassigned ? 'Shipment courier reassigned.' : 'Shipment courier assigned.',
                $actor,
                null,
                $lockedShipment,
                [
                    'old_courier_id' => $oldCourierId,
                    'new_courier_id' => $lockedCourier->id,
                    ...array_intersect_key($context, array_flip([
                        'logistics_provider_id', 'hub_id', 'logistics_staff_id', 'reason_provided',
                    ])),
                ],
            );

            return $this->freshShipment($lockedShipment);
        }, 3);
    }

    private function freshShipment(Shipment $shipment): Shipment
    {
        return $shipment->fresh([
            'courier.user', 'sellerOrder.order.buyer', 'sellerOrder.seller.user',
            'sellerOrder.items', 'trackingEvents.actor',
        ]);
    }
}
