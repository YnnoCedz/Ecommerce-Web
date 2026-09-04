<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Shared-identity capability onboarding.
 *
 * This migration is deliberately additive. `users.status` remains global
 * identity state; every approval below belongs to its own domain record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('status', 30)->default('pending');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'submitted_at'], 'marketplace_profiles_review_idx');
        });

        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->string('registration_context', 30)->default('marketplace')->after('password');
            $table->json('application_payload')->nullable()->after('registration_context');
        });

        Schema::create('pending_registration_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pending_registration_id')->constrained('pending_registrations')->cascadeOnDelete();
            $table->string('document_type', 60);
            $table->string('storage_disk', 50)->default('r2');
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->timestamp('uploaded_at');
            $table->timestamps();

            $table->unique(['pending_registration_id', 'document_type'], 'pending_reg_docs_registration_type_unique');
        });

        Schema::create('logistics_provider_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('company_name');
            $table->string('legal_name')->nullable();
            $table->string('contact_name');
            $table->string('contact_email');
            $table->string('contact_phone', 40);
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('region_code', 10);
            $table->string('region_label');
            $table->string('province_code', 10)->nullable();
            $table->string('province_label')->nullable();
            $table->string('city_code', 10);
            $table->string('city_label');
            $table->string('barangay_code', 10)->nullable();
            $table->string('barangay_label')->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('status', 30)->default('pending');
            $table->timestamp('submitted_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_provider_id')->nullable()->constrained('logistics_providers')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'status'], 'logistics_applications_user_status_idx');
            $table->index(['status', 'submitted_at'], 'logistics_applications_review_idx');
        });

        Schema::create('logistics_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('logistics_provider_application_id')->constrained('logistics_provider_applications')->cascadeOnDelete();
            $table->string('document_type', 60);
            $table->string('storage_disk', 50)->default('r2');
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('status', 30)->default('pending');
            $table->timestamp('uploaded_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['logistics_provider_application_id', 'document_type'], 'logistics_docs_application_type_unique');
        });

        Schema::table('courier_applications', function (Blueprint $table) {
            $table->foreignId('logistics_provider_id')->nullable()->after('user_id')
                ->constrained('logistics_providers')->restrictOnDelete();
            $table->foreignId('reviewed_by_staff_id')->nullable()->after('reviewed_by')
                ->constrained('logistics_staff')->nullOnDelete();
            $table->foreignId('primary_hub_id')->nullable()->after('reviewed_by_staff_id')
                ->constrained('logistics_hubs')->restrictOnDelete();
            $table->index(
                ['logistics_provider_id', 'status', 'submitted_at'],
                'courier_applications_provider_review_idx',
            );
        });

        $this->backfillLegacyMarketplaceProfiles();
    }

    /**
     * Preserve legitimate legacy shoppers without granting Buyer to identities
     * introduced only for Rider/Logistics. Before courier onboarding existed,
     * every non-admin identity was a marketplace identity. Newer identities are
     * included only when they have marketplace evidence or no operational-only
     * Rider/Logistics record.
     */
    private function backfillLegacyMarketplaceProfiles(): void
    {
        $users = DB::table('users')
            ->where('role', '!=', 'admin')
            ->where(function ($query) {
                $query->where('created_at', '<', '2026-09-02 00:00:00')
                    ->orWhere(function ($identity) {
                        $identity->whereNotExists(fn ($q) => $q->selectRaw('1')->from('couriers')->whereColumn('couriers.user_id', 'users.id'))
                            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('logistics_staff')->whereColumn('logistics_staff.user_id', 'users.id'));
                    })
                    ->orWhereExists(fn ($q) => $q->selectRaw('1')->from('sellers')->whereColumn('sellers.user_id', 'users.id'))
                    ->orWhereExists(fn ($q) => $q->selectRaw('1')->from('orders')->whereColumn('orders.buyer_id', 'users.id'))
                    ->orWhereExists(fn ($q) => $q->selectRaw('1')->from('carts')->whereColumn('carts.user_id', 'users.id'))
                    ->orWhereExists(fn ($q) => $q->selectRaw('1')->from('addresses')->whereColumn('addresses.user_id', 'users.id'));
            })
            ->when(Schema::hasColumn('users', 'registration_status'), fn ($query) => $query
                ->where(function ($registration) {
                    $registration->whereNull('registration_submitted_at')
                        ->orWhere('registration_status', 'approved');
                }))
            ->pluck('id');

        $now = now();
        foreach ($users as $userId) {
            DB::table('marketplace_profiles')->insertOrIgnore([
                'user_id' => $userId,
                'status' => 'approved',
                'approved_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('courier_applications', function (Blueprint $table) {
            $table->dropIndex('courier_applications_provider_review_idx');
            $table->dropConstrainedForeignId('primary_hub_id');
            $table->dropConstrainedForeignId('reviewed_by_staff_id');
            $table->dropConstrainedForeignId('logistics_provider_id');
        });

        Schema::dropIfExists('logistics_documents');
        Schema::dropIfExists('logistics_provider_applications');
        Schema::dropIfExists('pending_registration_documents');
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropColumn(['registration_context', 'application_payload']);
        });
        Schema::dropIfExists('marketplace_profiles');
    }
};
