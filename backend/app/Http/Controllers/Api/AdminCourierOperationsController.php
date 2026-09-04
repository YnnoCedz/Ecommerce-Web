<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\Shipment;
use App\Services\CourierAssignmentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCourierOperationsController extends Controller
{
    public function __construct(private readonly CourierAssignmentService $assignments) {}

    public function eligibleCouriers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $query = Courier::query()->where('active', true)->where('status', 'active')->whereNotNull('approved_at')
            ->whereHas('user', fn (Builder $user) => $user->where('status', 'active')->where('role', '!=', 'admin'))
            ->with('user:id,status')->orderBy('name');
        $query->when(trim((string) ($data['search'] ?? '')), fn (Builder $query, string $search) => $query->where(fn (Builder $nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('vehicle_plate_number', 'like', "%{$search}%")));
        $page = $query->paginate((int) ($data['per_page'] ?? 20));

        return response()->json([
            'data' => $page->getCollection()->map(fn (Courier $courier) => [
                'id' => $courier->id, 'name' => $courier->name, 'status' => $courier->status,
                'availability' => $courier->availability_status, 'vehicle_type' => $courier->vehicle_type,
                'vehicle' => trim(implode(' ', array_filter([$courier->vehicle_make, $courier->vehicle_model]))),
                'plate_number' => $courier->vehicle_plate_number,
            ])->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }

    public function assign(Request $request, Shipment $shipment): JsonResponse
    {
        $data = $request->validate(['courier_id' => ['required', 'integer', 'exists:couriers,id']]);
        $updated = $this->assignments->assign($shipment, Courier::query()->findOrFail($data['courier_id']), $request->user());

        return response()->json(['message' => 'Courier assignment updated.', 'data' => [
            'shipment_id' => $updated->id, 'courier_id' => $updated->courier_id,
            'courier_name' => $updated->courier?->name, 'status' => $updated->status,
            'tracking_number' => $updated->tracking_number,
        ]]);
    }
}
