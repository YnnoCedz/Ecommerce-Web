<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthChallenge;
use App\Models\CourierApplication;
use App\Models\LogisticsDocument;
use App\Models\LogisticsProvider;
use App\Models\LogisticsProviderApplication;
use App\Models\MarketplaceProfile;
use App\Models\PendingRegistration;
use App\Models\PendingRegistrationChallenge;
use App\Models\User;
use App\Models\UserDocument;
use App\Notifications\AuthChallengeNotification;
use App\Notifications\EmailVerificationCodeNotification;
use App\Services\ActivityLogger;
use App\Services\CapabilityResolver;
use App\Services\MediaStorageService;
use App\Services\PsgcService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    public const SEXES = ['female', 'male', 'prefer_not_to_say'];

    public const MINIMUM_AGE = 18;

    private const TWO_FACTOR_PURPOSE = 'login';

    private const TWO_FACTOR_CHANNEL = 'email';

    private const TWO_FACTOR_CODE_LENGTH = 6;

    private const TWO_FACTOR_EXPIRES_MINUTES = 10;

    private const TWO_FACTOR_RESEND_SECONDS = 30;

    private const TWO_FACTOR_MAX_ATTEMPTS = 5;

    public function __construct(private readonly MediaStorageService $media) {}

    protected function strongPasswordRules(): array
    {
        return ['required', 'confirmed', 'max:16', PasswordRule::min(8)->mixedCase()->numbers()->symbols()];
    }

    public function register(Request $request, PsgcService $psgc): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
            'phone' => $this->normalizePhilippinePhone((string) $request->input('phone')),
        ]);

        if ($existing = $this->existingIdentity($request->input('email'), $request->input('phone'))) {
            return $this->existingAccountResponse($existing);
        }

        $maxKb = max(1024, (int) config('courier.document_max_kilobytes', 8192));

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'sex' => ['required', Rule::in(self::SEXES)],
            'birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(self::MINIMUM_AGE)->toDateString(), 'after:'.now()->subYears(120)->toDateString()],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            // The normalized value is what is validated and stored, so a malformed
            // input can never reach the UNIQUE phone columns.
            'phone' => ['required', 'string', 'regex:/^\+639\d{9}$/', 'unique:users,phone', 'unique:users,mobile', 'unique:pending_registrations,phone'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['required', 'string', 'size:10'],
            'barangay_code' => ['required', 'string', 'size:10'],
            'postal_code' => ['required', 'string', 'max:20'],
            'id_document' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.$maxKb],
            'password' => $this->strongPasswordRules(),
        ], [
            'email.unique' => 'An account with this email already exists. Sign in to continue.',
            'phone.unique' => 'An account with this mobile number already exists. Sign in to continue.',
            'phone.regex' => 'Enter a valid Philippine mobile number, for example 09171234567.',
            'birthdate.before_or_equal' => 'You must be at least '.self::MINIMUM_AGE.' years old to register.',
            'id_document.required' => 'A valid government-issued ID is required.',
            'id_document.image' => 'The ID document must be an image.',
            'id_document.max' => 'The ID document must not exceed '.round($maxKb / 1024, 1).' MB.',
        ]);

        $data = array_merge($data, $psgc->validateHierarchy($data));

        $email = $this->normalizeEmail($data['email']);
        $phone = $data['phone'];

        $this->prunePendingRegistrations();

        // A still-live pending registration owned by someone else must never be
        // silently reused - doing so would return "check your email" while the
        // first person's name, password hash, address and ID stayed in place.
        $existing = PendingRegistration::where('email', $email)->first();
        if ($existing && $existing->expires_at->isFuture()) {
            return response()->json([
                'message' => 'A registration for this email address is already awaiting verification. '
                    .'Enter the code we sent, or use Resend code.',
                'code' => 'registration_already_pending',
                'requires_email_verification' => true,
                'verification_email' => $existing->email,
                'redirect_to' => '/auth/verify-email?email='.urlencode($existing->email),
            ], 409);
        }

        $stored = null;

        try {
            $stored = $this->media->storePrivateFile(
                $request->file('id_document'),
                'user-registration-ids/'.hash('sha256', $email),
                (string) config('courier.document_disk', 'r2'),
            );

            $pending = DB::transaction(function () use ($data, $email, $phone, $stored) {
                PendingRegistration::where('email', $email)->delete();

                return PendingRegistration::create([
                    'first_name' => trim($data['first_name']),
                    'middle_name' => $this->nullableTrim($data['middle_name'] ?? null),
                    'last_name' => trim($data['last_name']),
                    'sex' => $data['sex'],
                    'birthdate' => $data['birthdate'],
                    'name' => trim($data['first_name'].' '.$data['last_name']),
                    'email' => $email,
                    'mobile' => $phone,
                    'phone' => $phone,
                    'password' => Hash::make($data['password']),
                    'registration_context' => 'marketplace',
                    'address_line1' => trim($data['address_line1']),
                    'address_line2' => $this->nullableTrim($data['address_line2'] ?? null),
                    'region' => $data['region'],
                    'region_code' => $data['region_code'],
                    'province' => $data['province'] ?? null,
                    'province_code' => $data['province_code'] ?? null,
                    'city' => $data['city'],
                    'city_code' => $data['city_code'],
                    'barangay' => $data['barangay'],
                    'barangay_code' => $data['barangay_code'],
                    'postal_code' => $data['postal_code'],
                    'document_type' => UserDocument::TYPE_GOVERNMENT_ID,
                    'document_storage_disk' => $stored['storage_disk'],
                    'document_file_path' => $stored['storage_path'],
                    'document_original_filename' => $stored['original_filename'],
                    'document_mime_type' => $stored['mime_type'],
                    'document_file_size' => $stored['file_size'],
                    'document_uploaded_at' => now(),
                    'expires_at' => now()->addHour(),
                ]);
            });
        } catch (\Throwable $e) {
            // Never leave an orphaned private object behind a failed registration.
            if ($stored) {
                try {
                    $this->media->delete($stored['storage_path'], $stored['storage_disk']);
                } catch (\Throwable) {
                }
            }

            report($e);

            return response()->json([
                'message' => 'Unable to complete registration right now. Please try again.',
                'code' => 'registration_failed',
            ], 500);
        }

        $verificationEmailSent = true;

        try {
            $this->sendPendingVerificationNotification($pending);
        } catch (\Throwable $e) {
            $verificationEmailSent = false;

            Log::warning('Registration completed but verification email delivery failed.', [
                'pending_registration_id' => $pending->id,
                'exception_class' => $e::class,
            ]);
        }

        $message = $verificationEmailSent
            ? 'Registration received. Verify your email, then a Maketo administrator will review your account.'
            : 'Your registration is saved temporarily, but the verification email could not be sent. Please use Resend code.';

        return response()->json([
            'message' => $message,
            'requires_email_verification' => true,
            'requires_admin_approval' => true,
            'verification_email' => $pending->email,
            'verification_email_sent' => $verificationEmailSent,
            'redirect_to' => '/auth/verify-email?email='.urlencode($pending->email)
                .($verificationEmailSent ? '' : '&delivery=pending'),
        ], 201);
    }

    /** Direct web Logistics identity registration; it does not create Buyer. */
    public function registerLogistics(Request $request, PsgcService $psgc): JsonResponse
    {
        return $this->registerCapabilityIdentity($request, $psgc, 'logistics');
    }

    /** Rider-App-only identity registration; no web Rider registration route exists. */
    public function registerRider(Request $request, PsgcService $psgc): JsonResponse
    {
        return $this->registerCapabilityIdentity($request, $psgc, 'rider');
    }

    private function registerCapabilityIdentity(Request $request, PsgcService $psgc, string $context): JsonResponse
    {
        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
            'phone' => $this->normalizePhilippinePhone((string) $request->input('phone')),
            'vehicle_plate_number' => strtoupper(trim((string) $request->input('vehicle_plate_number', ''))),
        ]);

        if ($existing = $this->existingIdentity($request->input('email'), $request->input('phone'))) {
            return $this->existingAccountResponse($existing);
        }

        $maxKb = max(1024, (int) config('courier.document_max_kilobytes', 8192));
        $baseRules = [
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'sex' => ['required', Rule::in(self::SEXES)],
            'birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(self::MINIMUM_AGE)->toDateString(), 'after:'.now()->subYears(120)->toDateString()],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email', 'unique:pending_registrations,email'],
            'phone' => ['required', 'string', 'regex:/^\+639\d{9}$/', 'unique:users,phone', 'unique:users,mobile', 'unique:pending_registrations,phone'],
            'password' => $this->strongPasswordRules(),
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['required', 'string', 'size:10'],
            'barangay_code' => ['required', 'string', 'size:10'],
            'postal_code' => ['required', 'string', 'max:20'],
        ];
        $documentRules = ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:'.$maxKb];

        if ($context === 'logistics') {
            $specificRules = [
                'company_name' => ['required', 'string', 'max:255'],
                'legal_name' => ['nullable', 'string', 'max:255'],
                'applicant_id' => $documentRules,
                'business_permit' => $documentRules,
            ];
            $documentFields = [
                'applicant_id' => LogisticsDocument::TYPE_APPLICANT_ID,
                'business_permit' => LogisticsDocument::TYPE_BUSINESS_PERMIT,
            ];
        } else {
            $specificRules = [
                'logistics_provider_id' => ['required', 'integer', 'exists:logistics_providers,id'],
                'vehicle_type' => ['required', Rule::in(['motorcycle', 'car', 'van'])],
                'vehicle_make' => ['required', 'string', 'max:100'],
                'vehicle_model' => ['required', 'string', 'max:100'],
                'vehicle_year' => ['required', 'integer', 'min:1980', 'max:'.((int) now()->year + 1)],
                'vehicle_plate_number' => ['required', 'string', 'max:30'],
                'vehicle_color' => ['required', 'string', 'max:50'],
                'driver_license_image' => $documentRules,
                'vehicle_or_image' => $documentRules,
                'vehicle_cr_image' => $documentRules,
            ];
            $documentFields = [
                'driver_license_image' => 'driver_license',
                'vehicle_or_image' => 'vehicle_or',
                'vehicle_cr_image' => 'vehicle_cr',
            ];
        }

        $data = $request->validate([...$baseRules, ...$specificRules], [
            'phone.regex' => 'Enter a valid Philippine mobile number, for example 09171234567.',
        ]);
        $data = array_merge($data, $psgc->validateHierarchy($data));

        if ($context === 'rider') {
            $provider = LogisticsProvider::query()->findOrFail($data['logistics_provider_id']);
            if (! $provider->isActive()) {
                return response()->json(['message' => 'Select an approved active logistics provider.', 'code' => 'logistics_provider_unavailable'], 422);
            }
        }

        $this->prunePendingRegistrations();
        if (PendingRegistration::where('email', $data['email'])->where('expires_at', '>', now())->exists()) {
            return response()->json(['message' => 'A registration for this email is already awaiting verification.', 'code' => 'registration_already_pending'], 409);
        }

        $stored = [];
        try {
            foreach ($documentFields as $field => $type) {
                $file = $request->file($field);
                $stored[$type] = $this->media->storePrivateFile(
                    $file,
                    "pending-{$context}-documents/".hash('sha256', $data['email'])."/{$type}",
                    (string) config('courier.document_disk', 'r2'),
                );
            }

            $pending = DB::transaction(function () use ($data, $context, $stored, $documentFields) {
                $pending = PendingRegistration::create([
                    'first_name' => trim($data['first_name']),
                    'middle_name' => $this->nullableTrim($data['middle_name'] ?? null),
                    'last_name' => trim($data['last_name']),
                    'sex' => $data['sex'], 'birthdate' => $data['birthdate'],
                    'name' => trim($data['first_name'].' '.$data['last_name']),
                    'email' => $data['email'], 'mobile' => $data['phone'], 'phone' => $data['phone'],
                    'password' => Hash::make($data['password']),
                    'registration_context' => $context,
                    'application_payload' => collect($data)
                        ->except(['password', 'password_confirmation', ...array_keys($documentFields)])
                        ->all(),
                    'expires_at' => now()->addHour(),
                ]);

                foreach ($stored as $type => $file) {
                    $pending->documents()->create([
                        'document_type' => $type, 'storage_disk' => $file['storage_disk'],
                        'file_path' => $file['storage_path'], 'original_filename' => $file['original_filename'],
                        'mime_type' => $file['mime_type'], 'file_size' => $file['file_size'], 'uploaded_at' => now(),
                    ]);
                }

                return $pending;
            });
        } catch (\Throwable $exception) {
            foreach ($stored as $file) {
                try {
                    $this->media->delete($file['storage_path'], $file['storage_disk']);
                } catch (\Throwable) {
                }
            }
            report($exception);

            return response()->json(['message' => 'Unable to save this registration right now.', 'code' => 'registration_failed'], 500);
        }

        $sent = true;
        try {
            $this->sendPendingVerificationNotification($pending);
        } catch (\Throwable) {
            $sent = false;
        }

        return response()->json([
            'message' => 'Registration received. Verify your email to submit the application.',
            'requires_email_verification' => true,
            'verification_email' => $pending->email,
            'verification_email_sent' => $sent,
            'registration_context' => $context,
            'redirect_to' => '/auth/verify-email?email='.urlencode($pending->email),
        ], 201);
    }

    private function existingIdentity(mixed $email, mixed $phone): ?User
    {
        $email = $this->normalizeEmail((string) $email);
        $phone = $this->normalizePhilippinePhone((string) $phone);

        return User::query()
            ->where(fn ($query) => $query->where('email', $email)
                ->when($phone !== '', fn ($phones) => $phones->orWhere('phone', $phone)->orWhere('mobile', $phone)))
            ->first();
    }

    private function existingAccountResponse(User $user): JsonResponse
    {
        return response()->json([
            'message' => 'An existing Maketo identity was found. Sign in to continue.',
            'code' => 'existing_account',
            'existing_account' => true,
            'email_verified' => $user->hasVerifiedEmail(),
            'redirect_to' => '/auth/login',
        ], 409);
    }

    public function login(Request $request): JsonResponse
    {
        $timings = app()->isLocal() || config('performance.logging_enabled')
            ? ['total_started_at' => hrtime(true)]
            : null;

        $request->merge([
            'email' => $this->normalizeEmail((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $operationStartedAt = hrtime(true);
        $email = $this->normalizeEmail($data['email']);
        $user = User::where('email', $email)->first();
        $this->recordTiming($timings, 'email_lookup_ms', $operationStartedAt);

        $operationStartedAt = hrtime(true);
        $passwordMatches = $user && Hash::check($data['password'], $user->password);
        $this->recordTiming($timings, 'password_verification_ms', $operationStartedAt);

        if (! $passwordMatches) {
            app(ActivityLogger::class)->log('auth.login.failed', 'authentication', 'Login failed.', $user, $request, $user, ['reason' => 'invalid_credentials']);
            $this->logLoginTimings($timings, 'invalid_credentials');

            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'code' => 'invalid_credentials',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ], 422);
        }

        if (! $user->email_verified_at) {
            app(ActivityLogger::class)->log('auth.login.failed', 'authentication', 'Login failed.', $user, $request, $user, ['reason' => 'email_unverified']);
            $this->logLoginTimings($timings, 'email_unverified');

            return response()->json([
                'message' => 'Please verify your email address before signing in.',
                'code' => 'email_unverified',
            ], 403);
        }

        if ($user->status !== 'active') {
            app(ActivityLogger::class)->log('auth.login.failed', 'authentication', 'Login failed.', $user, $request, $user, ['reason' => 'account_inactive']);
            $this->logLoginTimings($timings, 'account_inactive');

            return response()->json([
                'message' => match ($user->status) {
                    'suspended' => 'This account has been suspended.',
                    'restricted' => 'This account is currently restricted.',
                    default => 'This account is not active.',
                },
                'code' => match ($user->status) {
                    'suspended' => 'account_suspended',
                    'restricted' => 'account_restricted',
                    default => 'account_inactive',
                },
            ], 403);
        }

        if ($user->two_factor_enabled) {
            [$challenge, $challengeToken] = $this->issueTwoFactorChallenge($request, $user, $request->boolean('remember'));

            $response = response()->json([
                'message' => 'Two-factor verification is required.',
                'code' => 'two_factor_required',
                'requires_two_factor' => true,
                'user' => $this->userPayload($user),
                'redirect_to' => $this->redirectForUser($user),
                'two_factor_challenge_id' => $challenge->id,
                'two_factor_challenge_token' => $challengeToken,
                'two_factor_expires_at' => optional($challenge->expires_at)->toISOString(),
                'two_factor_resend_available_at' => optional($challenge->resend_available_at)->toISOString(),
            ], 202);

            $this->logLoginTimings($timings, 'two_factor_required');

            return $response;
        }

        $operationStartedAt = hrtime(true);
        $user->forceFill(['last_active_at' => now()])->save();
        $this->recordTiming($timings, 'activity_update_ms', $operationStartedAt);

        $operationStartedAt = hrtime(true);
        $tokenPayload = $this->accessTokenPayload($user);
        $this->recordTiming($timings, 'token_creation_ms', $operationStartedAt);

        $operationStartedAt = hrtime(true);
        $userPayload = $this->userPayload($user);
        $redirectTo = $this->redirectForUser($user);
        $this->recordTiming($timings, 'response_payload_ms', $operationStartedAt);

        $response = response()->json([
            'message' => 'Authenticated successfully.',
            ...$tokenPayload,
            'user' => $userPayload,
            'redirect_to' => $redirectTo,
        ]);

        app(ActivityLogger::class)->log('auth.login.success', 'authentication', 'Login successful.', $user, $request, $user);

        $this->logLoginTimings($timings, 'authenticated');

        return $response;
    }

    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'integer', 'min:1'],
            'challenge_token' => ['required', 'string', 'size:64'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $challenge = $this->resolvePendingChallenge($data['challenge_id'], $data['challenge_token']);

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
            app(ActivityLogger::class)->log('auth.mfa.failed', 'authentication', 'MFA verification failed.', $challenge->user, $request, $challenge->user, ['purpose' => $challenge->purpose]);
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

        if (! $user->canAccessPlatformArea()) {
            return response()->json([
                'message' => 'This account is not currently allowed to sign in.',
                'code' => 'account_inactive',
            ], 403);
        }

        $challenge->forceFill(['consumed_at' => now()])->save();
        $user->forceFill(['last_active_at' => now()])->save();
        app(ActivityLogger::class)->log('auth.mfa.success', 'authentication', 'MFA verification successful.', $user, $request, $user, ['purpose' => $challenge->purpose]);
        app(ActivityLogger::class)->log('auth.login.success', 'authentication', 'Login successful.', $user, $request, $user, ['mfa' => true]);

        return response()->json([
            'message' => 'Authenticated successfully.',
            ...$this->accessTokenPayload($user),
            'user' => $this->userPayload($user),
            'redirect_to' => $this->redirectForUser($user),
        ]);
    }

    public function resendTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'integer', 'min:1'],
            'challenge_token' => ['required', 'string', 'size:64'],
        ]);

        $challenge = $this->resolvePendingChallenge($data['challenge_id'], $data['challenge_token']);

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

        $email = $this->normalizeEmail($data['email']);
        $pending = PendingRegistration::where('email', $email)->first();

        if ($pending) {
            if ($pending->expires_at->isPast()) {
                $pending->delete();

                return response()->json([
                    'message' => 'This registration has expired. Please register again.',
                    'code' => 'registration_expired',
                ], 410);
            }

            $challenge = $this->resolvePendingRegistrationChallenge($pending);
            if ($challenge?->resend_available_at?->isFuture()) {
                return response()->json([
                    'message' => 'Please wait before requesting another verification code.',
                    'code' => 'verification_resend_cooldown',
                    'retry_after' => now()->diffInSeconds($challenge->resend_available_at, false),
                ], 429);
            }

            try {
                $this->sendPendingVerificationNotification($pending);
            } catch (\Throwable $e) {
                report($e);

                return response()->json([
                    'message' => 'Unable to send the verification code right now. Please try again.',
                    'code' => 'verification_delivery_failed',
                ], 503);
            }

            return response()->json([
                'message' => 'A new verification code has been sent.',
                'retry_after' => User::EMAIL_VERIFICATION_RESEND_SECONDS,
                'expires_in' => User::EMAIL_VERIFICATION_EXPIRES_MINUTES * 60,
            ]);
        }

        $this->prunePendingRegistrations();
        $user = User::where('email', $email)->first();

        if ($user && ! $user->hasVerifiedEmail()) {
            $challenge = $this->resolveEmailVerificationChallenge($user);

            if ($challenge?->resend_available_at?->isFuture()) {
                return response()->json([
                    'message' => 'Please wait before requesting another verification code.',
                    'code' => 'verification_resend_cooldown',
                    'retry_after' => now()->diffInSeconds($challenge->resend_available_at, false),
                ], 429);
            }

            try {
                $user->sendEmailVerificationNotification();
            } catch (\Throwable $e) {
                report($e);

                return response()->json([
                    'message' => 'Unable to send the verification code right now. Please try again.',
                    'code' => 'verification_delivery_failed',
                ], 503);
            }
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
                $user->tokens()->delete();

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
        $pending = PendingRegistration::where('email', $email)->first();

        if ($pending) {
            if ($pending->expires_at->isPast()) {
                $pending->delete();

                return response()->json([
                    'message' => 'This registration has expired. Please register again.',
                    'code' => 'registration_expired',
                ], 410);
            }

            return $this->verifyPendingRegistration($pending, $data['code']);
        }

        $this->prunePendingRegistrations();

        $user = User::where('email', $email)->first();

        if (! $user) {
            return response()->json([
                'message' => 'The verification code is invalid or has expired.',
                'code' => 'verification_user_not_found',
            ], 422);
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

        return response()->json([
            'message' => 'Email verified successfully.',
            ...$this->accessTokenPayload($user),
            'user' => $this->userPayload($user),
            'redirect_to' => '/',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            app(ActivityLogger::class)->log('auth.logout', 'authentication', 'User logged out.', $user, $request, $user);
        }
        $request->user()?->currentAccessToken()?->delete();
        Auth::guard('sanctum')->forgetUser();

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
        // Phase 2.6: the seller profile is loaded unconditionally. Gating this on
        // `isSeller()` would silently null seller_status now that approval no
        // longer mutates users.role.
        if (! $user->relationLoaded('seller')) {
            $user->setRelation(
                'seller',
                $user->seller()->select(['id', 'user_id', 'status'])->first(),
            );
        }

        $seller = $user->getRelation('seller');

        if (! $user->relationLoaded('marketplaceProfile')) {
            $user->setRelation('marketplaceProfile', $user->marketplaceProfile()
                ->select(['id', 'user_id', 'status', 'submitted_at', 'approved_at', 'rejected_at', 'rejection_reason'])
                ->first());
        }
        $marketplaceProfile = $user->getRelation('marketplaceProfile');

        if (! $user->relationLoaded('courier')) {
            $user->setRelation(
                'courier',
                $user->courier()->select(['id', 'user_id', 'approved_application_id', 'active', 'status', 'availability_status', 'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_plate_number', 'vehicle_color', 'approved_at'])->first(),
            );
        }
        $courier = $user->getRelation('courier');
        $courierApproved = $user->hasActiveCourierProfile();

        if (! $user->relationLoaded('logisticsStaff')) {
            $user->setRelation(
                'logisticsStaff',
                $user->logisticsStaff()
                    ->select(['id', 'user_id', 'logistics_provider_id', 'primary_hub_id', 'staff_type', 'status', 'approved_at'])
                    ->with('provider:id,status,approved_at')
                    ->first(),
            );
        }
        $logisticsStaff = $user->getRelation('logisticsStaff');
        $logisticsAccess = $user->hasActiveLogisticsStaffProfile();

        $capabilities = app(CapabilityResolver::class)->for($user);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'sex' => $user->sex,
            'birthdate' => optional($user->birthdate)->toDateString(),
            'age' => $user->age,
            'display_name' => $user->display_name,
            'avatar_url' => $user->avatar_path ? $this->media->publicUrl($user->avatar_path) : null,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'phone' => $user->phone ?? $user->mobile,
            // `role` stays in the payload for backward compatibility and remains
            // authoritative for admin only. Clients must read `capabilities`.
            'role' => $user->role,
            'status' => $user->status,
            'registration_status' => match ($marketplaceProfile?->status) {
                'pending' => User::REGISTRATION_PENDING_REVIEW,
                'rejected' => User::REGISTRATION_REJECTED,
                default => User::REGISTRATION_APPROVED,
            },
            'marketplace_status' => $marketplaceProfile?->status,
            'capabilities' => $capabilities,
            // Legacy capability flags, preserved so existing web and Flutter
            // clients keep working until they migrate to `capabilities`.
            'seller_status' => $seller?->status,
            'seller_approved' => $capabilities['seller'],
            'courier_approved' => $courierApproved,
            'logistics_access' => $logisticsAccess,
            'logistics_staff_type' => $logisticsStaff?->staff_type,
            'courier' => $courierApproved ? [
                'id' => $courier->id,
                'status' => $courier->status,
                'availability_status' => $courier->availability_status,
                'vehicle' => [
                    'type' => $courier->vehicle_type,
                    'make' => $courier->vehicle_make,
                    'model' => $courier->vehicle_model,
                    'year' => $courier->vehicle_year,
                    'plate_number' => $courier->vehicle_plate_number,
                    'color' => $courier->vehicle_color,
                ],
            ] : null,
            'location_label' => $user->location_label,
            'email_verified_at' => optional($user->email_verified_at)->toISOString(),
            'last_active_at' => optional($user->last_active_at)->toISOString(),
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'two_factor_method' => $user->two_factor_method,
            'joined_at' => optional($user->created_at)->toISOString(),
        ];
    }

    /**
     * Marketplace login stays marketplace-first. Only platform administrators are
     * redirected away; seller, rider and logistics capabilities never move a user
     * off the marketplace - Seller Center is an opt-in switch, the Rider app is a
     * separate client, and the Logistics portal does not exist yet.
     */
    protected function redirectForUser(User $user): string
    {
        $capabilities = app(CapabilityResolver::class)->for($user);

        return $capabilities['admin']
            ? '/admin'
            : ($capabilities['buyer'] ? '/' : '/marketplace-unavailable');
    }

    protected function nullableTrim(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    protected function accessTokenPayload(User $user): array
    {
        return [
            'token' => $user->createToken('web')->plainTextToken,
            'token_type' => 'Bearer',
        ];
    }

    protected function recordTiming(?array &$timings, string $operation, int $startedAt): void
    {
        if ($timings === null) {
            return;
        }

        $timings[$operation] = round((hrtime(true) - $startedAt) / 1_000_000, 2);
    }

    protected function logLoginTimings(?array $timings, string $outcome): void
    {
        if ($timings === null) {
            return;
        }

        $totalStartedAt = $timings['total_started_at'];
        unset($timings['total_started_at']);

        Log::debug('Authentication login timing', [
            'outcome' => $outcome,
            ...$timings,
            'total_ms' => round((hrtime(true) - $totalStartedAt) / 1_000_000, 2),
        ]);
    }

    protected function issueTwoFactorChallenge(Request $request, User $user, bool $remember): array
    {
        $this->markExpiredChallenges($user);
        $this->invalidateActiveChallenges($user);

        $code = $this->generateTwoFactorCode();
        $challengeToken = Str::random(64);
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
                'challenge_token_hash' => hash('sha256', $challengeToken),
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 255, ''),
                'issued_at' => now()->toISOString(),
            ],
        ]);

        $this->sendTwoFactorChallenge($user, $challenge, $code);

        return [$challenge, $challengeToken];
    }

    protected function resolvePendingChallenge(int $challengeId, string $challengeToken): ?AuthChallenge
    {
        $challenge = AuthChallenge::query()
            ->whereKey($challengeId)
            ->where('purpose', self::TWO_FACTOR_PURPOSE)
            ->whereNull('consumed_at')
            ->first();

        $expectedHash = $challenge?->metadata['challenge_token_hash'] ?? null;

        if (! is_string($expectedHash) || ! hash_equals($expectedHash, hash('sha256', $challengeToken))) {
            return null;
        }

        return $challenge;
    }

    protected function generateTwoFactorCode(): string
    {
        return (string) random_int(10 ** (self::TWO_FACTOR_CODE_LENGTH - 1), (10 ** self::TWO_FACTOR_CODE_LENGTH) - 1);
    }

    protected function normalizePhilippinePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '63')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '0')) {
            $digits = ltrim($digits, '0');
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '+63'.$digits;
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

    protected function resolvePendingRegistrationChallenge(PendingRegistration $pending): ?PendingRegistrationChallenge
    {
        return PendingRegistrationChallenge::query()
            ->where('pending_registration_id', $pending->id)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();
    }

    protected function verifyPendingRegistration(PendingRegistration $pending, string $code): JsonResponse
    {
        $challenge = $this->resolvePendingRegistrationChallenge($pending);

        if (! $challenge) {
            return response()->json(['message' => 'The verification code is invalid or has expired.', 'code' => 'verification_challenge_not_found'], 422);
        }

        if ($challenge->expires_at->isPast()) {
            return response()->json(['message' => 'This verification code has expired. Please request a new code.', 'code' => 'verification_code_expired'], 410);
        }

        if ($challenge->attempts >= $challenge->max_attempts) {
            $challenge->forceFill(['consumed_at' => now()])->save();

            return response()->json(['message' => 'Too many incorrect attempts. Please request a new code.', 'code' => 'verification_code_locked'], 429);
        }

        if (! Hash::check($code, $challenge->code_hash)) {
            $challenge->increment('attempts');
            $challenge->refresh();

            if ($challenge->attempts >= $challenge->max_attempts) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return response()->json(['message' => 'Too many incorrect attempts. Please request a new code.', 'code' => 'verification_code_locked'], 429);
            }

            return response()->json([
                'message' => 'The verification code is invalid.',
                'code' => 'verification_code_invalid',
                'remaining_attempts' => max(0, $challenge->max_attempts - $challenge->attempts),
            ], 422);
        }

        // Email verification proves identity control only. The users row is
        // globally active, while the requested capability remains pending in
        // its own authoritative application record.
        $user = DB::transaction(function () use ($pending, $challenge) {
            $user = User::create([
                'first_name' => $pending->first_name,
                'middle_name' => $pending->middle_name,
                'last_name' => $pending->last_name,
                'sex' => $pending->sex,
                'birthdate' => $pending->birthdate,
                'name' => $pending->name,
                'email' => $pending->email,
                'mobile' => $pending->mobile,
                'phone' => $pending->phone,
                'password' => $pending->password,
                'role' => 'buyer',
                'status' => 'active',
                'registration_status' => User::REGISTRATION_APPROVED,
                'email_verified_at' => now(),
                'two_factor_enabled' => false,
            ]);

            $context = $pending->registration_context ?: 'marketplace';
            $payload = $pending->application_payload ?? [];

            if ($context === 'marketplace' && filled($pending->address_line1)) {
                $user->addresses()->create([
                    'label' => 'Home',
                    'recipient_name' => $user->display_name,
                    'phone' => $user->phone,
                    'line1' => $pending->address_line1,
                    'line2' => $pending->address_line2,
                    'region' => $pending->region,
                    'region_code' => $pending->region_code,
                    'province' => $pending->province,
                    'province_code' => $pending->province_code,
                    'city' => $pending->city,
                    'city_code' => $pending->city_code,
                    'barangay' => $pending->barangay,
                    'barangay_code' => $pending->barangay_code,
                    'postal_code' => $pending->postal_code,
                    'is_default' => true,
                ]);
            }

            // Promote - never copy - the transient private object. The same
            // storage path moves to user_documents so nothing is duplicated
            // and nothing is orphaned.
            if ($pending->hasDocument()) {
                UserDocument::create([
                    'user_id' => $user->id,
                    'document_type' => $pending->document_type ?: UserDocument::TYPE_GOVERNMENT_ID,
                    'storage_disk' => $pending->document_storage_disk,
                    'file_path' => $pending->document_file_path,
                    'original_filename' => $pending->document_original_filename,
                    'mime_type' => $pending->document_mime_type,
                    'file_size' => $pending->document_file_size,
                    'status' => 'pending',
                    'uploaded_at' => $pending->document_uploaded_at ?? now(),
                ]);
            }

            if ($context === 'marketplace') {
                MarketplaceProfile::create([
                    'user_id' => $user->id, 'status' => 'pending', 'submitted_at' => now(),
                ]);
            } elseif ($context === 'logistics') {
                $application = LogisticsProviderApplication::create([
                    'user_id' => $user->id,
                    'company_name' => $payload['company_name'],
                    'legal_name' => $payload['legal_name'] ?? null,
                    'contact_name' => $user->display_name,
                    'contact_email' => $user->email,
                    'contact_phone' => $user->phone,
                    'address_line1' => $payload['address_line1'],
                    'address_line2' => $payload['address_line2'] ?? null,
                    'region_code' => $payload['region_code'], 'region_label' => $payload['region'],
                    'province_code' => $payload['province_code'] ?? null, 'province_label' => $payload['province'] ?? null,
                    'city_code' => $payload['city_code'], 'city_label' => $payload['city'],
                    'barangay_code' => $payload['barangay_code'] ?? null, 'barangay_label' => $payload['barangay'] ?? null,
                    'postal_code' => $payload['postal_code'] ?? null,
                    'status' => 'pending', 'submitted_at' => now(),
                ]);

                foreach ($pending->documents as $document) {
                    $application->documents()->create([
                        'document_type' => $document->document_type,
                        'storage_disk' => $document->storage_disk,
                        'file_path' => $document->file_path,
                        'original_filename' => $document->original_filename,
                        'mime_type' => $document->mime_type,
                        'file_size' => $document->file_size,
                        'status' => 'pending', 'uploaded_at' => $document->uploaded_at,
                    ]);
                }
            } elseif ($context === 'rider') {
                $application = CourierApplication::create([
                    'user_id' => $user->id,
                    'logistics_provider_id' => $payload['logistics_provider_id'],
                    'mobile' => $user->phone,
                    'address_line1' => $payload['address_line1'],
                    'address_line2' => $payload['address_line2'] ?? null,
                    'region' => $payload['region'], 'region_code' => $payload['region_code'],
                    'province' => $payload['province'] ?? null, 'province_code' => $payload['province_code'] ?? null,
                    'city' => $payload['city'], 'city_code' => $payload['city_code'],
                    'barangay' => $payload['barangay'], 'barangay_code' => $payload['barangay_code'],
                    'postal_code' => $payload['postal_code'] ?? null,
                    'vehicle_type' => $payload['vehicle_type'], 'vehicle_make' => $payload['vehicle_make'],
                    'vehicle_model' => $payload['vehicle_model'], 'vehicle_year' => $payload['vehicle_year'],
                    'vehicle_plate_number' => $payload['vehicle_plate_number'], 'vehicle_color' => $payload['vehicle_color'],
                    'status' => 'pending', 'submitted_at' => now(),
                ]);

                foreach ($pending->documents as $document) {
                    $application->documents()->create([
                        'document_type' => $document->document_type,
                        'storage_disk' => $document->storage_disk,
                        'file_path' => $document->file_path,
                        'original_filename' => $document->original_filename,
                        'mime_type' => $document->mime_type,
                        'file_size' => $document->file_size,
                        'status' => 'pending', 'uploaded_at' => $document->uploaded_at,
                    ]);
                }
            }

            $challenge->forceFill(['consumed_at' => now()])->save();

            // Clear the transient metadata first so the deleting observer cannot
            // remove a private object that user_documents now owns.
            $pending->forceFill([
                'document_type' => null,
                'document_storage_disk' => null,
                'document_file_path' => null,
                'document_original_filename' => null,
                'document_mime_type' => null,
                'document_file_size' => null,
                'document_uploaded_at' => null,
            ])->save();
            // Ownership of the same objects is now represented by the final
            // domain-document rows. Delete only transient metadata.
            $pending->documents()->delete();
            $pending->delete();

            return $user;
        });

        $context = $pending->registration_context ?: 'marketplace';

        return response()->json([
            'message' => 'Email verified. Your '.$context.' application is awaiting review.',
            ...$this->accessTokenPayload($user),
            'user' => $this->userPayload($user),
            'requires_admin_approval' => true,
            'registration_context' => $context,
            'registration_status' => User::REGISTRATION_PENDING_REVIEW,
            'redirect_to' => $context === 'logistics'
                ? '/register/logistics?state=pending'
                : ($context === 'rider' ? '/rider/application-status' : '/register/pending?state=awaiting-approval'),
        ]);
    }

    protected function sendPendingVerificationNotification(PendingRegistration $pending): void
    {
        PendingRegistrationChallenge::query()
            ->where('pending_registration_id', $pending->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $challenge = $pending->challenges()->create([
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => User::EMAIL_VERIFICATION_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(User::EMAIL_VERIFICATION_EXPIRES_MINUTES),
            'resend_available_at' => now()->addSeconds(User::EMAIL_VERIFICATION_RESEND_SECONDS),
            'sent_to' => $pending->email,
            'metadata' => ['issued_at' => now()->toISOString()],
        ]);

        try {
            Notification::send($pending, new EmailVerificationCodeNotification($challenge, $code));
        } catch (\Throwable $e) {
            $challenge->forceFill(['consumed_at' => now(), 'resend_available_at' => now()])->save();
            throw $e;
        }
    }

    /**
     * Expired pending registrations are removed together with the private ID
     * object they own, so an abandoned registration never leaves an orphan in
     * private storage.
     */
    protected function prunePendingRegistrations(): void
    {
        PendingRegistration::query()
            ->where('expires_at', '<=', now())
            ->get()
            ->each(function (PendingRegistration $pending): void {
                foreach ($pending->documents()->get() as $document) {
                    try {
                        $this->media->delete($document->file_path, $document->storage_disk ?: 'r2');
                    } catch (\Throwable $e) {
                        Log::warning('Failed to delete expired pending capability document.', [
                            'pending_registration_id' => $pending->id,
                            'document_type' => $document->document_type,
                            'exception_class' => $e::class,
                        ]);
                    }
                }

                if ($pending->hasDocument()) {
                    try {
                        $this->media->delete($pending->document_file_path, $pending->document_storage_disk ?: 'r2');
                    } catch (\Throwable $e) {
                        Log::warning('Failed to delete expired registration ID document.', [
                            'pending_registration_id' => $pending->id,
                            'exception_class' => $e::class,
                        ]);
                    }
                }

                $pending->delete();
            });
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
