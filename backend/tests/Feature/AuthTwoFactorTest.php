<?php

namespace Tests\Feature;

use App\Models\AuthChallenge;
use App\Models\User;
use App\Notifications\AuthChallengeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function loginChallenge(User $user): array
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
            'remember' => true,
        ])->assertStatus(202)
            ->assertJsonPath('requires_two_factor', true)
            ->assertJsonPath('code', 'two_factor_required')
            ->assertJsonMissingPath('token');

        return [
            'challenge_id' => $response->json('two_factor_challenge_id'),
            'challenge_token' => $response->json('two_factor_challenge_token'),
        ];
    }

    protected function createTwoFactorUser(string $email): User
    {
        return User::factory()->create([
            'email' => $email,
            'password' => Hash::make('password123'),
            'two_factor_enabled' => true,
            'two_factor_method' => 'email',
        ]);
    }

    public function test_login_requires_two_factor_and_issues_token_only_after_verification(): void
    {
        Notification::fake();
        $user = $this->createTwoFactorUser('otp-test@maketo.local');
        $credentials = $this->loginChallenge($user);
        $challenge = AuthChallenge::findOrFail($credentials['challenge_id']);
        $code = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $this->assertNotNull($code);
        $this->assertIsString($credentials['challenge_token']);
        $this->assertSame(64, strlen($credentials['challenge_token']));

        $response = $this->postJson('/api/auth/2fa/verify', [
            ...$credentials,
            'code' => $code,
        ])->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', $user->email);

        $this->withToken($response->json('token'))->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $this->assertNotNull($challenge->refresh()->consumed_at);
    }

    public function test_two_factor_resend_requires_challenge_credential_and_returns_fresh_code(): void
    {
        Notification::fake();
        $user = $this->createTwoFactorUser('otp-resend@maketo.local');
        $credentials = $this->loginChallenge($user);
        $challenge = AuthChallenge::findOrFail($credentials['challenge_id']);
        $firstCode = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $challenge->forceFill(['resend_available_at' => now()->subSecond()])->save();

        $this->postJson('/api/auth/2fa/resend', [
            'challenge_id' => $challenge->id,
            'challenge_token' => str_repeat('x', 64),
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'challenge_not_found');

        $this->postJson('/api/auth/2fa/resend', $credentials)->assertOk();

        $secondCode = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();
        $this->assertNotSame($firstCode, $secondCode);
        $this->assertSame(0, $challenge->refresh()->attempts);
    }

    public function test_two_factor_rejects_invalid_expired_locked_and_reused_codes(): void
    {
        Notification::fake();
        $user = $this->createTwoFactorUser('otp-errors@maketo.local');

        $credentials = $this->loginChallenge($user);
        $challenge = AuthChallenge::findOrFail($credentials['challenge_id']);
        $code = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $this->postJson('/api/auth/2fa/verify', [...$credentials, 'code' => '111111'])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'challenge_invalid')
            ->assertJsonPath('remaining_attempts', 4);

        $challenge->forceFill(['attempts' => 0, 'expires_at' => now()->subSecond()])->save();
        $this->postJson('/api/auth/2fa/verify', [...$credentials, 'code' => $code])
            ->assertStatus(410)
            ->assertJsonPath('code', 'challenge_expired');

        $credentials = $this->loginChallenge($user);
        $challenge = AuthChallenge::findOrFail($credentials['challenge_id']);
        $challenge->forceFill(['attempts' => $challenge->max_attempts - 1])->save();
        $this->postJson('/api/auth/2fa/verify', [...$credentials, 'code' => '222222'])
            ->assertStatus(429)
            ->assertJsonPath('code', 'challenge_locked');

        $credentials = $this->loginChallenge($user);
        $code = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();
        $this->postJson('/api/auth/2fa/verify', [...$credentials, 'code' => $code])->assertOk();
        $this->postJson('/api/auth/2fa/verify', [...$credentials, 'code' => $code])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'challenge_not_found');
    }

    public function test_new_two_factor_login_invalidates_previous_active_challenge(): void
    {
        Notification::fake();
        $user = $this->createTwoFactorUser('otp-replaced@maketo.local');

        $first = $this->loginChallenge($user);
        $firstChallenge = AuthChallenge::findOrFail($first['challenge_id']);
        $this->loginChallenge($user);

        $this->assertNotNull($firstChallenge->refresh()->consumed_at);
        $this->assertSame(1, AuthChallenge::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->count());
    }

    public function test_auth_challenge_prune_command_deletes_old_consumed_and_expired_challenges(): void
    {
        $user = User::factory()->create();

        foreach ([
            [now()->subHours(25), null],
            [now()->addMinutes(10), now()->subHours(25)],
            [now()->addMinutes(10), null],
        ] as [$expiresAt, $consumedAt]) {
            AuthChallenge::create([
                'user_id' => $user->id,
                'purpose' => 'login',
                'channel' => 'email',
                'code_hash' => Hash::make('123456'),
                'expires_at' => $expiresAt,
                'resend_available_at' => now()->subSecond(),
                'consumed_at' => $consumedAt,
                'sent_to' => $user->email,
            ]);
        }

        $this->artisan('auth:challenges:prune --hours=24')
            ->expectsOutput('Pruned 2 auth challenge records.')
            ->assertSuccessful();

        $this->assertSame(1, AuthChallenge::count());
    }
}
