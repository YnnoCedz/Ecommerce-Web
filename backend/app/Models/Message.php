<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'body',
        'status',
        'is_system',
        'order_number',
        'order_id',
        'sent_at',
    ];

    public function attachments()
    {
        return $this->hasMany(MessageAttachment::class);
    }
}

