<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\PasswordResetLinkNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function browserHeaders(): array
    {
        return [
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
            'Origin' => 'http://192.168.1.8:8443',
            'Referer' => 'http://192.168.1.8:8443/auth/forgot-password',
        ];
    }

    public function test_forgot_password_sends_frontend_reset_link_notification(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://frontend.test']);

        $user = User::factory()->create([
            'email' => 'forgot-me@maketo.local',
        ]);

        $this->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/password/forgot', [
                'email' => $user->email,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'If that email address exists, a password reset link has been sent.');

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => $user->email,
        ]);

        Notification::assertSentTo($user, PasswordResetLinkNotification::class, function (PasswordResetLinkNotification $notification, array $channels) use ($user) {
            $message = $notification->toMail($user);

            return $channels === ['mail']
                && str_starts_with($message->actionUrl ?? '', 'http://frontend.test/auth/reset-password?')
                && str_contains((string) $message->actionUrl, 'token=')
                && str_contains((string) $message->actionUrl, 'email=' . rawurlencode($user->email));
            });
    }

    public function test_forgot_password_rejects_unknown_email_addresses(): void
    {
        Notification::fake();

        $this->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/password/forgot', [
                'email' => 'missing-user@maketo.local',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'We could not find an account with that email address.');

        Notification::assertNothingSent();
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'missing-user@maketo.local',
        ]);
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'reset-me@maketo.local',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $this->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/password/forgot', [
                'email' => $user->email,
            ])
            ->assertOk();

        $notification = Notification::sent($user, PasswordResetLinkNotification::class)->first();
        $this->assertNotNull($notification);

        $this->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/password/reset', [
                'token' => $notification->token(),
                'email' => $user->email,
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])
            ->assertOk()
            ->assertJsonPath('redirect_to', '/auth/login');

        $freshUser = $user->refresh();

        $this->assertTrue(Hash::check('NewPassword123!', $freshUser->password));
        $this->assertFalse(Hash::check('OldPassword123!', $freshUser->password));
        $this->assertSame(0, DB::table('password_reset_tokens')->where('email', $user->email)->count());
    }

    public function test_password_reset_rejects_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'invalid-reset@maketo.local',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $this->withHeaders($this->browserHeaders())
            ->postJson('/api/auth/password/reset', [
                'token' => 'invalid-token',
                'email' => $user->email,
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'password_reset_invalid');

        $this->assertTrue(Hash::check('OldPassword123!', $user->refresh()->password));
    }
}
