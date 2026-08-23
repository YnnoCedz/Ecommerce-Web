<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReturnEvidence;
use App\Models\ReturnRequest;
use App\Models\SellerOrder;
use App\Services\MediaStorageService;
use App\Services\OrderResolutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OrderResolutionController extends Controller
{
    public function __construct(
        private readonly OrderResolutionService $resolutions,
        private readonly MediaStorageService $media,
    ) {
    }

    public function cancel(Request $request, string $orderNumber, SellerOrder $sellerOrder): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        abort_if($sellerOrder->order?->order_number !== $orderNumber, 404);
        $cancellation = $this->resolutions->cancelSellerOrder($sellerOrder, $request->user(), trim($data['reason']));

        return response()->json(['message' => 'Seller order cancelled.', 'data' => $cancellation], 201);
    }

    public function buyerReturns(Request $request): JsonResponse
    {
        $returns = ReturnRequest::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['order', 'seller', 'items.orderItem', 'evidence', 'dispute'])
            ->latest('id')->get()->map(fn ($return) => $this->payload($return))->values();

        return response()->json(['data' => $returns]);
    }

    public function sellerCancel(Request $request, SellerOrder $sellerOrder): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        $cancellation = $this->resolutions->cancelSellerOrder($sellerOrder, $request->user(), trim($data['reason']), true);

        return response()->json(['message' => 'Seller order cancelled and inventory restored.', 'data' => $cancellation], 201);
    }

    public function storeReturn(Request $request, string $orderNumber, SellerOrder $sellerOrder): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'in:damaged_item,wrong_item,missing_item,defective_item,not_as_described,other'],
            'buyer_statement' => ['nullable', 'string', 'max:3000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'distinct', 'exists:order_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'evidence' => ['sometimes', 'array', 'max:5'],
            'evidence.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);
        abort_if($sellerOrder->order?->order_number !== $orderNumber, 404);
        $return = $this->resolutions->requestReturn($sellerOrder, $request->user(), $data, $request->file('evidence', []));

        return response()->json(['message' => 'Return request submitted.', 'data' => $this->payload($return)], 201);
    }

    public function escalate(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255'], 'buyer_statement' => ['nullable', 'string', 'max:3000']]);
        $dispute = $this->resolutions->escalate($returnRequest, $request->user(), $data['reason'], $data['buyer_statement'] ?? null);

        return response()->json(['message' => 'Dispute escalated for admin review.', 'data' => $dispute], 201);
    }

    public function sellerReturns(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;
        $returns = ReturnRequest::query()->where('seller_id', $seller->id)
            ->with(['order', 'buyer', 'items.orderItem', 'evidence', 'dispute'])
            ->latest('id')->get()->map(fn ($return) => $this->payload($return))->values();

        return response()->json(['data' => $returns]);
    }

    public function updateReturn(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:under_review,approved,rejected,return_in_transit,received,refunded,closed'],
            'seller_response' => ['nullable', 'string', 'max:3000'],
        ]);
        $updated = $this->resolutions->transitionReturn($returnRequest, $request->user()->seller->id, $data['status'], $data['seller_response'] ?? null);

        return response()->json(['message' => 'Return status updated.', 'data' => $this->payload($updated)]);
    }

    public function evidence(Request $request, ReturnEvidence $evidence): RedirectResponse
    {
        $return = $evidence->returnRequest;
        $user = $request->user();
        abort_unless($return->buyer_id === $user->id || $return->seller?->user_id === $user->id || $user->role === 'admin', 404);

        return redirect()->away($this->media->temporaryUrl($evidence->storage_path, 10, $evidence->storage_disk));
    }

    private function payload(ReturnRequest $return): array
    {
        return [
            'id' => $return->id,
            'order_id' => $return->order_id,
            'order_number' => $return->order?->order_number,
            'seller_order_id' => $return->seller_order_id,
            'seller_name' => $return->seller?->trade_name ?? $return->seller?->business_name,
            'buyer_name' => $return->buyer?->display_name,
            'status' => $return->status,
            'reason' => $return->reason,
            'buyer_statement' => $return->buyer_statement,
            'seller_response' => $return->seller_response,
            'requested_amount' => (float) $return->requested_amount,
            'refunded_amount' => (float) $return->refunded_amount,
            'requested_at' => optional($return->requested_at)->toISOString(),
            'items' => $return->items->map(fn ($item) => [
                'id' => $item->id,
                'order_item_id' => $item->order_item_id,
                'product_name' => $item->orderItem?->product_name,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'refund_amount' => (float) $item->refund_amount,
            ])->values(),
            'evidence' => $return->evidence->map(fn ($evidence) => [
                'id' => $evidence->id,
                'name' => $evidence->original_filename,
                'mime_type' => $evidence->mime_type,
                'url' => "/api/return-evidence/{$evidence->id}",
            ])->values(),
            'dispute' => $return->dispute,
        ];
    }
}
