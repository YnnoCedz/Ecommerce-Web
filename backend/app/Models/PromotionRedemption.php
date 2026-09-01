<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionRedemption extends Model
{
    protected $fillable = ['promotion_id', 'order_id', 'buyer_id', 'redeemed_at'];

    protected $casts = ['redeemed_at' => 'datetime'];

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }
}
