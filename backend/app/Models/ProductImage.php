<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    protected $fillable = [
        'product_id',
        'storage_disk',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'alt_text',
        'sort_order',
        'is_primary',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
