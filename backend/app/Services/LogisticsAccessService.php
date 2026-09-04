<?php

namespace App\Services;

use App\Models\LogisticsHub;
use App\Models\LogisticsStaff;
use App\Models\Shipment;
use App\Models\User;

class LogisticsAccessService
{
    public function staff(User $user): LogisticsStaff
    {
        $staff = $user->relationLoaded('logisticsStaff')
            ? $user->logisticsStaff
            : $user->logisticsStaff()->with(['provider', 'primaryHub'])->first();

        abort_unless($staff?->isActiveForLogistics(), 403, 'Active logistics staff access is required.');

        return $staff;
    }

    public function assertProviderManager(LogisticsStaff $staff): void
    {
        abort_unless($staff->isProviderManager(), 403, 'Provider manager access is required.');
    }

    public function assertHub(LogisticsStaff $staff, LogisticsHub $hub): void
    {
        abort_unless($staff->canAccessHub($hub), 404, 'Logistics hub not found.');
    }

    public function assertShipment(LogisticsStaff $staff, Shipment $shipment): void
    {
        abort_unless(
            $shipment->logistics_provider_id === $staff->logistics_provider_id,
            404,
            'Shipment not found.',
        );
    }
}
