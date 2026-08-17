<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CommerceController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\ModerationController;
use App\Http\Controllers\Api\MessagingController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
});

Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{slug}', [CatalogController::class, 'product']);
Route::get('/sellers', [CatalogController::class, 'sellers']);
Route::get('/sellers/{slug}', [CatalogController::class, 'seller']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/account/addresses', [AccountController::class, 'addresses']);
    Route::post('/account/addresses', [AccountController::class, 'storeAddress']);
    Route::post('/cart', [CommerceController::class, 'cart']);
    Route::post('/checkout', [CommerceController::class, 'checkout']);
    Route::get('/orders', [CommerceController::class, 'orders']);
    Route::get('/orders/{orderNumber}', [CommerceController::class, 'order']);
    Route::get('/messages', [MessagingController::class, 'index']);
    Route::post('/messages', [MessagingController::class, 'store']);
    Route::get('/reviews', [CommerceController::class, 'reviews']);
    Route::post('/reviews', [CommerceController::class, 'storeReview']);
    Route::get('/reports', [ModerationController::class, 'reports']);
    Route::post('/reports', [ModerationController::class, 'storeReport']);
    Route::get('/notifications', [ModerationController::class, 'notifications']);
    Route::get('/wishlists', [CommerceController::class, 'wishlists']);
    Route::post('/wishlists', [CommerceController::class, 'storeWishlist']);
    Route::get('/promotions', [CommerceController::class, 'promotions']);
});

