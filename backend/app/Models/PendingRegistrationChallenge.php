<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingRegistrationChallenge extends Model
{
    protected $fillable = [
        'pending_registration_id', 'code_hash', 'attempts', 'max_attempts',
        'expires_at', 'resend_available_at', 'consumed_at', 'sent_to', 'metadata',
    ];

    protected $casts = [
        'expires_at' => 'datetime', 'resend_available_at' => 'datetime',
        'consumed_at' => 'datetime', 'metadata' => 'array',
    ];

    public function pendingRegistration()
    {
        return $this->belongsTo(PendingRegistration::class);
    }
}
