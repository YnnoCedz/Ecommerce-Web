<?php

return [
    'delivery_estimate_message' => env(
        'MARKETPLACE_DELIVERY_ESTIMATE_MESSAGE',
        'Delivery estimate available at checkout.'
    ),

    'policies' => [
        'default_shipping' => env(
            'MARKETPLACE_DEFAULT_SHIPPING_POLICY',
            'Shipping options and fees are confirmed at checkout.'
        ),
        'default_returns' => env(
            'MARKETPLACE_DEFAULT_RETURN_POLICY',
            'Returns and refunds are handled under the Marketo marketplace policy.'
        ),
    ],
];
