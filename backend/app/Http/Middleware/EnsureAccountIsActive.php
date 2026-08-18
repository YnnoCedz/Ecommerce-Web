<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (! $user->canAccessPlatformArea()) {
            return response()->json([
                'message' => match ($user->status) {
                    'suspended' => 'This account has been suspended.',
                    'restricted' => 'This account is currently restricted.',
                    default => 'This account is pending approval.',
                },
                'code' => match ($user->status) {
                    'suspended' => 'account_suspended',
                    'restricted' => 'account_restricted',
                    default => 'account_pending',
                },
            ], 403);
        }

        return $next($request);
    }
}
