<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderCancellation extends Model
{
    protected $fillable = ['order_id', 'seller_order_id', 'buyer_id', 'seller_id', 'reason', 'refunded_amount', 'inventory_restored_at', 'cancelled_at'];

    protected $casts = ['refunded_amount' => 'decimal:2', 'inventory_restored_at' => 'datetime', 'cancelled_at' => 'datetime'];

    public function order() { return $this->belongsTo(Order::class); }
    public function sellerOrder() { return $this->belongsTo(SellerOrder::class); }
}
