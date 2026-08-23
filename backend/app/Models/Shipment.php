<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $fillable = [
        'seller_order_id',
        'courier_id',
        'tracking_number',
        'driver_name',
        'status',
        'expected_delivery_at',
        'picked_up_at',
        'in_transit_at',
        'delivered_at',
    ];

    protected $casts = [
        'expected_delivery_at' => 'datetime',
        'picked_up_at' => 'datetime',
        'in_transit_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function sellerOrder()
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function trackingEvents()
    {
        return $this->hasMany(TrackingEvent::class);
    }
}
