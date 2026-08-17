<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'reporter_user_id',
        'reason',
        'details',
        'status',
        'submitted_at',
        'resolved_at',
    ];

    public function attachments()
    {
        return $this->hasMany(ReportAttachment::class);
    }
}
