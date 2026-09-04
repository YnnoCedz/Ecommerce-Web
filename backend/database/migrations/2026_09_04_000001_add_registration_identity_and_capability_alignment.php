<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2.6 - Registration, identity and capability alignment.
 *
 * Strictly additive. No column is dropped, renamed or re-typed, and no existing
 * row is rewritten: `users.registration_status` defaults to `approved` so every
 * pre-existing account stays exactly as approved and active as it is today.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'middle_name')) {
                $table->string('middle_name')->nullable()->after('first_name');
            }

            if (! Schema::hasColumn('users', 'sex')) {
                $table->string('sex', 20)->nullable()->after('last_name');
            }

            if (! Schema::hasColumn('users', 'birthdate')) {
                $table->date('birthdate')->nullable()->after('sex');
            }

            // Registration review is a separate fact from operational account status.
            // `users.status` answers "may this account operate?"; this answers
            // "what did Marketo Admin decide about the registration?".
            if (! Schema::hasColumn('users', 'registration_status')) {
                $table->string('registration_status', 30)->default('approved')->after('status');
            }

            if (! Schema::hasColumn('users', 'registration_submitted_at')) {
                $table->timestamp('registration_submitted_at')->nullable()->after('registration_status');
            }

            if (! Schema::hasColumn('users', 'registration_reviewed_at')) {
                $table->timestamp('registration_reviewed_at')->nullable()->after('registration_submitted_at');
            }

            if (! Schema::hasColumn('users', 'registration_reviewed_by')) {
                $table->foreignId('registration_reviewed_by')->nullable()->after('registration_reviewed_at')
                    ->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('users', 'registration_decision_reason')) {
                $table->text('registration_decision_reason')->nullable()->after('registration_reviewed_by');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['registration_status', 'registration_submitted_at'], 'users_registration_review_idx');
        });

        Schema::table('pending_registrations', function (Blueprint $table) {
            if (! Schema::hasColumn('pending_registrations', 'middle_name')) {
                $table->string('middle_name')->nullable()->after('first_name');
            }
            if (! Schema::hasColumn('pending_registrations', 'sex')) {
                $table->string('sex', 20)->nullable()->after('last_name');
            }
            if (! Schema::hasColumn('pending_registrations', 'birthdate')) {
                $table->date('birthdate')->nullable()->after('sex');
            }
            if (! Schema::hasColumn('pending_registrations', 'address_line1')) {
                $table->string('address_line1')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('pending_registrations', 'address_line2')) {
                $table->string('address_line2')->nullable()->after('address_line1');
            }
            if (! Schema::hasColumn('pending_registrations', 'region')) {
                $table->string('region')->nullable()->after('address_line2');
            }
            if (! Schema::hasColumn('pending_registrations', 'region_code')) {
                $table->string('region_code', 10)->nullable()->after('region');
            }
            if (! Schema::hasColumn('pending_registrations', 'province')) {
                $table->string('province')->nullable()->after('region_code');
            }
            if (! Schema::hasColumn('pending_registrations', 'province_code')) {
                $table->string('province_code', 10)->nullable()->after('province');
            }
            if (! Schema::hasColumn('pending_registrations', 'city')) {
                $table->string('city')->nullable()->after('province_code');
            }
            if (! Schema::hasColumn('pending_registrations', 'city_code')) {
                $table->string('city_code', 10)->nullable()->after('city');
            }
            if (! Schema::hasColumn('pending_registrations', 'barangay')) {
                $table->string('barangay')->nullable()->after('city_code');
            }
            if (! Schema::hasColumn('pending_registrations', 'barangay_code')) {
                $table->string('barangay_code', 10)->nullable()->after('barangay');
            }
            if (! Schema::hasColumn('pending_registrations', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->after('barangay_code');
            }

            // Transient private ID-document metadata. Promoted into `user_documents`
            // when email verification creates the real users row, then cleared.
            if (! Schema::hasColumn('pending_registrations', 'document_type')) {
                $table->string('document_type', 60)->nullable()->after('postal_code');
            }
            if (! Schema::hasColumn('pending_registrations', 'document_storage_disk')) {
                $table->string('document_storage_disk', 50)->nullable()->after('document_type');
            }
            if (! Schema::hasColumn('pending_registrations', 'document_file_path')) {
                $table->string('document_file_path')->nullable()->after('document_storage_disk');
            }
            if (! Schema::hasColumn('pending_registrations', 'document_original_filename')) {
                $table->string('document_original_filename')->nullable()->after('document_file_path');
            }
            if (! Schema::hasColumn('pending_registrations', 'document_mime_type')) {
                $table->string('document_mime_type', 100)->nullable()->after('document_original_filename');
            }
            if (! Schema::hasColumn('pending_registrations', 'document_file_size')) {
                $table->unsignedBigInteger('document_file_size')->nullable()->after('document_mime_type');
            }
            if (! Schema::hasColumn('pending_registrations', 'document_uploaded_at')) {
                $table->timestamp('document_uploaded_at')->nullable()->after('document_file_size');
            }
        });

        if (! Schema::hasTable('user_documents')) {
            Schema::create('user_documents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
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

                $table->unique(['user_id', 'document_type'], 'user_documents_user_type_unique');
                $table->index(['status', 'uploaded_at'], 'user_documents_status_uploaded_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_documents');

        Schema::table('pending_registrations', function (Blueprint $table) {
            $columns = array_values(array_filter([
                'middle_name', 'sex', 'birthdate', 'address_line1', 'address_line2',
                'region', 'region_code', 'province', 'province_code', 'city', 'city_code',
                'barangay', 'barangay_code', 'postal_code', 'document_type',
                'document_storage_disk', 'document_file_path', 'document_original_filename',
                'document_mime_type', 'document_file_size', 'document_uploaded_at',
            ], fn (string $column) => Schema::hasColumn('pending_registrations', $column)));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_registration_review_idx');

            if (Schema::hasColumn('users', 'registration_reviewed_by')) {
                $table->dropConstrainedForeignId('registration_reviewed_by');
            }

            $columns = array_values(array_filter([
                'middle_name', 'sex', 'birthdate', 'registration_status',
                'registration_submitted_at', 'registration_reviewed_at',
                'registration_decision_reason',
            ], fn (string $column) => Schema::hasColumn('users', $column)));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
