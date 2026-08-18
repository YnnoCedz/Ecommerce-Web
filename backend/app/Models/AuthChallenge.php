<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuthChallenge extends Model
{
    protected $fillable = [
        'user_id',
        'purpose',
        'channel',
        'code_hash',
        'attempts',
        'max_attempts',
        'expires_at',
        'resend_available_at',
        'consumed_at',
        'sent_to',
        'metadata',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'resend_available_at' => 'datetime',
        'consumed_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
