<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (! Schema::hasColumn('reports', 'reportable_type')) {
                $table->string('reportable_type')->nullable()->after('reporter_user_id');
            }

            if (! Schema::hasColumn('reports', 'reportable_id')) {
                $table->unsignedBigInteger('reportable_id')->nullable()->after('reportable_type');
            }
        });

        Schema::table('messages', function (Blueprint $table) {
            if (! Schema::hasColumn('messages', 'senderable_type')) {
                $table->string('senderable_type')->nullable()->after('conversation_id');
            }

            if (! Schema::hasColumn('messages', 'senderable_id')) {
                $table->unsignedBigInteger('senderable_id')->nullable()->after('senderable_type');
            }
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->unique(
                ['cart_id', 'product_variant_id', 'saved_for_later'],
                'cart_items_cart_variant_saved_unique'
            );
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unique(
                ['order_id', 'product_variant_id', 'seller_order_id'],
                'order_items_order_variant_seller_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropUnique('order_items_order_variant_seller_unique');
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropUnique('cart_items_cart_variant_saved_unique');
        });

        Schema::table('messages', function (Blueprint $table) {
            if (Schema::hasColumn('messages', 'senderable_id')) {
                $table->dropColumn('senderable_id');
            }

            if (Schema::hasColumn('messages', 'senderable_type')) {
                $table->dropColumn('senderable_type');
            }
        });

        Schema::table('reports', function (Blueprint $table) {
            if (Schema::hasColumn('reports', 'reportable_id')) {
                $table->dropColumn('reportable_id');
            }

            if (Schema::hasColumn('reports', 'reportable_type')) {
                $table->dropColumn('reportable_type');
            }
        });
    }
};
