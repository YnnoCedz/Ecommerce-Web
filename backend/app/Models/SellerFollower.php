<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerFollower extends Model
{
    protected $fillable = [
        'seller_id',
        'user_id',
        'followed_at',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
