<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index(['status', 'published_at'], 'products_search_visibility_index');
            $table->index(['category_id', 'status'], 'products_category_status_index');
            $table->index(['seller_id', 'status'], 'products_seller_status_index');
            $table->index(['status', 'price'], 'products_status_price_index');
        });

        Schema::table('sellers', function (Blueprint $table) {
            $table->index(['status', 'trade_name'], 'sellers_status_trade_name_index');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->index(['active', 'name'], 'categories_active_name_index');
        });
    }

    public function down(): void
    {
        Schema::table('categories', fn (Blueprint $table) => $table->dropIndex('categories_active_name_index'));
        Schema::table('sellers', fn (Blueprint $table) => $table->dropIndex('sellers_status_trade_name_index'));
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_search_visibility_index');
            $table->dropIndex('products_category_status_index');
            $table->dropIndex('products_seller_status_index');
            $table->dropIndex('products_status_price_index');
        });
    }
};
