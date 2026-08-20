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

    protected function browserHeaders(): array
    {
        return [
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
            'Origin' => 'http://192.168.1.8:8443',
            'Referer' => 'http://192.168.1.8:8443/auth/login',
        ];
    }

    public function test_login_requires_two_factor_and_verifies_successfully(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'otp-test@maketo.local',
            'password' => Hash::make('password123'),
            'two_factor_enabled' => true,
            'two_factor_method' => 'email',
        ]);

        $loginResponse = $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
            'remember' => true,
        ]);

        $loginResponse
            ->assertStatus(202)
            ->assertJsonPath('requires_two_factor', true)
            ->assertJsonPath('code', 'two_factor_required');

        $challenge = AuthChallenge::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($challenge);
        $this->assertDatabaseHas('auth_challenges', [
            'id' => $challenge->id,
            'user_id' => $user->id,
            'purpose' => 'login',
            'channel' => 'email',
        ]);

        $challengeCode = Notification::sent($user, AuthChallengeNotification::class)
            ->last()
            ?->code();

        $this->assertNotNull($challengeCode);

        $verifyResponse = $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/verify', [
            'challenge_id' => $challenge->id,
            'code' => $challengeCode,
        ]);

        $verifyResponse
            ->assertOk()
            ->assertJsonPath('redirect_to', '/')
            ->assertJsonPath('user.email', $user->email);

        $this->withHeaders($this->browserHeaders())->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $this->assertNotNull($challenge->refresh()->consumed_at);
    }

    public function test_two_factor_resend_returns_fresh_code(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'otp-resend@maketo.local',
            'password' => Hash::make('password123'),
            'two_factor_enabled' => true,
            'two_factor_method' => 'email',
        ]);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202);

        $challenge = AuthChallenge::query()->where('user_id', $user->id)->firstOrFail();

        $firstCode = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $challenge->forceFill([
            'resend_available_at' => now()->subSecond(),
        ])->save();

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/resend', [
            'challenge_id' => $challenge->id,
        ])->assertOk();

        $challenge->refresh();
        $secondCode = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $this->assertNotSame($firstCode, $secondCode);
        $this->assertSame(0, $challenge->attempts);
    }

    public function test_two_factor_rejects_invalid_expired_reused_and_locked_codes(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'otp-errors@maketo.local',
            'password' => Hash::make('password123'),
            'two_factor_enabled' => true,
            'two_factor_method' => 'email',
        ]);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202);

        $challenge = AuthChallenge::query()->where('user_id', $user->id)->firstOrFail();
        $code = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $this->assertNotNull($code);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/verify', [
            'challenge_id' => $challenge->id,
            'code' => '111111',
        ])->assertStatus(422)
            ->assertJsonPath('code', 'challenge_invalid')
            ->assertJsonPath('remaining_attempts', 4);

        $challenge->forceFill([
            'attempts' => 0,
            'expires_at' => now()->subSecond(),
        ])->save();

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/verify', [
            'challenge_id' => $challenge->id,
            'code' => $code,
        ])->assertStatus(410)
            ->assertJsonPath('code', 'challenge_expired');

        $this->assertNotNull($challenge->refresh()->consumed_at);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202);

        $challenge = AuthChallenge::query()->where('user_id', $user->id)->whereNull('consumed_at')->firstOrFail();
        $code = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $this->assertNotNull($code);

        $challenge->forceFill(['attempts' => $challenge->max_attempts - 1])->save();

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/verify', [
            'challenge_id' => $challenge->id,
            'code' => '222222',
        ])->assertStatus(429)
            ->assertJsonPath('code', 'challenge_locked');

        $this->assertNotNull($challenge->refresh()->consumed_at);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202);

        $challenge = AuthChallenge::query()->where('user_id', $user->id)->whereNull('consumed_at')->firstOrFail();
        $code = Notification::sent($user, AuthChallengeNotification::class)->last()?->code();

        $this->assertNotNull($code);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/verify', [
            'challenge_id' => $challenge->id,
            'code' => $code,
        ])->assertOk();

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/2fa/verify', [
            'challenge_id' => $challenge->id,
            'code' => $code,
        ])->assertStatus(422)
            ->assertJsonPath('code', 'challenge_not_found');
    }

    public function test_new_two_factor_login_invalidates_previous_active_challenge(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'otp-replaced@maketo.local',
            'password' => Hash::make('password123'),
            'two_factor_enabled' => true,
            'two_factor_method' => 'email',
        ]);

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202);

        $firstChallenge = AuthChallenge::query()->where('user_id', $user->id)->firstOrFail();

        $this->withHeaders($this->browserHeaders())->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202);

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

        AuthChallenge::create([
            'user_id' => $user->id,
            'purpose' => 'login',
            'channel' => 'email',
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->subHours(25),
            'resend_available_at' => now()->subHours(25),
            'consumed_at' => null,
            'sent_to' => $user->email,
        ]);

        AuthChallenge::create([
            'user_id' => $user->id,
            'purpose' => 'login',
            'channel' => 'email',
            'code_hash' => Hash::make('654321'),
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->subSecond(),
            'consumed_at' => now()->subHours(25),
            'sent_to' => $user->email,
        ]);

        AuthChallenge::create([
            'user_id' => $user->id,
            'purpose' => 'login',
            'channel' => 'email',
            'code_hash' => Hash::make('999999'),
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->subSecond(),
            'sent_to' => $user->email,
        ]);

        $this->artisan('auth:challenges:prune --hours=24')
            ->expectsOutput('Pruned 2 auth challenge records.')
            ->assertSuccessful();

        $this->assertSame(1, AuthChallenge::count());
    }
}
