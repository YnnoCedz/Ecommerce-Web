<?php

namespace App\Services;

use App\Models\LogisticsHub;
use App\Models\LogisticsStaff;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class HubCheckInService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function checkIn(Shipment $shipment, LogisticsHub $hub, LogisticsStaff $staff, User $actor): Shipment
    {
        return DB::transaction(function () use ($shipment, $hub, $staff, $actor) {
            $locked = Shipment::query()->with('sellerOrder')->whereKey($shipment->id)->lockForUpdate()->firstOrFail();
            $lockedHub = LogisticsHub::query()->whereKey($hub->id)->lockForUpdate()->firstOrFail();

            if ($locked->logistics_provider_id !== $staff->logistics_provider_id
                || $lockedHub->logistics_provider_id !== $staff->logistics_provider_id) {
                throw ValidationException::withMessages(['hub_id' => ['Shipment and hub must belong to your logistics provider.']]);
            }
            if (! $staff->canAccessHub($lockedHub)) {
                throw ValidationException::withMessages(['hub_id' => ['You are not authorized to operate this hub.']]);
            }
            if (! $lockedHub->active) {
                throw ValidationException::withMessages(['hub_id' => ['The selected logistics hub is inactive.']]);
            }
            if ($locked->status !== 'ready' || in_array($locked->sellerOrder?->status, ['delivered', 'completed', 'cancelled', 'failed'], true)) {
                throw ValidationException::withMessages(['shipment' => ['Only a ready, non-terminal shipment may be checked into a hub.']]);
            }
            if ($locked->current_hub_id !== null && $locked->current_hub_id !== $lockedHub->id) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Shipment is already checked into a different hub.',
                    'code' => 'shipment_already_at_different_hub',
                ], 409));
            }
            if ($locked->current_hub_id === $lockedHub->id) {
                return $locked->fresh(['logisticsProvider', 'currentHub', 'courier']);
            }

            $receivedAt = now();
            $locked->forceFill(['current_hub_id' => $lockedHub->id, 'hub_received_at' => $receivedAt])->save();
            TrackingEvent::create([
                'shipment_id' => $locked->id,
                'status' => 'ready',
                'location' => $lockedHub->displayAddress(),
                'note' => "Received into {$lockedHub->name} ({$lockedHub->code}) by authorized logistics staff.",
                'actor_type' => 'logistics_staff',
                'actor_user_id' => $actor->id,
                'occurred_at' => $receivedAt,
            ]);
            $this->activity->log(
                'logistics.shipment.hub_checked_in', 'logistics', 'Shipment checked into a logistics hub.',
                $actor, request(), $locked,
                ['logistics_provider_id' => $locked->logistics_provider_id, 'hub_id' => $lockedHub->id, 'logistics_staff_id' => $staff->id],
            );

            return $locked->fresh(['logisticsProvider', 'currentHub', 'courier']);
        }, 3);
    }
}
