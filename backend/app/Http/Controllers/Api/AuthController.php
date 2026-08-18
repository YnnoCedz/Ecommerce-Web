<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthChallenge;
use App\Models\User;
use App\Notifications\AuthChallengeNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const TWO_FACTOR_PURPOSE = 'login';
    private const TWO_FACTOR_CHANNEL = 'email';
    private const TWO_FACTOR_CODE_LENGTH = 6;
    private const TWO_FACTOR_EXPIRES_MINUTES = 10;
    private const TWO_FACTOR_RESEND_SECONDS = 30;
    private const TWO_FACTOR_MAX_ATTEMPTS = 5;

    protected function strongPasswordRules(): array
    {
        return ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()];
    }

    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone', 'unique:users,mobile'],
            'password' => $this->strongPasswordRules(),
        ]);

        $email = $this->normalizeEmail($data['email']);
        $phone = $this->normalizePhilippinePhone($data['phone']);

        try {
            $user = DB::transaction(function () use ($data, $email, $phone) {
                $user = User::create([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'name' => trim($data['first_name'] . ' ' . $data['last_name']),
                    'email' => $email,
                    'mobile' => $phone,
                    'phone' => $phone,
                    'password' => Hash::make($data['password']),
                    'role' => 'buyer',
                    'status' => 'active',
                    'location_label' => null,
                    'email_verified_at' => null,
                    'last_active_at' => now(),
                    'two_factor_enabled' => false,
                ]);

                $user->sendEmailVerificationNotification();

                return $user;
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to complete registration right now. Please try again.',
                'code' => 'registration_failed',
            ], 500);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Registration successful. Please verify your email before signing in.',
            'user' => $this->userPayload($user),
            'requires_email_verification' => true,
            'verification_email' => $user->email,
            'redirect_to' => '/auth/verify-email?email=' . urlencode($user->email),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = User::where('email', $this->normalizeEmail($data['email']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'code' => 'invalid_credentials',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ], 422);
        }

        if (! $user->email_verified_at) {
            return response()->json([
                'message' => 'Please verify your email address before signing in.',
                'code' => 'email_unverified',
            ], 403);
        }

        if (in_array($user->status, ['suspended', 'restricted', 'pending'], true)) {
            return response()->json([
                'message' => match ($user->status) {
                    'suspended' => 'This account has been suspended.',
                    'restricted' => 'This account is currently restricted.',
                    default => 'This account is pending approval.',
                },
                'code' => match ($user->status) {
                    'suspended' => 'account_suspended',
                    'restricted' => 'account_restricted',
                    default => 'account_pending',
                },
            ], 403);
        }

        if ($user->two_factor_enabled) {
            $challenge = $this->issueTwoFactorChallenge($request, $user, $request->boolean('remember'));

            return response()->json([
                'message' => 'Two-factor verification is required.',
                'code' => 'two_factor_required',
                'requires_two_factor' => true,
                'user' => $this->userPayload($user),
                'redirect_to' => $this->redirectForUser($user),
                'two_factor_challenge_id' => $challenge->id,
                'two_factor_expires_at' => optional($challenge->expires_at)->toISOString(),
                'two_factor_resend_available_at' => optional($challenge->resend_available_at)->toISOString(),
            ], 202);
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        $user->forceFill(['last_active_at' => now()])->save();
        $user->refresh();

        return response()->json([
            'message' => 'Authenticated successfully.',
            'user' => $this->userPayload($user),
            'redirect_to' => $this->redirectForUser($user),
        ]);
    }

    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['nullable', 'integer', 'min:1'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $challenge = $this->resolvePendingChallenge($request, $data['challenge_id'] ?? null);

        if (! $challenge) {
            return response()->json([
                'message' => 'The verification code is invalid or has expired.',
                'code' => 'challenge_not_found',
            ], 422);
        }

        if ($challenge->expires_at->isPast()) {
            $challenge->forceFill(['consumed_at' => now()])->save();

            return response()->json([
                'message' => 'This verification code has expired. Please request a new code.',
                'code' => 'challenge_expired',
                'two_factor_challenge_id' => $challenge->id,
            ], 410);
        }

        if ($challenge->attempts >= $challenge->max_attempts) {
            $challenge->forceFill(['consumed_at' => now()])->save();

            return response()->json([
                'message' => 'Too many incorrect attempts. Please request a new code.',
                'code' => 'challenge_locked',
            ], 429);
        }

        if (! Hash::check($data['code'], $challenge->code_hash)) {
            $challenge->increment('attempts');
            $challenge->refresh();

            if ($challenge->attempts >= $challenge->max_attempts) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return response()->json([
                    'message' => 'Too many incorrect attempts. Please request a new code.',
                    'code' => 'challenge_locked',
                ], 429);
            }

            return response()->json([
                'message' => 'The verification code is invalid.',
                'code' => 'challenge_invalid',
                'remaining_attempts' => max(0, $challenge->max_attempts - $challenge->attempts),
            ], 422);
        }

        $user = User::find($challenge->user_id);

        if (! $user) {
            return response()->json([
                'message' => 'Unable to complete sign in right now.',
                'code' => 'challenge_user_missing',
            ], 500);
        }

        Auth::guard('web')->login($user, (bool) $request->session()->pull('auth.two_factor.remember', false));
        $request->session()->regenerate();
        $request->session()->forget([
            'auth.two_factor.user_id',
            'auth.two_factor.challenge_id',
            'auth.two_factor.redirect_to',
            'auth.two_factor.remember',
        ]);

        $challenge->forceFill(['consumed_at' => now()])->save();
        $user->forceFill(['last_active_at' => now()])->save();
        $user->refresh();

        return response()->json([
            'message' => 'Authenticated successfully.',
            'user' => $this->userPayload($user),
            'redirect_to' => $this->redirectForUser($user),
        ]);
    }

    public function resendTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $challenge = $this->resolvePendingChallenge($request, $data['challenge_id'] ?? null);

        if (! $challenge) {
            return response()->json([
                'message' => 'Unable to resend the verification code.',
                'code' => 'challenge_not_found',
            ], 422);
        }

        if ($challenge->resend_available_at && $challenge->resend_available_at->isFuture()) {
            return response()->json([
                'message' => 'Please wait before requesting another code.',
                'code' => 'resend_cooldown',
                'retry_after' => now()->diffInSeconds($challenge->resend_available_at, false),
            ], 429);
        }

        $user = User::find($challenge->user_id);

        if (! $user) {
            return response()->json([
                'message' => 'Unable to resend the verification code.',
                'code' => 'challenge_user_missing',
            ], 500);
        }

        $code = $this->generateTwoFactorCode();
        $challenge->forceFill([
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => self::TWO_FACTOR_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(self::TWO_FACTOR_EXPIRES_MINUTES),
            'resend_available_at' => now()->addSeconds(self::TWO_FACTOR_RESEND_SECONDS),
            'consumed_at' => null,
            'sent_to' => $user->email,
            'metadata' => array_merge($challenge->metadata ?? [], [
                'resent_at' => now()->toISOString(),
            ]),
        ])->save();

        $this->sendTwoFactorChallenge($user, $challenge, $code);

        return response()->json([
            'message' => 'A new verification code has been sent.',
            'two_factor_challenge_id' => $challenge->id,
            'two_factor_expires_at' => optional($challenge->expires_at)->toISOString(),
            'two_factor_resend_available_at' => optional($challenge->resend_available_at)->toISOString(),
        ]);
    }

    public function resendEmailVerification(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::where('email', $this->normalizeEmail($data['email']))->first();

        if ($user && ! $user->hasVerifiedEmail()) {
            $challenge = $this->resolveEmailVerificationChallenge($user);

            if ($challenge?->resend_available_at?->isFuture()) {
                return response()->json([
                    'message' => 'Please wait before requesting another verification code.',
                    'code' => 'verification_resend_cooldown',
                    'retry_after' => now()->diffInSeconds($challenge->resend_available_at, false),
                ], 429);
            }

            $user->sendEmailVerificationNotification();
        }

        return response()->json([
            'message' => 'If that email address exists, a verification code has been sent.',
            'retry_after' => User::EMAIL_VERIFICATION_RESEND_SECONDS,
            'expires_in' => User::EMAIL_VERIFICATION_EXPIRES_MINUTES * 60,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255', 'exists:users,email'],
        ], [
            'email.exists' => 'We could not find an account with that email address.',
        ]);

        try {
            $status = Password::broker()->sendResetLink([
                'email' => $this->normalizeEmail($data['email']),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to send a password reset link right now. Please try again.',
                'code' => 'password_reset_failed',
            ], 500);
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'Please wait before requesting another password reset link.',
                'code' => 'password_reset_throttled',
            ], 429);
        }

        return response()->json([
            'message' => 'If that email address exists, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => $this->strongPasswordRules(),
        ]);

        try {
            $status = Password::broker()->reset([
                'email' => $this->normalizeEmail($data['email']),
                'token' => $data['token'],
                'password' => $data['password'],
                'password_confirmation' => (string) $request->input('password_confirmation'),
            ], function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                    'last_active_at' => now(),
                ])->save();

                DB::table('sessions')
                    ->where('user_id', $user->id)
                    ->delete();

                event(new PasswordReset($user));
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to reset your password right now. Please try again.',
                'code' => 'password_reset_failed',
            ], 500);
        }

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'The password reset link is invalid or has expired.',
                'code' => 'password_reset_invalid',
            ], 422);
        }

        return response()->json([
            'message' => 'Your password has been reset successfully.',
            'redirect_to' => '/auth/login',
        ]);
    }

    public function verifyEmailVerification(Request $request): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $email = $this->normalizeEmail($data['email']);
        $sessionUser = $request->user();

        if ($sessionUser instanceof User && ! hash_equals($sessionUser->email, $email)) {
            return response()->json([
                'message' => 'The verification code is invalid or has expired.',
                'code' => 'verification_user_mismatch',
            ], 422);
        }

        $user = $sessionUser instanceof User
            ? $sessionUser
            : User::where('email', $email)->first();

        if (! $user) {
            return response()->json([
                'message' => 'The verification code is invalid or has expired.',
                'code' => 'verification_user_not_found',
            ], 422);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Your email address is already verified.',
                'user' => $this->userPayload($user),
            ]);
        }

        $challenge = $this->resolveEmailVerificationChallenge($user);

        if (! $challenge) {
            return response()->json([
                'message' => 'The verification code is invalid or has expired.',
                'code' => 'verification_challenge_not_found',
            ], 422);
        }

        if ($challenge->expires_at->isPast()) {
            return response()->json([
                'message' => 'This verification code has expired. Please request a new code.',
                'code' => 'verification_code_expired',
            ], 410);
        }

        if ($challenge->attempts >= $challenge->max_attempts) {
            $challenge->forceFill(['consumed_at' => now()])->save();

            return response()->json([
                'message' => 'Too many incorrect attempts. Please request a new code.',
                'code' => 'verification_code_locked',
            ], 429);
        }

        if (! Hash::check($data['code'], $challenge->code_hash)) {
            $challenge->increment('attempts');
            $challenge->refresh();

            if ($challenge->attempts >= $challenge->max_attempts) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return response()->json([
                    'message' => 'Too many incorrect attempts. Please request a new code.',
                    'code' => 'verification_code_locked',
                ], 429);
            }

            return response()->json([
                'message' => 'The verification code is invalid.',
                'code' => 'verification_code_invalid',
                'remaining_attempts' => max(0, $challenge->max_attempts - $challenge->attempts),
            ], 422);
        }

        $user->markEmailAsVerified();
        $user->forceFill(['last_active_at' => now()])->save();
        $challenge->forceFill(['consumed_at' => now()])->save();
        $user->refresh();

        if (! $sessionUser instanceof User) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => 'Email verified successfully.',
            'user' => $this->userPayload($user),
            'redirect_to' => '/',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'user' => $this->userPayload($user),
        ]);
    }

    protected function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'display_name' => $user->display_name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'phone' => $user->phone ?? $user->mobile,
            'role' => $user->role,
            'status' => $user->status,
            'seller_status' => $user->seller?->status,
            'seller_approved' => (bool) $user->hasApprovedSellerProfile(),
            'location_label' => $user->location_label,
            'email_verified_at' => optional($user->email_verified_at)->toISOString(),
            'last_active_at' => optional($user->last_active_at)->toISOString(),
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'two_factor_method' => $user->two_factor_method,
            'joined_at' => optional($user->created_at)->toISOString(),
            'order_count' => $user->orders()->count(),
            'wishlist_count' => $user->wishlistItems()->count(),
        ];
    }

    protected function redirectForUser(User $user): string
    {
        return match ($user->role) {
            'admin' => '/admin',
            'seller' => $user->hasApprovedSellerProfile()
                ? '/seller-center'
                : '/seller-center/onboarding/status',
            default => '/account/dashboard',
        };
    }

    protected function issueTwoFactorChallenge(Request $request, User $user, bool $remember): AuthChallenge
    {
        $this->markExpiredChallenges($user);
        $this->invalidateActiveChallenges($user);

        $code = $this->generateTwoFactorCode();
        $challenge = AuthChallenge::create([
            'user_id' => $user->id,
            'purpose' => self::TWO_FACTOR_PURPOSE,
            'channel' => self::TWO_FACTOR_CHANNEL,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => self::TWO_FACTOR_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(self::TWO_FACTOR_EXPIRES_MINUTES),
            'resend_available_at' => now()->addSeconds(self::TWO_FACTOR_RESEND_SECONDS),
            'sent_to' => $user->email,
            'metadata' => [
                'remember' => $remember,
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 255, ''),
                'issued_at' => now()->toISOString(),
            ],
        ]);

        $request->session()->put([
            'auth.two_factor.user_id' => $user->id,
            'auth.two_factor.challenge_id' => $challenge->id,
            'auth.two_factor.redirect_to' => $this->redirectForUser($user),
            'auth.two_factor.remember' => $remember,
        ]);

        $this->sendTwoFactorChallenge($user, $challenge, $code);

        return $challenge;
    }

    protected function resolvePendingChallenge(Request $request, ?int $challengeId = null): ?AuthChallenge
    {
        $sessionChallengeId = (int) $request->session()->get('auth.two_factor.challenge_id', 0);
        $sessionUserId = (int) $request->session()->get('auth.two_factor.user_id', 0);
        $resolvedChallengeId = $challengeId ?: $sessionChallengeId;

        if ($resolvedChallengeId <= 0 || $sessionUserId <= 0) {
            return null;
        }

        return AuthChallenge::query()
            ->whereKey($resolvedChallengeId)
            ->where('user_id', $sessionUserId)
            ->where('purpose', self::TWO_FACTOR_PURPOSE)
            ->first();
    }

    protected function generateTwoFactorCode(): string
    {
        return (string) random_int(10 ** (self::TWO_FACTOR_CODE_LENGTH - 1), (10 ** self::TWO_FACTOR_CODE_LENGTH) - 1);
    }

    protected function normalizePhilippinePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '63')) {
            return '+' . $digits;
        }

        if (str_starts_with($digits, '0')) {
            $digits = ltrim($digits, '0');
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '+63' . $digits;
        }

        return $phone;
    }

    protected function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    protected function resolveEmailVerificationChallenge(User $user): ?AuthChallenge
    {
        return AuthChallenge::query()
            ->where('user_id', $user->id)
            ->where('purpose', User::EMAIL_VERIFICATION_PURPOSE)
            ->where('channel', 'email')
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();
    }

    protected function sendTwoFactorChallenge(User $user, AuthChallenge $challenge, string $code): void
    {
        if (app()->environment('production') && config('mail.default') === 'log') {
            return;
        }

        Notification::send($user, new AuthChallengeNotification($challenge, $code));
    }

    protected function markExpiredChallenges(User $user): void
    {
        AuthChallenge::query()
            ->where('user_id', $user->id)
            ->where('purpose', self::TWO_FACTOR_PURPOSE)
            ->whereNull('consumed_at')
            ->where('expires_at', '<', now())
            ->update(['consumed_at' => now()]);
    }

    protected function invalidateActiveChallenges(User $user): void
    {
        AuthChallenge::query()
            ->where('user_id', $user->id)
            ->where('purpose', self::TWO_FACTOR_PURPOSE)
            ->whereNull('consumed_at')
            ->where('expires_at', '>=', now())
            ->update(['consumed_at' => now()]);
    }
}
