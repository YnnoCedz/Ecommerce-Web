<?php

namespace App\Services;

use App\Contracts\PaymentProvider;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Str;
use RuntimeException;

class SimulatedPaymentProvider implements PaymentProvider
{
    private const ELECTRONIC_METHODS = ['gcash', 'maya', 'card'];

    public function charge(Order $order, User $buyer, string $method, array $details = []): Payment
    {
        if (! in_array($method, ['cod', ...self::ELECTRONIC_METHODS], true)) {
            throw new RuntimeException('Unsupported payment method.');
        }

        $outcome = $method === 'cod' ? 'unpaid' : $this->configuredOutcome();
        $metadata = ['sandbox' => true];
        if (in_array($method, ['gcash', 'maya'], true)) {
            $metadata['account_last4'] = isset($details['mobile_number'])
                ? substr(preg_replace('/\D+/', '', (string) $details['mobile_number']), -4)
                : null;
        }

        return Payment::create([
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'type' => 'charge',
            'method' => $method,
            'provider' => 'simulated',
            'status' => $outcome,
            'amount' => $order->grand_total,
            'currency' => $order->currency,
            'provider_reference' => $this->reference('PAY'),
            'card_brand' => $method === 'card' ? ($details['card_brand'] ?? 'Demo card') : null,
            'card_last4' => $method === 'card' ? ($details['card_last4'] ?? null) : null,
            'paid_at' => $outcome === 'paid' ? now() : null,
            'failure_reason' => $outcome === 'failed' ? 'The sandbox provider declined this demo payment.' : null,
            'metadata' => $metadata,
        ]);
    }

    public function refund(Payment $payment, float $amount, string $reason): Payment
    {
        $available = round((float) $payment->amount - (float) $payment->refunded_amount, 2);
        $amount = round($amount, 2);
        if ($payment->type !== 'charge' || ! in_array($payment->status, ['paid', 'partially_refunded'], true) || $amount <= 0 || $amount > $available) {
            throw new RuntimeException('This payment cannot be refunded for the requested amount.');
        }

        $refund = Payment::create([
            'order_id' => $payment->order_id,
            'user_id' => $payment->user_id,
            'parent_payment_id' => $payment->id,
            'type' => 'refund',
            'method' => $payment->method,
            'provider' => 'simulated',
            'status' => 'refunded',
            'amount' => $amount,
            'currency' => $payment->currency,
            'provider_reference' => $this->reference('REF'),
            'paid_at' => now(),
            'metadata' => ['sandbox' => true, 'reason' => $reason],
        ]);

        $newRefundedAmount = round((float) $payment->refunded_amount + $amount, 2);
        $payment->forceFill([
            'refunded_amount' => $newRefundedAmount,
            'status' => $newRefundedAmount >= (float) $payment->amount ? 'refunded' : 'partially_refunded',
        ])->save();

        return $refund;
    }

    private function configuredOutcome(): string
    {
        if (app()->environment('production')) {
            throw new RuntimeException('The simulated payment provider is disabled in production.');
        }

        $outcome = (string) config('payments.simulated.outcome', 'success');

        return match ($outcome) {
            'success' => 'paid',
            'failure' => 'failed',
            'pending' => 'pending',
            default => throw new RuntimeException('Invalid simulated payment outcome configuration.'),
        };
    }

    private function reference(string $prefix): string
    {
        return $prefix.'-'.now()->format('Ymd').'-'.Str::upper(Str::random(10));
    }
}
