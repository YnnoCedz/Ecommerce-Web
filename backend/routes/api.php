<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CommerceController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\ModerationController;
use App\Http\Controllers\Api\MessagingController;
use App\Http\Controllers\Api\SellerApplicationController;
use App\Http\Controllers\Api\SellerController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/email/resend', [AuthController::class, 'resendEmailVerification'])->middleware('throttle:3,1');
    Route::post('/email/verify', [AuthController::class, 'verifyEmailVerification'])->middleware('throttle:6,1');
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/2fa/verify', [AuthController::class, 'verifyTwoFactor'])->middleware('throttle:10,1');
    Route::post('/2fa/resend', [AuthController::class, 'resendTwoFactor'])->middleware('throttle:3,1');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum', 'account.active']);
});

Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{slug}', [CatalogController::class, 'product']);
Route::get('/sellers', [CatalogController::class, 'sellers']);
Route::get('/sellers/{slug}', [CatalogController::class, 'seller']);

Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
    Route::get('/account/addresses', [AccountController::class, 'addresses']);
    Route::post('/account/addresses', [AccountController::class, 'storeAddress']);
    Route::get('/seller/application', [SellerApplicationController::class, 'current']);
    Route::post('/seller/applications', [SellerApplicationController::class, 'store']);
    Route::get('/cart', [CommerceController::class, 'cart']);
    Route::post('/cart/items', [CommerceController::class, 'storeCartItem']);
    Route::patch('/cart/items/{itemId}', [CommerceController::class, 'updateCartItem']);
    Route::delete('/cart/items/{itemId}', [CommerceController::class, 'destroyCartItem']);
    Route::patch('/cart/promo', [CommerceController::class, 'updateCartPromo']);
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

Route::prefix('seller')
    ->middleware(['auth:sanctum', 'account.active', 'role:seller', 'seller.approved'])
    ->group(function () {
    Route::get('/dashboard', [SellerController::class, 'dashboard']);
    Route::get('/me', [SellerController::class, 'me']);
    Route::get('/orders', [SellerController::class, 'orders']);
    Route::get('/products', [SellerController::class, 'products']);
    Route::get('/customers', [SellerController::class, 'customers']);
    Route::get('/promotions', [SellerController::class, 'promotions']);
});

Route::prefix('admin')
    ->middleware(['auth:sanctum', 'account.active', 'role:admin'])
    ->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::get('/sellers', [AdminController::class, 'sellers']);
    Route::get('/seller-applications', [SellerApplicationController::class, 'index']);
    Route::get('/seller-applications/{sellerApplication}', [SellerApplicationController::class, 'show']);
    Route::post('/seller-applications/{sellerApplication}/approve', [SellerApplicationController::class, 'approve']);
    Route::post('/seller-applications/{sellerApplication}/reject', [SellerApplicationController::class, 'reject']);
    Route::get('/seller-documents/{sellerDocument}/view', [SellerApplicationController::class, 'viewDocument']);
    Route::get('/reports', [AdminController::class, 'reports']);
});
