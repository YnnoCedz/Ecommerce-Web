<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsProviderApplication extends Model
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'user_id', 'company_name', 'legal_name', 'contact_name', 'contact_email',
        'contact_phone', 'address_line1', 'address_line2', 'region_code',
        'region_label', 'province_code', 'province_label', 'city_code',
        'city_label', 'barangay_code', 'barangay_label', 'postal_code', 'status',
        'submitted_at', 'reviewed_at', 'reviewed_by', 'rejection_reason',
        'approved_provider_id',
    ];

    protected $casts = ['submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];

    public function applicant()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function documents()
    {
        return $this->hasMany(LogisticsDocument::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approvedProvider()
    {
        return $this->belongsTo(LogisticsProvider::class, 'approved_provider_id');
    }
}
