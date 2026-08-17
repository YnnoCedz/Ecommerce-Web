<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportAttachment extends Model
{
    protected $fillable = [
        'report_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
    ];
}

