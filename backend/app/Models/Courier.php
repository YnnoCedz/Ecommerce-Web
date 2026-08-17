<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Courier extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'contact_email',
        'contact_phone',
        'service_area',
        'active',
    ];

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }
}

