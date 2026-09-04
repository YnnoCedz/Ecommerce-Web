<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLogisticsStaffActive
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user->unsetRelation('logisticsStaff');
        if (! $user->hasActiveLogisticsStaffProfile()) {
            return response()->json([
                'message' => 'An active logistics staff capability with an active provider is required.',
                'code' => 'logistics_access_denied',
            ], 403);
        }

        return $next($request);
    }
}
