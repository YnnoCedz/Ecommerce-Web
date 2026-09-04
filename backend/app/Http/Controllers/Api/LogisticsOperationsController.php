<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsHub;
use App\Models\LogisticsStaff;
use App\Models\Shipment;
use App\Services\ActivityLogger;
use App\Services\CourierLogisticsAffiliationService;
use App\Services\HubCheckInService;
use App\Services\LogisticsAccessService;
use App\Services\LogisticsDispatchPolicyService;
use App\Services\PsgcService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LogisticsOperationsController extends Controller
{
    public function __construct(
        private readonly LogisticsAccessService $access,
        private readonly CourierLogisticsAffiliationService $affiliations,
        private readonly HubCheckInService $checkIns,
        private readonly LogisticsDispatchPolicyService $dispatch,
        private readonly ActivityLogger $activity,
    ) {}

    public function context(Request $request): JsonResponse
    {
        $staff = $this->staff($request);
        $hubs = LogisticsHub::query()->where('logistics_provider_id', $staff->logistics_provider_id)->where('active', true)
            ->when(! $staff->isProviderManager(), fn (Builder $query) => $query->whereKey($staff->primary_hub_id))
            ->orderBy('name')->get();

        return response()->json(['data' => [
            'staff' => [
                'id' => $staff->id,
                'name' => $request->user()->display_name,
                'type' => $staff->staff_type,
                'status' => $staff->status,
                'primary_hub' => $staff->primaryHub ? $this->hubSummary($staff->primaryHub) : null,
            ],
            'provider' => [
                'id' => $staff->provider->id, 'code' => $staff->provider->code,
                'company_name' => $staff->provider->company_name, 'status' => $staff->provider->status,
            ],
            'authorized_hubs' => $hubs->map(fn (LogisticsHub $hub) => $this->hubSummary($hub))->values(),
        ]]);
    }

    public function hubs(Request $request): JsonResponse
    {
        $staff = $this->staff($request);
        $hubs = LogisticsHub::query()->with('serviceAreas')
            ->where('logistics_provider_id', $staff->logistics_provider_id)
            ->when(! $staff->isProviderManager(), fn (Builder $query) => $query->whereKey($staff->primary_hub_id))
            ->orderBy('name')->get();

        return response()->json(['data' => $hubs->map(fn (LogisticsHub $hub) => $this->hubPayload($hub))->values()]);
    }

    public function storeHub(Request $request, PsgcService $psgc): JsonResponse
    {
        $staff = $this->staff($request);
        $this->access->assertProviderManager($staff);
        $data = $this->hubData($request, $psgc);
        $hub = LogisticsHub::create([...$data, 'logistics_provider_id' => $staff->logistics_provider_id]);
        $this->activity->log('logistics.hub.created', 'logistics', 'Logistics hub created.', $request->user(), $request, $hub, ['logistics_provider_id' => $staff->logistics_provider_id]);

        return response()->json(['message' => 'Logistics hub created.', 'data' => $this->hubPayload($hub)], 201);
    }

    public function updateHub(Request $request, LogisticsHub $hub, PsgcService $psgc): JsonResponse
    {
        $staff = $this->staff($request);
        $this->access->assertProviderManager($staff);
        $this->access->assertHub($staff, $hub);
        $hub->update($this->hubData($request, $psgc, $hub));
        $this->activity->log('logistics.hub.updated', 'logistics', 'Logistics hub updated.', $request->user(), $request, $hub, ['active' => (bool) $hub->active]);

        return response()->json(['message' => 'Logistics hub updated.', 'data' => $this->hubPayload($hub->fresh('serviceAreas'))]);
    }

    public function replaceServiceAreas(Request $request, LogisticsHub $hub, PsgcService $psgc): JsonResponse
    {
        $staff = $this->staff($request);
        $this->access->assertProviderManager($staff);
        $this->access->assertHub($staff, $hub);
        $data = $request->validate([
            'areas' => ['required', 'array', 'max:100'],
            'areas.*.municipality_code' => ['required', 'string', 'size:10', 'distinct'],
            'areas.*.municipality_label' => ['required', 'string', 'max:255'],
            'areas.*.priority' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'areas.*.active' => ['nullable', 'boolean'],
        ]);
        $normalized = collect($data['areas'])->map(function (array $area) use ($psgc) {
            $city = $psgc->city($area['municipality_code']);

            return [
                'municipality_code' => $city['code'],
                'municipality_label' => $city['name'],
                'priority' => $area['priority'] ?? 100,
                'active' => $area['active'] ?? true,
            ];
        });
        if ($normalized->pluck('municipality_code')->duplicates()->isNotEmpty()) {
            return response()->json(['message' => 'Duplicate municipality codes are not allowed.', 'code' => 'duplicate_service_area'], 422);
        }

        DB::transaction(function () use ($hub, $normalized, $request) {
            $locked = LogisticsHub::query()->whereKey($hub->id)->lockForUpdate()->firstOrFail();
            $locked->serviceAreas()->delete();
            $locked->serviceAreas()->createMany($normalized->all());
            $this->activity->log('logistics.hub.service_areas_replaced', 'logistics', 'Hub service areas replaced.', $request->user(), $request, $locked, ['area_count' => $normalized->count()]);
        });

        return response()->json(['message' => 'Hub service areas updated.', 'data' => $this->hubPayload($hub->fresh('serviceAreas'))]);
    }

    public function shipments(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:40'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $staff = $this->staff($request);
        $query = Shipment::query()->where('logistics_provider_id', $staff->logistics_provider_id)
            ->with(['logisticsProvider:id,code,company_name', 'currentHub:id,code,name', 'courier:id,name', 'sellerOrder.order:id,order_number,shipping_city,shipping_province', 'sellerOrder.seller:id,business_name,trade_name'])
            ->latest('id');
        $this->scopeShipmentsToStaff($query, $staff);
        $query->when($data['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status));
        $query->when(trim((string) ($data['search'] ?? '')), fn (Builder $query, string $search) => $query->where(
            fn (Builder $nested) => $nested->where('tracking_number', 'like', "%{$search}%")
                ->orWhereHas('sellerOrder.order', fn (Builder $order) => $order->where('order_number', 'like', "%{$search}%"))
        ));
        $page = $query->paginate((int) ($data['per_page'] ?? 20));

        return response()->json([
            'data' => $page->getCollection()->map(fn (Shipment $shipment) => $this->shipmentPayload($shipment))->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }

    public function showShipment(Request $request, Shipment $shipment): JsonResponse
    {
        $staff = $this->staff($request);
        $this->access->assertShipment($staff, $shipment);
        if (! $staff->isProviderManager()) {
            $allowed = $shipment->current_hub_id === $staff->primary_hub_id
                || ($shipment->current_hub_id === null && $shipment->hub_received_at === null && $shipment->status === 'ready');
            abort_unless($allowed, 404, 'Shipment not found.');
        }
        $shipment->load([
            'logisticsProvider:id,code,company_name', 'currentHub', 'courier:id,name',
            'sellerOrder.order', 'sellerOrder.seller', 'sellerOrder.items',
            'trackingEvents' => fn ($query) => $query->orderBy('occurred_at')->orderBy('id'),
            'deliveryProof:id,shipment_id,submitted_at,note',
        ]);

        return response()->json(['data' => $this->shipmentPayload($shipment, true)]);
    }

    public function checkIn(Request $request, Shipment $shipment): JsonResponse
    {
        $data = $request->validate(['hub_id' => ['required', 'integer', 'exists:logistics_hubs,id']]);
        $staff = $this->staff($request);
        $this->access->assertShipment($staff, $shipment);
        $updated = $this->checkIns->checkIn($shipment, LogisticsHub::query()->findOrFail($data['hub_id']), $staff, $request->user());

        return response()->json(['message' => 'Shipment checked into logistics hub.', 'data' => $this->shipmentPayload($updated)]);
    }

    public function riders(Request $request): JsonResponse
    {
        $staff = $this->staff($request);
        $query = CourierLogisticsAffiliation::query()->where('logistics_provider_id', $staff->logistics_provider_id)
            ->where('status', 'active')->whereNull('ended_at')
            ->with(['courier.user:id,status', 'primaryHub:id,code,name'])
            ->when(! $staff->isProviderManager(), fn (Builder $query) => $query->where('primary_hub_id', $staff->primary_hub_id))
            ->latest('assigned_at');
        $page = $query->paginate(min(50, max(1, (int) $request->input('per_page', 20))));

        return response()->json([
            'data' => $page->getCollection()->map(fn (CourierLogisticsAffiliation $affiliation) => $this->affiliationPayload($affiliation))->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }

    public function affiliate(Request $request, Courier $courier): JsonResponse
    {
        $staff = $this->staff($request);
        $this->access->assertProviderManager($staff);
        $data = $request->validate(['primary_hub_id' => ['required', 'integer', 'exists:logistics_hubs,id']]);
        $hub = LogisticsHub::query()->findOrFail($data['primary_hub_id']);
        $this->access->assertHub($staff, $hub);
        $affiliation = $this->affiliations->affiliate($courier, $staff->provider, $hub, $request->user());

        return response()->json(['message' => 'Courier affiliated with logistics provider.', 'data' => $this->affiliationPayload($affiliation)], 201);
    }

    public function endAffiliation(Request $request, CourierLogisticsAffiliation $affiliation): JsonResponse
    {
        $staff = $this->staff($request);
        $this->access->assertProviderManager($staff);
        abort_unless($affiliation->logistics_provider_id === $staff->logistics_provider_id, 404, 'Courier affiliation not found.');
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $ended = $this->affiliations->end($affiliation, $request->user(), $data['reason']);

        return response()->json(['message' => 'Courier affiliation ended.', 'data' => $this->affiliationPayload($ended)]);
    }

    public function assignCourier(Request $request, Shipment $shipment): JsonResponse
    {
        $data = $request->validate(['courier_id' => ['required', 'integer', 'exists:couriers,id']]);
        $staff = $this->staff($request);
        $this->access->assertShipment($staff, $shipment);
        $updated = $this->dispatch->assign($shipment, Courier::query()->findOrFail($data['courier_id']), $staff, $request->user());

        return response()->json(['message' => 'Courier assignment updated.', 'data' => $this->shipmentPayload($updated)]);
    }

    private function staff(Request $request): LogisticsStaff
    {
        return $this->access->staff($request->user())->loadMissing(['provider', 'primaryHub']);
    }

    private function scopeShipmentsToStaff(Builder $query, LogisticsStaff $staff): void
    {
        if ($staff->isProviderManager()) {
            return;
        }
        $query->where(function (Builder $scope) use ($staff) {
            $scope->where('current_hub_id', $staff->primary_hub_id)
                ->orWhere(fn (Builder $unreceived) => $unreceived->whereNull('current_hub_id')->whereNull('hub_received_at')->where('status', 'ready'));
        });
    }

    private function hubData(Request $request, PsgcService $psgc, ?LogisticsHub $hub = null): array
    {
        if ($request->has('code')) {
            $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);
        }
        $required = $hub ? 'sometimes' : 'required';
        $data = $request->validate([
            'code' => [$required, 'string', 'max:40', 'regex:/^[A-Z0-9][A-Z0-9-]*$/', Rule::unique('logistics_hubs', 'code')->ignore($hub?->id)],
            'name' => [$required, 'string', 'max:255'],
            'address_line1' => [$required, 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => [$required, 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => [$required, 'string', 'size:10'],
            'barangay_code' => ['nullable', 'string', 'size:10'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'active' => ['nullable', 'boolean'],
        ]);
        $geographyTouched = collect(['region_code', 'province_code', 'city_code', 'barangay_code'])->contains(fn ($field) => $request->has($field));
        if (! $geographyTouched && $hub) {
            return $data;
        }
        $geographyInput = [
            'region_code' => $data['region_code'] ?? $hub?->region_code,
            'province_code' => array_key_exists('province_code', $data) ? $data['province_code'] : $hub?->province_code,
            'city_code' => $data['city_code'] ?? $hub?->city_code,
            'barangay_code' => array_key_exists('barangay_code', $data) ? $data['barangay_code'] : $hub?->barangay_code,
            'postal_code' => $data['postal_code'] ?? $hub?->postal_code,
        ];
        $normalized = filled($geographyInput['barangay_code'])
            ? $psgc->validateHierarchy($geographyInput)
            : $psgc->validateMunicipality($geographyInput);

        return [
            ...$data,
            'region_code' => $normalized['region_code'], 'region_label' => $normalized['region'],
            'province_code' => $normalized['province_code'], 'province_label' => $normalized['province'],
            'city_code' => $normalized['city_code'], 'city_label' => $normalized['city'],
            'barangay_code' => $normalized['barangay_code'] ?? null, 'barangay_label' => $normalized['barangay'] ?? null,
            'postal_code' => $normalized['postal_code'] ?: ($geographyInput['postal_code'] ?: null),
            'active' => $data['active'] ?? $hub?->active ?? true,
        ];
    }

    private function hubSummary(LogisticsHub $hub): array
    {
        return ['id' => $hub->id, 'code' => $hub->code, 'name' => $hub->name, 'city_code' => $hub->city_code, 'city_label' => $hub->city_label];
    }

    private function hubPayload(LogisticsHub $hub): array
    {
        return [
            ...$this->hubSummary($hub),
            'active' => (bool) $hub->active,
            'address' => [
                'line1' => $hub->address_line1, 'line2' => $hub->address_line2,
                'region_code' => $hub->region_code, 'region_label' => $hub->region_label,
                'province_code' => $hub->province_code, 'province_label' => $hub->province_label,
                'city_code' => $hub->city_code, 'city_label' => $hub->city_label,
                'barangay_code' => $hub->barangay_code, 'barangay_label' => $hub->barangay_label,
                'postal_code' => $hub->postal_code,
            ],
            'service_areas' => $hub->relationLoaded('serviceAreas') ? $hub->serviceAreas->map(fn ($area) => [
                'municipality_code' => $area->municipality_code, 'municipality_label' => $area->municipality_label,
                'priority' => $area->priority, 'active' => (bool) $area->active,
            ])->values() : [],
        ];
    }

    private function affiliationPayload(CourierLogisticsAffiliation $affiliation): array
    {
        return [
            'id' => $affiliation->id, 'courier_id' => $affiliation->courier_id,
            'courier_name' => $affiliation->courier?->name,
            'logistics_provider_id' => $affiliation->logistics_provider_id,
            'primary_hub' => $affiliation->primaryHub ? $this->hubSummary($affiliation->primaryHub) : null,
            'status' => $affiliation->status,
            'assigned_at' => optional($affiliation->assigned_at)->toISOString(),
            'ended_at' => optional($affiliation->ended_at)->toISOString(),
        ];
    }

    private function shipmentPayload(Shipment $shipment, bool $detail = false): array
    {
        $payload = [
            'id' => $shipment->id, 'tracking_number' => $shipment->tracking_number, 'status' => $shipment->status,
            'logistics_provider_id' => $shipment->logistics_provider_id,
            'provider' => $shipment->logisticsProvider ? ['id' => $shipment->logisticsProvider->id, 'code' => $shipment->logisticsProvider->code, 'company_name' => $shipment->logisticsProvider->company_name] : null,
            'current_hub' => $shipment->currentHub ? $this->hubSummary($shipment->currentHub) : null,
            'hub_received_at' => optional($shipment->hub_received_at)->toISOString(),
            'courier' => $shipment->courier ? ['id' => $shipment->courier->id, 'name' => $shipment->courier->name] : null,
            'order_number' => $shipment->sellerOrder?->order?->order_number,
        ];
        if ($detail) {
            $payload['proof_of_delivery'] = ['exists' => (bool) $shipment->deliveryProof];
            $payload['tracking_events'] = $shipment->trackingEvents->map(fn ($event) => [
                'status' => $event->status, 'location' => $event->location, 'note' => $event->note,
                'occurred_at' => optional($event->occurred_at)->toISOString(),
            ])->values();
        }

        return $payload;
    }
}
