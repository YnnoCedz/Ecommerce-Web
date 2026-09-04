<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Courier extends Model
{
    protected $fillable = [
        'user_id',
        'approved_application_id',
        'name',
        'slug',
        'contact_email',
        'contact_phone',
        'service_area',
        'current_area_code',
        'current_area_label',
        'current_area_updated_at',
        'active',
        'status',
        'availability_status',
        'vehicle_type',
        'vehicle_make',
        'vehicle_model',
        'vehicle_year',
        'vehicle_plate_number',
        'vehicle_color',
        'approved_at',
    ];

    protected $casts = [
        'active' => 'boolean',
        'vehicle_year' => 'integer',
        'approved_at' => 'datetime',
        'current_area_updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedApplication()
    {
        return $this->belongsTo(CourierApplication::class, 'approved_application_id');
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function deliveryProofs()
    {
        return $this->hasMany(DeliveryProof::class);
    }

    public function logisticsAffiliations()
    {
        return $this->hasMany(CourierLogisticsAffiliation::class);
    }

    public function activeLogisticsAffiliation()
    {
        return $this->hasOne(CourierLogisticsAffiliation::class)
            ->where('status', 'active')
            ->whereNull('ended_at')
            ->latestOfMany('assigned_at');
    }
}
