<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'seller_id',
        'code',
        'type',
        'value',
        'min_order',
        'usage_limit',
        'usage_count',
        'starts_at',
        'ends_at',
        'status',
        'applies_to_label',
        'category_id',
        'new_customers_only',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
