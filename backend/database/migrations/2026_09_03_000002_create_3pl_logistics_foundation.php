<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logistics_providers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('company_name');
            $table->string('legal_name')->nullable();
            $table->string('status', 30)->default('pending');
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone', 40)->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('region_code', 10)->nullable();
            $table->string('region_label')->nullable();
            $table->string('province_code', 10)->nullable();
            $table->string('province_label')->nullable();
            $table->string('city_code', 10)->nullable();
            $table->string('city_label')->nullable();
            $table->string('barangay_code', 10)->nullable();
            $table->string('barangay_label')->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('suspended_at')->nullable();
            $table->foreignId('suspended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('inactive_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'logistics_providers_status_created_idx');
        });

        Schema::create('logistics_hubs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('logistics_provider_id')->constrained('logistics_providers')->restrictOnDelete();
            $table->string('code', 40)->unique();
            $table->string('name');
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
            $table->string('contact_name')->nullable();
            $table->string('contact_phone', 40)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['logistics_provider_id', 'active'], 'logistics_hubs_provider_active_idx');
            $table->index(['active', 'city_code'], 'logistics_hubs_active_city_idx');
        });

        Schema::create('logistics_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->foreignId('logistics_provider_id')->constrained('logistics_providers')->restrictOnDelete();
            $table->foreignId('primary_hub_id')->nullable()->constrained('logistics_hubs')->restrictOnDelete();
            $table->string('staff_type', 30);
            $table->string('status', 30)->default('active');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamps();

            $table->index(['logistics_provider_id', 'status', 'staff_type'], 'logistics_staff_provider_status_type_idx');
            $table->index(['logistics_provider_id', 'primary_hub_id', 'status'], 'logistics_staff_provider_hub_status_idx');
        });

        Schema::create('hub_service_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hub_id')->constrained('logistics_hubs')->restrictOnDelete();
            $table->string('municipality_code', 10);
            $table->string('municipality_label');
            $table->unsignedSmallInteger('priority')->default(100);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['hub_id', 'municipality_code'], 'hub_service_areas_hub_municipality_unique');
            $table->index(['municipality_code', 'hub_id'], 'hub_service_areas_municipality_hub_idx');
        });

        Schema::create('courier_logistics_affiliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('courier_id')->constrained('couriers')->restrictOnDelete();
            $table->foreignId('logistics_provider_id')->constrained('logistics_providers')->restrictOnDelete();
            $table->foreignId('primary_hub_id')->constrained('logistics_hubs')->restrictOnDelete();
            $table->string('status', 30)->default('active');
            $table->timestamp('assigned_at');
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('ended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('end_reason', 500)->nullable();
            $table->timestamps();

            $table->index(['courier_id', 'status', 'ended_at'], 'courier_affiliations_current_idx');
            $table->index(['logistics_provider_id', 'status'], 'courier_affiliations_provider_status_idx');
            $table->index(['logistics_provider_id', 'primary_hub_id', 'status'], 'courier_affiliations_provider_hub_status_idx');
        });

        Schema::table('couriers', function (Blueprint $table) {
            $table->string('current_area_code', 10)->nullable()->after('service_area');
            $table->string('current_area_label')->nullable()->after('current_area_code');
            $table->timestamp('current_area_updated_at')->nullable()->after('current_area_label');
            $table->index(['current_area_code', 'availability_status'], 'couriers_current_area_availability_idx');
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->foreignId('logistics_provider_id')->nullable()->after('seller_order_id')->constrained('logistics_providers')->restrictOnDelete();
            $table->foreignId('current_hub_id')->nullable()->after('courier_id')->constrained('logistics_hubs')->restrictOnDelete();
            $table->timestamp('hub_received_at')->nullable()->after('current_hub_id');
            $table->index(['logistics_provider_id', 'status', 'current_hub_id', 'courier_id'], 'shipments_provider_queue_idx');
            $table->index(['current_hub_id', 'status', 'courier_id'], 'shipments_hub_queue_idx');
            $table->index(['courier_id', 'status'], 'shipments_courier_status_idx');
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->string('pickup_store_name')->nullable();
            $table->string('pickup_contact_name')->nullable();
            $table->string('pickup_contact_phone', 40)->nullable();
            $table->string('pickup_address_line1')->nullable();
            $table->string('pickup_address_line2')->nullable();
            $table->string('pickup_region_code', 10)->nullable();
            $table->string('pickup_region_label')->nullable();
            $table->string('pickup_province_code', 10)->nullable();
            $table->string('pickup_province_label')->nullable();
            $table->string('pickup_city_code', 10)->nullable();
            $table->string('pickup_city_label')->nullable();
            $table->string('pickup_barangay_code', 10)->nullable();
            $table->string('pickup_barangay_label')->nullable();
            $table->string('pickup_postal_code', 20)->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_region_code', 10)->nullable();
            $table->string('shipping_region_label')->nullable();
            $table->string('shipping_province_code', 10)->nullable();
            $table->string('shipping_city_code', 10)->nullable();
            $table->string('shipping_barangay_code', 10)->nullable();
            $table->string('shipping_barangay_label')->nullable();
            $table->index('shipping_city_code', 'orders_shipping_city_code_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_shipping_city_code_idx');
            $table->dropColumn([
                'shipping_region_code', 'shipping_region_label', 'shipping_province_code',
                'shipping_city_code', 'shipping_barangay_code', 'shipping_barangay_label',
            ]);
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropColumn([
                'pickup_store_name', 'pickup_contact_name', 'pickup_contact_phone',
                'pickup_address_line1', 'pickup_address_line2', 'pickup_region_code',
                'pickup_region_label', 'pickup_province_code', 'pickup_province_label',
                'pickup_city_code', 'pickup_city_label', 'pickup_barangay_code',
                'pickup_barangay_label', 'pickup_postal_code',
            ]);
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropIndex('shipments_provider_queue_idx');
            $table->dropIndex('shipments_hub_queue_idx');
            $table->dropIndex('shipments_courier_status_idx');
            $table->dropConstrainedForeignId('current_hub_id');
            $table->dropConstrainedForeignId('logistics_provider_id');
            $table->dropColumn('hub_received_at');
        });

        Schema::table('couriers', function (Blueprint $table) {
            $table->dropIndex('couriers_current_area_availability_idx');
            $table->dropColumn(['current_area_code', 'current_area_label', 'current_area_updated_at']);
        });

        Schema::dropIfExists('courier_logistics_affiliations');
        Schema::dropIfExists('hub_service_areas');
        Schema::dropIfExists('logistics_staff');
        Schema::dropIfExists('logistics_hubs');
        Schema::dropIfExists('logistics_providers');
    }
};
