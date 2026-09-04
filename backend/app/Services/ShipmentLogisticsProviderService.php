<?php

namespace App\Services;

use App\Models\LogisticsProvider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class ShipmentLogisticsProviderService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function assign(Shipment $shipment, LogisticsProvider $provider, User $admin, ?string $reason = null): Shipment
    {
        return DB::transaction(function () use ($shipment, $provider, $admin, $reason) {
            $locked = Shipment::query()->with('sellerOrder')->whereKey($shipment->id)->lockForUpdate()->firstOrFail();
            $activeProvider = LogisticsProvider::query()->whereKey($provider->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'ready' || in_array($locked->sellerOrder?->status, ['delivered', 'completed', 'cancelled', 'failed'], true)) {
                throw ValidationException::withMessages([
                    'shipment' => ['Only a ready, non-terminal shipment may be assigned to a logistics provider.'],
                ]);
            }
            if (! $activeProvider->isActive()) {
                throw ValidationException::withMessages([
                    'logistics_provider_id' => ['Only an approved active logistics provider may receive a shipment.'],
                ]);
            }
            if ($locked->logistics_provider_id !== null && $locked->logistics_provider_id !== $activeProvider->id) {
                throw new HttpResponseException(response()->json([
                    'message' => 'This shipment already belongs to a different logistics provider.',
                    'code' => 'shipment_provider_conflict',
                ], 409));
            }
            if ($locked->logistics_provider_id === $activeProvider->id) {
                return $locked->fresh(['logisticsProvider', 'currentHub', 'courier']);
            }

            $locked->forceFill(['logistics_provider_id' => $activeProvider->id])->save();
            $this->activity->log(
                'logistics.shipment.provider_assigned',
                'logistics',
                'Shipment assigned to a third-party logistics provider.',
                $admin,
                request(),
                $locked,
                [
                    'logistics_provider_id' => $activeProvider->id,
                    'reason_provided' => filled($reason),
                ],
            );

            return $locked->fresh(['logisticsProvider', 'currentHub', 'courier']);
        }, 3);
    }
}
