<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Maketo API',
        'status' => 'ok',
    ]);
});
