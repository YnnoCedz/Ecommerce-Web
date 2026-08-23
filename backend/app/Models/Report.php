<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'reporter_user_id',
        'target_type',
        'target_id',
        'target_name',
        'reason',
        'details',
        'severity',
        'status',
        'moderation_notes',
        'resolved_by',
        'submitted_at',
        'resolved_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_user_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function attachments()
    {
        return $this->hasMany(ReportAttachment::class);
    }
}
