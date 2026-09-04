<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerApproved
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Seller is additive but requires an approved Marketplace profile.
        // `users.role === 'seller'` remains legacy data only.
        $user->unsetRelation('seller');

        if (! $user->canShopMarketplace()) {
            return response()->json([
                'message' => 'Approved Marketplace access is required before becoming a seller.',
                'code' => 'marketplace_access_required',
            ], 403);
        }

        if (! $user->hasApprovedSellerProfile()) {
            return response()->json([
                'message' => 'Your seller application has not been approved yet.',
                'code' => 'seller_not_approved',
            ], 403);
        }

        return $next($request);
    }
}
