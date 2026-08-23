<?php

return [
    'provider' => env('PAYMENT_PROVIDER', 'simulated'),
    'simulated' => [
        'outcome' => env('SIMULATED_PAYMENT_OUTCOME', 'success'),
    ],
];
