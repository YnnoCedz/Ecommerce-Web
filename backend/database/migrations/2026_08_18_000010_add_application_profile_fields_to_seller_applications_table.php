<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('seller_applications', 'owner_id_number')) {
                $table->string('owner_id_number')->nullable()->after('description');
            }

            if (! Schema::hasColumn('seller_applications', 'tin')) {
                $table->string('tin')->nullable()->after('owner_id_number');
            }

            if (! Schema::hasColumn('seller_applications', 'registration_number')) {
                $table->string('registration_number')->nullable()->after('tin');
            }

            if (! Schema::hasColumn('seller_applications', 'established_on')) {
                $table->date('established_on')->nullable()->after('registration_number');
            }

            if (! Schema::hasColumn('seller_applications', 'public_email')) {
                $table->string('public_email')->nullable()->after('contact_email');
            }
        });
    }

    public function down(): void
    {
        Schema::table('seller_applications', function (Blueprint $table) {
            if (Schema::hasColumn('seller_applications', 'public_email')) {
                $table->dropColumn('public_email');
            }

            if (Schema::hasColumn('seller_applications', 'established_on')) {
                $table->dropColumn('established_on');
            }

            if (Schema::hasColumn('seller_applications', 'registration_number')) {
                $table->dropColumn('registration_number');
            }

            if (Schema::hasColumn('seller_applications', 'tin')) {
                $table->dropColumn('tin');
            }

            if (Schema::hasColumn('seller_applications', 'owner_id_number')) {
                $table->dropColumn('owner_id_number');
            }
        });
    }
};
