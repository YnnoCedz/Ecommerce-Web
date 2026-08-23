<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPreference extends Model
{
    protected $attributes = [
        'language' => 'en-PH',
        'currency' => 'PHP',
        'number_format' => '1,000.00',
        'recommendations_enabled' => true,
        'recently_viewed_enabled' => true,
        'price_drop_alerts_enabled' => true,
        'analytics_cookies_enabled' => true,
        'marketing_cookies_enabled' => false,
    ];

    protected $fillable = [
        'user_id',
        'language',
        'currency',
        'number_format',
        'recommendations_enabled',
        'recently_viewed_enabled',
        'price_drop_alerts_enabled',
        'analytics_cookies_enabled',
        'marketing_cookies_enabled',
    ];

    protected $casts = [
        'recommendations_enabled' => 'boolean',
        'recently_viewed_enabled' => 'boolean',
        'price_drop_alerts_enabled' => 'boolean',
        'analytics_cookies_enabled' => 'boolean',
        'marketing_cookies_enabled' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
