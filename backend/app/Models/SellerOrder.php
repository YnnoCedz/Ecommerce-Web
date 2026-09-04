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
        'pickup_store_name',
        'pickup_contact_name',
        'pickup_contact_phone',
        'pickup_address_line1',
        'pickup_address_line2',
        'pickup_region_code',
        'pickup_region_label',
        'pickup_province_code',
        'pickup_province_label',
        'pickup_city_code',
        'pickup_city_label',
        'pickup_barangay_code',
        'pickup_barangay_label',
        'pickup_postal_code',
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

    public function courier()
    {
        return $this->belongsTo(Courier::class);
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
