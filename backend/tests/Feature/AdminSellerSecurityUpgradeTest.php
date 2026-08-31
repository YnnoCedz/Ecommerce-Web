<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AuthChallenge;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerApplication;
use App\Models\SellerDocument;
use App\Models\User;
use App\Notifications\SecurityChallengeNotification;
use App\Notifications\SellerDocumentExpiryNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminSellerSecurityUpgradeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_users_backend_excludes_administrators_before_pagination_and_search(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $hidden = User::factory()->create(['role' => 'admin', 'name' => 'Hidden Administrator']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?per_page=100')->assertOk();

        $this->assertEqualsCanonicalizing([$buyer->id, $seller->id], collect($response->json('data'))->pluck('id')->all());
        $response->assertJsonPath('meta.total', 2);
        $this->actingAs($admin)->getJson('/api/admin/users?search=Hidden')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $this->actingAs($admin)->getJson('/api/admin/users?role=admin')->assertUnprocessable();
        $this->actingAs($admin)->patchJson("/api/admin/users/{$hidden->id}/status", ['status' => 'suspended', 'reason' => 'Not available here.'])->assertNotFound();
    }

    public function test_platform_settings_are_authorized_allowlisted_persisted_and_audited(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);

        $this->getJson('/api/admin/settings')->assertUnauthorized();
        $this->actingAs($buyer)->getJson('/api/admin/settings')->assertForbidden();
        $this->actingAs($seller)->putJson('/api/admin/settings', ['settings' => ['platform_name' => 'Nope']])->assertForbidden();
        $this->actingAs($admin)->patchJson('/api/admin/settings', ['settings' => ['platform_name' => 'Maketo Hub', 'seller_document_expiry_warning_days' => 21]])
            ->assertOk()->assertJsonPath('data.platform_name', 'Maketo Hub')->assertJsonPath('data.seller_document_expiry_warning_days', 21);
        $this->assertDatabaseHas('platform_settings', ['key' => 'platform_name', 'updated_by' => $admin->id]);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'platform.setting.changed', 'user_id' => $admin->id]);
        $this->actingAs($admin)->putJson('/api/admin/settings', ['settings' => ['unsupported_key' => true]])->assertUnprocessable();
    }

    public function test_login_events_and_real_platform_analytics_are_recorded_without_credentials(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer', 'password' => Hash::make('Password123!')]);

        $this->postJson('/api/auth/login', ['email' => $buyer->email, 'password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['email' => $buyer->email, 'password' => 'Password123!'])->assertOk();

        $this->assertDatabaseHas('activity_logs', ['event_type' => 'auth.login.failed', 'user_id' => $buyer->id]);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'auth.login.success', 'user_id' => $buyer->id]);
        $this->assertStringNotContainsString('Password123!', ActivityLog::pluck('metadata')->map(fn ($value) => json_encode($value))->implode(' '));
        $this->actingAs($admin)->getJson('/api/admin/analytics/platform?days=30')->assertOk()
            ->assertJsonPath('data.users.buyers', 1)
            ->assertJsonPath('data.authentication.successful_today', 1)
            ->assertJsonPath('data.authentication.failed_today', 1);
        $this->actingAs($admin)->getJson('/api/admin/activity?per_page=1')->assertOk()->assertJsonPath('meta.total', 3)->assertJsonCount(1, 'data');
    }

    public function test_unified_activity_reconstructs_business_history_deduplicates_and_never_invents_logins(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer', 'created_at' => now()->subMonths(3)]);
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->for($sellerUser)->create(['status' => 'approved']);
        $application = SellerApplication::create([
            'applicant_user_id' => $buyer->id, 'business_name' => 'Historical Store', 'slug' => 'historical-store',
            'address_line1' => '1 History Street', 'province' => 'Cebu', 'city' => 'Cebu City', 'postal_code' => '6000',
            'status' => 'pending', 'submitted_at' => now()->subMonths(2),
        ]);
        $order = $this->createOrder($buyer, ['grand_total' => 1250, 'placed_at' => now()->subMonth(), 'created_at' => now()->subMonth()]);
        $sellerOrderId = DB::table('seller_orders')->insertGetId(['order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'pending', 'subtotal' => 1250, 'shipping_fee' => 0, 'discount_total' => 0, 'grand_total' => 1250, 'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        $returnId = DB::table('return_requests')->insertGetId(['order_id' => $order->id, 'seller_order_id' => $sellerOrderId, 'buyer_id' => $buyer->id, 'seller_id' => $seller->id, 'status' => 'requested', 'reason' => 'Damaged', 'requested_amount' => 1250, 'refunded_amount' => 0, 'requested_at' => now()->subWeeks(3), 'created_at' => now()->subWeeks(3), 'updated_at' => now()->subWeeks(3)]);
        $disputeId = DB::table('disputes')->insertGetId(['return_request_id' => $returnId, 'opened_by' => $buyer->id, 'status' => 'open', 'reason' => 'Unresolved return', 'refund_amount' => 0, 'opened_at' => now()->subWeeks(2), 'created_at' => now()->subWeeks(2), 'updated_at' => now()->subWeeks(2)]);
        $audit = ActivityLog::create(['user_id' => $buyer->id, 'actor_role' => 'buyer', 'event_type' => 'seller.application.submitted', 'event_category' => 'seller', 'description' => 'Seller application submitted.', 'subject_type' => SellerApplication::class, 'subject_id' => $application->id]);
        $buyer->createToken('old-device')->accessToken;
        DB::table('personal_access_tokens')->where('tokenable_id', $buyer->id)->update(['last_used_at' => now()->subDay()]);

        $response = $this->actingAs($admin)->getJson('/api/admin/activity?per_page=100')->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains("audit:{$audit->id}"));
        $this->assertFalse($ids->contains("seller_applications:{$application->id}"));
        $this->assertTrue($ids->contains("orders:{$order->id}"));
        $this->assertTrue($ids->contains("disputes:{$disputeId}"));
        $this->actingAs($admin)->getJson('/api/admin/activity?category=authentication&event_type=auth.login.success&per_page=100')
            ->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_enterprise_analytics_returns_real_range_aggregates_and_series(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->for($sellerUser)->create(['status' => 'approved']);
        $product = Product::factory()->for($seller)->create(['price' => 500]);
        $order = $this->createOrder($buyer, ['status' => 'completed', 'payment_status' => 'paid', 'grand_total' => 1000]);
        $sellerOrderId = DB::table('seller_orders')->insertGetId(['order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'completed', 'subtotal' => 1000, 'shipping_fee' => 0, 'discount_total' => 0, 'grand_total' => 1000, 'ready_at' => now(), 'picked_up_at' => now(), 'delivered_at' => now(), 'created_at' => now()->subHours(4), 'updated_at' => now()]);
        DB::table('order_items')->insert(['order_id' => $order->id, 'seller_order_id' => $sellerOrderId, 'seller_id' => $seller->id, 'product_id' => $product->id, 'product_name' => $product->name, 'product_slug' => $product->slug, 'sku' => $product->sku, 'unit_price' => 500, 'quantity' => 2, 'subtotal' => 1000, 'created_at' => now(), 'updated_at' => now()]);
        ActivityLog::create(['user_id' => $buyer->id, 'actor_role' => 'buyer', 'event_type' => 'auth.login.success', 'event_category' => 'authentication', 'description' => 'Login successful.']);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($admin)->getJson('/api/admin/analytics/platform?range=7d')->assertOk()
            ->assertJsonPath('data.range', '7d')->assertJsonPath('data.kpis.gross_marketplace_value.value', 1000)
            ->assertJsonPath('data.orders.trend.0.total', 1)->assertJsonPath('data.users.growth.0.buyers', 1)
            ->assertJsonPath('data.seller_performance.top_sellers.0.id', $seller->id)
            ->assertJsonPath('data.catalog.top_products.0.id', $product->id)
            ->assertJsonPath('data.authentication.trend.0.successful', 1)
            ->assertJsonPath('data.activity.volume', 1);
        $this->assertLessThanOrEqual(50, count(DB::getQueryLog()), 'Platform analytics query count should remain bounded.');
        DB::disableQueryLog();
        $this->actingAs($admin)->getJson('/api/admin/analytics/platform?range=12m')->assertOk()->assertJsonPath('data.range_days', 365);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $overview = $this->actingAs($admin)->getJson('/api/admin/analytics/platform?section=overview&range=7d')->assertOk()
            ->assertJsonPath('data.section', 'overview')->assertJsonCount(6, 'data.kpis')
            ->assertJsonPath('data.revenue_orders_trend.0.gross_sales', 1000)
            ->assertJsonMissingPath('data.login_trend')->assertJsonMissingPath('data.product_growth');
        $this->assertLessThanOrEqual(15, count(DB::getQueryLog()), 'Overview analytics should not calculate every analytics domain.');
        DB::disableQueryLog();
        $this->assertLessThanOrEqual(5, count($overview->json('data.top_sellers')));

        foreach (['commerce', 'users-sellers', 'catalog', 'operations', 'security'] as $section) {
            $this->actingAs($admin)->getJson("/api/admin/analytics/platform?section={$section}&range=7d")
                ->assertOk()->assertJsonPath('data.section', $section);
        }
        $this->actingAs($admin)->getJson('/api/admin/analytics/platform?section=security&range=7d')
            ->assertOk()->assertJsonPath('data.login_trend.0.successful', 1)
            ->assertJsonMissingPath('data.revenue_orders_trend');
    }

    public function test_admin_password_change_requires_current_password_and_action_scoped_mfa_when_enabled(): void
    {
        Notification::fake();
        $admin = User::factory()->create(['role' => 'admin', 'password' => Hash::make('Password123!'), 'two_factor_enabled' => true]);

        $this->actingAs($admin)->postJson('/api/admin/security/password', [
            'current_password' => 'wrong', 'password' => 'NewPassword123!', 'password_confirmation' => 'NewPassword123!',
        ])->assertUnprocessable()->assertJsonPath('code', 'current_password_invalid');

        $challenge = $this->actingAs($admin)->postJson('/api/admin/security/password/mfa-challenge', ['current_password' => 'Password123!'])
            ->assertCreated()->json('data');
        $code = null;
        Notification::assertSentTo($admin, SecurityChallengeNotification::class, function (SecurityChallengeNotification $notification) use (&$code) {
            $code = $notification->code();

            return $notification->challenge()->purpose === 'admin.change_password';
        });
        $this->actingAs($admin)->postJson('/api/admin/security/password', [
            'current_password' => 'Password123!', 'password' => 'NewPassword123!', 'password_confirmation' => 'NewPassword123!',
            'challenge_id' => $challenge['challenge_id'], 'challenge_token' => $challenge['challenge_token'], 'code' => '000000',
        ])->assertUnprocessable()->assertJsonPath('code', 'challenge_code_invalid');
        $this->actingAs($admin)->postJson('/api/admin/security/password', [
            'current_password' => 'Password123!', 'password' => 'NewPassword123!', 'password_confirmation' => 'NewPassword123!',
            'challenge_id' => $challenge['challenge_id'], 'challenge_token' => $challenge['challenge_token'], 'code' => $code,
        ])->assertOk();
        $this->assertTrue(Hash::check('NewPassword123!', $admin->fresh()->password));
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'auth.password.changed', 'user_id' => $admin->id]);
        $this->actingAs($admin)->postJson('/api/admin/security/password', [
            'current_password' => 'NewPassword123!', 'password' => 'NextPassword123!', 'password_confirmation' => 'NextPassword123!',
            'challenge_id' => $challenge['challenge_id'], 'challenge_token' => $challenge['challenge_token'], 'code' => $code,
        ])->assertUnprocessable()->assertJsonPath('code', 'challenge_invalid');

        $this->travel(11)->minutes();
        $expired = $this->actingAs($admin)->postJson('/api/admin/security/password/mfa-challenge', ['current_password' => 'NewPassword123!'])->assertCreated()->json('data');
        AuthChallenge::findOrFail($expired['challenge_id'])->update(['expires_at' => now()->subMinute()]);
        $this->actingAs($admin)->postJson('/api/admin/security/password', [
            'current_password' => 'NewPassword123!', 'password' => 'NextPassword123!', 'password_confirmation' => 'NextPassword123!',
            'challenge_id' => $expired['challenge_id'], 'challenge_token' => $expired['challenge_token'], 'code' => '000000',
        ])->assertGone()->assertJsonPath('code', 'challenge_expired');
    }

    public function test_seller_document_renewal_is_private_owned_reviewed_and_preserves_history(): void
    {
        Storage::fake('r2');
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->for($sellerUser)->create(['status' => 'approved']);
        $otherUser = User::factory()->create(['role' => 'seller']);
        Seller::factory()->for($otherUser)->create(['status' => 'approved']);
        $admin = User::factory()->create(['role' => 'admin']);
        $document = SellerDocument::create([
            'seller_id' => $seller->id, 'document_type' => 'seller_certificate', 'storage_disk' => 'r2',
            'file_name' => 'old.pdf', 'file_path' => 'seller-documents/old.pdf', 'original_filename' => 'old.pdf',
            'mime_type' => 'application/pdf', 'file_size' => 100, 'status' => 'approved', 'private' => true, 'uploaded_at' => now(),
        ]);

        $this->actingAs($sellerUser)->getJson('/api/seller/documents')->assertOk()->assertJsonPath('data.0.id', $document->id);
        $this->actingAs($otherUser)->post('/api/seller/documents/'.$document->id.'/renew', ['document' => UploadedFile::fake()->create('renewal.pdf', 100, 'application/pdf')], ['Accept' => 'application/json'])->assertNotFound();
        $response = $this->actingAs($sellerUser)->post('/api/seller/documents/'.$document->id.'/renew', ['document' => UploadedFile::fake()->create('renewal.pdf', 100, 'application/pdf')], ['Accept' => 'application/json'])->assertCreated();
        $renewalId = $response->json('data.renewal.id');
        $this->assertDatabaseHas('seller_documents', ['id' => $renewalId, 'renewal_of_document_id' => $document->id, 'status' => 'pending', 'private' => 1]);
        $this->actingAs($sellerUser)->post('/api/seller/documents/'.$document->id.'/renew', ['document' => UploadedFile::fake()->create('duplicate.pdf', 100, 'application/pdf')], ['Accept' => 'application/json'])->assertConflict();
        $this->actingAs($admin)->patchJson("/api/admin/document-renewals/{$renewalId}", ['decision' => 'approve', 'expires_at' => now()->addYear()->toDateString()])->assertOk();
        $this->assertDatabaseHas('seller_documents', ['id' => $document->id, 'status' => 'superseded']);
        $this->assertDatabaseHas('seller_documents', ['id' => $renewalId, 'status' => 'approved']);
        $this->assertDatabaseCount('seller_documents', 2);
        $this->actingAs($sellerUser)->getJson('/api/seller/documents')->assertOk()->assertJsonPath('data.0.id', $renewalId);
    }

    public function test_seller_danger_action_requires_phrase_password_single_use_email_code_and_keeps_records(): void
    {
        Notification::fake();
        $user = User::factory()->create(['role' => 'seller', 'password' => Hash::make('Password123!')]);
        $seller = Seller::factory()->for($user)->create(['status' => 'approved']);

        $this->actingAs($user)->postJson('/api/seller/settings/danger-zone/challenge', ['action' => 'deactivate', 'confirmation' => 'wrong', 'password' => 'Password123!'])->assertUnprocessable();
        $challenge = $this->actingAs($user)->postJson('/api/seller/settings/danger-zone/challenge', ['action' => 'deactivate', 'confirmation' => 'DEACTIVATE STORE', 'password' => 'Password123!'])->assertCreated()->json('data');
        $code = null;
        Notification::assertSentTo($user, SecurityChallengeNotification::class, function (SecurityChallengeNotification $notification) use (&$code) {
            $code = $notification->code();

            return $notification->challenge()->purpose === 'seller.danger_zone.deactivate';
        });
        $this->assertSame('approved', $seller->fresh()->status);
        $this->actingAs($user)->postJson('/api/seller/settings/danger-zone/verify', ['action' => 'deactivate', 'challenge_id' => $challenge['challenge_id'], 'challenge_token' => $challenge['challenge_token'], 'code' => $code])->assertOk();
        $this->assertSame('inactive', $seller->fresh()->status);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'seller.store.deactivated', 'user_id' => $user->id]);
        $this->actingAs($user)->postJson('/api/seller/settings/danger-zone/verify', ['action' => 'deactivate', 'challenge_id' => $challenge['challenge_id'], 'challenge_token' => $challenge['challenge_token'], 'code' => $code])->assertForbidden();
    }

    public function test_seller_security_uses_email_mfa_for_configuration_and_password_changes(): void
    {
        Notification::fake();
        $user = User::factory()->create(['role' => 'seller', 'password' => Hash::make('Password123!')]);
        Seller::factory()->for($user)->create(['status' => 'approved']);

        $this->actingAs($user)->getJson('/api/seller/settings/security')->assertOk()
            ->assertJsonPath('data.mfa.enabled', false)
            ->assertJsonStructure(['data' => ['mfa', 'sessions', 'last_password_changed_at']]);

        $enable = $this->actingAs($user)->postJson('/api/seller/settings/security/mfa/challenge', [
            'action' => 'enable', 'current_password' => 'Password123!',
        ])->assertCreated()->json('data');
        $enableCode = null;
        Notification::assertSentTo($user, SecurityChallengeNotification::class, function ($notification) use (&$enableCode) {
            if ($notification->challenge()->purpose !== 'seller.mfa.enable') return false;
            $enableCode = $notification->code();

            return true;
        });
        $this->actingAs($user)->postJson('/api/seller/settings/security/mfa/verify', [
            'action' => 'enable', 'challenge_id' => $enable['challenge_id'], 'challenge_token' => $enable['challenge_token'], 'code' => $enableCode,
        ])->assertOk()->assertJsonPath('data.enabled', true);
        $this->assertTrue($user->fresh()->two_factor_enabled);

        $passwordChallenge = $this->actingAs($user)->postJson('/api/seller/settings/security/password/challenge', [
            'current_password' => 'Password123!',
        ])->assertCreated()->json('data');
        $passwordCode = null;
        Notification::assertSentTo($user, SecurityChallengeNotification::class, function ($notification) use (&$passwordCode) {
            if ($notification->challenge()->purpose !== 'seller.change_password') return false;
            $passwordCode = $notification->code();

            return true;
        });
        $this->actingAs($user)->patchJson('/api/seller/settings/security/password', [
            'current_password' => 'Password123!', 'password' => 'Changed123!', 'password_confirmation' => 'Changed123!',
            'challenge_id' => $passwordChallenge['challenge_id'], 'challenge_token' => $passwordChallenge['challenge_token'], 'code' => $passwordCode,
        ])->assertOk();

        $this->assertTrue(Hash::check('Changed123!', $user->fresh()->password));
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'seller.mfa.enabled', 'user_id' => $user->id]);
        $this->assertDatabaseHas('activity_logs', ['event_type' => 'seller.password.changed', 'user_id' => $user->id]);
    }

    public function test_seller_danger_zone_blocks_unsettled_payments_returns_and_disputes(): void
    {
        Notification::fake();
        $sellerUser = User::factory()->create(['role' => 'seller', 'password' => Hash::make('Password123!')]);
        $seller = Seller::factory()->for($sellerUser)->create(['status' => 'approved']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $order = $this->createOrder($buyer, ['status' => 'completed', 'payment_status' => 'pending']);
        $sellerOrderId = DB::table('seller_orders')->insertGetId([
            'order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'completed', 'subtotal' => 100,
            'shipping_fee' => 0, 'discount_total' => 0, 'grand_total' => 100, 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $payload = ['action' => 'deactivate', 'confirmation' => 'DEACTIVATE STORE', 'password' => 'Password123!'];

        $this->actingAs($sellerUser)->postJson('/api/seller/settings/danger-zone/challenge', $payload)
            ->assertConflict()->assertJsonPath('code', 'seller_obligations_open');

        $order->update(['payment_status' => 'paid']);
        $returnId = DB::table('return_requests')->insertGetId([
            'order_id' => $order->id, 'seller_order_id' => $sellerOrderId, 'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
            'status' => 'requested', 'reason' => 'Damaged', 'requested_amount' => 100, 'refunded_amount' => 0,
            'requested_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($sellerUser)->postJson('/api/seller/settings/danger-zone/challenge', $payload)
            ->assertConflict()->assertJsonPath('code', 'seller_obligations_open');

        DB::table('return_requests')->where('id', $returnId)->update(['status' => 'closed', 'resolved_at' => now()]);
        DB::table('disputes')->insert([
            'return_request_id' => $returnId, 'opened_by' => $buyer->id, 'status' => 'open', 'reason' => 'Unresolved',
            'opened_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($sellerUser)->postJson('/api/seller/settings/danger-zone/challenge', $payload)
            ->assertConflict()->assertJsonPath('code', 'seller_obligations_open');
    }

    public function test_document_expiry_command_sends_each_threshold_only_once(): void
    {
        Notification::fake();
        $user = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->for($user)->create(['status' => 'approved']);
        SellerDocument::create([
            'seller_id' => $seller->id, 'document_type' => 'owner_id', 'storage_disk' => 'r2', 'file_name' => 'id.pdf',
            'file_path' => 'seller-documents/id.pdf', 'mime_type' => 'application/pdf', 'status' => 'approved',
            'private' => true, 'uploaded_at' => now(), 'approved_at' => now(), 'expires_at' => now()->addDays(30)->toDateString(),
        ]);

        $this->artisan('seller-documents:notify-expiry')->assertSuccessful();
        $this->artisan('seller-documents:notify-expiry')->assertSuccessful();

        Notification::assertSentToTimes($user, SellerDocumentExpiryNotification::class, 1);
        $this->assertDatabaseCount('activity_logs', 1);
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_seller_onboarding_rejects_missing_invalid_and_duplicate_submissions_server_side(): void
    {
        Storage::fake('r2');
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->actingAs($buyer)->postJson('/api/seller/applications', [])->assertUnprocessable()
            ->assertJsonValidationErrors(['business_name', 'categories', 'owner_id_file', 'seller_certificate_file']);
        $this->actingAs($buyer)->post('/api/seller/applications', [
            'categories' => [999999],
            'owner_id_file' => UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream'),
            'seller_certificate_file' => UploadedFile::fake()->create('large.pdf', 11000, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()
            ->assertJsonValidationErrors(['categories.0', 'owner_id_file', 'seller_certificate_file']);

        $application = SellerApplication::create([
            'applicant_user_id' => $buyer->id, 'business_name' => 'Pending Store', 'slug' => 'pending-store',
            'description' => 'Pending application.', 'address_line1' => '1 Test Street', 'province' => 'Metro Manila',
            'city' => 'Makati', 'postal_code' => '1200', 'status' => 'pending', 'submitted_at' => now(),
        ]);
        $this->actingAs($buyer)->postJson('/api/seller/applications', [])->assertConflict()->assertJsonPath('code', 'seller_application_pending');
        $this->actingAs($buyer)->postJson("/api/admin/seller-applications/{$application->id}/approve")->assertForbidden();

        $approvedUser = User::factory()->create(['role' => 'seller']);
        Seller::factory()->for($approvedUser)->create(['status' => 'approved']);
        $this->actingAs($approvedUser)->postJson('/api/seller/applications', [])->assertForbidden();
    }

    private function createOrder(User $buyer, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'buyer_id' => $buyer->id, 'order_number' => 'ORD-'.str()->upper(str()->random(8)),
            'status' => 'pending', 'payment_status' => 'pending', 'payment_method' => 'card', 'currency' => 'PHP',
            'shipping_name' => $buyer->name, 'shipping_phone' => $buyer->mobile, 'shipping_line1' => '1 Test Street',
            'shipping_city' => 'Makati', 'shipping_province' => 'Metro Manila', 'shipping_postal_code' => '1200',
            'subtotal' => 0, 'shipping_total' => 0, 'discount_total' => 0, 'tax_total' => 0, 'grand_total' => 0,
            'placed_at' => now(),
        ], $overrides));
    }
}
