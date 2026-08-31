<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerDocument extends Model
{
    protected $fillable = [
        'seller_id',
        'seller_application_id',
        'renewal_of_document_id',
        'document_type',
        'storage_disk',
        'file_name',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'status',
        'private',
        'uploaded_at',
        'expires_at',
        'submitted_at',
        'reviewed_at',
        'approved_at',
        'rejected_at',
        'review_notes',
    ];

    protected $casts = [
        'private' => 'boolean',
        'uploaded_at' => 'datetime',
        'expires_at' => 'date',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function sellerApplication()
    {
        return $this->belongsTo(SellerApplication::class);
    }

    public function renewedDocument()
    {
        return $this->belongsTo(self::class, 'renewal_of_document_id');
    }

    public function renewals()
    {
        return $this->hasMany(self::class, 'renewal_of_document_id');
    }
}
