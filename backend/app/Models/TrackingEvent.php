<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrackingEvent extends Model
{
    protected $fillable = [
        'shipment_id',
        'status',
        'location',
        'note',
        'occurred_at',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}
