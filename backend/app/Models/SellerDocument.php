<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerDocument extends Model
{
    protected $fillable = [
        'seller_id',
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
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function sellerApplication()
    {
        return $this->belongsTo(SellerApplication::class);
    }
}
