<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourierDocument extends Model
{
    protected $fillable = [
        'courier_application_id', 'document_type', 'storage_disk', 'file_path',
        'original_filename', 'mime_type', 'file_size', 'status', 'uploaded_at',
        'reviewed_at', 'reviewed_by',
    ];

    protected $casts = ['uploaded_at' => 'datetime', 'reviewed_at' => 'datetime'];

    public function application()
    {
        return $this->belongsTo(CourierApplication::class, 'courier_application_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
