<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;

class PendingRegistration extends Model
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'first_name', 'last_name', 'name', 'email', 'mobile', 'phone', 'password', 'expires_at',
    ];

    protected $casts = ['expires_at' => 'datetime'];

    public function challenges()
    {
        return $this->hasMany(PendingRegistrationChallenge::class);
    }

    public function getDisplayNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name) ?: (string) $this->name;
    }
}
