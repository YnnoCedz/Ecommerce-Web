<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'category',
        'title',
        'body',
        'action_type',
        'action_label',
        'order_id',
        'seller_order_id',
        'product_id',
        'conversation_id',
        'read_at',
        'dismissed_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }
}
