<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Seller extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
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
        'province',
        'city',
        'postal_code',
        'contact_name',
        'contact_email',
        'public_email',
        'contact_phone',
        'messaging_phone',
        'banner_path',
        'logo_path',
        'verified',
        'status',
        'response_rate',
        'response_time_label',
        'follower_count',
        'product_count',
        'joined_year',
        'payout_method',
        'payout_schedule',
        'bank_name',
        'account_name',
        'account_type',
        'bank_account_number',
        'gcash_number',
        'maya_number',
        'account_number_last4',
        'operating_hours',
        'return_policy',
        'shipping_policy',
        'privacy_policy',
        'brand_colors',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'response_rate' => 'decimal:2',
        'follower_count' => 'integer',
        'product_count' => 'integer',
        'joined_year' => 'integer',
        'operating_hours' => 'array',
        'brand_colors' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'seller_categories')->withPivot(['status', 'reviewed_at'])->withTimestamps();
    }

    public function documents()
    {
        return $this->hasMany(SellerDocument::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function promotions()
    {
        return $this->hasMany(Promotion::class);
    }

    public function followers()
    {
        return $this->hasMany(SellerFollower::class);
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }
}
