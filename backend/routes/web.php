<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Marketo API',
        'status' => 'running',
    ]);
});

Route::get('/db-check', function () {
    try {
        DB::select('SELECT 1');

        return response()->json([
            'status' => 'ok',
            'database' => 'connected',
        ]);
    } catch (Throwable $e) {
        report($e);

        return response()->json([
            'status' => 'error',
            'database' => 'connection_failed',
        ], 500);
    }
});
