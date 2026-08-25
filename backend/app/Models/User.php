<?php

namespace App\Models;

use App\Notifications\EmailVerificationCodeNotification;
use App\Notifications\PasswordResetLinkNotification;
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

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'mobile',
        'phone',
        'avatar_path',
        'password',
        'role',
        'status',
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
        'two_factor_enabled' => 'boolean',
        'two_factor_confirmed_at' => 'datetime',
    ];

    public function addresses()
    {
        return $this->hasMany(Address::class);
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

    public function isSeller(): bool
    {
        return $this->role === 'seller';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function hasApprovedSellerProfile(): bool
    {
        return $this->isSeller() && $this->seller?->status === 'approved';
    }

    public function canAccessPlatformArea(): bool
    {
        return ! in_array($this->status, ['suspended', 'restricted', 'pending'], true);
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
