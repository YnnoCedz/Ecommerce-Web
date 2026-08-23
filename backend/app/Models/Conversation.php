<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'type',
        'subject',
        'order_number',
        'order_id',
        'product_id',
        'seller_order_id',
        'last_message_preview',
        'last_message_at',
        'unread_count',
        'muted',
        'archived',
    ];

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany('sent_at');
    }

    public function participants()
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function sellerOrder()
    {
        return $this->belongsTo(SellerOrder::class);
    }
}
