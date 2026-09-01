<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionRate extends Model
{
    protected $fillable = ['commission_type', 'calculation_type', 'percentage_rate', 'fixed_amount', 'effective_from', 'effective_until', 'is_active', 'created_by'];

    protected $casts = ['percentage_rate' => 'decimal:4', 'fixed_amount' => 'decimal:2', 'effective_from' => 'datetime', 'effective_until' => 'datetime', 'is_active' => 'boolean'];
}
