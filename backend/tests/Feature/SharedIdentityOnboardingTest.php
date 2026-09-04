<?php

namespace Tests\Feature;

use App\Models\Courier;
use App\Models\CourierApplication;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsHub;
use App\Models\LogisticsProvider;
use App\Models\LogisticsProviderApplication;
use App\Models\LogisticsStaff;
use App\Models\PendingRegistration;
use App\Models\Seller;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SharedIdentityOnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Storage::fake('r2');
    }

    public function test_new_logistics_identity_is_verified_once_and_approved_without_buyer_access(): void
    {
        $this->post('/api/auth/register/logistics', $this->logisticsPayload(), ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('registration_context', 'logistics');

        $pending = PendingRegistration::where('email', 'logistics-applicant@maketo.local')->firstOrFail();
        $this->assertSame('logistics', $pending->registration_context);
        $this->assertCount(2, $pending->documents);
        $verification = Notification::sent($pending, EmailVerificationCodeNotification::class)->last();

        $this->postJson('/api/auth/email/verify', ['email' => $pending->email, 'code' => $verification->code()])
            ->assertOk()->assertJsonPath('user.capabilities.buyer', false)
            ->assertJsonPath('user.capabilities.logistics', false)->assertJsonStructure(['token']);

        $user = User::where('email', $pending->email)->firstOrFail();
        $this->assertSame('active', $user->status);
        $this->assertNull($user->marketplaceProfile);
        $application = LogisticsProviderApplication::where('user_id', $user->id)->with('documents')->firstOrFail();
        $this->assertSame('pending', $application->status);
        $this->assertCount(2, $application->documents);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->postJson("/api/admin/logistics-applications/{$application->id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $staff = LogisticsStaff::where('user_id', $user->id)->with('provider')->firstOrFail();
        $this->assertSame('provider_manager', $staff->staff_type);
        $this->assertTrue($staff->provider->isActive());
        $this->assertTrue($user->fresh()->capabilities()['logistics']);
        $this->assertFalse($user->fresh()->capabilities()['buyer']);
        $this->actingAs($user)->getJson('/api/logistics/context')->assertOk()
            ->assertJsonPath('data.staff.type', 'provider_manager');
    }

    public function test_new_rider_identity_is_provider_owned_and_provider_manager_selects_hub(): void
    {
        [$providerA, $hubA, $managerA] = $this->providerTeam('A');
        [$providerB, $hubB, $managerB] = $this->providerTeam('B');

        $payload = $this->identityPayload('rider-applicant@maketo.local') + [
            'logistics_provider_id' => $providerA->id,
            'vehicle_type' => 'motorcycle', 'vehicle_make' => 'Honda', 'vehicle_model' => 'Click',
            'vehicle_year' => 2025, 'vehicle_plate_number' => 'ABC-1234', 'vehicle_color' => 'Black',
            'driver_license_image' => $this->image('license.png'),
            'vehicle_or_image' => $this->image('or.png'), 'vehicle_cr_image' => $this->image('cr.png'),
        ];
        $this->post('/api/auth/register/rider', $payload, ['Accept' => 'application/json'])->assertCreated();
        $pending = PendingRegistration::where('email', 'rider-applicant@maketo.local')->firstOrFail();
        $code = Notification::sent($pending, EmailVerificationCodeNotification::class)->last()->code();
        $this->postJson('/api/auth/email/verify', ['email' => $pending->email, 'code' => $code])
            ->assertOk()->assertJsonPath('user.capabilities.rider', false);

        $user = User::where('email', $pending->email)->firstOrFail();
        $application = CourierApplication::where('user_id', $user->id)->firstOrFail();
        $this->assertSame($providerA->id, $application->logistics_provider_id);
        $this->assertNull($user->marketplaceProfile);

        $this->actingAs($managerB)->getJson('/api/logistics/rider-applications')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($managerB)->postJson("/api/logistics/rider-applications/{$application->id}/approve", ['primary_hub_id' => $hubB->id])->assertNotFound();

        $this->actingAs($managerA)->postJson("/api/logistics/rider-applications/{$application->id}/approve", ['primary_hub_id' => $hubA->id])
            ->assertOk()->assertJsonPath('data.status', 'approved')->assertJsonPath('data.primary_hub.id', $hubA->id);

        $courier = Courier::where('user_id', $user->id)->firstOrFail();
        $this->assertDatabaseHas('courier_logistics_affiliations', [
            'courier_id' => $courier->id, 'logistics_provider_id' => $providerA->id,
            'primary_hub_id' => $hubA->id, 'status' => 'active',
        ]);
        $this->assertTrue($user->fresh()->capabilities()['rider']);
        $this->assertFalse($user->fresh()->capabilities()['buyer']);
    }

    public function test_pending_marketplace_does_not_disable_rider_and_rejected_marketplace_does_not_disable_logistics(): void
    {
        [$provider, $hub, $manager] = $this->providerTeam('INDEPENDENT');

        $rider = User::factory()->create();
        $rider->marketplaceProfile()->update(['status' => 'pending', 'approved_at' => null]);
        $courier = Courier::create([
            'user_id' => $rider->id, 'name' => $rider->display_name, 'slug' => 'independent-rider',
            'active' => true, 'status' => 'active', 'availability_status' => 'offline', 'approved_at' => now(),
        ]);
        CourierLogisticsAffiliation::create([
            'courier_id' => $courier->id, 'logistics_provider_id' => $provider->id,
            'primary_hub_id' => $hub->id, 'status' => 'active', 'assigned_at' => now(), 'assigned_by' => $manager->id,
        ]);
        $this->actingAs($rider)->getJson('/api/courier/profile')->assertOk();
        $this->actingAs($rider)->getJson('/api/cart')->assertForbidden()->assertJsonPath('code', 'marketplace_application_pending');

        $logistics = User::factory()->create();
        $logistics->marketplaceProfile()->update(['status' => 'rejected', 'approved_at' => null, 'rejected_at' => now()]);
        LogisticsStaff::create([
            'user_id' => $logistics->id, 'logistics_provider_id' => $provider->id,
            'staff_type' => 'provider_manager', 'status' => 'active', 'approved_at' => now(),
        ]);
        $this->actingAs($logistics)->getJson('/api/logistics/context')->assertOk();
        $this->actingAs($logistics)->getJson('/api/cart')->assertForbidden()->assertJsonPath('code', 'marketplace_application_rejected');
    }

    public function test_seller_requires_buyer_and_global_suspension_blocks_every_capability(): void
    {
        $identity = User::factory()->create();
        $identity->marketplaceProfile()->delete();
        Seller::factory()->create(['user_id' => $identity->id, 'status' => 'approved']);
        $this->actingAs($identity)->postJson('/api/seller/applications', [])->assertForbidden()
            ->assertJsonPath('code', 'marketplace_access_required');
        $this->actingAs($identity)->getJson('/api/seller/dashboard')->assertForbidden()
            ->assertJsonPath('code', 'marketplace_access_required');

        $identity->forceFill(['status' => 'suspended'])->save();
        $this->actingAs($identity)->getJson('/api/auth/me')->assertForbidden()->assertJsonPath('code', 'account_suspended');
        $this->actingAs($identity)->getJson('/api/cart')->assertForbidden()->assertJsonPath('code', 'account_suspended');
        $this->actingAs($identity)->getJson('/api/courier/profile')->assertForbidden()->assertJsonPath('code', 'account_suspended');
        $this->actingAs($identity)->getJson('/api/logistics/context')->assertForbidden()->assertJsonPath('code', 'account_suspended');
    }

    public function test_existing_verified_identity_adds_marketplace_and_logistics_applications_without_duplicate_identity_or_verification(): void
    {
        [$provider, $hub, $manager] = $this->providerTeam('REUSE');
        $identity = User::factory()->create(['email' => 'shared-identity@maketo.local']);
        $identity->marketplaceProfile()->delete();
        $courier = Courier::create([
            'user_id' => $identity->id, 'name' => $identity->display_name, 'slug' => 'shared-identity-rider',
            'active' => true, 'status' => 'active', 'availability_status' => 'offline', 'approved_at' => now(),
        ]);
        CourierLogisticsAffiliation::create([
            'courier_id' => $courier->id, 'logistics_provider_id' => $provider->id,
            'primary_hub_id' => $hub->id, 'status' => 'active', 'assigned_at' => now(), 'assigned_by' => $manager->id,
        ]);
        $identityCount = User::count();
        $verifiedAt = $identity->email_verified_at;

        $this->actingAs($identity)->post('/api/marketplace/applications', [
            'address_line1' => '12 Mabini Street', 'region_code' => '0100000000',
            'province_code' => '0102800000', 'city_code' => '0102801000',
            'barangay_code' => '0102801001', 'postal_code' => '2900',
            'id_document' => $this->image('marketplace-id.png'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->actingAs($identity)->post('/api/logistics/applications', [
            'company_name' => 'Shared Identity Logistics', 'legal_name' => 'Shared Identity Logistics OPC',
            'address_line1' => '12 Mabini Street', 'region_code' => '0100000000',
            'province_code' => '0102800000', 'city_code' => '0102801000',
            'barangay_code' => '0102801001', 'postal_code' => '2900',
            'applicant_id' => $this->image('applicant-id.png'),
            'business_permit' => $this->image('business-permit.png'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->assertSame($identityCount, User::count());
        $this->assertTrue($verifiedAt->equalTo($identity->fresh()->email_verified_at));
        $this->assertDatabaseHas('marketplace_profiles', ['user_id' => $identity->id, 'status' => 'pending']);
        $this->assertDatabaseHas('logistics_provider_applications', ['user_id' => $identity->id, 'status' => 'pending']);
        $this->assertTrue($identity->fresh()->capabilities()['rider']);
        Notification::assertNotSentTo($identity, EmailVerificationCodeNotification::class);
    }

    private function providerTeam(string $suffix): array
    {
        $provider = LogisticsProvider::create(['code' => "LP-{$suffix}", 'company_name' => "Provider {$suffix}", 'status' => 'active', 'approved_at' => now()]);
        $hub = LogisticsHub::create([
            'logistics_provider_id' => $provider->id, 'code' => "HUB-{$suffix}", 'name' => "Hub {$suffix}",
            'address_line1' => '1 Hub Road', 'region_code' => '0100000000', 'region_label' => 'Region I',
            'city_code' => '0102801000', 'city_label' => 'Adams', 'active' => true,
        ]);
        $manager = User::factory()->create(['email' => strtolower($suffix).'@provider.test']);
        LogisticsStaff::create([
            'user_id' => $manager->id, 'logistics_provider_id' => $provider->id,
            'staff_type' => 'provider_manager', 'status' => 'active', 'approved_at' => now(),
        ]);

        return [$provider, $hub, $manager];
    }

    private function logisticsPayload(): array
    {
        return $this->identityPayload('logistics-applicant@maketo.local') + [
            'company_name' => 'North Luzon Logistics', 'legal_name' => 'North Luzon Logistics OPC',
            'applicant_id' => $this->image('applicant-id.png'), 'business_permit' => $this->image('dti.png'),
        ];
    }

    private function identityPayload(string $email): array
    {
        return [
            'first_name' => 'Alex', 'middle_name' => 'M', 'last_name' => 'Reyes', 'sex' => 'prefer_not_to_say',
            'birthdate' => '1994-05-01', 'email' => $email, 'phone' => '09175550191',
            'password' => 'Password123!', 'password_confirmation' => 'Password123!',
            'address_line1' => '12 Mabini Street', 'region_code' => '0100000000',
            'province_code' => '0102800000', 'city_code' => '0102801000',
            'barangay_code' => '0102801001', 'postal_code' => '2900',
        ];
    }

    private function image(string $name): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n0kAAAAASUVORK5CYII=');

        return UploadedFile::fake()->createWithContent($name, $png);
    }
}
