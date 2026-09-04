<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryProof;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeliveryProofController extends Controller
{
    public function show(Request $request, Shipment $shipment): JsonResponse
    {
        $proof = $this->authorizedProof($request, $shipment);

        return response()->json(['data' => [
            'id' => $proof->id,
            'shipment_id' => $shipment->id,
            'submitted_at' => optional($proof->submitted_at)->toISOString(),
            'note' => $proof->note,
            'image_url' => route('shipment.delivery-proof.content', $shipment),
        ]]);
    }

    public function content(Request $request, Shipment $shipment): StreamedResponse|JsonResponse
    {
        $proof = $this->authorizedProof($request, $shipment);
        $disk = Storage::disk($proof->storage_disk);
        if (! $disk->exists($proof->file_path)) {
            return response()->json([
                'message' => 'The proof-of-delivery image is unavailable.',
                'code' => 'delivery_proof_file_unavailable',
            ], 404);
        }

        $extension = match ($proof->mime_type) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };

        return $disk->response(
            $proof->file_path,
            "proof-of-delivery.{$extension}",
            [
                'Content-Type' => $proof->mime_type,
                'Content-Disposition' => "inline; filename=\"proof-of-delivery.{$extension}\"",
                'Cache-Control' => 'private, no-store, max-age=0',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    private function authorizedProof(Request $request, Shipment $shipment): DeliveryProof
    {
        $shipment->loadMissing([
            'deliveryProof',
            'courier.user:id',
            'sellerOrder.order:id,buyer_id',
            'sellerOrder.seller:id,user_id',
        ]);
        $user = $request->user();
        $authorized = $user->role === 'admin'
            || $shipment->courier?->user_id === $user->id
            || $shipment->sellerOrder?->order?->buyer_id === $user->id
            || $shipment->sellerOrder?->seller?->user_id === $user->id;

        if (! $authorized) {
            abort(404, 'Proof of delivery not found.');
        }
        if (! $shipment->deliveryProof) {
            abort(404, 'Proof of delivery not found.');
        }

        return $shipment->deliveryProof;
    }
}
