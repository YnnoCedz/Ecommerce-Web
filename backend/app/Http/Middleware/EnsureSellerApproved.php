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

        if (! $user->isSeller()) {
            return response()->json([
                'message' => 'Seller access is required.',
                'code' => 'seller_role_required',
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
