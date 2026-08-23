<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    protected $fillable = ['order_id', 'seller_order_id', 'buyer_id', 'seller_id', 'status', 'reason', 'buyer_statement', 'seller_response', 'requested_amount', 'refunded_amount', 'requested_at', 'resolved_at'];

    protected $casts = ['requested_amount' => 'decimal:2', 'refunded_amount' => 'decimal:2', 'requested_at' => 'datetime', 'resolved_at' => 'datetime'];

    public function order() { return $this->belongsTo(Order::class); }
    public function sellerOrder() { return $this->belongsTo(SellerOrder::class); }
    public function buyer() { return $this->belongsTo(User::class, 'buyer_id'); }
    public function seller() { return $this->belongsTo(Seller::class); }
    public function items() { return $this->hasMany(ReturnRequestItem::class); }
    public function evidence() { return $this->hasMany(ReturnEvidence::class); }
    public function dispute() { return $this->hasOne(Dispute::class); }
}
