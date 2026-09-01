<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->string('selected_discount_type', 20)->nullable()->after('product_variant_id');
            $table->foreignId('selected_discount_id')->nullable()->after('selected_discount_type')->constrained('promotions')->nullOnDelete();
            $table->index(['cart_id', 'selected_discount_type', 'selected_discount_id'], 'cart_item_discount_idx');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('discount_source_type', 20)->nullable()->after('promotion_id');
            $table->string('discount_type')->nullable()->after('promotion_name');
            $table->decimal('discount_value', 12, 2)->nullable()->after('discount_type');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $table) => $table->dropColumn(['discount_source_type', 'discount_type', 'discount_value']));
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropIndex('cart_item_discount_idx');
            $table->dropForeign(['selected_discount_id']);
            $table->dropColumn(['selected_discount_type', 'selected_discount_id']);
        });
    }
};
