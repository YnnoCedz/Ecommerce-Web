<?php

$frontendOrigins = array_values(array_unique(array_filter(array_map(
    static fn (string $origin): string => rtrim(trim($origin), '/'),
    explode(',', implode(',', [
        (string) env('FRONTEND_URL', 'http://192.168.1.8:8443'),
        (string) env('LOGISTICS_FRONTEND_URL', 'https://logistics.marketohub.online,http://localhost:8450,http://127.0.0.1:8450'),
    ])),
))));

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $frontendOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
