<?php

namespace App\Services;

use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderLifecycleService
{
    private const SELLER_TRANSITIONS = [
        'pending' => 'confirmed',
        'new' => 'confirmed',
        'confirmed' => 'preparing',
        'preparing' => 'ready',
    ];

    private const LOGISTICS_TRANSITIONS = [
        'ready' => 'picked-up',
        'picked-up' => 'in-transit',
        'in-transit' => 'out-for-delivery',
        'out-for-delivery' => 'delivered',
    ];

    public function __construct(private readonly NotificationService $notifications) {}

    public function transitionBySeller(SellerOrder $sellerOrder, int $sellerId, string $status, ?string $trackingNumber = null): SellerOrder
    {
        return DB::transaction(function () use ($sellerOrder, $sellerId, $status, $trackingNumber) {
            $locked = SellerOrder::query()->whereKey($sellerOrder->id)->lockForUpdate()->firstOrFail();

            if ($locked->seller_id !== $sellerId) {
                abort(404);
            }

            $expected = self::SELLER_TRANSITIONS[$locked->status] ?? null;
            if ($expected !== $status) {
                throw ValidationException::withMessages([
                    'status' => ["Order cannot move from {$locked->status} to {$status}."],
                ]);
            }

            $timestamps = match ($status) {
                'confirmed' => ['confirmed_at' => now()],
                'ready' => ['ready_at' => now()],
                'in-transit' => ['picked_up_at' => now()],
                'delivered' => ['delivered_at' => now()],
                default => [],
            };
            $locked->forceFill(['status' => $status, ...$timestamps])->save();

            if ($status === 'ready') {
                $shipment = $this->updateShipment($locked, $status, $trackingNumber, 'seller', $locked->seller?->user_id);
                $locked->tracking_number = $shipment->tracking_number;
                $locked->save();

                $this->notifications->publishToRoles('admin', [
                    'category' => 'order',
                    'title' => 'Order ready for pickup',
                    'body' => ($locked->seller?->trade_name ?: $locked->seller?->business_name ?: 'A seller')." prepared order {$locked->order->order_number}.",
                    'action_type' => 'admin_order',
                    'action_label' => 'Open delivery operations',
                    'order_id' => $locked->order_id,
                    'seller_order_id' => $locked->id,
                ]);
            }

            $order = $this->synchronizeOrder($locked->order_id);
            if ($order->buyer) {
                $this->notifications->publishToUser($order->buyer, [
                    'category' => 'order',
                    'title' => 'Order status updated',
                    'body' => "Order {$order->order_number} is now ".str_replace('-', ' ', $status).'.',
                    'action_type' => 'buyer_order',
                    'action_label' => 'View order',
                    'order_id' => $order->id,
                ]);
            }

            return $locked->fresh(['order.items.product.images', 'order.buyer', 'shipment.trackingEvents']);
        }, 3);
    }

    public function transitionByLogisticsActor(SellerOrder $sellerOrder, User $actor, string $status): SellerOrder
    {
        return DB::transaction(function () use ($sellerOrder, $actor, $status) {
            $locked = SellerOrder::query()
                ->with(['order.buyer', 'seller.user'])
                ->whereKey($sellerOrder->id)
                ->lockForUpdate()
                ->firstOrFail();
            $expected = self::LOGISTICS_TRANSITIONS[$locked->status] ?? null;

            if ($expected !== $status) {
                throw ValidationException::withMessages([
                    'status' => ["Delivery cannot move from {$locked->status} to {$status}. Refresh the order and try again."],
                ]);
            }

            $timestamps = match ($status) {
                'picked-up' => ['picked_up_at' => now()],
                'delivered' => ['delivered_at' => now()],
                default => [],
            };
            $locked->forceFill(['status' => $status, ...$timestamps])->save();
            $shipment = $this->updateShipment($locked, $status, null, 'admin_logistics', $actor->id);
            $locked->forceFill(['tracking_number' => $shipment->tracking_number])->save();
            $order = $this->synchronizeOrder($locked->order_id);

            $labels = [
                'picked-up' => ['Order picked up', 'Your order was picked up by Maketo Logistics.'],
                'in-transit' => ['Order in transit', 'Your order is in transit with Maketo Logistics.'],
                'out-for-delivery' => ['Order out for delivery', 'Your order is out for delivery.'],
                'delivered' => ['Order delivered', 'Your order has been delivered.'],
            ];
            [$title, $body] = $labels[$status];

            if ($order->buyer) {
                $this->notifications->publishToUser($order->buyer, [
                    'category' => 'order',
                    'title' => $title,
                    'body' => $body,
                    'action_type' => 'buyer_order',
                    'action_label' => 'Track order',
                    'order_id' => $order->id,
                    'seller_order_id' => $locked->id,
                ]);
            }

            if (in_array($status, ['picked-up', 'delivered'], true) && $locked->seller?->user) {
                $this->notifications->publishToUser($locked->seller->user, [
                    'category' => 'order',
                    'title' => $status === 'picked-up' ? 'Order picked up' : 'Order delivered successfully',
                    'body' => $status === 'picked-up'
                        ? "Order {$order->order_number} was collected by Maketo Logistics."
                        : "Order {$order->order_number} was delivered.",
                    'action_type' => 'seller_order',
                    'action_label' => 'View order',
                    'order_id' => $order->id,
                    'seller_order_id' => $locked->id,
                ]);
            }

            return $locked->fresh(['order.items.product.images', 'order.buyer', 'seller', 'shipment.courier', 'shipment.trackingEvents.actor']);
        }, 3);
    }

    public function completeByBuyer(SellerOrder $sellerOrder, User $buyer): SellerOrder
    {
        return DB::transaction(function () use ($sellerOrder, $buyer) {
            $locked = SellerOrder::query()->whereKey($sellerOrder->id)->lockForUpdate()->firstOrFail();
            $order = Order::query()->whereKey($locked->order_id)->lockForUpdate()->firstOrFail();

            if ($order->buyer_id !== $buyer->id) {
                abort(404);
            }

            if ($locked->status !== 'delivered') {
                throw ValidationException::withMessages([
                    'status' => ['Only a delivered seller order can be marked as received.'],
                ]);
            }

            $locked->forceFill(['status' => 'completed', 'completed_at' => now()])->save();
            $order = $this->synchronizeOrder($order->id);

            if ($locked->seller?->user) {
                $this->notifications->publishToUser($locked->seller->user, [
                    'category' => 'order',
                    'title' => 'Order completed',
                    'body' => "The buyer received order {$order->order_number}.",
                    'action_type' => 'seller_order',
                    'action_label' => 'View order',
                    'order_id' => $order->id,
                ]);
            }

            return $locked->fresh(['order.items.product.images', 'order.buyer', 'seller', 'shipment.trackingEvents']);
        }, 3);
    }

    private function updateShipment(
        SellerOrder $sellerOrder,
        string $status,
        ?string $trackingNumber,
        string $actorType,
        ?int $actorUserId,
    ): Shipment {
        $shipment = Shipment::query()->where('seller_order_id', $sellerOrder->id)->lockForUpdate()->first()
            ?? new Shipment(['seller_order_id' => $sellerOrder->id]);
        $shipment->tracking_number = trim((string) $trackingNumber) ?: $shipment->tracking_number ?: 'MKT-'.Str::upper(Str::random(12));
        $shipment->status = $status;

        if ($status === 'picked-up') {
            $shipment->picked_up_at ??= now();
        }

        if ($status === 'in-transit') {
            $shipment->in_transit_at ??= now();
        }

        if ($status === 'delivered') {
            $shipment->delivered_at ??= now();
        }

        $shipment->save();

        TrackingEvent::create([
            'shipment_id' => $shipment->id,
            'status' => $status,
            'note' => match ($status) {
                'ready' => 'Seller prepared the order for Maketo pickup.',
                'picked-up' => 'Package collected from the seller by Maketo Logistics.',
                'in-transit' => 'Package is moving through delivery.',
                'out-for-delivery' => 'Package is on its way to the buyer.',
                'delivered' => 'Package was delivered to the buyer.',
                default => 'Delivery status updated.',
            },
            'actor_type' => $actorType,
            'actor_user_id' => $actorUserId,
            'occurred_at' => now(),
        ]);

        return $shipment;
    }

    private function synchronizeOrder(int $orderId): Order
    {
        $order = Order::query()->with(['sellerOrders', 'buyer'])->lockForUpdate()->findOrFail($orderId);
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

        return $order->fresh(['sellerOrders', 'buyer']);
    }
}
