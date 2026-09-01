<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'buyer_id',
        'voucher_promotion_id',
        'voucher_code',
        'order_number',
        'status',
        'payment_status',
        'payment_method',
        'currency',
        'shipping_name',
        'shipping_phone',
        'shipping_line1',
        'shipping_line2',
        'shipping_city',
        'shipping_province',
        'shipping_postal_code',
        'subtotal',
        'shipping_total',
        'discount_total',
        'product_promotion_discount_total',
        'voucher_discount_total',
        'tax_total',
        'grand_total',
        'buyer_notes',
        'placed_at',
        'completed_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_total' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'product_promotion_discount_total' => 'decimal:2',
        'voucher_discount_total' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'placed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function sellerOrders()
    {
        return $this->hasMany(SellerOrder::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function cancellations()
    {
        return $this->hasMany(OrderCancellation::class);
    }

    public function returnRequests()
    {
        return $this->hasMany(ReturnRequest::class);
    }
}
