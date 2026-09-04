<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourierDeliveryDetailResource;
use App\Http\Resources\CourierDeliveryListResource;
use App\Models\CommissionEntry;
use App\Models\Courier;
use App\Models\Payout;
use App\Models\Shipment;
use App\Services\ActivityLogger;
use App\Services\CourierDeliveryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

class CourierOperationsController extends Controller
{
    public function __construct(
        private readonly CourierDeliveryService $deliveries,
        private readonly ActivityLogger $activity,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        $courier = $this->courier($request);

        return response()->json(['data' => $this->profilePayload($courier)]);
    }

    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'availability' => ['required', Rule::in(['offline', 'available', 'busy'])],
        ]);
        $courier = $this->courier($request);
        if (! $courier->active || $courier->status !== 'active' || ! $courier->approved_at) {
            return response()->json(['message' => 'This courier account is not active.', 'code' => 'courier_not_active'], 403);
        }

        $previous = $courier->availability_status;
        $courier->update(['availability_status' => $data['availability']]);
        $this->activity->log(
            'courier.availability.updated', 'delivery', 'Courier availability updated.',
            $request->user(), $request, $courier,
            ['old_availability' => $previous, 'new_availability' => $data['availability']],
        );

        return response()->json([
            'message' => 'Courier availability updated.',
            'data' => ['availability' => $courier->fresh()->availability_status],
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $courier = $this->courier($request);
        $base = Shipment::query()->where('courier_id', $courier->id);
        $activeStatuses = ['ready', 'picked-up', 'in-transit', 'out-for-delivery'];
        $current = (clone $base)->whereIn('status', $activeStatuses)
            ->with($this->listRelations())->withSum('items', 'quantity')
            ->latest('updated_at')->first();

        return response()->json(['data' => [
            'availability' => $courier->availability_status,
            'active_delivery_count' => (clone $base)->whereIn('status', $activeStatuses)->count(),
            'assigned_count' => (clone $base)->where('status', 'ready')->count(),
            'completed_today' => (clone $base)->where('status', 'delivered')->whereDate('delivered_at', today())->count(),
            'current_delivery' => $current ? (new CourierDeliveryListResource($current))->resolve($request) : null,
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['assigned', 'current', 'active', 'completed', 'failed', 'all'])],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $courier = $this->courier($request);
        $scope = $data['status'] ?? 'active';
        $query = Shipment::query()->where('courier_id', $courier->id)
            ->with($this->listRelations())
            ->withSum('items', 'quantity');

        match ($scope) {
            'assigned' => $query->where('status', 'ready'),
            'current', 'active' => $query->whereIn('status', ['ready', 'picked-up', 'in-transit', 'out-for-delivery']),
            'completed' => $query->where('status', 'delivered'),
            'failed' => $query->whereIn('status', ['failed', 'cancelled']),
            'all' => null,
        };
        $query->when(trim((string) ($data['search'] ?? '')), function (Builder $query, string $search) {
            $query->where(function (Builder $nested) use ($search) {
                $nested->where('tracking_number', 'like', "%{$search}%")
                    ->orWhereHas('sellerOrder.order', fn (Builder $order) => $order->where('shipping_name', 'like', "%{$search}%"))
                    ->orWhereHas('sellerOrder.seller', fn (Builder $seller) => $seller->where('business_name', 'like', "%{$search}%")->orWhere('trade_name', 'like', "%{$search}%"));
            });
        });
        $scope === 'completed' ? $query->latest('delivered_at') : $query->latest('updated_at');
        $page = $query->paginate((int) ($data['per_page'] ?? 15));

        return response()->json([
            'data' => $page->getCollection()->map(fn (Shipment $shipment) => (new CourierDeliveryListResource($shipment))->resolve($request))->values(),
            'meta' => [
                'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(), 'total' => $page->total(),
            ],
        ]);
    }

    public function show(Request $request, Shipment $shipment): JsonResponse
    {
        $courier = $this->courier($request);
        $this->assertOwnership($shipment, $courier);
        $shipment->load([
            'sellerOrder.order', 'sellerOrder.seller', 'sellerOrder.items',
            'currentHub', 'logisticsProvider',
            'deliveryProof',
            'trackingEvents' => fn ($query) => $query->orderBy('occurred_at')->orderBy('id'),
        ]);

        return response()->json(['data' => (new CourierDeliveryDetailResource($shipment))->resolve($request)]);
    }

    public function updateStatus(Request $request, Shipment $shipment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['picked-up', 'in-transit', 'out-for-delivery', 'delivered'])],
            'note' => ['nullable', 'string', 'max:1000'],
            'location' => ['nullable', 'string', 'max:160'],
        ]);
        $courier = $this->courier($request);
        $this->assertOwnership($shipment, $courier);
        try {
            $updated = $this->deliveries->transitionByCourier(
                $shipment, $courier, $request->user(), $data['status'],
                $data['note'] ?? null, $data['location'] ?? null,
            );
        } catch (ValidationException $exception) {
            return $this->transitionError($exception);
        }

        return response()->json([
            'message' => 'Delivery status updated.',
            'data' => (new CourierDeliveryDetailResource($updated))->resolve($request),
        ]);
    }

    public function deliver(Request $request, Shipment $shipment): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'proof_image' => [
                'required',
                'max:'.((int) config('courier.delivery_proof_max_kilobytes', 8192)),
                File::image()
                    ->types(['jpg', 'jpeg', 'png', 'webp'])
                    ->max((int) config('courier.delivery_proof_max_kilobytes', 8192)),
            ],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        if ($validator->fails()) {
            $failed = $validator->failed()['proof_image'] ?? [];
            [$code, $message] = match (true) {
                isset($failed['Required']) => ['proof_of_delivery_required', 'A proof-of-delivery image is required.'],
                isset($failed['Max']) => ['delivery_proof_too_large', 'The proof-of-delivery image is too large.'],
                default => ['invalid_delivery_proof', 'Please upload a valid JPEG, PNG, or WebP image.'],
            };

            return response()->json([
                'message' => $message,
                'code' => $code,
                'errors' => $validator->errors(),
            ], 422);
        }

        $courier = $this->courier($request);
        $this->assertOwnership($shipment, $courier);
        try {
            $updated = $this->deliveries->deliverWithProof(
                $shipment,
                $courier,
                $request->user(),
                $request->file('proof_image'),
                $request->string('note')->toString(),
            );
        } catch (ValidationException $exception) {
            return $this->transitionError($exception);
        } catch (RuntimeException) {
            return response()->json([
                'message' => "We couldn't store the proof of delivery. Please try again.",
                'code' => 'delivery_proof_storage_failed',
            ], 503);
        }

        return response()->json([
            'message' => 'Delivery completed with proof of delivery.',
            'data' => (new CourierDeliveryDetailResource($updated))->resolve($request),
        ]);
    }

    public function earnings(Request $request): JsonResponse
    {
        $courier = $this->courier($request);
        $entries = CommissionEntry::query()
            ->where('commission_type', 'courier_delivery')
            ->where('recipient_type', 'courier')
            ->where('recipient_id', $courier->id)
            ->whereNotIn('status', ['reversed', 'refunded']);

        return response()->json(['data' => [
            'currency' => 'PHP',
            'total_earned' => (string) ((clone $entries)->sum('net_amount') ?? '0.00'),
            'pending_payout' => (string) ((clone $entries)->whereNull('payout_id')->sum('net_amount') ?? '0.00'),
            'paid_out' => (string) Payout::query()->where('recipient_type', 'courier')->where('recipient_id', $courier->id)->where('status', 'paid')->sum('net_amount'),
            'delivery_count' => (clone $entries)->count(),
        ]]);
    }

    public function payouts(Request $request): JsonResponse
    {
        $data = $request->validate(['page' => ['nullable', 'integer', 'min:1'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:50']]);
        $courier = $this->courier($request);
        $page = Payout::query()->where('recipient_type', 'courier')->where('recipient_id', $courier->id)
            ->latest('id')->paginate((int) ($data['per_page'] ?? 15));

        return response()->json([
            'data' => $page->getCollection()->map(fn (Payout $payout) => [
                'id' => $payout->id, 'payout_number' => $payout->payout_number,
                'period_start' => optional($payout->period_start)->toDateString(),
                'period_end' => optional($payout->period_end)->toDateString(),
                'currency' => $payout->currency, 'gross_amount' => (string) $payout->gross_amount,
                'commission_amount' => (string) $payout->commission_amount,
                'net_amount' => (string) $payout->net_amount, 'status' => $payout->status,
                'paid_at' => optional($payout->paid_at)->toISOString(),
            ])->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }

    private function courier(Request $request): Courier
    {
        $user = $request->user();

        return $user->relationLoaded('courier')
            ? $user->getRelation('courier')
            : Courier::query()->where('user_id', $user->id)->firstOrFail();
    }

    private function assertOwnership(Shipment $shipment, Courier $courier): void
    {
        if ($shipment->courier_id !== $courier->id) {
            throw new HttpResponseException(response()->json([
                'message' => 'This delivery is not assigned to your courier account.',
                'code' => 'shipment_not_assigned',
            ], 404));
        }
    }

    private function listRelations(): array
    {
        return [
            'sellerOrder.seller', 'sellerOrder.order', 'currentHub',
            'trackingEvents' => fn ($query) => $query->latest('id'),
        ];
    }

    private function transitionError(ValidationException $exception): JsonResponse
    {
        $proofRequired = array_key_exists('proof_image', $exception->errors());

        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?: 'The delivery status transition is invalid.',
            'code' => $proofRequired ? 'proof_of_delivery_required' : 'invalid_delivery_transition',
            'errors' => $exception->errors(),
        ], 422);
    }

    private function profilePayload(Courier $courier): array
    {
        return [
            'id' => $courier->id, 'name' => $courier->name, 'status' => $courier->status,
            'active' => (bool) $courier->active, 'availability' => $courier->availability_status,
            'service_area' => $courier->service_area, 'vehicle_type' => $courier->vehicle_type,
            'vehicle_make' => $courier->vehicle_make, 'vehicle_model' => $courier->vehicle_model,
            'vehicle_year' => $courier->vehicle_year, 'plate_number' => $courier->vehicle_plate_number,
            'vehicle_color' => $courier->vehicle_color, 'approved_at' => optional($courier->approved_at)->toISOString(),
        ];
    }
}
