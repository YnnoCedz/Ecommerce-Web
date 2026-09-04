<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryProof extends Model
{
    protected $fillable = [
        'shipment_id',
        'courier_id',
        'storage_disk',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'note',
        'submitted_at',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'submitted_at' => 'datetime',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }
}
