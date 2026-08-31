<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->index(['role', 'created_at'], 'users_role_created_index'));
        Schema::table('products', fn (Blueprint $table) => $table->index(['created_at', 'seller_id'], 'products_created_seller_index'));
        Schema::table('seller_applications', fn (Blueprint $table) => $table->index(['reviewed_at', 'status'], 'seller_applications_reviewed_status_index'));
        Schema::table('tracking_events', fn (Blueprint $table) => $table->index('occurred_at', 'tracking_events_occurred_index'));
        Schema::table('return_requests', fn (Blueprint $table) => $table->index('requested_at', 'return_requests_requested_index'));
        Schema::table('reviews', fn (Blueprint $table) => $table->index(['submitted_at', 'rating'], 'reviews_submitted_rating_index'));
        Schema::table('promotions', fn (Blueprint $table) => $table->index('created_at', 'promotions_created_index'));
        Schema::table('seller_documents', fn (Blueprint $table) => $table->index('submitted_at', 'seller_documents_submitted_index'));
        Schema::table('seller_orders', fn (Blueprint $table) => $table->index(['created_at', 'status'], 'seller_orders_created_status_index'));
    }

    public function down(): void
    {
        Schema::table('seller_orders', fn (Blueprint $table) => $table->dropIndex('seller_orders_created_status_index'));
        Schema::table('seller_documents', fn (Blueprint $table) => $table->dropIndex('seller_documents_submitted_index'));
        Schema::table('promotions', fn (Blueprint $table) => $table->dropIndex('promotions_created_index'));
        Schema::table('reviews', fn (Blueprint $table) => $table->dropIndex('reviews_submitted_rating_index'));
        Schema::table('return_requests', fn (Blueprint $table) => $table->dropIndex('return_requests_requested_index'));
        Schema::table('tracking_events', fn (Blueprint $table) => $table->dropIndex('tracking_events_occurred_index'));
        Schema::table('seller_applications', fn (Blueprint $table) => $table->dropIndex('seller_applications_reviewed_status_index'));
        Schema::table('products', fn (Blueprint $table) => $table->dropIndex('products_created_seller_index'));
        Schema::table('users', fn (Blueprint $table) => $table->dropIndex('users_role_created_index'));
    }
};
