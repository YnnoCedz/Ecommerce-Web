<?php

return [
    'name' => env('APP_NAME', 'Maketo'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost')),
    'timezone' => 'Asia/Singapore',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'faker_locale' => 'en_PH',
];
