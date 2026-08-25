<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'carts_user_status_index');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'orders_status_created_index');
            $table->index(['payment_status', 'created_at'], 'orders_payment_created_index');
        });
        Schema::table('seller_applications', function (Blueprint $table) {
            $table->index(['status', 'submitted_at'], 'seller_applications_status_submitted_index');
        });
        Schema::table('reports', function (Blueprint $table) {
            $table->index(['status', 'submitted_at'], 'reports_status_submitted_index');
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_id', 'dismissed_at', 'created_at'], 'notifications_user_dismissed_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', fn (Blueprint $table) => $table->dropIndex('notifications_user_dismissed_created_index'));
        Schema::table('reports', fn (Blueprint $table) => $table->dropIndex('reports_status_submitted_index'));
        Schema::table('seller_applications', fn (Blueprint $table) => $table->dropIndex('seller_applications_status_submitted_index'));
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_status_created_index');
            $table->dropIndex('orders_payment_created_index');
        });
        Schema::table('carts', fn (Blueprint $table) => $table->dropIndex('carts_user_status_index'));
    }
};
