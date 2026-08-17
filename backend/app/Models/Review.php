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

    public function reply()
    {
        return $this->hasOne(ReviewReply::class);
    }
}
