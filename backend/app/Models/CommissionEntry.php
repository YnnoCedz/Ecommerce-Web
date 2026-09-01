<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionEntry extends Model
{
    protected $fillable = ['reference', 'source_key', 'commission_type', 'source_type', 'source_id', 'recipient_type', 'recipient_id', 'rate_id', 'gross_amount', 'calculation_type', 'percentage_rate', 'fixed_amount', 'commission_amount', 'net_amount', 'status', 'commission_taken', 'taken_at', 'taken_by', 'taken_reference', 'waiver_reason', 'reversal_of_id', 'reversed_at', 'payout_id', 'metadata'];

    protected $casts = ['gross_amount' => 'decimal:2', 'percentage_rate' => 'decimal:4', 'fixed_amount' => 'decimal:2', 'commission_amount' => 'decimal:2', 'net_amount' => 'decimal:2', 'commission_taken' => 'boolean', 'taken_at' => 'datetime', 'reversed_at' => 'datetime', 'metadata' => 'array'];

    public function rate()
    {
        return $this->belongsTo(CommissionRate::class);
    }

    public function payout()
    {
        return $this->belongsTo(Payout::class);
    }
}
