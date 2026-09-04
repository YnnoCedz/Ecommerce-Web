<?php

namespace App\Models;

use App\Notifications\EmailVerificationCodeNotification;
use App\Notifications\PasswordResetLinkNotification;
use App\Services\CapabilityResolver;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmailContract
{
    use HasApiTokens, HasFactory, MustVerifyEmailTrait, Notifiable;

    public const EMAIL_VERIFICATION_PURPOSE = 'email_verification';

    public const EMAIL_VERIFICATION_EXPIRES_MINUTES = 10;

    public const EMAIL_VERIFICATION_RESEND_SECONDS = 30;

    public const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

    public const REGISTRATION_APPROVED = 'approved';

    public const REGISTRATION_PENDING_REVIEW = 'pending_review';

    public const REGISTRATION_REJECTED = 'rejected';

    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'sex',
        'birthdate',
        'email',
        'mobile',
        'phone',
        'avatar_path',
        'password',
        'role',
        'status',
        'registration_status',
        'registration_submitted_at',
        'registration_reviewed_at',
        'registration_reviewed_by',
        'registration_decision_reason',
        'location_label',
        'email_verified_at',
        'last_active_at',
        'two_factor_enabled',
        'two_factor_method',
        'two_factor_confirmed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_active_at' => 'datetime',
        'birthdate' => 'date',
        'two_factor_enabled' => 'boolean',
        'two_factor_confirmed_at' => 'datetime',
        'registration_submitted_at' => 'datetime',
        'registration_reviewed_at' => 'datetime',
    ];

    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    public function documents()
    {
        return $this->hasMany(UserDocument::class);
    }

    public function marketplaceProfile()
    {
        return $this->hasOne(MarketplaceProfile::class);
    }

    public function registrationReviewer()
    {
        return $this->belongsTo(User::class, 'registration_reviewed_by');
    }

    public function seller()
    {
        return $this->hasOne(Seller::class);
    }

    public function sellerApplications()
    {
        return $this->hasMany(SellerApplication::class, 'applicant_user_id');
    }

    public function latestSellerApplication()
    {
        return $this->hasOne(SellerApplication::class, 'applicant_user_id')->latestOfMany();
    }

    public function courier()
    {
        return $this->hasOne(Courier::class);
    }

    public function courierApplications()
    {
        return $this->hasMany(CourierApplication::class);
    }

    public function latestCourierApplication()
    {
        return $this->hasOne(CourierApplication::class)->latestOfMany();
    }

    public function logisticsStaff()
    {
        return $this->hasOne(LogisticsStaff::class);
    }

    public function logisticsProviderApplications()
    {
        return $this->hasMany(LogisticsProviderApplication::class);
    }

    public function latestLogisticsProviderApplication()
    {
        return $this->hasOne(LogisticsProviderApplication::class)->latestOfMany();
    }

    public function hasActiveCourierProfile(): bool
    {
        if ($this->relationLoaded('courier')) {
            $courier = $this->getRelation('courier');
        } else {
            $courier = $this->courier()->first();
            $this->setRelation('courier', $courier);
        }

        if ($courier && ! $courier->relationLoaded('activeLogisticsAffiliation')) {
            $courier->load('activeLogisticsAffiliation.provider');
        }
        if ($courier && ! $courier->relationLoaded('approvedApplication')) {
            $courier->load('approvedApplication:id,logistics_provider_id');
        }

        $affiliation = $courier?->activeLogisticsAffiliation;
        $legacyCourier = $courier !== null
            && ($courier->approved_application_id === null
                || $courier->approvedApplication?->logistics_provider_id === null);

        return ! $this->isAdmin()
            && $courier !== null
            && $courier->active
            && $courier->status === 'active'
            && $courier->approved_at !== null
            && ($legacyCourier || (
                $affiliation !== null
                && $affiliation->status === 'active'
                && $affiliation->ended_at === null
                && $affiliation->provider?->isActive()
            ));
    }

    public function hasActiveLogisticsStaffProfile(): bool
    {
        if (! $this->relationLoaded('logisticsStaff')) {
            $this->load('logisticsStaff.provider');
        } elseif ($this->logisticsStaff && ! $this->logisticsStaff->relationLoaded('provider')) {
            $this->logisticsStaff->load('provider');
        }

        return $this->logisticsStaff?->isActiveForLogistics() ?? false;
    }

    public function carts()
    {
        return $this->hasMany(Cart::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function wishlistItems()
    {
        return $this->hasMany(WishlistItem::class);
    }

    public function authChallenges()
    {
        return $this->hasMany(AuthChallenge::class);
    }

    public function marketplaceNotifications()
    {
        return $this->hasMany(MarketplaceNotification::class);
    }

    public function preference()
    {
        return $this->hasOne(UserPreference::class);
    }

    public function conversationParticipants()
    {
        return $this->morphMany(ConversationParticipant::class, 'participantable');
    }

    public function sentMessages()
    {
        return $this->morphMany(Message::class, 'senderable');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function isBuyer(): bool
    {
        return $this->role === 'buyer';
    }

    /**
     * LEGACY. `users.role === 'seller'` is historical data only and is NOT an
     * authorization authority as of Phase 2.6. Use hasApprovedSellerProfile()
     * or CapabilityResolver::seller() to prove seller capability.
     *
     * @deprecated Phase 2.6 - seller capability is derived from the seller profile.
     */
    public function isSeller(): bool
    {
        return $this->role === 'seller';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function canShopMarketplace(): bool
    {
        return app(CapabilityResolver::class)->buyer($this);
    }

    /**
     * Resolve the seller profile without consulting `users.role`, caching the
     * relation so repeated capability reads stay at one query.
     */
    public function resolveSellerProfile(): ?Seller
    {
        if (! $this->relationLoaded('seller')) {
            $this->setRelation('seller', $this->seller()->first());
        }

        return $this->getRelation('seller');
    }

    /**
     * Phase 2.6: authoritative seller capability. Deliberately role-independent
     * so one identity can be buyer + seller + rider simultaneously (D-10).
     */
    public function hasApprovedSellerProfile(): bool
    {
        return $this->resolveSellerProfile()?->status === 'approved';
    }

    public function isRegistrationApproved(): bool
    {
        return ($this->registration_status ?? self::REGISTRATION_APPROVED) === self::REGISTRATION_APPROVED;
    }

    public function isRegistrationRejected(): bool
    {
        return $this->registration_status === self::REGISTRATION_REJECTED;
    }

    public function isAwaitingRegistrationReview(): bool
    {
        return $this->registration_status === self::REGISTRATION_PENDING_REVIEW;
    }

    /**
     * The account itself is usable. Every capability is gated on this first.
     */
    public function isAccountEligible(): bool
    {
        return $this->canAccessPlatformArea() && $this->hasVerifiedEmail();
    }

    public function canAccessPlatformArea(): bool
    {
        return $this->status === 'active';
    }

    /**
     * @return array{buyer: bool, seller: bool, rider: bool, logistics: bool, admin: bool}
     */
    public function capabilities(): array
    {
        return app(CapabilityResolver::class)->for($this);
    }

    /**
     * Age is always derived from birthdate and is never stored.
     */
    public function getAgeAttribute(): ?int
    {
        return $this->birthdate?->age;
    }

    public function getDisplayNameAttribute(): string
    {
        $displayName = trim(implode(' ', array_filter([$this->first_name, $this->last_name])));

        return $displayName !== '' ? $displayName : (string) $this->name;
    }

    public function sendEmailVerificationNotification(): void
    {
        if ($this->hasVerifiedEmail()) {
            return;
        }

        $this->authChallenges()
            ->where('purpose', self::EMAIL_VERIFICATION_PURPOSE)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $challenge = $this->authChallenges()->create([
            'purpose' => self::EMAIL_VERIFICATION_PURPOSE,
            'channel' => 'email',
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => self::EMAIL_VERIFICATION_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(self::EMAIL_VERIFICATION_EXPIRES_MINUTES),
            'resend_available_at' => now()->addSeconds(self::EMAIL_VERIFICATION_RESEND_SECONDS),
            'sent_to' => $this->email,
            'metadata' => [
                'issued_at' => now()->toISOString(),
            ],
        ]);

        $deliveryStartedAt = hrtime(true);

        try {
            Notification::send($this, new EmailVerificationCodeNotification($challenge, $code));
        } catch (\Throwable $e) {
            $deliveryMs = (hrtime(true) - $deliveryStartedAt) / 1_000_000;

            // Failed delivery must not leave an unusable resend cooldown.
            $challenge->forceFill([
                'consumed_at' => now(),
                'resend_available_at' => now(),
            ])->save();

            Log::error('Verification email delivery failed.', [
                'user_id' => $this->getKey(),
                'mailer' => config('mail.default'),
                'transport_ms' => round($deliveryMs, 2),
                'exception_class' => $e::class,
            ]);

            throw $e;
        }

        if (config('performance.logging_enabled')) {
            Log::info('Verification email delivered.', [
                'user_id' => $this->getKey(),
                'mailer' => config('mail.default'),
                'transport_ms' => round((hrtime(true) - $deliveryStartedAt) / 1_000_000, 2),
            ]);
        }
    }

    public function sendPasswordResetNotification($token): void
    {
        Notification::send($this, new PasswordResetLinkNotification($token));
    }
}
