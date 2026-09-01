<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayoutItem extends Model
{
    protected $fillable = ['payout_id', 'source_key', 'source_type', 'source_id', 'commission_entry_id', 'description', 'gross_amount', 'commission_amount', 'adjustment_amount', 'net_amount', 'metadata'];

    protected $casts = ['gross_amount' => 'decimal:2', 'commission_amount' => 'decimal:2', 'adjustment_amount' => 'decimal:2', 'net_amount' => 'decimal:2', 'metadata' => 'array'];

    public function payout()
    {
        return $this->belongsTo(Payout::class);
    }

    public function commissionEntry()
    {
        return $this->belongsTo(CommissionEntry::class);
    }
}
