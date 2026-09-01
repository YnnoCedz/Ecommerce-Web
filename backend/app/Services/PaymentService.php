<?php

namespace App\Services;

use App\Contracts\PaymentProvider;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use RuntimeException;

class PaymentService
{
    private PaymentProvider $provider;

    public function __construct(SimulatedPaymentProvider $simulated, private readonly PromotionRedemptionService $redemptions)
    {
        if (config('payments.provider') !== 'simulated') {
            throw new RuntimeException('The configured payment provider is not available.');
        }

        $this->provider = $simulated;
    }

    public function charge(Order $order, User $buyer, string $method, array $details = []): Payment
    {
        return $this->provider->charge($order, $buyer, $method, $details);
    }

    public function retry(Order $order, User $buyer, array $details = []): Payment
    {
        if ($order->buyer_id !== $buyer->id || ! in_array($order->payment_status, ['failed', 'pending'], true) || $order->payment_method === 'cod') {
            abort(422, 'This payment is not eligible for retry.');
        }

        $promotions = $this->redemptions->lockEligible(
            $order->items()->whereNotNull('promotion_id')->pluck('promotion_id'),
            $buyer,
        );
        $payment = $this->charge($order, $buyer, (string) $order->payment_method, $details);
        if ($payment->status !== 'failed') {
            $this->redemptions->consumeLocked($promotions, $buyer, $order);
        }

        return $payment;
    }

    public function refundOrderAmount(Order $order, float $amount, string $reason): ?Payment
    {
        $charge = $order->payments()->where('type', 'charge')->whereIn('status', ['paid', 'partially_refunded'])->oldest('id')->first();
        if (! $charge) {
            return null;
        }

        return $this->provider->refund($charge, $amount, $reason);
    }
}
