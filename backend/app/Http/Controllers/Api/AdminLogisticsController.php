<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogisticsHub;
use App\Models\LogisticsProvider;
use App\Models\LogisticsStaff;
use App\Models\Shipment;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\ShipmentLogisticsProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminLogisticsController extends Controller
{
    public function __construct(
        private readonly ShipmentLogisticsProviderService $shipmentProviders,
        private readonly ActivityLogger $activity,
    ) {}

    public function providers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(LogisticsProvider::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $query = LogisticsProvider::query()->withCount(['hubs', 'staff', 'shipments'])->latest('id');
        $query->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status));
        $query->when(trim((string) ($data['search'] ?? '')), fn ($query, $search) => $query->where(
            fn ($nested) => $nested->where('company_name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%")
        ));
        $page = $query->paginate((int) ($data['per_page'] ?? 20));

        return response()->json([
            'data' => $page->getCollection()->map(fn (LogisticsProvider $provider) => $this->providerPayload($provider))->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }

    public function storeProvider(Request $request): JsonResponse
    {
        $data = $this->providerData($request);
        $provider = DB::transaction(function () use ($data, $request) {
            $provider = LogisticsProvider::create($this->applyProviderStatus($data, $request->user()));
            $this->activity->log('logistics.provider.created', 'logistics', 'Logistics provider created.', $request->user(), $request, $provider);

            return $provider;
        });

        return response()->json(['message' => 'Logistics provider created.', 'data' => $this->providerPayload($provider)], 201);
    }

    public function showProvider(LogisticsProvider $provider): JsonResponse
    {
        $provider->load([
            'hubs' => fn ($query) => $query->with('serviceAreas')->orderBy('name'),
            'staff.user:id,name,email,status',
        ])->loadCount('shipments');

        return response()->json(['data' => [
            ...$this->providerPayload($provider),
            'hubs' => $provider->hubs->map(fn (LogisticsHub $hub) => $this->hubPayload($hub))->values(),
            'staff' => $provider->staff->map(fn (LogisticsStaff $staff) => $this->staffPayload($staff))->values(),
        ]]);
    }

    public function updateProvider(Request $request, LogisticsProvider $provider): JsonResponse
    {
        $data = $this->providerData($request, $provider);
        DB::transaction(function () use ($provider, $data, $request) {
            $locked = LogisticsProvider::query()->whereKey($provider->id)->lockForUpdate()->firstOrFail();
            $locked->fill($this->applyProviderStatus($data, $request->user(), $locked))->save();
            $this->activity->log('logistics.provider.updated', 'logistics', 'Logistics provider updated.', $request->user(), $request, $locked, ['status' => $locked->status]);
        });

        return response()->json(['message' => 'Logistics provider updated.', 'data' => $this->providerPayload($provider->fresh())]);
    }

    public function storeStaff(Request $request, LogisticsProvider $provider): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id', 'unique:logistics_staff,user_id'],
            'staff_type' => ['required', Rule::in(LogisticsStaff::TYPES)],
            'primary_hub_id' => ['nullable', 'integer', 'exists:logistics_hubs,id'],
            'status' => ['nullable', Rule::in(LogisticsStaff::STATUSES)],
        ]);
        $user = User::query()->findOrFail($data['user_id']);
        abort_unless($user->canAccessPlatformArea() && $user->email_verified_at, 422, 'The selected user account is not eligible for logistics access.');
        $hub = isset($data['primary_hub_id']) ? LogisticsHub::query()->findOrFail($data['primary_hub_id']) : null;
        $this->validateStaffHub($data['staff_type'], $provider, $hub);

        $staff = LogisticsStaff::create([
            ...$data,
            'logistics_provider_id' => $provider->id,
            'primary_hub_id' => $data['staff_type'] === 'provider_manager' ? null : $hub?->id,
            'status' => $data['status'] ?? 'active',
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
            'suspended_at' => ($data['status'] ?? 'active') === 'suspended' ? now() : null,
        ]);
        $this->activity->log('logistics.staff.created', 'logistics', 'Logistics staff capability created.', $request->user(), $request, $staff, ['logistics_provider_id' => $provider->id]);

        return response()->json(['message' => 'Logistics staff capability created.', 'data' => $this->staffPayload($staff->load('user'))], 201);
    }

    public function updateStaff(Request $request, LogisticsStaff $staff): JsonResponse
    {
        $data = $request->validate([
            'staff_type' => ['sometimes', Rule::in(LogisticsStaff::TYPES)],
            'primary_hub_id' => ['nullable', 'integer', 'exists:logistics_hubs,id'],
            'status' => ['sometimes', Rule::in(LogisticsStaff::STATUSES)],
        ]);
        $staffType = $data['staff_type'] ?? $staff->staff_type;
        $hubId = array_key_exists('primary_hub_id', $data) ? $data['primary_hub_id'] : $staff->primary_hub_id;
        $hub = $hubId ? LogisticsHub::query()->findOrFail($hubId) : null;
        $this->validateStaffHub($staffType, $staff->provider, $hub);
        $status = $data['status'] ?? $staff->status;
        $staff->update([
            ...$data,
            'primary_hub_id' => $staffType === 'provider_manager' ? null : $hub?->id,
            'suspended_at' => $status === 'suspended' ? ($staff->suspended_at ?? now()) : null,
        ]);
        $this->activity->log('logistics.staff.updated', 'logistics', 'Logistics staff capability updated.', $request->user(), $request, $staff, ['status' => $status]);

        return response()->json(['message' => 'Logistics staff capability updated.', 'data' => $this->staffPayload($staff->fresh('user'))]);
    }

    public function assignProvider(Request $request, Shipment $shipment): JsonResponse
    {
        $data = $request->validate([
            'logistics_provider_id' => ['required', 'integer', 'exists:logistics_providers,id'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $updated = $this->shipmentProviders->assign(
            $shipment,
            LogisticsProvider::query()->findOrFail($data['logistics_provider_id']),
            $request->user(),
            $data['reason'] ?? null,
        );

        return response()->json(['message' => 'Shipment assigned to logistics provider.', 'data' => [
            'shipment_id' => $updated->id,
            'logistics_provider_id' => $updated->logistics_provider_id,
            'provider' => $updated->logisticsProvider ? [
                'id' => $updated->logisticsProvider->id,
                'code' => $updated->logisticsProvider->code,
                'company_name' => $updated->logisticsProvider->company_name,
            ] : null,
            'status' => $updated->status,
            'courier_id' => $updated->courier_id,
        ]]);
    }

    private function providerData(Request $request, ?LogisticsProvider $provider = null): array
    {
        if ($request->has('code')) {
            $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);
        }
        $sometimes = $provider ? 'sometimes' : 'required';
        $statusPresence = $provider ? 'sometimes' : 'nullable';

        return $request->validate([
            'code' => [$sometimes, 'string', 'max:40', 'regex:/^[A-Z0-9][A-Z0-9-]*$/', Rule::unique('logistics_providers', 'code')->ignore($provider?->id)],
            'company_name' => [$sometimes, 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'status' => [$statusPresence, Rule::in(LogisticsProvider::STATUSES)],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['nullable', 'string', 'size:10'],
            'region_label' => ['nullable', 'string', 'max:255'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'province_label' => ['nullable', 'string', 'max:255'],
            'city_code' => ['nullable', 'string', 'size:10'],
            'city_label' => ['nullable', 'string', 'max:255'],
            'barangay_code' => ['nullable', 'string', 'size:10'],
            'barangay_label' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
        ]);
    }

    private function applyProviderStatus(array $data, User $admin, ?LogisticsProvider $current = null): array
    {
        $status = $data['status'] ?? $current?->status ?? 'pending';
        $data['status'] = $status;
        $data['approved_at'] = $status === 'active' ? ($current?->approved_at ?? now()) : $current?->approved_at;
        $data['approved_by'] = $status === 'active' ? ($current?->approved_by ?? $admin->id) : $current?->approved_by;
        $data['suspended_at'] = $status === 'suspended' ? ($current?->suspended_at ?? now()) : null;
        $data['suspended_by'] = $status === 'suspended' ? $admin->id : null;
        $data['inactive_at'] = $status === 'inactive' ? ($current?->inactive_at ?? now()) : null;

        return $data;
    }

    private function validateStaffHub(string $staffType, LogisticsProvider $provider, ?LogisticsHub $hub): void
    {
        if ($staffType === 'provider_manager') {
            return;
        }
        abort_unless($hub && $hub->logistics_provider_id === $provider->id && $hub->active, 422, 'Hub staff require an active primary hub owned by their provider.');
    }

    private function providerPayload(LogisticsProvider $provider): array
    {
        return [
            'id' => $provider->id, 'code' => $provider->code, 'company_name' => $provider->company_name,
            'legal_name' => $provider->legal_name, 'status' => $provider->status,
            'contact_name' => $provider->contact_name, 'contact_email' => $provider->contact_email,
            'contact_phone' => $provider->contact_phone,
            'approved_at' => optional($provider->approved_at)->toISOString(),
            'suspended_at' => optional($provider->suspended_at)->toISOString(),
            'inactive_at' => optional($provider->inactive_at)->toISOString(),
            'hub_count' => isset($provider->hubs_count) ? (int) $provider->hubs_count : null,
            'staff_count' => isset($provider->staff_count) ? (int) $provider->staff_count : null,
            'shipment_count' => isset($provider->shipments_count) ? (int) $provider->shipments_count : null,
        ];
    }

    private function hubPayload(LogisticsHub $hub): array
    {
        return [
            'id' => $hub->id, 'code' => $hub->code, 'name' => $hub->name, 'active' => (bool) $hub->active,
            'city_code' => $hub->city_code, 'city_label' => $hub->city_label,
            'service_areas' => $hub->relationLoaded('serviceAreas') ? $hub->serviceAreas->map(fn ($area) => [
                'municipality_code' => $area->municipality_code, 'municipality_label' => $area->municipality_label,
                'priority' => $area->priority, 'active' => $area->active,
            ])->values() : [],
        ];
    }

    private function staffPayload(LogisticsStaff $staff): array
    {
        return [
            'id' => $staff->id, 'user_id' => $staff->user_id,
            'user' => $staff->relationLoaded('user') ? ['name' => $staff->user?->name, 'email' => $staff->user?->email] : null,
            'logistics_provider_id' => $staff->logistics_provider_id,
            'staff_type' => $staff->staff_type, 'status' => $staff->status,
            'primary_hub_id' => $staff->primary_hub_id,
            'approved_at' => optional($staff->approved_at)->toISOString(),
        ];
    }
}
