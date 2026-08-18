<?php

namespace Tests\Feature;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthorizationAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function browserHeaders(): array
    {
        return [
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
            'Origin' => 'http://127.0.0.1:8443',
            'Referer' => 'http://127.0.0.1:8443/',
        ];
    }

    public function test_admin_routes_reject_non_admin_users(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($buyer)
            ->withHeaders($this->browserHeaders())
            ->getJson('/api/admin/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('code', 'insufficient_role');
    }

    public function test_admin_dashboard_is_accessible_to_admin_users(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->withHeaders($this->browserHeaders())
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => ['users', 'buyers', 'sellers', 'approved_sellers', 'products', 'orders', 'reports']]);
    }

    public function test_seller_routes_reject_unapproved_sellers(): void
    {
        $sellerUser = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'pending',
            'verified' => false,
        ]);

        $this->actingAs($sellerUser)
            ->withHeaders($this->browserHeaders())
            ->getJson('/api/seller/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('code', 'seller_not_approved');
    }

    public function test_approved_seller_routes_are_accessible_to_approved_sellers(): void
    {
        $sellerUser = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'approved',
            'verified' => true,
        ]);

        $this->actingAs($sellerUser)
            ->withHeaders($this->browserHeaders())
            ->getJson('/api/seller/dashboard')
            ->assertOk()
            ->assertJsonPath('data.seller.status', 'approved');
    }

    public function test_inactive_accounts_are_blocked_from_private_routes(): void
    {
        $user = User::factory()->create([
            'role' => 'buyer',
            'status' => 'suspended',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);

        $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->getJson('/api/account/addresses')
            ->assertStatus(403)
            ->assertJsonPath('code', 'account_suspended');
    }
}
