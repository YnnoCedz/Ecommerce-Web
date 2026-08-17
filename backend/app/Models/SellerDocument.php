<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerDocument extends Model
{
    protected $fillable = [
        'seller_id',
        'document_type',
        'file_name',
        'file_path',
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
}
