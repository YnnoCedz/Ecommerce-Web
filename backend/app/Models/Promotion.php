<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'seller_id',
        'product_id',
        'kind',
        'code',
        'name',
        'type',
        'value',
        'deal_price',
        'min_order',
        'usage_limit',
        'usage_count',
        'starts_at',
        'ends_at',
        'cancelled_at',
        'status',
        'applies_to_label',
        'category_id',
        'new_customers_only',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'deal_price' => 'decimal:2',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'new_customers_only' => 'boolean',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function derivedStatus(): string
    {
        if ($this->cancelled_at || $this->status === 'cancelled') {
            return 'cancelled';
        }

        if ($this->kind === 'deal' && (! $this->starts_at || ! $this->ends_at)) {
            return 'draft';
        }

        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return 'scheduled';
        }

        return $this->ends_at && $now->gte($this->ends_at) ? 'expired' : 'active';
    }
}
