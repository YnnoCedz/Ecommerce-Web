<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourierApplication extends Model
{
    protected $fillable = [
        'user_id', 'logistics_provider_id', 'mobile', 'address_line1', 'address_line2', 'region',
        'region_code', 'province', 'province_code', 'city', 'city_code',
        'barangay', 'barangay_code', 'postal_code', 'vehicle_type',
        'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_plate_number',
        'vehicle_color', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by',
        'rejection_reason', 'approved_courier_id', 'reviewed_by_staff_id',
        'primary_hub_id',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'vehicle_year' => 'integer',
    ];

    public function applicant()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function documents()
    {
        return $this->hasMany(CourierDocument::class);
    }

    public function provider()
    {
        return $this->belongsTo(LogisticsProvider::class, 'logistics_provider_id');
    }

    public function staffReviewer()
    {
        return $this->belongsTo(LogisticsStaff::class, 'reviewed_by_staff_id');
    }

    public function primaryHub()
    {
        return $this->belongsTo(LogisticsHub::class, 'primary_hub_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approvedCourier()
    {
        return $this->belongsTo(Courier::class, 'approved_courier_id');
    }
}
