<?php

return [
    'name' => env('APP_NAME', 'Marketo'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://192.168.1.8:8000'),
    'frontend_url' => env('FRONTEND_URL', 'http://192.168.1.8:8443'),
    'timezone' => 'Asia/Singapore',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'faker_locale' => 'en_PH',
];
