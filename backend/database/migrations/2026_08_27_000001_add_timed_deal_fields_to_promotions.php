<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('seller_id')->constrained('products')->nullOnDelete();
            $table->string('kind')->default('coupon')->after('product_id')->index();
            $table->string('name')->nullable()->after('code');
            $table->decimal('deal_price', 12, 2)->nullable()->after('value');
            $table->timestamp('cancelled_at')->nullable()->after('ends_at');
            $table->index(['product_id', 'kind', 'starts_at', 'ends_at'], 'promo_product_window_idx');
            $table->index(['kind', 'status', 'starts_at', 'ends_at'], 'promo_active_window_idx');
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropIndex('promo_product_window_idx');
            $table->dropIndex('promo_active_window_idx');
            $table->dropIndex(['kind']);
            $table->dropColumn(['product_id', 'kind', 'name', 'deal_price', 'cancelled_at']);
        });
    }
};
