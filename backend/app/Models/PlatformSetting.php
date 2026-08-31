<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'is_public', 'updated_by'];

    protected $casts = ['is_public' => 'boolean'];
}
