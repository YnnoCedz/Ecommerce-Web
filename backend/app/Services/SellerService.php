<?php

namespace App\Services;

class SellerService
{
    public function submitApplication(array $payload): array
    {
        return ['status' => 'pending', 'payload' => $payload];
    }
}

