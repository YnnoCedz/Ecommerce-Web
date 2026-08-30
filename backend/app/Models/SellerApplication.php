<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerApplication extends Model
{
    protected $fillable = [
        'applicant_user_id',
        'business_name',
        'trade_name',
        'slug',
        'tagline',
        'description',
        'owner_id_number',
        'tin',
        'registration_number',
        'established_on',
        'address_line1',
        'address_line2',
        'region',
        'region_code',
        'province',
        'province_code',
        'city',
        'city_code',
        'barangay',
        'barangay_code',
        'postal_code',
        'contact_name',
        'contact_email',
        'public_email',
        'contact_phone',
        'messaging_phone',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'approved_seller_id',
        'submitted_at',
    ];

    protected $casts = [
        'established_on' => 'date',
        'reviewed_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function applicant()
    {
        return $this->belongsTo(User::class, 'applicant_user_id');
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'seller_application_categories')->withTimestamps();
    }

    public function documents()
    {
        return $this->hasMany(SellerDocument::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approvedSeller()
    {
        return $this->belongsTo(Seller::class, 'approved_seller_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}
