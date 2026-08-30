<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VariantOption extends Model
{
    protected $fillable = [
        'product_variant_id',
        'option_name',
        'value',
        'sort_order',
    ];

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}

