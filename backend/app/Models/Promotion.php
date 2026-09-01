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
        'per_buyer_limit',
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
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
        'per_buyer_limit' => 'integer',
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

    public function redemptions()
    {
        return $this->hasMany(PromotionRedemption::class);
    }

    public function hasUsageRemaining(): bool
    {
        return $this->usage_limit === null || (int) $this->usage_count < (int) $this->usage_limit;
    }

    public function canBeUsedBy(?User $buyer): bool
    {
        if ($this->derivedStatus() !== 'active') {
            return false;
        }

        return ! $buyer || $this->per_buyer_limit === null
            || $this->redemptions()->where('buyer_id', $buyer->id)->count() < (int) $this->per_buyer_limit;
    }

    public function derivedStatus(): string
    {
        if ($this->cancelled_at || $this->status === 'cancelled') {
            return 'cancelled';
        }

        if ($this->kind === 'deal' && (! $this->starts_at || ! $this->ends_at)) {
            return 'draft';
        }

        if (! $this->hasUsageRemaining()) {
            return 'limit_reached';
        }

        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return 'scheduled';
        }

        return $this->ends_at && $now->gte($this->ends_at) ? 'expired' : 'active';
    }

    public function canBeCancelled(): bool
    {
        return $this->kind === 'deal'
            && in_array($this->derivedStatus(), ['active', 'scheduled'], true);
    }

    public function reactivationBlockReason(): ?string
    {
        if ($this->kind !== 'deal' || $this->derivedStatus() !== 'cancelled') {
            return 'not_cancelled';
        }

        if (! $this->starts_at || ! $this->ends_at) {
            return 'invalid_schedule';
        }

        if (now()->gte($this->ends_at)) {
            return 'expired_schedule';
        }

        if (! $this->hasUsageRemaining()) {
            return 'usage_limit_reached';
        }

        if (! $this->product()->where('status', 'active')->whereNull('deleted_at')->exists()) {
            return 'invalid_product';
        }

        return null;
    }

    public function canBeReactivated(): bool
    {
        return $this->reactivationBlockReason() === null;
    }
}
