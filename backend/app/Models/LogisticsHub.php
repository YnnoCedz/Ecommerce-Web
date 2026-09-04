<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsHub extends Model
{
    protected $fillable = [
        'logistics_provider_id', 'code', 'name', 'address_line1', 'address_line2',
        'region_code', 'region_label', 'province_code', 'province_label',
        'city_code', 'city_label', 'barangay_code', 'barangay_label',
        'postal_code', 'contact_name', 'contact_phone', 'active',
    ];

    protected $casts = ['active' => 'boolean'];

    public function provider()
    {
        return $this->belongsTo(LogisticsProvider::class, 'logistics_provider_id');
    }

    public function serviceAreas()
    {
        return $this->hasMany(HubServiceArea::class, 'hub_id')
            ->orderBy('priority')
            ->orderBy('id');
    }

    public function primaryStaff()
    {
        return $this->hasMany(LogisticsStaff::class, 'primary_hub_id');
    }

    public function courierAffiliations()
    {
        return $this->hasMany(CourierLogisticsAffiliation::class, 'primary_hub_id');
    }

    public function currentShipments()
    {
        return $this->hasMany(Shipment::class, 'current_hub_id');
    }

    public function displayAddress(): string
    {
        return trim(implode(', ', array_filter([
            $this->name, $this->address_line1, $this->address_line2,
            $this->barangay_label, $this->city_label, $this->province_label,
            $this->postal_code,
        ])));
    }
}
