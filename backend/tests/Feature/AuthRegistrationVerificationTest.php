<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Tests\TestCase;

class AuthRegistrationVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function browserHeaders(): array
    {
        return [
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
            'Origin' => 'http://127.0.0.1:8443',
            'Referer' => 'http://127.0.0.1:8443/auth/register',
        ];
    }

    public function test_registration_requires_email_verification_before_login(): void
    {
        Notification::fake();

        $email = 'verify-me@maketo.local';

        $response = $this->withHeaders($this->browserHeaders())->postJson('/api/auth/register', [
            'first_name' => 'Mia',
            'last_name' => 'Santos',
            'email' => $email,
            'phone' => '+63 917 555 0101',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('requires_email_verification', true)
            ->assertJsonPath('verification_email', $email)
            ->assertJsonPath('user.email', $email);

        $this->withHeaders($this->browserHeaders())
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $email)
            ->assertJsonPath('user.email_verified_at', null);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/register', [
            'first_name' => 'Mia',
            'last_name' => 'Santos',
            'email' => '  VERIFY-ME@MAKETO.LOCAL  ',
            'phone' => '+63 917 555 0102',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);

        $user = User::where('email', $email)->firstOrFail();

        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, EmailVerificationCodeNotification::class);

        $verificationNotification = Notification::sent($user, EmailVerificationCodeNotification::class)->first();
        $this->assertNotNull($verificationNotification);
        $code = $verificationNotification->code();

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Password123!',
        ])->assertStatus(403)->assertJsonPath('code', 'email_unverified');

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/email/verify', [
            'email' => $email,
            'code' => $code,
        ])->assertOk()
            ->assertJsonPath('redirect_to', '/')
            ->assertJsonPath('user.email', $email);

        $this->assertNotNull($user->refresh()->email_verified_at);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Password123!',
        ])->assertOk();
    }

    public function test_registration_rejects_passwords_missing_required_strength_rules(): void
    {
        Notification::fake();

        $response = $this->withHeaders($this->browserHeaders())->postJson('/api/auth/register', [
            'first_name' => 'Weak',
            'last_name' => 'Password',
            'email' => 'weak-password@maketo.local',
            'phone' => '+63 917 555 0222',
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseMissing('users', [
            'email' => 'weak-password@maketo.local',
        ]);

        Notification::assertNothingSent();
    }

    public function test_verification_code_email_has_prominent_code_and_exact_expiration_text(): void
    {
        Notification::fake();

        $email = 'mail-copy@maketo.local';

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/register', [
            'first_name' => 'Lia',
            'last_name' => 'Ramos',
            'email' => $email,
            'phone' => '+63 917 555 0188',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $user = User::where('email', $email)->firstOrFail();
        $notification = Notification::sent($user, EmailVerificationCodeNotification::class)->first();
        $this->assertNotNull($notification);

        $mail = $notification->toMail($user);
        $this->assertMatchesRegularExpression('/Verification code: <strong>\d{6}<\/strong>/', (string) $mail->introLines[1]);
        $this->assertSame('This code expires in 10 minutes.', $mail->introLines[2]);
        $this->assertSame('Enter this code on the Maketo verification page. If you did not request it, you can ignore this email.', $mail->introLines[3]);
    }

    public function test_email_verification_accepts_leading_zero_code_and_keeps_session(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'leading-zero@maketo.local',
            'email_verified_at' => null,
        ]);

        $user->authChallenges()->create([
            'purpose' => User::EMAIL_VERIFICATION_PURPOSE,
            'channel' => 'email',
            'code_hash' => Hash::make('003491'),
            'attempts' => 0,
            'max_attempts' => User::EMAIL_VERIFICATION_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(User::EMAIL_VERIFICATION_EXPIRES_MINUTES),
            'resend_available_at' => now()->subSecond(),
            'sent_to' => $user->email,
        ]);

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '003491',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Email verified successfully.')
            ->assertJsonPath('redirect_to', '/')
            ->assertJsonPath('user.email_verified_at', fn ($value) => is_string($value));

        $this->assertNotNull($user->refresh()->email_verified_at);

        $this->withHeaders($this->browserHeaders())
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_email_verification_with_valid_code_restores_session_when_missing(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'restore-session@maketo.local',
            'email_verified_at' => null,
        ]);

        $user->authChallenges()->create([
            'purpose' => User::EMAIL_VERIFICATION_PURPOSE,
            'channel' => 'email',
            'code_hash' => Hash::make('684052'),
            'attempts' => 0,
            'max_attempts' => User::EMAIL_VERIFICATION_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(User::EMAIL_VERIFICATION_EXPIRES_MINUTES),
            'resend_available_at' => now()->subSecond(),
            'sent_to' => $user->email,
        ]);

        $this->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '684052',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Email verified successfully.')
            ->assertJsonPath('redirect_to', '/')
            ->assertJsonPath('user.email', $user->email);

        $this->assertNotNull($user->refresh()->email_verified_at);

        $this->withHeaders($this->browserHeaders())
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_wrong_expired_and_reused_verification_codes_are_rejected(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'code-errors@maketo.local',
            'email_verified_at' => null,
        ]);

        $challenge = $user->authChallenges()->create([
            'purpose' => User::EMAIL_VERIFICATION_PURPOSE,
            'channel' => 'email',
            'code_hash' => Hash::make('918204'),
            'attempts' => 0,
            'max_attempts' => User::EMAIL_VERIFICATION_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(User::EMAIL_VERIFICATION_EXPIRES_MINUTES),
            'resend_available_at' => now()->subSecond(),
            'sent_to' => $user->email,
        ]);

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '111111',
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'verification_code_invalid');

        $challenge->forceFill(['expires_at' => now()->subSecond()])->save();

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '918204',
            ])
            ->assertStatus(410)
            ->assertJsonPath('code', 'verification_code_expired');

        $challenge->forceFill([
            'attempts' => 0,
            'expires_at' => now()->addMinutes(User::EMAIL_VERIFICATION_EXPIRES_MINUTES),
        ])->save();

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '918204',
            ])
            ->assertOk();

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '918204',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Your email address is already verified.');
    }

    public function test_resending_verification_code_enforces_cooldown_and_invalidates_previous_code(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'resend-code@maketo.local',
            'email_verified_at' => null,
        ]);

        $oldChallenge = $user->authChallenges()->create([
            'purpose' => User::EMAIL_VERIFICATION_PURPOSE,
            'channel' => 'email',
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'max_attempts' => User::EMAIL_VERIFICATION_MAX_ATTEMPTS,
            'expires_at' => now()->addMinutes(User::EMAIL_VERIFICATION_EXPIRES_MINUTES),
            'resend_available_at' => now()->addSeconds(20),
            'sent_to' => $user->email,
        ]);

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/resend', [
                'email' => $user->email,
            ])
            ->assertStatus(429)
            ->assertJsonPath('code', 'verification_resend_cooldown');

        $oldChallenge->forceFill(['resend_available_at' => now()->subSecond()])->save();

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/resend', [
                'email' => $user->email,
            ])
            ->assertOk()
            ->assertJsonPath('expires_in', 600);

        $this->assertNotNull($oldChallenge->refresh()->consumed_at);

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/email/verify', [
                'email' => $user->email,
                'code' => '123456',
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'verification_code_invalid');
    }

    public function test_registration_rolls_back_when_verification_mail_fails(): void
    {
        Notification::shouldReceive('send')
            ->once()
            ->andThrow(new RuntimeException('SMTP unavailable'));

        $email = 'rollback-me@maketo.local';

        $response = $this->withHeaders($this->browserHeaders())->postJson('/api/auth/register', [
            'first_name' => 'Ria',
            'last_name' => 'Cruz',
            'email' => $email,
            'phone' => '+63 917 555 0199',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response
            ->assertStatus(500)
            ->assertJsonPath('code', 'registration_failed');

        $this->assertDatabaseMissing('users', [
            'email' => $email,
        ]);
    }
}
