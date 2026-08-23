<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequestItem extends Model
{
    protected $fillable = ['return_request_id', 'order_item_id', 'quantity', 'unit_price', 'refund_amount'];
    protected $casts = ['quantity' => 'integer', 'unit_price' => 'decimal:2', 'refund_amount' => 'decimal:2'];

    public function returnRequest() { return $this->belongsTo(ReturnRequest::class); }
    public function orderItem() { return $this->belongsTo(OrderItem::class); }
}
