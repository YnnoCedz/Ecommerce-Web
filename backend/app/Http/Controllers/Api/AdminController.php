<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Report;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'data' => [
                'users' => User::count(),
                'buyers' => User::where('role', 'buyer')->count(),
                'sellers' => Seller::count(),
                'approved_sellers' => Seller::where('status', 'approved')->count(),
                'pending_seller_applications' => DB::table('seller_applications')->where('status', 'pending')->count(),
                'products' => Product::count(),
                'orders' => Order::count(),
                'reports' => Report::count(),
            ],
        ]);
    }

    public function users(): JsonResponse
    {
        return response()->json([
            'data' => User::query()
                ->latest('id')
                ->limit(25)
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->display_name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                    'email_verified_at' => optional($user->email_verified_at)->toISOString(),
                    'last_active_at' => optional($user->last_active_at)->toISOString(),
                ])
                ->values(),
        ]);
    }

    public function sellers(): JsonResponse
    {
        return response()->json([
            'data' => Seller::query()
                ->with('user')
                ->latest('id')
                ->limit(25)
                ->get()
                ->map(fn (Seller $seller) => [
                    'id' => $seller->id,
                    'slug' => $seller->slug,
                    'business_name' => $seller->business_name,
                    'trade_name' => $seller->trade_name,
                    'status' => $seller->status,
                    'verified' => (bool) $seller->verified,
                    'user' => $seller->user ? [
                        'id' => $seller->user->id,
                        'name' => $seller->user->display_name,
                        'email' => $seller->user->email,
                    ] : null,
                ])
                ->values(),
        ]);
    }

    public function sellerApplications(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('seller_applications')
                ->leftJoin('users', 'users.id', '=', 'seller_applications.applicant_user_id')
                ->select([
                    'seller_applications.id',
                    'seller_applications.business_name',
                    'seller_applications.trade_name',
                    'seller_applications.slug',
                    'seller_applications.status',
                    'seller_applications.submitted_at',
                    'users.email as applicant_email',
                    DB::raw("COALESCE(users.name, CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))) as applicant_name"),
                ])
                ->orderByDesc('seller_applications.id')
                ->limit(25)
                ->get(),
        ]);
    }

    public function reports(): JsonResponse
    {
        return response()->json([
            'data' => Report::query()
                ->latest('id')
                ->limit(25)
                ->get()
                ->map(fn (Report $report) => [
                    'id' => $report->id,
                    'status' => $report->status,
                    'reason' => $report->reason ?? null,
                    'details' => $report->details ?? null,
                    'target_type' => $report->target_type ?? null,
                    'target_id' => $report->target_id ?? null,
                ])
                ->values(),
        ]);
    }
}
