<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationParticipant extends Model
{
    protected $fillable = [
        'conversation_id',
        'participantable_type',
        'participantable_id',
        'unread_count',
        'last_read_at',
        'muted',
        'archived',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function participantable()
    {
        return $this->morphTo();
    }
}
