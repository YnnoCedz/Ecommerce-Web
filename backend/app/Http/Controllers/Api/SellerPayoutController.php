<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerPayoutController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = Payout::query()->where('recipient_type', 'seller')->where('recipient_id', $request->user()->seller->id)->latest('id')->paginate(20);

        return response()->json(['data' => $page->items(), 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()]]);
    }

    public function show(Request $request, Payout $payout): JsonResponse
    {
        abort_unless($payout->recipient_type === 'seller' && $payout->recipient_id === $request->user()->seller->id, 404);

        return response()->json(['data' => $payout->load('items')]);
    }
}
