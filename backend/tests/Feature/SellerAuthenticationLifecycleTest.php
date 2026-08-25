<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerAuthenticationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_application_approval_and_seller_bearer_login_complete_the_real_lifecycle(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('Password123!'),
            'two_factor_enabled' => false,
        ]);
        $category = Category::factory()->create();

        $this->actingAs($buyer)->post('/api/seller/applications', [
            'first_name' => 'Seller',
            'last_name' => 'Applicant',
            'business_name' => 'Lifecycle Store',
            'trade_name' => 'Lifecycle',
            'description' => 'A complete seller application used to verify the authentication lifecycle.',
            'owner_id_number' => 'OWNER-1001',
            'tin' => '123-456-789',
            'registration_number' => 'REG-1001',
            'established_on' => '2024-01-15',
            'address_line1' => '100 Test Street',
            'province' => 'Metro Manila',
            'city' => 'Makati',
            'postal_code' => '1200',
            'contact_email' => 'seller.lifecycle@gmail.com',
            'contact_phone' => '+639175551001',
            'categories' => [$category->id],
            'owner_id_file' => UploadedFile::fake()->create('owner-id.pdf', 100, 'application/pdf'),
            'seller_certificate_file' => UploadedFile::fake()->create('seller-certificate.pdf', 100, 'application/pdf'),
        ])->assertCreated()
            ->assertJsonPath('application.status', 'pending');

        $application = SellerApplication::where('applicant_user_id', $buyer->id)->firstOrFail();
        $this->assertSame('buyer', $buyer->refresh()->role);
        $this->assertCount(2, $application->documents);

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/seller-applications/{$application->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        Auth::forgetGuards();

        $sellerUser = $buyer->refresh();
        $this->assertSame('seller', $sellerUser->role);
        $this->assertSame('approved', $sellerUser->seller?->status);

        $login = $this->postJson('/api/auth/login', [
            'email' => $sellerUser->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.role', 'seller')
            ->assertJsonPath('user.seller_approved', true)
            ->assertJsonPath('redirect_to', '/seller-center');

        $token = $login->json('token');
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();
        $this->withToken($token)->getJson('/api/seller/me')->assertOk();
        $this->withToken($token)->getJson('/api/seller/dashboard')->assertOk();
        $this->withToken($token)->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_admin_cannot_submit_a_public_seller_application(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson('/api/seller/applications')
            ->assertForbidden()
            ->assertJsonPath('code', 'seller_application_role_invalid');

        $this->assertDatabaseCount('seller_applications', 0);
    }
}
