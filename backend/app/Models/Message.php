<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'senderable_type',
        'senderable_id',
        'body',
        'status',
        'is_system',
        'order_number',
        'order_id',
        'sent_at',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'sent_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function senderable()
    {
        return $this->morphTo();
    }

    public function attachments()
    {
        return $this->hasMany(MessageAttachment::class);
    }
}
