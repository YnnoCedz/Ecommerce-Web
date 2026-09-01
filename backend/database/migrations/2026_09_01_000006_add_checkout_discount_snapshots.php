<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('voucher_promotion_id')->nullable()->after('buyer_id')->constrained('promotions')->nullOnDelete();
            $table->string('voucher_code')->nullable()->after('voucher_promotion_id');
            $table->decimal('product_promotion_discount_total', 12, 2)->default(0)->after('discount_total');
            $table->decimal('voucher_discount_total', 12, 2)->default(0)->after('product_promotion_discount_total');
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->decimal('product_promotion_discount_total', 12, 2)->default(0)->after('discount_total');
            $table->decimal('voucher_discount_total', 12, 2)->default(0)->after('product_promotion_discount_total');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('regular_unit_price', 12, 2)->nullable()->after('unit_price');
            $table->string('promotion_name')->nullable()->after('promotion_id');
            $table->decimal('promotion_discount', 12, 2)->default(0)->after('regular_unit_price');
            $table->decimal('voucher_discount', 12, 2)->default(0)->after('promotion_discount');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $table) => $table->dropColumn(['regular_unit_price', 'promotion_name', 'promotion_discount', 'voucher_discount']));
        Schema::table('seller_orders', fn (Blueprint $table) => $table->dropColumn(['product_promotion_discount_total', 'voucher_discount_total']));
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['voucher_promotion_id']);
            $table->dropColumn(['voucher_promotion_id', 'voucher_code', 'product_promotion_discount_total', 'voucher_discount_total']);
        });
    }
};
