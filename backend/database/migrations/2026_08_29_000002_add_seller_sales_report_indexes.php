<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['placed_at', 'payment_status'], 'orders_placed_payment_idx');
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->index(['seller_id', 'status', 'order_id'], 'so_seller_status_order_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_placed_payment_idx');
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropIndex('so_seller_status_order_idx');
        });
    }
};
