<?php

namespace Tests\Feature;

use App\Models\Courier;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsHub;
use App\Models\LogisticsProvider;
use App\Models\LogisticsStaff;
use App\Models\PendingRegistration;
use App\Models\Seller;
use App\Models\User;
use App\Models\UserDocument;
use App\Notifications\EmailVerificationCodeNotification;
use App\Notifications\UserRegistrationReviewedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Phase 2.6 - one identity, many derived capabilities, and User registration
 * with independent Marketplace approval.
 */
class RegistrationCapabilityAlignmentTest extends TestCase
{
    use RefreshDatabase;

    private function imageFile(string $name = 'valid-id.png', int $sizeKb = 1): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n0kAAAAASUVORK5CYII=');

        return UploadedFile::fake()->createWithContent($name, str_pad($png, $sizeKb * 1024, "\0"));
    }

    private function registrationPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Mia',
            'middle_name' => 'Reyes',
            'last_name' => 'Santos',
            'sex' => 'female',
            'birthdate' => '1996-04-12',
            'email' => 'applicant@maketo.local',
            'phone' => '09175550101',
            'address_line1' => '12 Mabini Street',
            'region_code' => '0100000000',
            'province_code' => '0102800000',
            'city_code' => '0102801000',
            'barangay_code' => '0102801001',
            'postal_code' => '2900',
            'id_document' => $this->imageFile(),
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ], $overrides);
    }

    private function register(array $overrides = [])
    {
        return $this->post(
            '/api/auth/register',
            $this->registrationPayload($overrides),
            ['Accept' => 'application/json'],
        );
    }

    private function verifyEmail(string $email): void
    {
        $pending = PendingRegistration::where('email', $email)->firstOrFail();
        $code = Notification::sent($pending, EmailVerificationCodeNotification::class)->last()->code();

        $this->postJson('/api/auth/email/verify', ['email' => $email, 'code' => $code])->assertOk();
    }

    private function admin(): User
    {
        return User::factory()->create([
            'role' => 'admin', 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function activeUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'buyer', 'status' => 'active', 'email_verified_at' => now(),
            'registration_status' => User::REGISTRATION_APPROVED,
        ], $overrides));
    }

    private function approvedCourierFor(User $user): Courier
    {
        $courier = Courier::create([
            'user_id' => $user->id,
            'name' => $user->display_name,
            'slug' => 'courier-'.$user->id,
            'contact_email' => $user->email,
            'active' => true,
            'status' => 'active',
            'availability_status' => 'offline',
            'approved_at' => now(),
        ]);
        $provider = LogisticsProvider::create([
            'code' => 'RLP-'.$user->id, 'company_name' => 'Rider Provider '.$user->id,
            'status' => 'active', 'approved_at' => now(),
        ]);
        $hub = LogisticsHub::create([
            'logistics_provider_id' => $provider->id, 'code' => 'RHUB-'.$user->id,
            'name' => 'Rider Hub', 'address_line1' => '1 Hub Road', 'region_code' => '0100000000',
            'region_label' => 'Region I', 'city_code' => '0102801000', 'city_label' => 'Adams', 'active' => true,
        ]);
        CourierLogisticsAffiliation::create([
            'courier_id' => $courier->id, 'logistics_provider_id' => $provider->id,
            'primary_hub_id' => $hub->id, 'status' => 'active', 'assigned_at' => now(), 'assigned_by' => $user->id,
        ]);

        return $courier;
    }

    private function logisticsStaffFor(User $user): LogisticsStaff
    {
        $provider = LogisticsProvider::create([
            'code' => 'LP-'.$user->id, 'company_name' => 'Provider '.$user->id,
            'status' => 'active', 'approved_at' => now(),
        ]);
        LogisticsHub::create([
            'logistics_provider_id' => $provider->id, 'code' => 'HUB-'.$user->id,
            'name' => 'Hub', 'address_line1' => '1 Hub Road', 'region_code' => '0100000000',
            'region_label' => 'Region I', 'city_code' => '0102801000', 'city_label' => 'Adams',
            'active' => true,
        ]);

        return LogisticsStaff::create([
            'user_id' => $user->id, 'logistics_provider_id' => $provider->id,
            'staff_type' => 'provider_manager', 'status' => 'active', 'approved_at' => now(),
        ]);
    }

    // ---------------------------------------------------------------- registration

    public function test_registration_stores_full_profile_psgc_address_and_private_id_without_creating_a_user(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $this->register()->assertCreated()
            ->assertJsonPath('requires_admin_approval', true)
            ->assertJsonMissingPath('token');

        $this->assertDatabaseMissing('users', ['email' => 'applicant@maketo.local']);

        $pending = PendingRegistration::where('email', 'applicant@maketo.local')->firstOrFail();
        $this->assertSame('Reyes', $pending->middle_name);
        $this->assertSame('female', $pending->sex);
        $this->assertSame('1996-04-12', $pending->birthdate->toDateString());
        $this->assertSame('+639175550101', $pending->phone);
        $this->assertSame('+639175550101', $pending->mobile);
        $this->assertSame('Adams', $pending->city);
        $this->assertSame('0102801001', $pending->barangay_code);

        // The ID is stored through the private abstraction and no storage detail
        // is ever serialised back to the client.
        $this->assertTrue($pending->hasDocument());
        Storage::disk('r2')->assertExists($pending->document_file_path);
        $this->assertArrayNotHasKey('document_file_path', $pending->toArray());
        $this->assertArrayNotHasKey('document_storage_disk', $pending->toArray());
        $this->assertStringStartsWith('user-registration-ids/', $pending->document_file_path);
    }

    public function test_email_verification_creates_active_identity_and_pending_marketplace_profile_with_token(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $this->register()->assertCreated();
        $path = PendingRegistration::where('email', 'applicant@maketo.local')->firstOrFail()->document_file_path;

        $this->verifyEmail('applicant@maketo.local');

        $user = User::where('email', 'applicant@maketo.local')->firstOrFail();
        $this->assertSame('active', $user->status);
        $this->assertSame(User::REGISTRATION_APPROVED, $user->registration_status);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->registration_submitted_at);
        $this->assertSame('pending', $user->marketplaceProfile()->firstOrFail()->status);
        $this->assertFalse($user->capabilities()['buyer']);

        // Default address created from the registration form.
        $address = $user->addresses()->firstOrFail();
        $this->assertTrue((bool) $address->is_default);
        $this->assertSame('12 Mabini Street', $address->line1);
        $this->assertSame('0102801001', $address->barangay_code);

        // The transient object was promoted, not duplicated, and not orphaned.
        $document = UserDocument::where('user_id', $user->id)->firstOrFail();
        $this->assertSame($path, $document->file_path);
        $this->assertSame(UserDocument::TYPE_GOVERNMENT_ID, $document->document_type);
        $this->assertSame('pending', $document->status);
        Storage::disk('r2')->assertExists($path);
        $this->assertDatabaseMissing('pending_registrations', ['email' => 'applicant@maketo.local']);
    }

    public function test_age_is_derived_and_never_stored(): void
    {
        $this->assertFalse(
            Schema::hasColumn('users', 'age'),
            'users.age must not exist - age is always derived from birthdate.',
        );

        $user = $this->activeUser(['birthdate' => now()->subYears(30)->subDays(3)->toDateString()]);
        $this->assertSame(30, $user->refresh()->age);
    }

    // ------------------------------------------------------------------- approval

    public function test_admin_approval_activates_the_account_and_emails_the_applicant(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $this->register()->assertCreated();
        $this->verifyEmail('applicant@maketo.local');
        $user = User::where('email', 'applicant@maketo.local')->firstOrFail();

        // Identity authentication succeeds while operational Marketplace access is pending.
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Password123!'])
            ->assertOk()->assertJsonPath('user.capabilities.buyer', false);
        $this->actingAs($user)->getJson('/api/cart')->assertForbidden()
            ->assertJsonPath('code', 'marketplace_application_pending');

        $admin = $this->admin();
        $this->actingAs($admin)->getJson('/api/admin/user-registrations')
            ->assertOk()->assertJsonPath('data.0.id', $user->id);

        $this->actingAs($admin)->postJson("/api/admin/user-registrations/{$user->id}/approve")
            ->assertOk()->assertJsonPath('data.registration_status', User::REGISTRATION_APPROVED);

        $user->refresh();
        $this->assertSame('active', $user->status);
        $this->assertSame(User::REGISTRATION_APPROVED, $user->registration_status);
        $this->assertSame($admin->id, $user->marketplaceProfile()->firstOrFail()->approved_by);
        $this->assertNotNull($user->marketplaceProfile()->firstOrFail()->approved_at);
        $this->assertSame('approved', $user->documents()->firstOrFail()->status);

        Notification::assertSentTo($user, UserRegistrationReviewedNotification::class);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Password123!'])
            ->assertOk()->assertJsonPath('user.capabilities.buyer', true);
    }

    public function test_admin_rejection_records_the_decision_denies_access_and_emails_the_applicant(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $this->register()->assertCreated();
        $this->verifyEmail('applicant@maketo.local');
        $user = User::where('email', 'applicant@maketo.local')->firstOrFail();
        $path = $user->documents()->firstOrFail()->file_path;

        $admin = $this->admin();
        $this->actingAs($admin)->postJson("/api/admin/user-registrations/{$user->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors(['reason']);

        $this->actingAs($admin)->postJson("/api/admin/user-registrations/{$user->id}/reject", [
            'reason' => 'The submitted identification could not be verified.',
        ])->assertOk();

        $user->refresh();
        $this->assertSame('rejected', $user->marketplaceProfile()->firstOrFail()->status);
        $this->assertSame('active', $user->status);
        $this->assertSame('The submitted identification could not be verified.', $user->marketplaceProfile()->firstOrFail()->rejection_reason);
        // Suspended/restricted are never reused for a registration decision.
        $this->assertNotContains($user->status, ['suspended', 'restricted']);

        // The document is retained for the audit record.
        Storage::disk('r2')->assertExists($path);

        Notification::assertSentTo($user, UserRegistrationReviewedNotification::class);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Password123!'])
            ->assertOk()->assertJsonPath('user.capabilities.buyer', false);
        $this->actingAs($user)->getJson('/api/cart')->assertForbidden()
            ->assertJsonPath('code', 'marketplace_application_rejected');

        // A decided registration cannot be re-decided.
        $this->actingAs($admin)->postJson("/api/admin/user-registrations/{$user->id}/approve")
            ->assertStatus(409)->assertJsonPath('code', 'registration_state_invalid');
    }

    public function test_registration_id_is_visible_only_to_administrators(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $this->register()->assertCreated();
        $this->verifyEmail('applicant@maketo.local');
        $document = User::where('email', 'applicant@maketo.local')->firstOrFail()->documents()->firstOrFail();
        $url = "/api/admin/user-documents/{$document->id}/view";

        $this->getJson($url)->assertUnauthorized();

        $buyer = $this->activeUser(['email' => 'other-buyer@maketo.local']);
        $this->actingAs($buyer)->getJson($url)->assertForbidden();

        $sellerUser = $this->activeUser(['email' => 'seller@maketo.local']);
        Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved']);
        $this->actingAs($sellerUser)->getJson($url)->assertForbidden();

        $rider = $this->activeUser(['email' => 'rider@maketo.local']);
        $this->approvedCourierFor($rider);
        $this->actingAs($rider)->getJson($url)->assertForbidden();

        $staffUser = $this->activeUser(['email' => 'logistics@maketo.local']);
        $this->logisticsStaffFor($staffUser);
        $this->actingAs($staffUser)->getJson($url)->assertForbidden();

        $this->actingAs($this->admin())->getJson($url)->assertOk()
            ->assertJsonPath('data.id', $document->id)
            ->assertJsonMissingPath('data.file_path')
            ->assertJsonMissingPath('data.storage_disk');
    }

    // ------------------------------------------------------------ legacy accounts

    public function test_existing_users_are_never_forced_into_pending_approval(): void
    {
        $legacy = $this->activeUser(['email' => 'legacy@maketo.local']);

        $this->assertSame(User::REGISTRATION_APPROVED, $legacy->registration_status);
        $this->assertTrue($legacy->isRegistrationApproved());
        $this->assertTrue($legacy->capabilities()['buyer']);

        // A pre-existing account keeps logging in exactly as before.
        $this->postJson('/api/auth/login', ['email' => $legacy->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.capabilities.buyer', true)
            ->assertJsonPath('user.registration_status', User::REGISTRATION_APPROVED);
    }

    // -------------------------------------------------------------- capabilities

    public function test_capabilities_are_derived_and_never_stored_as_columns(): void
    {
        foreach (['is_buyer', 'is_seller', 'is_rider', 'is_logistics'] as $column) {
            $this->assertFalse(
                Schema::hasColumn('users', $column),
                "users.{$column} must not exist - capabilities are derived.",
            );
        }
    }

    public function test_auth_me_reports_every_capability_combination(): void
    {
        // Buyer only
        $buyer = $this->activeUser(['email' => 'b@maketo.local']);
        $this->assertCapabilities($buyer, ['buyer' => true, 'seller' => false, 'rider' => false, 'logistics' => false, 'admin' => false]);

        // Buyer + Seller - note role stays 'buyer'
        $seller = $this->activeUser(['email' => 'bs@maketo.local']);
        Seller::factory()->create(['user_id' => $seller->id, 'status' => 'approved']);
        $this->assertCapabilities($seller, ['buyer' => true, 'seller' => true, 'rider' => false, 'logistics' => false, 'admin' => false]);

        // Buyer + Rider
        $rider = $this->activeUser(['email' => 'br@maketo.local']);
        $this->approvedCourierFor($rider);
        $this->assertCapabilities($rider, ['buyer' => true, 'seller' => false, 'rider' => true, 'logistics' => false, 'admin' => false]);

        // Seller + Rider
        $sellerRider = $this->activeUser(['email' => 'sr@maketo.local']);
        Seller::factory()->create(['user_id' => $sellerRider->id, 'status' => 'approved']);
        $this->approvedCourierFor($sellerRider);
        $this->assertCapabilities($sellerRider, ['buyer' => true, 'seller' => true, 'rider' => true, 'logistics' => false, 'admin' => false]);

        // Buyer + Logistics
        $logistics = $this->activeUser(['email' => 'bl@maketo.local']);
        $this->logisticsStaffFor($logistics);
        $this->assertCapabilities($logistics, ['buyer' => true, 'seller' => false, 'rider' => false, 'logistics' => true, 'admin' => false]);

        // Rider + Logistics
        $riderLogistics = $this->activeUser(['email' => 'rl@maketo.local']);
        $this->approvedCourierFor($riderLogistics);
        $this->logisticsStaffFor($riderLogistics);
        $this->assertCapabilities($riderLogistics, ['buyer' => true, 'seller' => false, 'rider' => true, 'logistics' => true, 'admin' => false]);

        // Seller + Rider + Logistics on one identity
        $all = $this->activeUser(['email' => 'srl@maketo.local']);
        Seller::factory()->create(['user_id' => $all->id, 'status' => 'approved']);
        $this->approvedCourierFor($all);
        $this->logisticsStaffFor($all);
        $this->assertCapabilities($all, ['buyer' => true, 'seller' => true, 'rider' => true, 'logistics' => true, 'admin' => false]);

        // Admin is platform authority and is not a marketplace capability.
        $admin = $this->admin();
        $this->assertCapabilities($admin, ['buyer' => false, 'seller' => false, 'rider' => false, 'logistics' => false, 'admin' => true]);
    }

    private function assertCapabilities(User $user, array $expected): void
    {
        $response = $this->actingAs($user)->getJson('/api/auth/me')->assertOk();

        foreach ($expected as $capability => $value) {
            $response->assertJsonPath("user.capabilities.{$capability}", $value);
        }

        $this->assertSame($expected, $user->fresh()->capabilities());
    }

    public function test_one_identity_holds_buyer_seller_and_rider_without_any_role_mutation(): void
    {
        $user = $this->activeUser(['email' => 'multi@maketo.local']);
        Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);
        $this->approvedCourierFor($user);

        $this->assertSame('buyer', $user->fresh()->role);

        // Seller Center, marketplace and courier surfaces all answer for one token.
        $this->actingAs($user)->getJson('/api/seller/dashboard')->assertOk();
        $this->actingAs($user)->getJson('/api/cart')->assertOk();
        $this->actingAs($user)->getJson('/api/courier/profile')->assertOk();
    }

    public function test_legacy_role_seller_still_works_and_needs_no_backfill(): void
    {
        $legacy = $this->activeUser(['email' => 'legacy-seller@maketo.local', 'role' => 'seller']);
        Seller::factory()->create(['user_id' => $legacy->id, 'status' => 'approved']);

        $this->actingAs($legacy)->getJson('/api/seller/dashboard')->assertOk();
        $this->actingAs($legacy)->getJson('/api/cart')->assertOk();
        $this->actingAs($legacy)->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('user.role', 'seller')
            ->assertJsonPath('user.capabilities.seller', true)
            ->assertJsonPath('user.capabilities.buyer', true);
    }

    public function test_suspended_seller_profile_loses_seller_capability_but_keeps_a_clear_state(): void
    {
        $user = $this->activeUser(['email' => 'suspended-seller@maketo.local']);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved']);

        $this->actingAs($user)->getJson('/api/seller/dashboard')->assertOk();

        $seller->forceFill(['status' => 'suspended'])->save();

        $this->actingAs($user)->getJson('/api/seller/dashboard')
            ->assertForbidden()->assertJsonPath('code', 'seller_not_approved');

        // The client can tell "suspended seller" from "never applied", which is
        // what keeps the frontend out of a Seller Center <-> onboarding loop.
        $this->actingAs($user)->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('user.capabilities.seller', false)
            ->assertJsonPath('user.seller_status', 'suspended')
            ->assertJsonPath('user.capabilities.buyer', true);
    }

    public function test_marketplace_login_stays_marketplace_first_for_every_capability(): void
    {
        $cases = [
            'buyer' => fn (User $u) => null,
            'seller' => fn (User $u) => Seller::factory()->create(['user_id' => $u->id, 'status' => 'approved']),
            'rider' => fn (User $u) => $this->approvedCourierFor($u),
            'logistics' => fn (User $u) => $this->logisticsStaffFor($u),
        ];

        foreach ($cases as $label => $grant) {
            $user = $this->activeUser([
                'email' => "redirect-{$label}@maketo.local",
                'password' => Hash::make('Password123!'),
            ]);
            $grant($user);

            $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Password123!'])
                ->assertOk()
                ->assertJsonPath('redirect_to', '/');
        }

        $admin = User::factory()->create([
            'role' => 'admin', 'status' => 'active', 'email_verified_at' => now(),
            'password' => Hash::make('Password123!'),
        ]);
        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'Password123!'])
            ->assertOk()->assertJsonPath('redirect_to', '/admin');
    }

    // --------------------------------------------------------- identity integrity

    public function test_existing_email_never_creates_a_second_identity(): void
    {
        Storage::fake('r2');
        $existing = $this->activeUser(['email' => 'applicant@maketo.local']);

        $this->register()->assertConflict()->assertJsonPath('code', 'existing_account');

        $this->assertSame(1, User::where('email', 'applicant@maketo.local')->count());
        $this->assertSame($existing->id, User::where('email', 'applicant@maketo.local')->firstOrFail()->id);
    }

    public function test_equivalent_phone_formats_resolve_to_one_identity(): void
    {
        Storage::fake('r2');
        $this->activeUser(['email' => 'holder@maketo.local', 'phone' => '+639175550101', 'mobile' => '+639175550101']);

        foreach (['09175550101', '9175550101', '639175550101', '+639175550101', '+63 917 555 0101'] as $format) {
            $this->register(['phone' => $format])
                ->assertConflict()
                ->assertJsonPath('code', 'existing_account');
        }

        $this->assertSame(1, User::where('phone', '+639175550101')->count());
    }

    public function test_malformed_phone_is_rejected_and_never_reaches_the_unique_column(): void
    {
        Storage::fake('r2');

        foreach (['12345', 'not-a-phone', '+1 415 555 0100', '0917555010'] as $malformed) {
            $this->register(['phone' => $malformed])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['phone']);
        }

        $this->assertSame(0, PendingRegistration::count());
        $this->assertSame(0, User::count());
    }

    public function test_a_live_pending_registration_is_never_reused_by_a_different_person(): void
    {
        Notification::fake();
        Storage::fake('r2');

        $this->register()->assertCreated();
        $first = PendingRegistration::where('email', 'applicant@maketo.local')->firstOrFail();

        $second = $this->register([
            'first_name' => 'Impostor',
            'last_name' => 'Cruz',
            'phone' => '09175550999',
            'password' => 'Different123!',
            'password_confirmation' => 'Different123!',
        ])->assertStatus(409)->assertJsonPath('code', 'registration_already_pending');

        // Nothing about the first person's record was disclosed or overwritten.
        $second->assertJsonMissingPath('password');
        $stored = PendingRegistration::where('email', 'applicant@maketo.local')->firstOrFail();
        $this->assertSame($first->id, $stored->id);
        $this->assertSame('Mia', $stored->first_name);
        $this->assertSame('+639175550101', $stored->phone);
        $this->assertTrue(Hash::check('Password123!', $stored->password));
        $this->assertSame($first->document_file_path, $stored->document_file_path);
        $this->assertSame(1, PendingRegistration::count());
    }

    public function test_failed_registration_leaves_no_private_object_behind(): void
    {
        Storage::fake('r2');

        // Invalid PSGC hierarchy fails after the ID would have been accepted.
        $this->register(['barangay_code' => '9999999999'])->assertUnprocessable();

        $this->assertSame(0, PendingRegistration::count());
        $this->assertEmpty(Storage::disk('r2')->allFiles());
    }
}
