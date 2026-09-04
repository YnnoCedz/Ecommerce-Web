<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourierLogisticsAffiliation extends Model
{
    protected $fillable = [
        'courier_id', 'logistics_provider_id', 'primary_hub_id', 'status',
        'assigned_at', 'assigned_by', 'ended_at', 'ended_by', 'end_reason',
    ];

    protected $casts = ['assigned_at' => 'datetime', 'ended_at' => 'datetime'];

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function provider()
    {
        return $this->belongsTo(LogisticsProvider::class, 'logistics_provider_id');
    }

    public function primaryHub()
    {
        return $this->belongsTo(LogisticsHub::class, 'primary_hub_id');
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function endedBy()
    {
        return $this->belongsTo(User::class, 'ended_by');
    }
}
