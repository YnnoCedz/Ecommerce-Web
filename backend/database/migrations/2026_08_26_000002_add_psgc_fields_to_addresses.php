<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('province')->nullable()->change();
            $table->string('region')->nullable()->after('line2');
            $table->string('region_code', 10)->nullable()->after('region');
            $table->string('province_code', 10)->nullable()->after('province');
            $table->string('city_code', 10)->nullable()->after('city');
            $table->string('barangay')->nullable()->after('city_code');
            $table->string('barangay_code', 10)->nullable()->after('barangay');
        });

        foreach (['seller_applications', 'sellers'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('province')->nullable()->change();
                $table->string('region')->nullable()->after('address_line2');
                $table->string('region_code', 10)->nullable()->after('region');
                $table->string('province_code', 10)->nullable()->after('province');
                $table->string('city_code', 10)->nullable()->after('city');
                $table->string('barangay')->nullable()->after('city_code');
                $table->string('barangay_code', 10)->nullable()->after('barangay');
            });
        }
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('province')->nullable(false)->change();
            $table->dropColumn(['region', 'region_code', 'province_code', 'city_code', 'barangay', 'barangay_code']);
        });

        foreach (['seller_applications', 'sellers'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('province')->nullable(false)->change();
                $table->dropColumn(['region', 'region_code', 'province_code', 'city_code', 'barangay', 'barangay_code']);
            });
        }
    }
};
