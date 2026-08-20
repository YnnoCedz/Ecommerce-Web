<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            if (! Schema::hasColumn('sellers', 'bank_account_number')) {
                $table->string('bank_account_number')->nullable()->after('bank_name');
            }

            if (! Schema::hasColumn('sellers', 'operating_hours')) {
                $table->json('operating_hours')->nullable()->after('account_number_last4');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'tags')) {
                $table->json('tags')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'tags')) {
                $table->dropColumn('tags');
            }
        });

        Schema::table('sellers', function (Blueprint $table) {
            if (Schema::hasColumn('sellers', 'operating_hours')) {
                $table->dropColumn('operating_hours');
            }

            if (Schema::hasColumn('sellers', 'bank_account_number')) {
                $table->dropColumn('bank_account_number');
            }
        });
    }
};
