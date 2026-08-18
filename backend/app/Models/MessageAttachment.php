<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageAttachment extends Model
{
    protected $fillable = [
        'message_id',
        'storage_disk',
        'file_name',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'kind',
    ];
}
