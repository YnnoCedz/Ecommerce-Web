<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payout extends Model
{
    protected $fillable = ['payout_number', 'recipient_type', 'recipient_id', 'period_start', 'period_end', 'currency', 'gross_amount', 'commission_amount', 'adjustment_amount', 'net_amount', 'status', 'payment_method', 'payment_reference', 'notes', 'approved_by', 'requested_at', 'approved_at', 'processing_at', 'paid_at', 'failed_at', 'cancelled_at', 'metadata'];

    protected $casts = ['period_start' => 'date', 'period_end' => 'date', 'gross_amount' => 'decimal:2', 'commission_amount' => 'decimal:2', 'adjustment_amount' => 'decimal:2', 'net_amount' => 'decimal:2', 'requested_at' => 'datetime', 'approved_at' => 'datetime', 'processing_at' => 'datetime', 'paid_at' => 'datetime', 'failed_at' => 'datetime', 'cancelled_at' => 'datetime', 'metadata' => 'array'];

    public function items()
    {
        return $this->hasMany(PayoutItem::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
