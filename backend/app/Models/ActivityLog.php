<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id', 'actor_role', 'event_type', 'event_category', 'description',
        'subject_type', 'subject_id', 'ip_address', 'user_agent', 'metadata',
    ];

    protected $casts = ['metadata' => 'array'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
