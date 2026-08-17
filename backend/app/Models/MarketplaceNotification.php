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
        'product_id',
        'conversation_id',
        'read_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
