<?php

namespace App\Services;

use App\Models\Dispute;
use App\Models\Order;
use App\Models\OrderCancellation;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ReturnRequest;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderResolutionService
{
    private const RETURN_TRANSITIONS = [
        'requested' => ['under_review', 'approved', 'rejected'],
        'under_review' => ['approved', 'rejected'],
        'approved' => ['return_in_transit'],
        'return_in_transit' => ['received'],
        'received' => ['refunded'],
        'refunded' => ['closed'],
    ];

    public function __construct(
        private readonly PaymentService $payments,
        private readonly NotificationService $notifications,
        private readonly MediaStorageService $media,
    ) {
    }

    public function cancelSellerOrder(SellerOrder $sellerOrder, User $actor, string $reason, bool $sellerInitiated = false): OrderCancellation
    {
        return DB::transaction(function () use ($sellerOrder, $actor, $reason, $sellerInitiated) {
            $locked = SellerOrder::query()->with(['order', 'items'])->whereKey($sellerOrder->id)->lockForUpdate()->firstOrFail();
            $authorized = $sellerInitiated
                ? $locked->seller?->user_id === $actor->id
                : $locked->order->buyer_id === $actor->id;
            if (! $authorized) {
                abort(404);
            }

            $existing = OrderCancellation::query()->where('seller_order_id', $locked->id)->first();
            if ($existing) {
                return $existing;
            }

            $allowedStatuses = $sellerInitiated ? ['pending', 'new', 'confirmed'] : ['pending', 'new'];
            if (! in_array($locked->status, $allowedStatuses, true)) {
                throw ValidationException::withMessages(['status' => ['This seller order can no longer be cancelled.']]);
            }

            foreach ($locked->items as $item) {
                if ($item->product_variant_id) {
                    ProductVariant::query()->whereKey($item->product_variant_id)->lockForUpdate()->increment('stock_quantity', $item->quantity);
                } else {
                    Product::withTrashed()->whereKey($item->product_id)->lockForUpdate()->increment('stock_quantity', $item->quantity);
                }
            }

            $refund = $this->payments->refundOrderAmount($locked->order, (float) $locked->grand_total, 'Buyer cancellation: '.$reason);
            $cancellation = OrderCancellation::create([
                'order_id' => $locked->order_id,
                'seller_order_id' => $locked->id,
                'buyer_id' => $locked->order->buyer_id,
                'seller_id' => $locked->seller_id,
                'reason' => $reason,
                'refunded_amount' => $refund?->amount ?? 0,
                'inventory_restored_at' => now(),
                'cancelled_at' => now(),
            ]);

            $locked->forceFill(['status' => 'cancelled'])->save();
            $this->synchronizeOrder($locked->order_id);

            $recipient = $sellerInitiated ? $locked->order->buyer : $locked->seller?->user;
            if ($recipient) {
                $this->notifications->publishToUser($recipient, [
                    'category' => 'order',
                    'title' => 'Seller order cancelled',
                    'body' => $sellerInitiated
                        ? "The seller cancelled their portion of {$locked->order->order_number}."
                        : "The buyer cancelled their portion of {$locked->order->order_number}.",
                    'action_type' => $sellerInitiated ? 'buyer_order' : 'seller_order',
                    'action_label' => 'View order',
                    'order_id' => $locked->order_id,
                ]);
            }

            return $cancellation;
        }, 3);
    }

    public function requestReturn(SellerOrder $sellerOrder, User $buyer, array $data, array $files = []): ReturnRequest
    {
        return DB::transaction(function () use ($sellerOrder, $buyer, $data, $files) {
            $locked = SellerOrder::query()->with(['order', 'items'])->whereKey($sellerOrder->id)->lockForUpdate()->firstOrFail();
            if ($locked->order->buyer_id !== $buyer->id) {
                abort(404);
            }
            if (! in_array($locked->status, ['delivered', 'completed'], true)) {
                throw ValidationException::withMessages(['status' => ['Returns are available only after delivery.']]);
            }

            $items = collect($data['items'])->map(function (array $requested) use ($locked) {
                $item = $locked->items->firstWhere('id', (int) $requested['order_item_id']);
                if (! $item || (int) $requested['quantity'] > $item->quantity) {
                    throw ValidationException::withMessages(['items' => ['A selected return item or quantity is invalid.']]);
                }

                $alreadyRequested = (int) DB::table('return_request_items')
                    ->join('return_requests', 'return_requests.id', '=', 'return_request_items.return_request_id')
                    ->where('return_request_items.order_item_id', $item->id)
                    ->whereNotIn('return_requests.status', ['rejected', 'closed'])
                    ->sum('return_request_items.quantity');
                if ($alreadyRequested + (int) $requested['quantity'] > $item->quantity) {
                    throw ValidationException::withMessages(['items' => ['The requested quantity exceeds the quantity eligible for return.']]);
                }

                return ['model' => $item, 'quantity' => (int) $requested['quantity']];
            });

            $requestedAmount = round((float) $items->sum(fn ($line) => (float) $line['model']->unit_price * $line['quantity']), 2);
            $return = ReturnRequest::create([
                'order_id' => $locked->order_id,
                'seller_order_id' => $locked->id,
                'buyer_id' => $buyer->id,
                'seller_id' => $locked->seller_id,
                'status' => 'requested',
                'reason' => $data['reason'],
                'buyer_statement' => $data['buyer_statement'] ?? null,
                'requested_amount' => $requestedAmount,
                'requested_at' => now(),
            ]);

            foreach ($items as $line) {
                $return->items()->create([
                    'order_item_id' => $line['model']->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['model']->unit_price,
                    'refund_amount' => round((float) $line['model']->unit_price * $line['quantity'], 2),
                ]);
            }

            foreach ($files as $file) {
                if (! $file instanceof UploadedFile) {
                    continue;
                }
                $stored = $this->media->storePrivateFile($file, "returns/{$return->id}/evidence");
                $return->evidence()->create([
                    'uploaded_by' => $buyer->id,
                    'storage_disk' => $stored['storage_disk'],
                    'storage_path' => $stored['storage_path'],
                    'original_filename' => $stored['original_filename'],
                    'mime_type' => $stored['mime_type'],
                    'file_size' => $stored['file_size'],
                ]);
            }

            if ($locked->seller?->user) {
                $this->notifications->publishToUser($locked->seller->user, [
                    'category' => 'order',
                    'title' => 'New return request',
                    'body' => "A return was requested for {$locked->order->order_number}.",
                    'action_type' => 'seller_order',
                    'action_label' => 'Review return',
                    'order_id' => $locked->order_id,
                ]);
            }

            return $return->load(['items.orderItem', 'evidence', 'dispute']);
        }, 3);
    }

    public function transitionReturn(ReturnRequest $return, int $sellerId, string $status, ?string $response): ReturnRequest
    {
        return DB::transaction(function () use ($return, $sellerId, $status, $response) {
            $locked = ReturnRequest::query()->with(['order', 'buyer'])->whereKey($return->id)->lockForUpdate()->firstOrFail();
            if ($locked->seller_id !== $sellerId) {
                abort(404);
            }
            if (! in_array($status, self::RETURN_TRANSITIONS[$locked->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => ["Return cannot move from {$locked->status} to {$status}."]]);
            }

            $changes = ['status' => $status];
            if ($response !== null) {
                $changes['seller_response'] = $response;
            }
            if (in_array($status, ['rejected', 'closed'], true)) {
                $changes['resolved_at'] = now();
            }
            if ($status === 'refunded') {
                $refund = $this->payments->refundOrderAmount($locked->order, (float) $locked->requested_amount, 'Approved return #'.$locked->id);
                $changes['refunded_amount'] = $refund?->amount ?? 0;
            }
            $locked->forceFill($changes)->save();

            $this->notifications->publishToUser($locked->buyer, [
                'category' => 'order',
                'title' => 'Return status updated',
                'body' => "Return #{$locked->id} is now ".str_replace('_', ' ', $status).'.',
                'action_type' => 'buyer_order',
                'action_label' => 'View order',
                'order_id' => $locked->order_id,
            ]);

            return $locked->fresh(['items.orderItem', 'evidence', 'dispute']);
        }, 3);
    }

    public function escalate(ReturnRequest $return, User $buyer, string $reason, ?string $statement): Dispute
    {
        if ($return->buyer_id !== $buyer->id) {
            abort(404);
        }
        if (! in_array($return->status, ['requested', 'under_review', 'rejected'], true)) {
            throw ValidationException::withMessages(['status' => ['This return cannot be escalated.']]);
        }

        return DB::transaction(function () use ($return, $buyer, $reason, $statement) {
            $dispute = Dispute::query()->firstOrCreate(
                ['return_request_id' => $return->id],
                ['opened_by' => $buyer->id, 'status' => 'open', 'reason' => $reason, 'buyer_statement' => $statement, 'opened_at' => now()],
            );
            if ($return->seller?->user && $dispute->wasRecentlyCreated) {
                $this->notifications->publishToUser($return->seller->user, [
                    'category' => 'order',
                    'title' => 'Return dispute escalated',
                    'body' => "Return #{$return->id} was escalated for admin review.",
                    'action_type' => 'seller_order',
                    'action_label' => 'View return',
                    'order_id' => $return->order_id,
                ]);
            }

            return $dispute;
        });
    }

    private function synchronizeOrder(int $orderId): void
    {
        $order = Order::query()->with(['sellerOrders', 'payments'])->lockForUpdate()->findOrFail($orderId);
        $statuses = $order->sellerOrders->pluck('status');
        $status = $statuses->every(fn ($value) => $value === 'cancelled') ? 'cancelled' : 'pending';
        if ($status !== 'cancelled' && $statuses->contains(fn ($value) => in_array($value, ['confirmed', 'preparing'], true))) {
            $status = 'processing';
        }
        $charge = $order->payments->where('type', 'charge')->first();
        $order->forceFill([
            'status' => $status,
            'payment_status' => $charge?->status ?? $order->payment_status,
        ])->save();
    }
}
