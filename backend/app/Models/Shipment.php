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

