<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCourierActive
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user->unsetRelation('courier');

        if (! $user->hasActiveCourierProfile()) {
            return response()->json([
                'message' => 'An approved active courier profile is required.',
                'code' => 'rider_not_active',
            ], 403);
        }

        return $next($request);
    }
}
