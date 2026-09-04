<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsProvider extends Model
{
    public const STATUSES = ['pending', 'active', 'suspended', 'inactive'];

    protected $fillable = [
        'code', 'company_name', 'legal_name', 'status', 'contact_name',
        'contact_email', 'contact_phone', 'address_line1', 'address_line2',
        'region_code', 'region_label', 'province_code', 'province_label',
        'city_code', 'city_label', 'barangay_code', 'barangay_label',
        'postal_code', 'approved_at', 'approved_by', 'suspended_at',
        'suspended_by', 'inactive_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'suspended_at' => 'datetime',
        'inactive_at' => 'datetime',
    ];

    public function staff()
    {
        return $this->hasMany(LogisticsStaff::class);
    }

    public function applications()
    {
        return $this->hasMany(LogisticsProviderApplication::class, 'approved_provider_id');
    }

    public function hubs()
    {
        return $this->hasMany(LogisticsHub::class);
    }

    public function courierAffiliations()
    {
        return $this->hasMany(CourierLogisticsAffiliation::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->approved_at !== null;
    }
}
