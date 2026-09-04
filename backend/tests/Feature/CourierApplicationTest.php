<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Courier;
use App\Models\CourierApplication;
use App\Models\CourierDocument;
use App\Models\LogisticsHub;
use App\Models\LogisticsProvider;
use App\Models\LogisticsStaff;
use App\Models\Seller;
use App\Models\User;
use App\Notifications\CourierApplicationReviewedNotification;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CourierApplicationTest extends TestCase
{
    use RefreshDatabase;

    private LogisticsProvider $provider;

    private LogisticsHub $hub;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('r2');
        Notification::fake();
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '1300000000', 'name' => 'National Capital Region (NCR)']]]),
            '*/regions/1300000000/provinces' => Http::response(['data' => []]),
            '*/regions/1300000000/cities-municipalities' => Http::response(['data' => [['code' => '1376020000', 'name' => 'City of Makati', 'zip_code' => '1200']]]),
            '*/cities-municipalities/1376020000/barangays' => Http::response(['data' => [['code' => '1376020001', 'name' => 'Barangay One', 'zip_code' => '1200']]]),
        ]);
        $this->provider = LogisticsProvider::create([
            'code' => 'LP-TEST', 'company_name' => 'Test Logistics',
            'status' => 'active', 'approved_at' => now(),
        ]);
        $this->hub = LogisticsHub::create([
            'logistics_provider_id' => $this->provider->id, 'code' => 'HUB-TEST', 'name' => 'Test Hub',
            'address_line1' => '1 Hub Road', 'region_code' => '1300000000', 'region_label' => 'NCR',
            'city_code' => '1376020000', 'city_label' => 'Makati', 'active' => true,
        ]);
        $this->manager = User::factory()->create();
        LogisticsStaff::create([
            'user_id' => $this->manager->id, 'logistics_provider_id' => $this->provider->id,
            'staff_type' => 'provider_manager', 'status' => 'active', 'approved_at' => now(),
        ]);
    }

    public function test_courier_application_endpoints_require_the_existing_authentication_system(): void
    {
        $this->getJson('/api/courier/application')->assertUnauthorized();
        $this->postJson('/api/courier/applications')->assertUnauthorized();
    }

    public function test_admin_cannot_apply_and_pending_application_does_not_grant_courier_access(): void
    {
        $admin = $this->user('admin');
        $this->actingAs($admin)->postJson('/api/courier/applications')->assertForbidden()
            ->assertJsonPath('code', 'courier_application_role_invalid');

        $buyer = $this->user();
        $response = $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload());
        $response->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->assertSame('buyer', $buyer->refresh()->role);
        $this->assertNull($buyer->courier);
        $this->actingAs($buyer)->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('user.courier_approved', false)->assertJsonPath('user.courier', null);
    }

    public function test_all_three_separate_images_are_required_and_invalid_or_oversized_files_are_rejected(): void
    {
        foreach (['driver_license_image', 'vehicle_or_image', 'vehicle_cr_image'] as $field) {
            $payload = $this->validPayload();
            unset($payload[$field]);
            $this->actingAs($this->user())->post('/api/courier/applications', $payload, ['Accept' => 'application/json'])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }

        $invalid = $this->validPayload();
        $invalid['driver_license_image'] = UploadedFile::fake()->create('license.txt', 10, 'text/plain');
        $this->actingAs($this->user())->post('/api/courier/applications', $invalid, ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('driver_license_image');

        $oversized = $this->validPayload();
        $oversized['vehicle_or_image'] = $this->imageFile('or.png', 9000);
        $this->actingAs($this->user())->post('/api/courier/applications', $oversized, ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('vehicle_or_image');
    }

    public function test_submission_uses_private_storage_metadata_and_prevents_duplicate_pending_applications(): void
    {
        $buyer = $this->user();
        $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload())->assertCreated();

        $application = CourierApplication::where('user_id', $buyer->id)->firstOrFail();
        $this->assertCount(3, $application->documents);
        $this->assertEqualsCanonicalizing(['driver_license', 'vehicle_or', 'vehicle_cr'], $application->documents->pluck('document_type')->all());
        foreach ($application->documents as $document) {
            $this->assertSame('r2', $document->storage_disk);
            $this->assertStringStartsWith("courier-documents/{$buyer->id}/", $document->file_path);
            Storage::disk('r2')->assertExists($document->file_path);
        }

        $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload())
            ->assertConflict()->assertJsonPath('code', 'courier_application_pending');
        $this->assertDatabaseCount('courier_applications', 1);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'title' => 'Courier application submitted',
        ]);
    }

    public function test_authenticated_user_can_save_and_continue_one_draft_before_final_submission(): void
    {
        $buyer = $this->user();
        $draft = $this->validPayload();
        unset($draft['driver_license_image'], $draft['vehicle_or_image'], $draft['vehicle_cr_image']);

        $draftResponse = $this->actingAs($buyer)->putJson('/api/courier/application/draft', $draft)
            ->assertOk()->assertJsonPath('data.status', 'draft');
        $draftId = $draftResponse->json('data.id');

        $this->actingAs($buyer)->getJson('/api/courier/application')
            ->assertOk()->assertJsonPath('data.id', $draftId)->assertJsonPath('data.status', 'draft');

        $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload())
            ->assertCreated()->assertJsonPath('data.id', $draftId)->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseCount('courier_applications', 1);
        $this->assertDatabaseCount('courier_documents', 3);
    }

    public function test_only_admin_can_review_or_open_private_documents(): void
    {
        $applicant = $this->user();
        $other = $this->user();
        $this->actingAs($applicant)->post('/api/courier/applications', $this->validPayload())->assertCreated();
        $application = CourierApplication::with('documents')->firstOrFail();
        $document = $application->documents->first();

        $this->actingAs($applicant)->getJson("/api/admin/courier-documents/{$document->id}/view")->assertForbidden();
        $this->actingAs($other)->getJson("/api/admin/courier-documents/{$document->id}/view")->assertForbidden();
        $this->actingAs($applicant)->postJson("/api/logistics/rider-applications/{$application->id}/approve", [
            'primary_hub_id' => $this->hub->id,
        ])->assertForbidden();
        $this->actingAs($other)->getJson('/api/admin/courier-applications?status=pending')->assertForbidden();

        $admin = $this->user('admin');
        $this->actingAs($admin)->getJson('/api/admin/courier-applications?status=pending')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'pending');
        $this->actingAs($admin)->getJson("/api/admin/courier-documents/{$document->id}/view")
            ->assertOk()->assertJsonStructure(['data' => ['temporary_url']]);
    }

    public function test_applicant_can_open_only_their_own_private_documents(): void
    {
        $applicant = $this->user();
        $other = $this->user('seller');
        $this->actingAs($applicant)->post('/api/courier/applications', $this->validPayload())->assertCreated();
        $document = CourierDocument::firstOrFail();

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/courier/documents/{$document->id}/view")->assertUnauthorized();
        $this->actingAs($other)->getJson("/api/courier/documents/{$document->id}/view")->assertNotFound();
        $this->actingAs($applicant)->getJson("/api/courier/documents/{$document->id}/view")
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'document_type', 'temporary_url']])
            ->assertJsonMissingPath('data.file_path')
            ->assertJsonMissingPath('data.storage_disk');
    }

    public function test_application_responses_do_not_expose_private_storage_fields(): void
    {
        $buyer = $this->user();
        $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload())
            ->assertCreated()
            ->assertJsonMissingPath('data.documents.0.file_path')
            ->assertJsonMissingPath('data.documents.0.storage_disk');

        $this->actingAs($buyer)->getJson('/api/courier/application')
            ->assertOk()
            ->assertJsonMissingPath('data.documents.0.file_path')
            ->assertJsonMissingPath('data.documents.0.storage_disk');
    }

    public function test_provider_approval_is_transactional_and_preserves_the_existing_user_role(): void
    {
        $sellerUser = $this->user('seller');
        Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved']);
        $this->actingAs($sellerUser)->post('/api/courier/applications', $this->validPayload())->assertCreated();
        $application = CourierApplication::firstOrFail();

        $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/approve", [
            'primary_hub_id' => $this->hub->id,
        ])->assertOk()->assertJsonPath('data.status', 'approved');
        $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/approve", [
            'primary_hub_id' => $this->hub->id,
        ])->assertConflict()->assertJsonPath('code', 'application_state_invalid');

        $this->assertSame(1, Courier::where('user_id', $sellerUser->id)->count());
        $this->assertSame('seller', $sellerUser->refresh()->role);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'courier.application.provider_approved', 'subject_id' => $application->id]);
        $this->assertSame(1, ActivityLog::where('event_type', 'courier.application.provider_approved')->count());
        Notification::assertSentToTimes($sellerUser, CourierApplicationReviewedNotification::class, 1);

        $this->actingAs($sellerUser)->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('user.courier_approved', true)
            ->assertJsonPath('user.courier.status', 'active')
            ->assertJsonPath('user.courier.vehicle.plate_number', 'ABC 1234');
        $this->actingAs($sellerUser)->getJson('/api/seller/dashboard')->assertOk();

        $this->actingAs($sellerUser)->post('/api/courier/applications', $this->validPayload())
            ->assertConflict()->assertJsonPath('code', 'courier_already_active');
    }

    public function test_buyer_role_and_shopping_access_remain_after_courier_approval(): void
    {
        $buyer = $this->user('buyer');
        $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload())->assertCreated();
        $application = CourierApplication::firstOrFail();

        $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/approve", [
            'primary_hub_id' => $this->hub->id,
        ])->assertOk();

        $this->assertSame('buyer', $buyer->refresh()->role);
        $this->assertTrue($buyer->hasActiveCourierProfile());
        $this->actingAs($buyer)->getJson('/api/cart')->assertOk();
    }

    public function test_admin_filters_are_authoritative_for_pending_approved_and_rejected_states(): void
    {
        $admin = $this->user('admin');
        $applications = collect();

        foreach (['pending', 'approved', 'rejected'] as $status) {
            $user = $this->user();
            $this->actingAs($user)->post('/api/courier/applications', $this->validPayload())->assertCreated();
            $application = CourierApplication::where('user_id', $user->id)->firstOrFail();
            if ($status === 'approved') {
                $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/approve", [
                    'primary_hub_id' => $this->hub->id,
                ])->assertOk();
            } elseif ($status === 'rejected') {
                $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/reject", [
                    'rejection_reason' => 'The submitted image is not readable.',
                ])->assertOk();
            }
            $applications->put($status, $application->id);
        }

        foreach (['pending', 'approved', 'rejected'] as $status) {
            $this->actingAs($admin)->getJson("/api/admin/courier-applications?status={$status}")
                ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $applications->get($status));
        }
        $this->actingAs($admin)->getJson('/api/admin/courier-applications')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_failed_document_upload_leaves_no_application_or_document_records(): void
    {
        $attempt = 0;
        $storage = \Mockery::mock(MediaStorageService::class);
        $storage->shouldReceive('storePrivateFile')->times(3)->andReturnUsing(function (UploadedFile $file) use (&$attempt) {
            $attempt++;
            if ($attempt === 3) {
                throw new \RuntimeException('Simulated private upload failure.');
            }

            return [
                'storage_disk' => 'r2',
                'storage_path' => "courier-documents/test/{$attempt}.png",
                'original_filename' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
            ];
        });
        $storage->shouldReceive('delete')->twice()->andReturn(true);
        $this->app->instance(MediaStorageService::class, $storage);

        $this->actingAs($this->user())->post('/api/courier/applications', $this->validPayload())
            ->assertInternalServerError()->assertJsonPath('code', 'courier_application_failed');
        $this->assertDatabaseCount('courier_applications', 0);
        $this->assertDatabaseCount('courier_documents', 0);
    }

    public function test_rejection_requires_a_reason_and_preserves_application_and_documents(): void
    {
        $buyer = $this->user();
        $this->actingAs($buyer)->post('/api/courier/applications', $this->validPayload())->assertCreated();
        $application = CourierApplication::firstOrFail();

        $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/reject", [])
            ->assertUnprocessable()->assertJsonValidationErrors('rejection_reason');
        $this->actingAs($this->manager)->postJson("/api/logistics/rider-applications/{$application->id}/reject", [
            'rejection_reason' => 'The license image is not readable.',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('courier_applications', ['id' => $application->id, 'status' => 'rejected']);
        $this->assertSame(3, CourierDocument::where('courier_application_id', $application->id)->count());
        $this->assertDatabaseCount('couriers', 0);
    }

    private function user(string $role = 'buyer'): User
    {
        return User::factory()->create(['role' => $role, 'status' => 'active', 'email_verified_at' => now()]);
    }

    private function validPayload(): array
    {
        return [
            'mobile' => '+639175551001',
            'logistics_provider_id' => $this->provider->id,
            'address_line1' => '100 Test Street',
            'region_code' => '1300000000',
            'city_code' => '1376020000',
            'barangay_code' => '1376020001',
            'postal_code' => '1200',
            'vehicle_type' => 'motorcycle',
            'vehicle_make' => 'Honda',
            'vehicle_model' => 'Click 160',
            'vehicle_year' => 2025,
            'vehicle_plate_number' => 'abc 1234',
            'vehicle_color' => 'Black',
            'driver_license_image' => $this->imageFile('license.png'),
            'vehicle_or_image' => $this->imageFile('or.png'),
            'vehicle_cr_image' => $this->imageFile('cr.png'),
        ];
    }

    private function imageFile(string $name, int $sizeKb = 1): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n0kAAAAASUVORK5CYII=');
        $content = str_pad($png, $sizeKb * 1024, "\0");

        return UploadedFile::fake()->createWithContent($name, $content);
    }
}
