<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsStaff;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class LogisticsDispatchPolicyService
{
    public function __construct(private readonly CourierAssignmentService $assignments) {}

    public function assign(Shipment $shipment, Courier $courier, LogisticsStaff $staff, User $actor): Shipment
    {
        return DB::transaction(function () use ($shipment, $courier, $staff, $actor) {
            $staff->loadMissing('provider');
            if (! $staff->isActiveForLogistics()) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Active logistics staff access is required.',
                    'code' => 'logistics_access_denied',
                ], 403));
            }

            $lockedShipment = Shipment::query()->with('currentHub')->whereKey($shipment->id)->lockForUpdate()->firstOrFail();
            if ($lockedShipment->logistics_provider_id !== $staff->logistics_provider_id) {
                throw ValidationException::withMessages(['shipment' => ['Shipment does not belong to your logistics provider.']]);
            }
            if (! $lockedShipment->current_hub_id || ! $lockedShipment->currentHub || ! $staff->canAccessHub($lockedShipment->currentHub)) {
                throw ValidationException::withMessages(['shipment' => ['Shipment must be held at a hub you are authorized to operate.']]);
            }

            $affiliation = CourierLogisticsAffiliation::query()
                ->where('courier_id', $courier->id)
                ->where('status', 'active')
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first();
            if (! $affiliation || $affiliation->logistics_provider_id !== $staff->logistics_provider_id) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Courier must have an active affiliation with your logistics provider.',
                    'code' => 'cross_provider_assignment_forbidden',
                ], 403));
            }
            if ($affiliation->primary_hub_id !== $lockedShipment->current_hub_id) {
                throw ValidationException::withMessages(['courier_id' => ['Only a courier affiliated with the shipment current hub may be assigned in this phase.']]);
            }

            return $this->assignments->assign($lockedShipment, $courier, $actor, [
                'actor_type' => 'logistics_dispatch',
                'logistics_provider_id' => $staff->logistics_provider_id,
                'hub_id' => $lockedShipment->current_hub_id,
                'logistics_staff_id' => $staff->id,
            ]);
        }, 3);
    }
}
