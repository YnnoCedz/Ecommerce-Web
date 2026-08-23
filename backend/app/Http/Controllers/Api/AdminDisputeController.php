<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Models\Payment;
use App\Models\ReturnEvidence;
use App\Services\AdminDisputeResolutionService;
use App\Services\MediaStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminDisputeController extends Controller
{
    public function __construct(
        private readonly AdminDisputeResolutionService $resolutions,
        private readonly MediaStorageService $media,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:50'],
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Dispute::query()->with([
            'returnRequest.order',
            'returnRequest.buyer',
            'returnRequest.seller',
            'resolver',
        ]);
        $query->when($data['status'] ?? null, fn (Builder $builder, string $status) => $builder->where('status', $status));
        $query->when(trim((string) ($data['search'] ?? '')), function (Builder $builder, string $search) {
            $builder->where(function (Builder $nested) use ($search) {
                $nested->where('reason', 'like', "%{$search}%")
                    ->orWhereHas('returnRequest.order', fn (Builder $order) => $order->where('order_number', 'like', "%{$search}%"))
                    ->orWhereHas('returnRequest.buyer', fn (Builder $buyer) => $buyer->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('returnRequest.seller', fn (Builder $seller) => $seller->where('business_name', 'like', "%{$search}%")->orWhere('trade_name', 'like', "%{$search}%"));
            });
        });

        $disputes = $query->latest('opened_at')->latest('id')->limit((int) ($data['limit'] ?? 100))->get();

        return response()->json([
            'data' => $disputes->map(fn (Dispute $dispute) => $this->summaryPayload($dispute))->values(),
            'meta' => [
                'total_count' => Dispute::count(),
                'open_count' => Dispute::whereIn('status', ['open', 'reviewing'])->count(),
                'resolved_count' => Dispute::whereIn('status', ['resolved', 'rejected'])->count(),
            ],
        ]);
    }

    public function show(Dispute $dispute): JsonResponse
    {
        return response()->json(['data' => $this->detailPayload($this->loadDetail($dispute))]);
    }

    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        $data = $request->validate([
            'resolution_type' => ['required', Rule::in(['approve_return', 'reject', 'full_refund', 'partial_refund', 'buyer_side', 'seller_side'])],
            'resolution_notes' => ['required', 'string', 'min:5', 'max:3000'],
            'refund_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0.01', Rule::requiredIf($request->input('resolution_type') === 'partial_refund')],
        ]);

        $resolved = $this->resolutions->resolve(
            $dispute,
            $request->user(),
            $data['resolution_type'],
            trim($data['resolution_notes']),
            isset($data['refund_amount']) ? (float) $data['refund_amount'] : null,
        );

        return response()->json([
            'message' => 'Dispute resolved.',
            'data' => $this->detailPayload($this->loadDetail($resolved)),
        ]);
    }

    public function evidence(Dispute $dispute, ReturnEvidence $evidence): RedirectResponse
    {
        abort_unless($evidence->return_request_id === $dispute->return_request_id, 404);

        return redirect()->away($this->media->temporaryUrl($evidence->storage_path, 10, $evidence->storage_disk));
    }

    private function loadDetail(Dispute $dispute): Dispute
    {
        return $dispute->load([
            'opener',
            'resolver',
            'returnRequest.buyer',
            'returnRequest.seller.user',
            'returnRequest.order.payments',
            'returnRequest.sellerOrder',
            'returnRequest.items.orderItem',
            'returnRequest.evidence.uploader',
        ]);
    }

    private function summaryPayload(Dispute $dispute): array
    {
        $return = $dispute->returnRequest;

        return [
            'id' => $dispute->id,
            'reference' => 'DSP-'.str_pad((string) $dispute->id, 6, '0', STR_PAD_LEFT),
            'status' => $dispute->status,
            'reason' => $dispute->reason,
            'order_number' => $return?->order?->order_number,
            'return_request_id' => $dispute->return_request_id,
            'buyer_name' => $return?->buyer?->display_name,
            'seller_name' => $return?->seller?->trade_name ?: $return?->seller?->business_name,
            'requested_amount' => (float) ($return?->requested_amount ?? 0),
            'refund_amount' => (float) $dispute->refund_amount,
            'resolution_type' => $dispute->resolution_type,
            'opened_at' => optional($dispute->opened_at)->toISOString(),
            'resolved_at' => optional($dispute->resolved_at)->toISOString(),
        ];
    }

    private function detailPayload(Dispute $dispute): array
    {
        $return = $dispute->returnRequest;
        $summary = $this->summaryPayload($dispute);

        return $summary + [
            'buyer_statement' => $dispute->buyer_statement ?: $return->buyer_statement,
            'seller_response' => $dispute->seller_response ?: $return->seller_response,
            'resolution_notes' => $dispute->resolution_notes ?: $dispute->resolution_note,
            'resolved_by' => $dispute->resolver ? [
                'id' => $dispute->resolver->id,
                'name' => $dispute->resolver->display_name,
            ] : null,
            'buyer' => [
                'id' => $return->buyer->id,
                'name' => $return->buyer->display_name,
                'email' => $return->buyer->email,
            ],
            'seller' => [
                'id' => $return->seller->id,
                'name' => $return->seller->trade_name ?: $return->seller->business_name,
                'email' => $return->seller->user?->email,
            ],
            'order' => [
                'id' => $return->order->id,
                'order_number' => $return->order->order_number,
                'status' => $return->order->status,
                'payment_status' => $return->order->payment_status,
                'payment_method' => $return->order->payment_method,
                'grand_total' => (float) $return->order->grand_total,
                'placed_at' => optional($return->order->placed_at)->toISOString(),
            ],
            'seller_order' => [
                'id' => $return->sellerOrder->id,
                'status' => $return->sellerOrder->status,
                'grand_total' => (float) $return->sellerOrder->grand_total,
            ],
            'return_request' => [
                'id' => $return->id,
                'status' => $return->status,
                'reason' => $return->reason,
                'buyer_statement' => $return->buyer_statement,
                'seller_response' => $return->seller_response,
                'requested_amount' => (float) $return->requested_amount,
                'refunded_amount' => (float) $return->refunded_amount,
                'requested_at' => optional($return->requested_at)->toISOString(),
                'resolved_at' => optional($return->resolved_at)->toISOString(),
            ],
            'items' => $return->items->map(fn ($item) => [
                'id' => $item->id,
                'order_item_id' => $item->order_item_id,
                'product_name' => $item->orderItem?->product_name,
                'sku' => $item->orderItem?->sku,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'refund_amount' => (float) $item->refund_amount,
            ])->values(),
            'evidence' => $return->evidence->map(fn (ReturnEvidence $evidence) => [
                'id' => $evidence->id,
                'name' => $evidence->original_filename,
                'mime_type' => $evidence->mime_type,
                'file_size' => $evidence->file_size,
                'uploaded_by' => $evidence->uploader?->display_name,
                'created_at' => optional($evidence->created_at)->toISOString(),
                'url' => "/api/admin/disputes/{$dispute->id}/evidence/{$evidence->id}",
            ])->values(),
            'payments' => $return->order->payments->sortBy('id')->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'parent_payment_id' => $payment->parent_payment_id,
                'type' => $payment->type,
                'method' => $payment->method,
                'provider' => $payment->provider,
                'status' => $payment->status,
                'amount' => (float) $payment->amount,
                'refunded_amount' => (float) $payment->refunded_amount,
                'currency' => $payment->currency,
                'reference' => $payment->provider_reference,
                'occurred_at' => optional($payment->paid_at ?: $payment->created_at)->toISOString(),
            ])->values(),
            'created_at' => optional($dispute->created_at)->toISOString(),
            'updated_at' => optional($dispute->updated_at)->toISOString(),
        ];
    }
}
