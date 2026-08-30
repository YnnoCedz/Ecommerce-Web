<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('variant_options', 'option_name')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->string('option_name')->nullable()->after('product_variant_id');
            });
        }

        // MySQL may use the legacy unique index to support this foreign key.
        // Give the constraint a dedicated index before replacing that unique key.
        if (! Schema::hasIndex('variant_options', 'vo_variant_fk_index')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->index('product_variant_id', 'vo_variant_fk_index');
            });
        }

        if (Schema::hasIndex('variant_options', 'variant_options_unique')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->dropUnique('variant_options_unique');
            });
        }

        if (! Schema::hasIndex('variant_options', 'vo_variant_name_unique')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->unique(['product_variant_id', 'option_name'], 'vo_variant_name_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('variant_options', 'vo_variant_name_unique')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->dropUnique('vo_variant_name_unique');
            });
        }

        if (Schema::hasColumn('variant_options', 'option_name')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->dropColumn('option_name');
            });
        }

        if (! Schema::hasIndex('variant_options', 'variant_options_unique')) {
            Schema::table('variant_options', function (Blueprint $table) {
                $table->unique(['product_variant_id', 'value'], 'variant_options_unique');
            });
        }
    }
};
