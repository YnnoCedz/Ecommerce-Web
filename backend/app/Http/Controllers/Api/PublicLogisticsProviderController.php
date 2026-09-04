<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogisticsProvider;
use Illuminate\Http\JsonResponse;

class PublicLogisticsProviderController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => LogisticsProvider::query()
            ->where('status', 'active')->whereNotNull('approved_at')
            ->orderBy('company_name')->get(['id', 'code', 'company_name'])]);
    }
}
