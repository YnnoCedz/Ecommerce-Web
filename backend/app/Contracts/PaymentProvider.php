<?php

namespace App\Contracts;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;

interface PaymentProvider
{
    public function charge(Order $order, User $buyer, string $method, array $details = []): Payment;

    public function refund(Payment $payment, float $amount, string $reason): Payment;
}
