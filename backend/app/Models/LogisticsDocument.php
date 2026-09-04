<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsDocument extends Model
{
    public const TYPE_APPLICANT_ID = 'applicant_id';

    public const TYPE_BUSINESS_PERMIT = 'business_permit';

    protected $fillable = [
        'logistics_provider_application_id', 'document_type', 'storage_disk',
        'file_path', 'original_filename', 'mime_type', 'file_size', 'status',
        'uploaded_at', 'reviewed_at', 'reviewed_by',
    ];

    protected $hidden = ['file_path', 'storage_disk'];

    protected $casts = ['uploaded_at' => 'datetime', 'reviewed_at' => 'datetime'];

    public function application()
    {
        return $this->belongsTo(LogisticsProviderApplication::class, 'logistics_provider_application_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
