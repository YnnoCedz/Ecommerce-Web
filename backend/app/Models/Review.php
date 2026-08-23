<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'seller_id',
        'product_id',
        'order_id',
        'order_item_id',
        'rating',
        'title',
        'body',
        'status',
        'helpful_count',
        'not_helpful_count',
        'submitted_at',
        'moderated_at',
        'moderation_note',
    ];

    protected $casts = [
        'rating' => 'integer',
        'helpful_count' => 'integer',
        'not_helpful_count' => 'integer',
        'submitted_at' => 'datetime',
        'moderated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function reply()
    {
        return $this->hasOne(ReviewReply::class);
    }
}
