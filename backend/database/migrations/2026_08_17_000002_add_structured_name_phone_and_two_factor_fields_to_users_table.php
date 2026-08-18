<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name')->nullable()->after('name');
            }

            if (! Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name')->nullable()->after('first_name');
            }

            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable()->unique()->after('mobile');
            }

            if (! Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')->default(false)->after('status');
            }

            if (! Schema::hasColumn('users', 'two_factor_method')) {
                $table->string('two_factor_method')->nullable()->after('two_factor_enabled');
            }

            if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->dropColumn('two_factor_confirmed_at');
            }

            if (Schema::hasColumn('users', 'two_factor_method')) {
                $table->dropColumn('two_factor_method');
            }

            if (Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->dropColumn('two_factor_enabled');
            }

            if (Schema::hasColumn('users', 'phone')) {
                $table->dropUnique(['phone']);
                $table->dropColumn('phone');
            }

            if (Schema::hasColumn('users', 'last_name')) {
                $table->dropColumn('last_name');
            }

            if (Schema::hasColumn('users', 'first_name')) {
                $table->dropColumn('first_name');
            }
        });
    }
};
