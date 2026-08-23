<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('product_image_storage_disk')->nullable()->after('sku');
            $table->string('product_image_storage_path', 1024)->nullable()->after('product_image_storage_disk');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('order_id')->constrained('products')->nullOnDelete();
            $table->foreignId('seller_order_id')->nullable()->after('product_id')->constrained('seller_orders')->nullOnDelete();
            $table->index(['order_id', 'seller_order_id', 'product_id'], 'conversations_context_index');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('order_id')->constrained('users')->nullOnDelete();
            $table->foreignId('parent_payment_id')->nullable()->after('user_id')->constrained('payments')->nullOnDelete();
            $table->string('type')->default('charge')->after('parent_payment_id');
            $table->decimal('refunded_amount', 12, 2)->default(0)->after('amount');
            $table->json('metadata')->nullable()->after('failure_reason');
            $table->index(['order_id', 'type', 'status'], 'payments_order_type_status_index');
            $table->unique('provider_reference', 'payments_provider_reference_unique');
        });

        Schema::create('order_cancellations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->foreignId('seller_order_id')->unique()->constrained('seller_orders')->restrictOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->restrictOnDelete();
            $table->text('reason');
            $table->decimal('refunded_amount', 12, 2)->default(0);
            $table->timestamp('inventory_restored_at')->nullable();
            $table->timestamp('cancelled_at');
            $table->timestamps();
        });

        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->foreignId('seller_order_id')->constrained('seller_orders')->restrictOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->restrictOnDelete();
            $table->string('status')->default('requested');
            $table->string('reason');
            $table->text('buyer_statement')->nullable();
            $table->text('seller_response')->nullable();
            $table->decimal('requested_amount', 12, 2)->default(0);
            $table->decimal('refunded_amount', 12, 2)->default(0);
            $table->timestamp('requested_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['seller_id', 'status'], 'return_requests_seller_status_index');
            $table->index(['buyer_id', 'status'], 'return_requests_buyer_status_index');
        });

        Schema::create('return_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained('return_requests')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('order_items')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('refund_amount', 12, 2);
            $table->timestamps();
            $table->unique(['return_request_id', 'order_item_id'], 'return_request_items_unique');
        });

        Schema::create('return_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained('return_requests')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('storage_disk')->default('r2');
            $table->string('storage_path', 1024);
            $table->string('original_filename');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();
        });

        Schema::create('disputes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->unique()->constrained('return_requests')->restrictOnDelete();
            $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
            $table->string('status')->default('open');
            $table->string('reason');
            $table->text('buyer_statement')->nullable();
            $table->text('seller_response')->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disputes');
        Schema::dropIfExists('return_evidence');
        Schema::dropIfExists('return_request_items');
        Schema::dropIfExists('return_requests');
        Schema::dropIfExists('order_cancellations');

        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('payments_provider_reference_unique');
            $table->dropIndex('payments_order_type_status_index');
            $table->dropConstrainedForeignId('parent_payment_id');
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['type', 'refunded_amount', 'metadata']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex('conversations_context_index');
            $table->dropConstrainedForeignId('seller_order_id');
            $table->dropConstrainedForeignId('product_id');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['product_image_storage_disk', 'product_image_storage_path']);
        });
    }
};
