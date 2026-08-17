<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerOrder extends Model
{
    protected $fillable = [
        'order_id',
        'seller_id',
        'status',
        'subtotal',
        'shipping_fee',
        'discount_total',
        'grand_total',
        'courier_id',
        'tracking_number',
        'confirmed_at',
        'ready_at',
        'picked_up_at',
        'delivered_at',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function shipment()
    {
        return $this->hasOne(Shipment::class);
    }
}

