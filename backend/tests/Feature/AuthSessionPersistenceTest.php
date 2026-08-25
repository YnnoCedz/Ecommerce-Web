<?php

namespace Tests\Feature;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthSessionPersistenceTest extends TestCase
{
    use RefreshDatabase;

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

    protected function login(User $user): string
    {
        return $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.id', $user->id)
            ->json('token');
    }

    public function test_buyer_token_authorizes_requests_until_logout(): void
    {
        $buyer = $this->createUser('buyer');
        $token = $this->login($buyer);

        $accessToken = PersonalAccessToken::findToken($token);

        $this->assertNotNull($accessToken);
        $this->assertSame(User::class, $accessToken->tokenable_type);
        $this->assertSame($buyer->id, $accessToken->tokenable_id);
        $this->assertSame(['*'], $accessToken->abilities);
        $this->assertNotEmpty($accessToken->token);
        $this->assertNotNull($accessToken->created_at);
        $this->assertTrue($accessToken->tokenable->is($buyer));

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $buyer->id);

        $tokenId = (int) strstr($token, '|', true);
        $this->assertNotNull(PersonalAccessToken::findOrFail($tokenId)->last_used_at);

        $this->withToken($token)->getJson('/api/orders')->assertOk();
        $this->withToken($token)->getJson('/api/cart')->assertOk();
        $this->withToken($token)->getJson('/api/wishlists')->assertOk();
        $this->withToken($token)->getJson('/api/notifications')->assertOk();
        $this->withToken($token)->getJson('/api/admin/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'insufficient_role');
        $this->withToken($token)->getJson('/api/seller/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'insufficient_role');

        $this->withToken($token)->patchJson('/api/account/password', [
            'current_password' => 'wrong-password',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertStatus(422)
            ->assertJsonPath('code', 'current_password_invalid');

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $buyer->id);

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_approved_seller_token_preserves_role_boundaries(): void
    {
        $sellerUser = $this->createUser('seller');
        Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'approved',
            'verified' => true,
        ]);

        $token = $this->login($sellerUser);

        $this->withToken($token)->getJson('/api/seller/me')->assertOk();
        $this->withToken($token)->getJson('/api/seller/dashboard')->assertOk();
        $this->withToken($token)->getJson('/api/admin/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'insufficient_role');
        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $sellerUser->id);
    }

    public function test_non_approved_seller_can_authenticate_but_cannot_enter_seller_area(): void
    {
        $sellerUser = $this->createUser('seller');
        Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'pending',
            'verified' => false,
        ]);

        $login = $this->postJson('/api/auth/login', [
            'email' => $sellerUser->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.seller_approved', false)
            ->assertJsonPath('redirect_to', '/seller-center/onboarding/status');

        $token = $login->json('token');
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();
        $this->withToken($token)->getJson('/api/seller/me')
            ->assertForbidden()
            ->assertJsonPath('code', 'seller_not_approved');
    }

    public function test_admin_token_preserves_role_boundaries(): void
    {
        $admin = $this->createUser('admin');
        $token = $this->login($admin);

        $this->withToken($token)->getJson('/api/admin/me')->assertOk();
        $this->withToken($token)->getJson('/api/admin/dashboard')->assertOk();
        $this->withToken($token)->getJson('/api/admin/users')->assertOk();
        $this->withToken($token)->getJson('/api/seller/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'insufficient_role');
        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $admin->id);
    }

    public function test_invalid_credentials_do_not_issue_a_token(): void
    {
        $buyer = $this->createUser('buyer');

        $this->postJson('/api/auth/login', [
            'email' => $buyer->email,
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJsonMissingPath('token');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_unauthenticated_api_requests_return_json_401(): void
    {
        $this->getJson('/api/orders')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }
}
