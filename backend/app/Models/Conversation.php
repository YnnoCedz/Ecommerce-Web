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

    public function participants()
    {
        return $this->hasMany(ConversationParticipant::class);
    }
}
