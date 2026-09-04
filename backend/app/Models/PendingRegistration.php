<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;

class PendingRegistration extends Model
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'first_name', 'middle_name', 'last_name', 'sex', 'birthdate', 'name',
        'email', 'mobile', 'phone', 'password', 'registration_context',
        'application_payload', 'expires_at',
        'address_line1', 'address_line2', 'region', 'region_code', 'province',
        'province_code', 'city', 'city_code', 'barangay', 'barangay_code', 'postal_code',
        'document_type', 'document_storage_disk', 'document_file_path',
        'document_original_filename', 'document_mime_type', 'document_file_size',
        'document_uploaded_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'birthdate' => 'date',
        'application_payload' => 'array',
        'document_uploaded_at' => 'datetime',
    ];

    protected $hidden = ['password', 'document_file_path', 'document_storage_disk'];

    public function hasDocument(): bool
    {
        return filled($this->document_file_path);
    }

    public function challenges()
    {
        return $this->hasMany(PendingRegistrationChallenge::class);
    }

    public function documents()
    {
        return $this->hasMany(PendingRegistrationDocument::class);
    }

    public function getDisplayNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name) ?: (string) $this->name;
    }
}
