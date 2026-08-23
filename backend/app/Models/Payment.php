<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'parent_payment_id',
        'type',
        'method',
        'provider',
        'status',
        'amount',
        'refunded_amount',
        'currency',
        'provider_reference',
        'card_brand',
        'card_last4',
        'proof_path',
        'paid_at',
        'failure_reason',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parentPayment()
    {
        return $this->belongsTo(self::class, 'parent_payment_id');
    }

    public function refunds()
    {
        return $this->hasMany(self::class, 'parent_payment_id');
    }
}
