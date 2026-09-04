<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('mobile')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('region')->nullable();
            $table->string('region_code', 10)->nullable();
            $table->string('province')->nullable();
            $table->string('province_code', 10)->nullable();
            $table->string('city')->nullable();
            $table->string('city_code', 10)->nullable();
            $table->string('barangay')->nullable();
            $table->string('barangay_code', 10)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('vehicle_type')->nullable();
            $table->string('vehicle_make')->nullable();
            $table->string('vehicle_model')->nullable();
            $table->unsignedSmallInteger('vehicle_year')->nullable();
            $table->string('vehicle_plate_number')->nullable();
            $table->string('vehicle_color')->nullable();
            $table->string('status')->default('pending');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'status'], 'courier_app_user_status_idx');
            $table->index(['status', 'submitted_at'], 'courier_app_status_submitted_idx');
        });

        Schema::create('courier_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('courier_application_id')->constrained('courier_applications')->cascadeOnDelete();
            $table->string('document_type');
            $table->string('storage_disk')->default('r2');
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('status')->default('pending');
            $table->timestamp('uploaded_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['courier_application_id', 'document_type'], 'courier_doc_app_type_unique');
        });

        Schema::table('couriers', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->unique()->after('id')->constrained('users')->nullOnDelete();
            $table->foreignId('approved_application_id')->nullable()->unique()->after('user_id')->constrained('courier_applications')->nullOnDelete();
            $table->string('status')->default('active')->after('active');
            $table->string('availability_status')->default('offline')->after('status');
            $table->string('vehicle_type')->nullable()->after('availability_status');
            $table->string('vehicle_make')->nullable()->after('vehicle_type');
            $table->string('vehicle_model')->nullable()->after('vehicle_make');
            $table->unsignedSmallInteger('vehicle_year')->nullable()->after('vehicle_model');
            $table->string('vehicle_plate_number')->nullable()->after('vehicle_year');
            $table->string('vehicle_color')->nullable()->after('vehicle_plate_number');
            $table->timestamp('approved_at')->nullable()->after('vehicle_color');
        });

    }

    public function down(): void
    {
        Schema::table('couriers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_application_id');
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn([
                'status', 'availability_status', 'vehicle_type', 'vehicle_make',
                'vehicle_model', 'vehicle_year', 'vehicle_plate_number',
                'vehicle_color', 'approved_at',
            ]);
        });

        Schema::dropIfExists('courier_documents');
        Schema::dropIfExists('courier_applications');
    }
};
