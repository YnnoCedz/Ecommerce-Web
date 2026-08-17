<?php

namespace App\Services;

class CheckoutService
{
    public function createOrderFromCart(array $payload): array
    {
        return [
            'message' => 'Checkout service scaffolded.',
            'payload' => $payload,
        ];
    }
}

