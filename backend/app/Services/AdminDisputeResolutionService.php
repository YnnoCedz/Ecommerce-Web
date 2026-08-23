<?php

namespace App\Services;

use App\Models\Dispute;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminDisputeResolutionService
{
    public function __construct(
        private readonly PaymentService $payments,
        private readonly NotificationService $notifications,
    ) {
    }

    public function resolve(Dispute $dispute, User $admin, string $resolutionType, string $notes, ?float $partialAmount = null): Dispute
    {
        return DB::transaction(function () use ($dispute, $admin, $resolutionType, $notes, $partialAmount) {
            $locked = Dispute::query()
                ->with(['returnRequest.order.payments', 'returnRequest.buyer', 'returnRequest.seller.user'])
                ->whereKey($dispute->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($locked->status, ['open', 'reviewing'], true)) {
                throw ValidationException::withMessages(['status' => ['This dispute has already been resolved.']]);
            }

            $return = $locked->returnRequest;
            $refundAmount = 0.0;
            $disputeStatus = 'resolved';
            $returnStatus = 'approved';

            if (in_array($resolutionType, ['reject', 'seller_side'], true)) {
                $disputeStatus = 'rejected';
                $returnStatus = 'rejected';
            }

            if (in_array($resolutionType, ['full_refund', 'partial_refund'], true)) {
                $remaining = round((float) $return->requested_amount - (float) $return->refunded_amount, 2);
                if ($remaining <= 0) {
                    throw ValidationException::withMessages(['refund_amount' => ['This return has no remaining refundable amount.']]);
                }

                $refundAmount = $resolutionType === 'full_refund' ? $remaining : round((float) $partialAmount, 2);
                if ($resolutionType === 'partial_refund' && ($refundAmount <= 0 || $refundAmount >= $remaining)) {
                    throw ValidationException::withMessages(['refund_amount' => ["A partial refund must be greater than zero and less than {$remaining}."]]);
                }

                $refund = $this->payments->refundOrderAmount(
                    $return->order,
                    $refundAmount,
                    "Admin dispute #{$locked->id}: {$resolutionType}",
                );
                if (! $refund instanceof Payment) {
                    throw ValidationException::withMessages(['refund_amount' => ['No paid simulated transaction is available to refund.']]);
                }

                $returnStatus = 'refunded';
                $refundAmount = (float) $refund->amount;
                $charge = $refund->parentPayment()->first();
                $return->order->forceFill(['payment_status' => $charge?->status ?? $return->order->payment_status])->save();
            }

            $return->forceFill([
                'status' => $returnStatus,
                'refunded_amount' => round((float) $return->refunded_amount + $refundAmount, 2),
                'resolved_at' => now(),
            ])->save();

            $locked->forceFill([
                'status' => $disputeStatus,
                'resolution_type' => $resolutionType,
                'resolution_note' => $notes,
                'resolution_notes' => $notes,
                'resolved_by' => $admin->id,
                'refund_amount' => $refundAmount,
                'resolved_at' => now(),
            ])->save();

            $outcomeLabel = str_replace('_', ' ', $resolutionType);
            $this->notifications->publishToUser($return->buyer, [
                'category' => 'moderation',
                'title' => 'Dispute resolved',
                'body' => "Dispute #{$locked->id} was resolved: {$outcomeLabel}.",
                'action_type' => 'buyer_order',
                'action_label' => 'View order',
                'order_id' => $return->order_id,
            ]);

            if ($return->seller?->user) {
                $this->notifications->publishToUser($return->seller->user, [
                    'category' => 'moderation',
                    'title' => 'Dispute resolved',
                    'body' => "Dispute #{$locked->id} was resolved: {$outcomeLabel}.",
                    'action_type' => 'seller_order',
                    'action_label' => 'View return',
                    'order_id' => $return->order_id,
                ]);
            }

            return $locked->fresh();
        }, 3);
    }
}
