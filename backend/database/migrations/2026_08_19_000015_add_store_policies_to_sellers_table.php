<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            if (! Schema::hasColumn('sellers', 'return_policy')) {
                $table->text('return_policy')->nullable()->after('operating_hours');
            }

            if (! Schema::hasColumn('sellers', 'shipping_policy')) {
                $table->text('shipping_policy')->nullable()->after('return_policy');
            }

            if (! Schema::hasColumn('sellers', 'privacy_policy')) {
                $table->text('privacy_policy')->nullable()->after('shipping_policy');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            if (Schema::hasColumn('sellers', 'privacy_policy')) {
                $table->dropColumn('privacy_policy');
            }

            if (Schema::hasColumn('sellers', 'shipping_policy')) {
                $table->dropColumn('shipping_policy');
            }

            if (Schema::hasColumn('sellers', 'return_policy')) {
                $table->dropColumn('return_policy');
            }
        });
    }
};
