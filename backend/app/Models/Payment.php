<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'method',
        'provider',
        'status',
        'amount',
        'currency',
        'provider_reference',
        'card_brand',
        'card_last4',
        'proof_path',
        'paid_at',
        'failure_reason',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
