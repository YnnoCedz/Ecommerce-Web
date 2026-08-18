<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('business_name');
            $table->string('trade_name')->nullable();
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('province');
            $table->string('city');
            $table->string('postal_code');
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('messaging_phone')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_seller_id')->nullable()->constrained('sellers')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('seller_application_categories', function (Blueprint $table) {
            $table->foreignId('seller_application_id')->constrained('seller_applications')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['seller_application_id', 'category_id'], 'seller_application_categories_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_application_categories');
        Schema::dropIfExists('seller_applications');
    }
};
