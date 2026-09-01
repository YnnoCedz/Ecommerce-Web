<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\MarketplaceNotification;
use App\Models\Seller;
use App\Models\SellerApplication;
use App\Models\SellerDocument;
use App\Models\User;
use App\Notifications\SellerApplicationReviewedNotification;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class SellerAuthenticationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_application_approval_and_seller_bearer_login_complete_the_real_lifecycle(): void
    {
        Notification::fake();
        Storage::fake('r2');
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '1300000000', 'name' => 'National Capital Region (NCR)']]]),
            '*/regions/1300000000/provinces' => Http::response(['data' => []]),
            '*/regions/1300000000/cities-municipalities' => Http::response(['data' => [['code' => '1376020000', 'name' => 'City of Makati', 'zip_code' => '1200']]]),
            '*/cities-municipalities/1376020000/barangays' => Http::response(['data' => [['code' => '1376020001', 'name' => 'Barangay One', 'zip_code' => '1200']]]),
        ]);

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('Password123!'),
            'two_factor_enabled' => false,
        ]);
        $category = Category::factory()->create();
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($buyer)->post('/api/seller/applications', [
            'first_name' => 'Seller',
            'last_name' => 'Applicant',
            'business_name' => 'Lifecycle Store',
            'trade_name' => 'Lifecycle',
            'description' => 'A complete seller application used to verify the authentication lifecycle.',
            'owner_id_number' => 'OWNER-1001',
            'tin' => '123-456-789-000',
            'registration_number' => 'BN-2024-A1B2C3',
            'established_on' => '2024-01-15',
            'address_line1' => '100 Test Street',
            'region_code' => '1300000000',
            'city_code' => '1376020000',
            'barangay_code' => '1376020001',
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
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'title' => 'New seller application',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'event_type' => 'seller.application.created',
            'subject_id' => $application->id,
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'event_type' => 'seller.application.submitted',
            'subject_id' => $application->id,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/seller-applications/{$application->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->actingAs($admin)
            ->postJson("/api/admin/seller-applications/{$application->id}/approve")
            ->assertConflict();
        $this->assertSame(1, Seller::where('user_id', $buyer->id)->count());

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
            ->assertJsonPath('redirect_to', '/');

        $token = $login->json('token');
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();
        $this->withToken($token)->getJson('/api/seller/me')->assertOk();
        $this->withToken($token)->getJson('/api/seller/dashboard')->assertOk();
        $this->withToken($token)->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_admin_application_status_filter_returns_only_the_requested_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        foreach (['pending', 'approved', 'rejected'] as $status) {
            SellerApplication::create([
                'applicant_user_id' => User::factory()->create(['role' => 'buyer'])->id,
                'business_name' => ucfirst($status).' Store',
                'slug' => $status.'-store',
                'description' => 'Status filter test application.',
                'address_line1' => '1 Test Street',
                'city' => 'Makati City',
                'postal_code' => '1200',
                'status' => $status,
                'submitted_at' => now(),
            ]);
        }

        foreach (['pending', 'approved', 'rejected'] as $status) {
            $response = $this->actingAs($admin)
                ->getJson('/api/admin/seller-applications?status='.$status)
                ->assertOk();

            $rows = $response->json('data');
            $this->assertCount(1, $rows);
            $this->assertSame($status, $rows[0]['status']);
        }
    }

    public function test_seller_application_rejects_incorrect_tin_and_registration_formats(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($buyer)->postJson('/api/seller/applications', [
            'tin' => '123-456-789',
            'registration_number' => 'CS202600000',
            'contact_phone' => '+631234',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['tin', 'registration_number', 'contact_phone'])
            ->assertJsonPath('errors.tin.0', 'BIR TIN must use the format 000-000-000-000.')
            ->assertJsonPath('errors.registration_number.0', 'The DTI / SEC registration number must use the format BN-YYYY-XXXXXX.')
            ->assertJsonPath('errors.contact_phone.0', 'The mobile number must use the format +639XXXXXXXXX.');
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

    public function test_admin_can_request_revision_without_erasing_application_history(): void
    {
        Notification::fake();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active', 'email_verified_at' => now()]);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'email_verified_at' => now()]);
        $application = SellerApplication::create([
            'applicant_user_id' => $buyer->id,
            'business_name' => 'Revision Store',
            'slug' => 'revision-store',
            'description' => 'Application requiring a corrected certificate.',
            'address_line1' => '1 Revision Street',
            'province' => 'Metro Manila',
            'city' => 'Makati City',
            'postal_code' => '1200',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);
        $document = SellerDocument::create([
            'seller_application_id' => $application->id,
            'document_type' => 'seller_certificate',
            'storage_disk' => 'r2',
            'file_name' => 'certificate.png',
            'file_path' => 'seller-documents/revision/certificate.png',
            'original_filename' => 'certificate.png',
            'mime_type' => 'image/png',
            'file_size' => 100,
            'status' => 'pending',
            'private' => true,
            'uploaded_at' => now(),
        ]);

        $this->actingAs($admin)->postJson("/api/admin/seller-applications/{$application->id}/request-revision", [
            'review_notes' => 'Upload a clearer and current seller certificate.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'needs_revision')
            ->assertJsonPath('data.rejection_reason', 'Upload a clearer and current seller certificate.');

        $this->assertDatabaseHas('seller_applications', ['id' => $application->id, 'status' => 'needs_revision']);
        $this->assertDatabaseHas('seller_documents', ['id' => $document->id, 'status' => 'needs_revision']);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'seller.application.revision_requested', 'subject_id' => $application->id]);
        $this->assertDatabaseHas('notifications', ['user_id' => $buyer->id, 'title' => 'Seller application needs revision']);
        Notification::assertSentTo($buyer, SellerApplicationReviewedNotification::class);

        $this->actingAs($admin)->postJson("/api/admin/seller-applications/{$application->id}/request-revision", [
            'review_notes' => 'Do not create a second revision transition.',
        ])->assertConflict();

        $this->actingAs($buyer)->postJson('/api/seller/applications', [])
            ->assertUnprocessable();
        $this->assertDatabaseCount('seller_applications', 1);
        $this->assertSame(1, MarketplaceNotification::where('user_id', $buyer->id)->count());
        $this->assertSame(1, ActivityLog::where('event_type', 'seller.application.revision_requested')->count());
    }

    public function test_r2_failure_is_compensated_without_creating_application_records(): void
    {
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '1300000000', 'name' => 'National Capital Region (NCR)']]]),
            '*/regions/1300000000/provinces' => Http::response(['data' => []]),
            '*/regions/1300000000/cities-municipalities' => Http::response(['data' => [['code' => '1376020000', 'name' => 'City of Makati', 'zip_code' => '1200']]]),
            '*/cities-municipalities/1376020000/barangays' => Http::response(['data' => [['code' => '1376020001', 'name' => 'Barangay One', 'zip_code' => '1200']]]),
        ]);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active', 'email_verified_at' => now()]);
        $category = Category::factory()->create();
        $storage = Mockery::mock(MediaStorageService::class);
        $storage->shouldReceive('storePrivateFile')->once()->ordered()->andReturn([
            'storage_disk' => 'r2', 'storage_path' => 'seller-documents/test/owner.png', 'original_filename' => 'owner.png',
            'mime_type' => 'image/png', 'file_size' => 100,
        ]);
        $storage->shouldReceive('storePrivateFile')->once()->ordered()->andThrow(new RuntimeException('R2 unavailable'));
        $storage->shouldReceive('delete')->once()->with('seller-documents/test/owner.png')->andReturn(true);
        $this->app->instance(MediaStorageService::class, $storage);

        $this->actingAs($buyer)->post('/api/seller/applications', [
            'first_name' => 'R2', 'last_name' => 'Failure', 'business_name' => 'R2 Failure Store',
            'description' => 'This complete request fails during the second private upload.',
            'owner_id_number' => 'OWNER-R2', 'tin' => '123-456-789-000', 'registration_number' => 'BN-2026-R2TEST',
            'established_on' => '2024-01-15', 'address_line1' => '100 Test Street',
            'region_code' => '1300000000', 'city_code' => '1376020000', 'barangay_code' => '1376020001', 'postal_code' => '1200',
            'contact_email' => 'r2.failure@gmail.com', 'contact_phone' => '+639175551001', 'categories' => [$category->id],
            'owner_id_file' => UploadedFile::fake()->create('owner.png', 100, 'image/png'),
            'seller_certificate_file' => UploadedFile::fake()->create('certificate.png', 100, 'image/png'),
        ], ['Accept' => 'application/json'])->assertServerError()->assertJsonPath('code', 'seller_application_failed');

        $this->assertDatabaseCount('seller_applications', 0);
        $this->assertDatabaseCount('seller_documents', 0);
    }
}
