<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsHub;
use App\Models\LogisticsProvider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CourierLogisticsAffiliationService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function affiliate(
        Courier $courier,
        LogisticsProvider $provider,
        LogisticsHub $hub,
        User $actor,
    ): CourierLogisticsAffiliation {
        return DB::transaction(function () use ($courier, $provider, $hub, $actor) {
            $lockedCourier = Courier::query()->with('user')->whereKey($courier->id)->lockForUpdate()->firstOrFail();
            $lockedProvider = LogisticsProvider::query()->whereKey($provider->id)->lockForUpdate()->firstOrFail();
            $lockedHub = LogisticsHub::query()->whereKey($hub->id)->lockForUpdate()->firstOrFail();

            if (! $lockedCourier->active || $lockedCourier->status !== 'active' || ! $lockedCourier->approved_at || $lockedCourier->user?->status !== 'active') {
                throw ValidationException::withMessages(['courier_id' => ['Only an approved active courier may be affiliated.']]);
            }
            if (! $lockedProvider->isActive()) {
                throw ValidationException::withMessages(['provider' => ['The logistics provider is not active.']]);
            }
            if (! $lockedHub->active || $lockedHub->logistics_provider_id !== $lockedProvider->id) {
                throw ValidationException::withMessages(['primary_hub_id' => ['The primary hub must be an active hub owned by the logistics provider.']]);
            }

            $current = CourierLogisticsAffiliation::query()
                ->where('courier_id', $lockedCourier->id)
                ->where('status', 'active')
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first();
            if ($current) {
                if ($current->logistics_provider_id === $lockedProvider->id && $current->primary_hub_id === $lockedHub->id) {
                    return $current->load(['provider', 'primaryHub']);
                }

                throw ValidationException::withMessages([
                    'courier_id' => ['This courier already has an active logistics affiliation. End it through the reviewed workflow first.'],
                ]);
            }

            $affiliation = CourierLogisticsAffiliation::create([
                'courier_id' => $lockedCourier->id,
                'logistics_provider_id' => $lockedProvider->id,
                'primary_hub_id' => $lockedHub->id,
                'status' => 'active',
                'assigned_at' => now(),
                'assigned_by' => $actor->id,
            ]);
            $this->activity->log(
                'logistics.courier.affiliated', 'logistics', 'Courier affiliated with a logistics provider.',
                $actor, request(), $affiliation,
                ['courier_id' => $lockedCourier->id, 'logistics_provider_id' => $lockedProvider->id, 'primary_hub_id' => $lockedHub->id],
            );

            return $affiliation->load(['provider', 'primaryHub']);
        }, 3);
    }

    public function end(CourierLogisticsAffiliation $affiliation, User $actor, string $reason): CourierLogisticsAffiliation
    {
        return DB::transaction(function () use ($affiliation, $actor, $reason) {
            $locked = CourierLogisticsAffiliation::query()->whereKey($affiliation->id)->lockForUpdate()->firstOrFail();
            if ($locked->ended_at || $locked->status !== 'active') {
                return $locked;
            }
            $hasActiveDeliveries = Shipment::query()->where('courier_id', $locked->courier_id)
                ->whereIn('status', ['ready', 'picked-up', 'in-transit', 'out-for-delivery'])
                ->exists();
            if ($hasActiveDeliveries) {
                throw ValidationException::withMessages([
                    'affiliation' => ['The affiliation cannot end while the courier has active deliveries.'],
                ]);
            }

            $locked->forceFill([
                'status' => 'inactive',
                'ended_at' => now(),
                'ended_by' => $actor->id,
                'end_reason' => $reason,
            ])->save();
            $this->activity->log(
                'logistics.courier.affiliation_ended', 'logistics', 'Courier logistics affiliation ended.',
                $actor, request(), $locked,
                ['courier_id' => $locked->courier_id, 'logistics_provider_id' => $locked->logistics_provider_id, 'reason_provided' => true],
            );

            return $locked->fresh(['provider', 'primaryHub']);
        }, 3);
    }
}
