<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingRegistrationDocument extends Model
{
    protected $fillable = [
        'pending_registration_id', 'document_type', 'storage_disk', 'file_path',
        'original_filename', 'mime_type', 'file_size', 'uploaded_at',
    ];

    protected $hidden = ['file_path', 'storage_disk'];

    protected $casts = ['uploaded_at' => 'datetime'];

    public function registration()
    {
        return $this->belongsTo(PendingRegistration::class, 'pending_registration_id');
    }
}
