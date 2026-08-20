<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            if (! Schema::hasColumn('sellers', 'gcash_number')) {
                $table->string('gcash_number', 32)->nullable()->after('bank_account_number');
            }

            if (! Schema::hasColumn('sellers', 'maya_number')) {
                $table->string('maya_number', 32)->nullable()->after('gcash_number');
            }
        });

        DB::table('sellers')
            ->whereNull('gcash_number')
            ->whereNotNull('bank_account_number')
            ->where('payout_method', 'gcash')
            ->update([
                'gcash_number' => DB::raw('bank_account_number'),
            ]);

        DB::table('sellers')
            ->whereNull('maya_number')
            ->whereNotNull('bank_account_number')
            ->where('payout_method', 'maya')
            ->update([
                'maya_number' => DB::raw('bank_account_number'),
            ]);
    }

    public function down(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            if (Schema::hasColumn('sellers', 'maya_number')) {
                $table->dropColumn('maya_number');
            }

            if (Schema::hasColumn('sellers', 'gcash_number')) {
                $table->dropColumn('gcash_number');
            }
        });
    }
};
