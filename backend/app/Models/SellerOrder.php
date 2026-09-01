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
        'product_promotion_discount_total',
        'voucher_discount_total',
        'grand_total',
        'courier_id',
        'tracking_number',
        'confirmed_at',
        'ready_at',
        'picked_up_at',
        'delivered_at',
        'completed_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'product_promotion_discount_total' => 'decimal:2',
        'voucher_discount_total' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'confirmed_at' => 'datetime',
        'ready_at' => 'datetime',
        'picked_up_at' => 'datetime',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
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

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function cancellation()
    {
        return $this->hasOne(OrderCancellation::class);
    }

    public function returnRequests()
    {
        return $this->hasMany(ReturnRequest::class);
    }
}
