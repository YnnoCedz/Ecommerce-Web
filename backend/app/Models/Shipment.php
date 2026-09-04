<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $fillable = [
        'seller_order_id',
        'logistics_provider_id',
        'courier_id',
        'current_hub_id',
        'hub_received_at',
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
        'hub_received_at' => 'datetime',
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

    public function logisticsProvider()
    {
        return $this->belongsTo(LogisticsProvider::class);
    }

    public function currentHub()
    {
        return $this->belongsTo(LogisticsHub::class, 'current_hub_id');
    }

    public function trackingEvents()
    {
        return $this->hasMany(TrackingEvent::class);
    }

    public function deliveryProof()
    {
        return $this->hasOne(DeliveryProof::class);
    }

    public function items()
    {
        return $this->hasManyThrough(
            OrderItem::class,
            SellerOrder::class,
            'id',
            'seller_order_id',
            'seller_order_id',
            'id',
        );
    }
}
