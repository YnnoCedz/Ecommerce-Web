<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HubServiceArea extends Model
{
    protected $fillable = [
        'hub_id', 'municipality_code', 'municipality_label', 'priority', 'active',
    ];

    protected $casts = ['priority' => 'integer', 'active' => 'boolean'];

    public function hub()
    {
        return $this->belongsTo(LogisticsHub::class, 'hub_id');
    }
}
