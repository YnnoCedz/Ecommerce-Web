<?php

namespace Tests\Feature;

use App\Models\Courier;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CourierIdentityFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyers_and_sellers_without_profiles_have_no_courier_capability(): void
    {
        $buyer = $this->user('buyer');
        $seller = $this->user('seller');

        $this->assertNull($buyer->courier);
        $this->assertFalse($buyer->hasActiveCourierProfile());
        $this->assertNull($seller->courier);
        $this->assertFalse($seller->hasActiveCourierProfile());

        foreach ([$buyer, $seller] as $user) {
            $this->actingAs($user)->getJson('/api/auth/me')
                ->assertOk()
                ->assertJsonPath('user.courier_approved', false)
                ->assertJsonPath('user.courier', null);
        }
    }

    public function test_buyer_and_seller_can_have_active_courier_capability_without_role_changes(): void
    {
        foreach (['buyer', 'seller'] as $role) {
            $user = $this->user($role);
            $courier = $this->activeCourier($user, $role);

            $this->assertTrue($user->refresh()->hasActiveCourierProfile());
            $this->assertTrue($user->courier->is($courier));
            $this->assertTrue($courier->user->is($user));
            $this->assertSame($role, $user->role);

            $this->actingAs($user)->getJson('/api/cart')->assertOk();
            $this->actingAs($user)->getJson('/api/auth/me')
                ->assertOk()
                ->assertJsonPath('user.role', $role)
                ->assertJsonPath('user.courier_approved', true)
                ->assertJsonPath('user.courier.id', $courier->id)
                ->assertJsonPath('user.courier.status', 'active')
                ->assertJsonMissingPath('user.courier.approved_application_id')
                ->assertJsonMissingPath('user.courier.user_id');
        }
    }

    public function test_courier_capability_requires_an_approved_and_active_profile(): void
    {
        $notApproved = $this->user();
        $this->courier($notApproved, 'not-approved', ['approved_at' => null]);
        $this->assertFalse($notApproved->refresh()->hasActiveCourierProfile());

        $disabled = $this->user();
        $this->courier($disabled, 'disabled', ['active' => false]);
        $this->assertFalse($disabled->refresh()->hasActiveCourierProfile());

        $inactive = $this->user();
        $this->courier($inactive, 'inactive', ['status' => 'suspended']);
        $this->assertFalse($inactive->refresh()->hasActiveCourierProfile());
    }

    public function test_one_user_cannot_have_duplicate_courier_profiles(): void
    {
        $user = $this->user();
        $this->activeCourier($user, 'first');

        $this->expectException(QueryException::class);
        $this->activeCourier($user, 'second');
    }

    public function test_courier_active_middleware_uses_the_profile_capability_not_role(): void
    {
        Route::middleware(['auth:sanctum', 'account.active', 'courier.active'])
            ->get('/api/testing/courier-identity', fn () => response()->json(['ok' => true]));

        $buyer = $this->user('buyer');
        $seller = $this->user('seller');
        $this->activeCourier($seller, 'seller-courier');

        $this->actingAs($buyer)->getJson('/api/testing/courier-identity')
            ->assertForbidden()
            ->assertJsonPath('code', 'rider_not_active');
        $this->actingAs($seller)->getJson('/api/testing/courier-identity')
            ->assertOk()
            ->assertJsonPath('ok', true);
        $this->assertSame('seller', $seller->refresh()->role);
    }

    public function test_admin_cannot_use_the_public_courier_application_endpoint(): void
    {
        $this->actingAs($this->user('admin'))
            ->postJson('/api/courier/applications')
            ->assertForbidden()
            ->assertJsonPath('code', 'courier_application_role_invalid');
    }

    private function user(string $role = 'buyer'): User
    {
        return User::factory()->create([
            'role' => $role,
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function activeCourier(User $user, string $slug): Courier
    {
        return $this->courier($user, $slug);
    }

    private function courier(User $user, string $slug, array $overrides = []): Courier
    {
        return Courier::create(array_merge([
            'user_id' => $user->id,
            'name' => $user->display_name,
            'slug' => 'identity-'.$slug,
            'contact_email' => $user->email,
            'contact_phone' => $user->phone,
            'active' => true,
            'status' => 'active',
            'availability_status' => 'offline',
            'approved_at' => now(),
        ], $overrides));
    }
}
