<?php

namespace Tests\Feature;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthSessionPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected function browserHeaders(string $path = '/'): array
    {
        return [
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
            'Origin' => 'http://192.168.1.8:8443',
            'Referer' => 'http://192.168.1.8:8443'.$path,
        ];
    }

    protected function createUser(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('Password123!'),
            'two_factor_enabled' => false,
        ]);
    }

    protected function login(User $user): void
    {
        $this->withHeaders($this->browserHeaders('/auth/login'))
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_buyer_session_survives_navigation_and_validation_error_until_logout(): void
    {
        $buyer = $this->createUser('buyer');
        $this->login($buyer);

        $this->withHeaders($this->browserHeaders('/account/orders'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $buyer->id);

        $this->withHeaders($this->browserHeaders('/account/orders'))
            ->getJson('/api/orders')
            ->assertOk();

        $this->withHeaders($this->browserHeaders('/account/security'))
            ->patchJson('/api/account/password', [
                'current_password' => 'wrong-password',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'current_password_invalid');

        $this->withHeaders($this->browserHeaders('/account/security'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $buyer->id);

        $this->withHeaders($this->browserHeaders('/account/security'))
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->withHeaders($this->browserHeaders())
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_approved_seller_session_survives_forbidden_admin_request(): void
    {
        $sellerUser = $this->createUser('seller');
        Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'approved',
            'verified' => true,
        ]);

        $this->login($sellerUser);

        $this->withHeaders($this->browserHeaders('/seller-center'))
            ->getJson('/api/seller/dashboard')
            ->assertOk();

        $this->withHeaders($this->browserHeaders('/admin'))
            ->getJson('/api/admin/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'insufficient_role');

        $this->withHeaders($this->browserHeaders('/seller-center'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $sellerUser->id);
    }

    public function test_admin_session_survives_forbidden_seller_request(): void
    {
        $admin = $this->createUser('admin');
        $this->login($admin);

        $this->withHeaders($this->browserHeaders('/admin'))
            ->getJson('/api/admin/dashboard')
            ->assertOk();

        $this->withHeaders($this->browserHeaders('/seller-center'))
            ->getJson('/api/seller/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'insufficient_role');

        $this->withHeaders($this->browserHeaders('/admin'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $admin->id);
    }

    public function test_unauthenticated_api_requests_return_json_401(): void
    {
        $this->withHeaders($this->browserHeaders('/account/orders'))
            ->getJson('/api/orders')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }
}
