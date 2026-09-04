<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Persistent private identity document for a marketplace user.
 *
 * Follows the seller_documents / courier_documents conventions: the file itself
 * always lives on a private disk and is only ever surfaced through a short-lived
 * signed URL behind an authorization check. `file_path` and `storage_disk` are
 * never included in an API payload.
 */
class UserDocument extends Model
{
    public const TYPE_GOVERNMENT_ID = 'government_id';

    protected $fillable = [
        'user_id',
        'document_type',
        'storage_disk',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'status',
        'uploaded_at',
        'reviewed_at',
        'reviewed_by',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
