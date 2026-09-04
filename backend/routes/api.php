<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminCourierOperationsController;
use App\Http\Controllers\Api\AdminDisputeController;
use App\Http\Controllers\Api\AdminLogisticsApplicationController;
use App\Http\Controllers\Api\AdminLogisticsController;
use App\Http\Controllers\Api\AdminPayoutController;
use App\Http\Controllers\Api\AdminPlatformController;
use App\Http\Controllers\Api\AdminUserRegistrationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CommerceController;
use App\Http\Controllers\Api\CourierApplicationController;
use App\Http\Controllers\Api\CourierOperationsController;
use App\Http\Controllers\Api\DeliveryProofController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\LogisticsApplicationController;
use App\Http\Controllers\Api\LogisticsOperationsController;
use App\Http\Controllers\Api\LogisticsRiderApplicationController;
use App\Http\Controllers\Api\MarketplaceApplicationController;
use App\Http\Controllers\Api\MessagingController;
use App\Http\Controllers\Api\ModerationController;
use App\Http\Controllers\Api\OrderResolutionController;
use App\Http\Controllers\Api\PublicLogisticsProviderController;
use App\Http\Controllers\Api\SellerApplicationController;
use App\Http\Controllers\Api\SellerController;
use App\Http\Controllers\Api\SellerPayoutController;
use App\Http\Controllers\Api\SellerSalesReportController;
use App\Http\Controllers\Api\SellerSecurityController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::prefix('locations')->group(function () {
    Route::get('/regions', [LocationController::class, 'regions']);
    Route::get('/regions/{regionCode}/provinces', [LocationController::class, 'provinces']);
    Route::get('/regions/{regionCode}/cities-municipalities', [LocationController::class, 'regionCities']);
    Route::get('/provinces/{provinceCode}/cities-municipalities', [LocationController::class, 'provinceCities']);
    Route::get('/cities-municipalities/{cityCode}/barangays', [LocationController::class, 'barangays']);
    Route::get('/cities-municipalities/{cityCode}', [LocationController::class, 'city']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:registration');
    Route::post('/register/logistics', [AuthController::class, 'registerLogistics'])->middleware('throttle:registration');
    Route::post('/register/rider', [AuthController::class, 'registerRider'])->middleware('throttle:registration');
    Route::post('/email/resend', [AuthController::class, 'resendEmailVerification'])->middleware('throttle:3,1');
    Route::post('/email/verify', [AuthController::class, 'verifyEmailVerification'])->middleware('throttle:6,1');
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/2fa/verify', [AuthController::class, 'verifyTwoFactor'])->middleware('throttle:10,1');
    Route::post('/2fa/resend', [AuthController::class, 'resendTwoFactor'])->middleware('throttle:3,1');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum', 'account.active']);
});

Route::get('/logistics/providers', PublicLogisticsProviderController::class)->middleware('throttle:60,1');

Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/search', [CatalogController::class, 'search']);
Route::get('/search/suggestions', [CatalogController::class, 'searchSuggestions'])->middleware('throttle:60,1');
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/deals', [CatalogController::class, 'deals']);
Route::get('/products/{slug}/reviews', [CatalogController::class, 'productReviews']);
Route::get('/products/{slug}', [CatalogController::class, 'product']);
Route::get('/sellers', [CatalogController::class, 'sellers']);
Route::get('/sellers/{slug}', [CatalogController::class, 'seller']);

Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
    Route::get('/shipments/{shipment}/proof-of-delivery', [DeliveryProofController::class, 'show'])->middleware('throttle:30,1');
    Route::get('/shipments/{shipment}/proof-of-delivery/content', [DeliveryProofController::class, 'content'])
        ->name('shipment.delivery-proof.content')->middleware('throttle:30,1');

    Route::middleware('marketplace.shopper')->group(function () {
        Route::patch('/account/profile', [AccountController::class, 'updateProfile']);
        Route::get('/account/preferences', [AccountController::class, 'preferences']);
        Route::patch('/account/preferences', [AccountController::class, 'updatePreferences']);
        Route::get('/account/addresses', [AccountController::class, 'addresses']);
        Route::post('/account/addresses', [AccountController::class, 'storeAddress']);
        Route::patch('/account/addresses/{addressId}', [AccountController::class, 'updateAddress']);
        Route::delete('/account/addresses/{addressId}', [AccountController::class, 'destroyAddress']);
        Route::patch('/account/password', [AccountController::class, 'updatePassword']);
    });

    Route::get('/seller/application', [SellerApplicationController::class, 'current']);
    Route::post('/seller/applications', [SellerApplicationController::class, 'store']);
    Route::get('/marketplace/application', [MarketplaceApplicationController::class, 'current']);
    Route::post('/marketplace/applications', [MarketplaceApplicationController::class, 'store'])->middleware('throttle:3,60');
    Route::get('/logistics/application', [LogisticsApplicationController::class, 'current']);
    Route::post('/logistics/applications', [LogisticsApplicationController::class, 'store'])->middleware('throttle:3,60');
    Route::get('/courier/application', [CourierApplicationController::class, 'current'])->middleware('throttle:30,1');
    Route::put('/courier/application/draft', [CourierApplicationController::class, 'saveDraft'])->middleware('throttle:10,60');
    Route::post('/courier/applications', [CourierApplicationController::class, 'store'])->middleware('throttle:3,60');
    Route::get('/courier/documents/{courierDocument}/view', [CourierApplicationController::class, 'viewOwnDocument'])->middleware('throttle:30,1');

    Route::middleware('marketplace.shopper')->group(function () {
        Route::get('/cart', [CommerceController::class, 'cart']);
        Route::post('/cart/items', [CommerceController::class, 'storeCartItem']);
        Route::patch('/cart/items/{itemId}', [CommerceController::class, 'updateCartItem']);
        Route::patch('/cart/items/{itemId}/discount', [CommerceController::class, 'updateCartItemDiscount']);
        Route::delete('/cart/items/{itemId}', [CommerceController::class, 'destroyCartItem']);
        Route::patch('/cart/promo', [CommerceController::class, 'updateCartPromo']);
        Route::post('/checkout/preview', [CommerceController::class, 'checkoutPreview']);
        Route::post('/checkout', [CommerceController::class, 'checkout']);
        Route::get('/orders', [CommerceController::class, 'orders']);
        Route::get('/orders/{orderNumber}', [CommerceController::class, 'order']);
        Route::post('/orders/{orderNumber}/seller-orders/{sellerOrder}/complete', [CommerceController::class, 'completeSellerOrder']);
        Route::post('/orders/{orderNumber}/payments/retry', [CommerceController::class, 'retryPayment']);
        Route::post('/orders/{orderNumber}/seller-orders/{sellerOrder}/cancel', [OrderResolutionController::class, 'cancel']);
        Route::post('/orders/{orderNumber}/seller-orders/{sellerOrder}/returns', [OrderResolutionController::class, 'storeReturn']);
        Route::get('/returns', [OrderResolutionController::class, 'buyerReturns']);
        Route::post('/returns/{returnRequest}/dispute', [OrderResolutionController::class, 'escalate']);
        Route::get('/return-evidence/{evidence}', [OrderResolutionController::class, 'evidence']);
        Route::get('/messages', [MessagingController::class, 'index']);
        Route::post('/messages', [MessagingController::class, 'store']);
        Route::post('/messages/conversations', [MessagingController::class, 'start']);
        Route::get('/messages/attachments/{attachment}', [MessagingController::class, 'attachment']);
        Route::get('/messages/{conversation}', [MessagingController::class, 'show']);
        Route::post('/messages/{conversation}', [MessagingController::class, 'send']);
        Route::patch('/messages/{conversation}/read', [MessagingController::class, 'markRead']);
        Route::get('/reviews', [CommerceController::class, 'reviews']);
        Route::get('/reviews/eligible', [CommerceController::class, 'eligibleReviews']);
        Route::post('/reviews', [CommerceController::class, 'storeReview']);
        Route::patch('/reviews/{review}', [CommerceController::class, 'updateReview']);
        Route::delete('/reviews/{review}', [CommerceController::class, 'destroyReview']);
        Route::get('/reports', [ModerationController::class, 'reports']);
        Route::post('/reports', [ModerationController::class, 'storeReport']);
    });
    Route::get('/notifications', [ModerationController::class, 'notifications']);
    Route::patch('/notifications/{notification}/read', [ModerationController::class, 'markNotificationRead']);
    Route::patch('/notifications/{notification}/dismiss', [ModerationController::class, 'dismissNotification']);
    Route::post('/notifications/mark-all-read', [ModerationController::class, 'markAllNotificationsRead']);
    Route::middleware('marketplace.shopper')->group(function () {
        Route::get('/wishlists', [CommerceController::class, 'wishlists']);
        Route::post('/wishlists', [CommerceController::class, 'storeWishlist']);
        Route::get('/wishlists/{productId}/status', [CommerceController::class, 'wishlistStatus']);
        Route::delete('/wishlists/{productId}', [CommerceController::class, 'destroyWishlist']);
        Route::get('/promotions', [CommerceController::class, 'promotions']);
    });
});

Route::prefix('seller')
    // Phase 2.6: `role:seller` removed. `seller.approved` proves the capability
    // from the approved seller profile so a seller may also be a buyer/rider.
    ->middleware(['auth:sanctum', 'account.active', 'seller.approved'])
    ->group(function () {
        Route::get('/dashboard', [SellerController::class, 'dashboard']);
        Route::get('/reports/sales/export', SellerSalesReportController::class);
        Route::get('/payouts', [SellerPayoutController::class, 'index']);
        Route::get('/payouts/{payout}', [SellerPayoutController::class, 'show']);
        Route::get('/me', [SellerController::class, 'me']);
        Route::patch('/me', [SellerController::class, 'updateMe']);
        Route::get('/orders', [SellerController::class, 'orders']);
        Route::patch('/orders/{sellerOrder}/status', [SellerController::class, 'updateOrderStatus']);
        Route::post('/orders/{sellerOrder}/cancel', [OrderResolutionController::class, 'sellerCancel']);
        Route::get('/reviews', [SellerController::class, 'reviews']);
        Route::post('/reviews/{review}/reply', [SellerController::class, 'replyToReview']);
        Route::delete('/reviews/{review}/reply', [SellerController::class, 'destroyReviewReply']);
        Route::get('/returns', [OrderResolutionController::class, 'sellerReturns']);
        Route::patch('/returns/{returnRequest}', [OrderResolutionController::class, 'updateReturn']);
        Route::get('/products', [SellerController::class, 'products']);
        Route::get('/products/{product}', [SellerController::class, 'show']);
        Route::post('/products', [SellerController::class, 'store']);
        Route::patch('/products/{product}', [SellerController::class, 'update']);
        Route::patch('/products/{product}/inventory', [SellerController::class, 'updateInventory']);
        Route::delete('/products/{product}', [SellerController::class, 'destroy']);
        Route::get('/customers', [SellerController::class, 'customers']);
        Route::get('/promotions', [SellerController::class, 'promotions']);
        Route::post('/promotions', [SellerController::class, 'storePromotion']);
        Route::put('/promotions/{promotion}', [SellerController::class, 'updatePromotion']);
        Route::patch('/promotions/{promotion}/cancel', [SellerController::class, 'cancelPromotion']);
        Route::patch('/promotions/{promotion}/reactivate', [SellerController::class, 'reactivatePromotion']);
        Route::get('/documents', [SellerSecurityController::class, 'documents']);
        Route::post('/documents/{sellerDocument}/renew', [SellerSecurityController::class, 'renew'])->middleware('throttle:5,60');
        Route::get('/settings/security', [SellerSecurityController::class, 'security']);
        Route::post('/settings/security/password/challenge', [SellerSecurityController::class, 'passwordChallenge'])->middleware('throttle:3,10');
        Route::patch('/settings/security/password', [SellerSecurityController::class, 'changePassword'])->middleware('throttle:5,10');
        Route::post('/settings/security/mfa/challenge', [SellerSecurityController::class, 'mfaChallenge'])->middleware('throttle:3,10');
        Route::post('/settings/security/mfa/verify', [SellerSecurityController::class, 'mfaVerify'])->middleware('throttle:5,10');
        Route::delete('/settings/security/sessions/{tokenId}', [SellerSecurityController::class, 'revokeSession'])->middleware('throttle:10,1');
        Route::post('/settings/danger-zone/challenge', [SellerSecurityController::class, 'dangerChallenge'])->middleware('throttle:3,10');
        Route::post('/settings/danger-zone/verify', [SellerSecurityController::class, 'dangerVerify'])->middleware('throttle:5,10');
    });

Route::prefix('courier')
    ->middleware(['auth:sanctum', 'account.active', 'courier.active'])
    ->group(function () {
        Route::get('/profile', [CourierOperationsController::class, 'profile'])->middleware('throttle:60,1');
        Route::patch('/availability', [CourierOperationsController::class, 'availability'])->middleware('throttle:30,1');
        Route::get('/dashboard', [CourierOperationsController::class, 'dashboard'])->middleware('throttle:60,1');
        Route::get('/deliveries', [CourierOperationsController::class, 'index'])->middleware('throttle:60,1');
        Route::get('/deliveries/{shipment}', [CourierOperationsController::class, 'show'])->middleware('throttle:60,1');
        Route::patch('/deliveries/{shipment}/status', [CourierOperationsController::class, 'updateStatus'])->middleware('throttle:30,1');
        Route::post('/deliveries/{shipment}/deliver', [CourierOperationsController::class, 'deliver'])->middleware('throttle:10,1');
        Route::get('/earnings/summary', [CourierOperationsController::class, 'earnings'])->middleware('throttle:60,1');
        Route::get('/payouts', [CourierOperationsController::class, 'payouts'])->middleware('throttle:60,1');
    });

Route::prefix('logistics')
    ->middleware(['auth:sanctum', 'account.active', 'logistics.staff.active'])
    ->group(function () {
        Route::get('/context', [LogisticsOperationsController::class, 'context']);
        Route::get('/hubs', [LogisticsOperationsController::class, 'hubs']);
        Route::post('/hubs', [LogisticsOperationsController::class, 'storeHub']);
        Route::patch('/hubs/{hub}', [LogisticsOperationsController::class, 'updateHub']);
        Route::put('/hubs/{hub}/service-areas', [LogisticsOperationsController::class, 'replaceServiceAreas']);
        Route::get('/shipments', [LogisticsOperationsController::class, 'shipments']);
        Route::get('/shipments/{shipment}', [LogisticsOperationsController::class, 'showShipment']);
        Route::post('/shipments/{shipment}/check-in', [LogisticsOperationsController::class, 'checkIn']);
        Route::patch('/shipments/{shipment}/courier', [LogisticsOperationsController::class, 'assignCourier']);
        Route::get('/riders', [LogisticsOperationsController::class, 'riders']);
        Route::post('/riders/{courier}/affiliate', [LogisticsOperationsController::class, 'affiliate']);
        Route::post('/affiliations/{affiliation}/end', [LogisticsOperationsController::class, 'endAffiliation']);
        Route::get('/rider-applications', [LogisticsRiderApplicationController::class, 'index']);
        Route::get('/rider-applications/{courierApplication}', [LogisticsRiderApplicationController::class, 'show']);
        Route::post('/rider-applications/{courierApplication}/approve', [LogisticsRiderApplicationController::class, 'approve'])->middleware('throttle:20,1');
        Route::post('/rider-applications/{courierApplication}/reject', [LogisticsRiderApplicationController::class, 'reject'])->middleware('throttle:20,1');
        Route::get('/rider-documents/{courierDocument}/view', [LogisticsRiderApplicationController::class, 'viewDocument'])->middleware('throttle:30,1');
    });

Route::prefix('admin')
    ->middleware(['auth:sanctum', 'account.active', 'role:admin'])
    ->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/profile', [AccountController::class, 'updateProfile']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{user}/status', [AdminController::class, 'updateUserStatus']);
        Route::get('/user-registrations', [AdminUserRegistrationController::class, 'index']);
        Route::get('/user-registrations/{user}', [AdminUserRegistrationController::class, 'show']);
        Route::post('/user-registrations/{user}/approve', [AdminUserRegistrationController::class, 'approve'])->middleware('throttle:20,1');
        Route::post('/user-registrations/{user}/reject', [AdminUserRegistrationController::class, 'reject'])->middleware('throttle:20,1');
        Route::get('/user-documents/{userDocument}/view', [AdminUserRegistrationController::class, 'viewDocument'])->middleware('throttle:30,1');
        Route::get('/sellers', [AdminController::class, 'sellers']);
        Route::patch('/sellers/{seller}/status', [AdminController::class, 'updateSellerStatus']);
        Route::get('/products', [AdminController::class, 'products']);
        Route::patch('/products/{product}/status', [AdminController::class, 'updateProductStatus']);
        Route::get('/orders', [AdminController::class, 'orders']);
        Route::get('/orders/{order}', [AdminController::class, 'order']);
        Route::patch('/seller-orders/{sellerOrder}/delivery-status', [AdminController::class, 'updateDeliveryStatus']);
        Route::get('/couriers/eligible', [AdminCourierOperationsController::class, 'eligibleCouriers']);
        Route::patch('/shipments/{shipment}/courier', [AdminCourierOperationsController::class, 'assign']);
        Route::get('/logistics/providers', [AdminLogisticsController::class, 'providers']);
        Route::post('/logistics/providers', [AdminLogisticsController::class, 'storeProvider']);
        Route::get('/logistics/providers/{provider}', [AdminLogisticsController::class, 'showProvider']);
        Route::patch('/logistics/providers/{provider}', [AdminLogisticsController::class, 'updateProvider']);
        Route::post('/logistics/providers/{provider}/staff', [AdminLogisticsController::class, 'storeStaff']);
        Route::patch('/logistics/staff/{staff}', [AdminLogisticsController::class, 'updateStaff']);
        Route::patch('/logistics/shipments/{shipment}/provider', [AdminLogisticsController::class, 'assignProvider']);
        Route::get('/logistics-applications', [AdminLogisticsApplicationController::class, 'index']);
        Route::get('/logistics-applications/{logisticsApplication}', [AdminLogisticsApplicationController::class, 'show']);
        Route::post('/logistics-applications/{logisticsApplication}/approve', [AdminLogisticsApplicationController::class, 'approve'])->middleware('throttle:20,1');
        Route::post('/logistics-applications/{logisticsApplication}/reject', [AdminLogisticsApplicationController::class, 'reject'])->middleware('throttle:20,1');
        Route::get('/logistics-documents/{logisticsDocument}/view', [AdminLogisticsApplicationController::class, 'viewDocument'])->middleware('throttle:30,1');
        Route::get('/categories', [AdminController::class, 'categories']);
        Route::post('/categories', [AdminController::class, 'storeCategory']);
        Route::patch('/categories/{category}', [AdminController::class, 'updateCategory']);
        Route::get('/analytics', [AdminController::class, 'analytics']);
        Route::get('/payouts', [AdminPayoutController::class, 'index']);
        Route::post('/payouts/generate', [AdminPayoutController::class, 'generate']);
        Route::get('/payouts/{payout}', [AdminPayoutController::class, 'show']);
        Route::post('/payouts/{payout}/transition', [AdminPayoutController::class, 'transition']);
        Route::get('/payouts/{payout}/pdf', [AdminPayoutController::class, 'pdf']);
        Route::get('/commissions', [AdminPayoutController::class, 'commissions']);
        Route::get('/commissions/export', [AdminPayoutController::class, 'exportCommissions']);
        Route::get('/commission-rates', [AdminPayoutController::class, 'rates']);
        Route::post('/commission-rates/challenge', [AdminPayoutController::class, 'rateChallenge'])->middleware('throttle:3,10');
        Route::post('/commission-rates', [AdminPayoutController::class, 'storeRate'])->middleware('throttle:5,10');
        Route::get('/analytics/platform', [AdminPlatformController::class, 'analytics']);
        Route::get('/activity', [AdminPlatformController::class, 'activity']);
        Route::get('/settings', [AdminPlatformController::class, 'settings']);
        Route::put('/settings', [AdminPlatformController::class, 'updateSettings']);
        Route::patch('/settings', [AdminPlatformController::class, 'updateSettings']);
        Route::post('/security/password/mfa-challenge', [AdminPlatformController::class, 'passwordChallenge'])->middleware('throttle:3,10');
        Route::post('/security/password', [AdminPlatformController::class, 'changePassword'])->middleware('throttle:5,10');
        Route::get('/document-renewals', [AdminPlatformController::class, 'renewals']);
        Route::patch('/document-renewals/{sellerDocument}', [AdminPlatformController::class, 'reviewRenewal']);
        Route::get('/seller-applications', [SellerApplicationController::class, 'index']);
        Route::get('/seller-applications/{sellerApplication}', [SellerApplicationController::class, 'show']);
        Route::post('/seller-applications/{sellerApplication}/approve', [SellerApplicationController::class, 'approve']);
        Route::post('/seller-applications/{sellerApplication}/reject', [SellerApplicationController::class, 'reject']);
        Route::post('/seller-applications/{sellerApplication}/request-revision', [SellerApplicationController::class, 'requestRevision']);
        Route::get('/seller-documents/{sellerDocument}/view', [SellerApplicationController::class, 'viewDocument']);
        Route::get('/courier-applications', [CourierApplicationController::class, 'index']);
        Route::get('/courier-applications/{courierApplication}', [CourierApplicationController::class, 'show']);
        Route::get('/courier-documents/{courierDocument}/view', [CourierApplicationController::class, 'viewDocument'])->middleware('throttle:30,1');
        Route::get('/reports', [ModerationController::class, 'adminReports']);
        Route::get('/reports/{report}', [ModerationController::class, 'adminReport']);
        Route::patch('/reports/{report}', [ModerationController::class, 'updateReport']);
        Route::get('/reports/{report}/attachments/{attachment}', [ModerationController::class, 'reportAttachment']);
        Route::get('/disputes', [AdminDisputeController::class, 'index']);
        Route::get('/disputes/{dispute}', [AdminDisputeController::class, 'show']);
        Route::patch('/disputes/{dispute}/resolve', [AdminDisputeController::class, 'resolve']);
        Route::get('/disputes/{dispute}/evidence/{evidence}', [AdminDisputeController::class, 'evidence']);
    });
