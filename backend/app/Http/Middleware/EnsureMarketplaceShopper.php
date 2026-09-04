<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMarketplaceShopper
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! $user->canShopMarketplace()) {
            $profile = $user->marketplaceProfile()->first();

            return response()->json([
                'message' => match ($profile?->status) {
                    'pending' => 'Your Marketplace application is awaiting review.',
                    'rejected' => 'Your Marketplace application was not approved.',
                    default => 'Marketplace access is required.',
                },
                'code' => match ($profile?->status) {
                    'pending' => 'marketplace_application_pending',
                    'rejected' => 'marketplace_application_rejected',
                    default => 'marketplace_access_required',
                },
            ], 403);
        }

        return $next($request);
    }
}
