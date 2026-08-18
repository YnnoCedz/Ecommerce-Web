<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $fillable = [
        'user_id',
        'status',
        'promo_code',
        'subtotal',
        'shipping_total',
        'discount_total',
        'grand_total',
        'last_checked_out_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(CartItem::class);
    }

    public function activeItems()
    {
        return $this->items()->where('saved_for_later', false);
    }

    public function savedItems()
    {
        return $this->items()->where('saved_for_later', true);
    }
}
