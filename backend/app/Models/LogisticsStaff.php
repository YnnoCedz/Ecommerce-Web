<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsStaff extends Model
{
    public const TYPES = ['provider_manager', 'hub_manager', 'dispatcher'];

    public const STATUSES = ['active', 'suspended', 'inactive'];

    protected $table = 'logistics_staff';

    protected $fillable = [
        'user_id', 'logistics_provider_id', 'primary_hub_id', 'staff_type',
        'status', 'approved_at', 'approved_by', 'suspended_at',
    ];

    protected $casts = ['approved_at' => 'datetime', 'suspended_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(LogisticsProvider::class, 'logistics_provider_id');
    }

    public function primaryHub()
    {
        return $this->belongsTo(LogisticsHub::class, 'primary_hub_id');
    }

    public function isActiveForLogistics(): bool
    {
        return $this->status === 'active'
            && $this->approved_at !== null
            && $this->provider?->isActive();
    }

    public function isProviderManager(): bool
    {
        return $this->staff_type === 'provider_manager';
    }

    public function canAccessHub(LogisticsHub $hub): bool
    {
        return $hub->logistics_provider_id === $this->logistics_provider_id
            && ($this->isProviderManager() || $this->primary_hub_id === $hub->id);
    }
}
