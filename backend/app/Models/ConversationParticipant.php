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

    protected $casts = [
        'unread_count' => 'integer',
        'last_read_at' => 'datetime',
        'muted' => 'boolean',
        'archived' => 'boolean',
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
