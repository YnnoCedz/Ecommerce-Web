<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->unsignedInteger('per_buyer_limit')->nullable()->after('usage_count');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('promotion_id')->nullable()->after('product_variant_id')->constrained('promotions')->nullOnDelete();
        });

        Schema::create('promotion_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('redeemed_at');
            $table->timestamps();

            $table->unique(['promotion_id', 'order_id'], 'promotion_order_redemption_unique');
            $table->index(['promotion_id', 'buyer_id'], 'promotion_buyer_redemptions_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_redemptions');
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
            $table->dropColumn('promotion_id');
        });
        Schema::table('promotions', fn (Blueprint $table) => $table->dropColumn('per_buyer_limit'));
    }
};
