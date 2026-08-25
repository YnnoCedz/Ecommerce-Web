<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $createTable = function (string $table, Closure $definition): void {
            if (! Schema::hasTable($table)) {
                Schema::create($table, $definition);
            }
        };

        $createTable('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('mobile')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->string('password');
            $table->string('role')->default('buyer');
            $table->string('status')->default('active');
            $table->string('location_label')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        $createTable('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        $createTable('couriers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('service_area')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        $createTable('sellers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('business_name');
            $table->string('trade_name')->nullable();
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('owner_id_number')->nullable();
            $table->string('tin')->nullable();
            $table->string('registration_number')->nullable();
            $table->date('established_on')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('province');
            $table->string('city');
            $table->string('postal_code');
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('public_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('messaging_phone')->nullable();
            $table->string('banner_path')->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('verified')->default(false);
            $table->string('status')->default('pending');
            $table->decimal('response_rate', 5, 2)->default(0);
            $table->string('response_time_label')->nullable();
            $table->unsignedInteger('follower_count')->default(0);
            $table->unsignedInteger('product_count')->default(0);
            $table->unsignedSmallInteger('joined_year')->nullable();
            $table->string('payout_method')->nullable();
            $table->string('payout_schedule')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_name')->nullable();
            $table->string('account_number_last4', 4)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        $createTable('seller_categories', function (Blueprint $table) {
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('status')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->primary(['seller_id', 'category_id'], 'seller_categories_primary');
        });

        $createTable('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('sku')->unique();
            $table->string('barcode')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('sale_price', 12, 2)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->string('status')->default('draft');
            $table->string('delivery_type')->default('both');
            $table->boolean('track_inventory')->default(true);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(0);
            $table->unsignedInteger('weight_grams')->nullable();
            $table->decimal('length_cm', 8, 2)->nullable();
            $table->decimal('width_cm', 8, 2)->nullable();
            $table->decimal('height_cm', 8, 2)->nullable();
            $table->boolean('free_shipping')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        $createTable('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('alt_text')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        $createTable('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name');
            $table->string('sku')->nullable()->unique();
            $table->string('barcode')->nullable();
            $table->decimal('price_override', 12, 2)->nullable();
            $table->decimal('sale_price_override', 12, 2)->nullable();
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        $createTable('variant_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->string('value');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['product_variant_id', 'value'], 'variant_options_unique');
        });

        $createTable('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->string('promo_code')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('shipping_total', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
            $table->timestamp('last_checked_out_at')->nullable();
            $table->timestamps();
        });

        $createTable('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained('carts')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->boolean('saved_for_later')->default(false);
            $table->timestamps();
        });

        $createTable('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('order_number')->unique();
            $table->string('status')->default('pending');
            $table->string('payment_status')->default('pending');
            $table->string('payment_method')->nullable();
            $table->char('currency', 3)->default('PHP');
            $table->string('shipping_name');
            $table->string('shipping_phone');
            $table->string('shipping_line1');
            $table->string('shipping_line2')->nullable();
            $table->string('shipping_city');
            $table->string('shipping_province');
            $table->string('shipping_postal_code');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('shipping_total', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('tax_total', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
            $table->text('buyer_notes')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamps();
        });

        $createTable('seller_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('shipping_fee', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->string('tracking_number')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'seller_id'], 'seller_orders_unique');
        });

        $createTable('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('seller_order_id')->nullable()->constrained('seller_orders')->nullOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('product_name');
            $table->string('product_slug');
            $table->string('variant_name')->nullable();
            $table->string('sku');
            $table->decimal('unit_price', 12, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });

        $createTable('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained('seller_orders')->cascadeOnDelete();
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->string('tracking_number')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('status')->default('pending');
            $table->timestamp('expected_delivery_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('in_transit_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });

        $createTable('tracking_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->string('status');
            $table->string('location')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        $createTable('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('method');
            $table->string('provider')->nullable();
            $table->string('status')->default('pending');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->string('provider_reference')->nullable();
            $table->string('card_brand')->nullable();
            $table->string('card_last4', 4)->nullable();
            $table->string('proof_path')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
        });

        $createTable('conversations', function (Blueprint $table) {
            $table->id();
            $table->string('type')->default('direct');
            $table->string('subject')->nullable();
            $table->string('order_number')->nullable();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('last_message_preview')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->boolean('muted')->default(false);
            $table->boolean('archived')->default(false);
            $table->timestamps();
        });

        $createTable('conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->morphs('participantable', 'cp_participantable');
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamp('last_read_at')->nullable();
            $table->boolean('muted')->default(false);
            $table->boolean('archived')->default(false);
            $table->timestamps();

            $table->unique(
                ['conversation_id', 'participantable_type', 'participantable_id'],
                'conversation_participants_unique'
            );
        });

        $createTable('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->text('body');
            $table->string('status')->default('sent');
            $table->boolean('is_system')->default(false);
            $table->string('order_number')->nullable();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        $createTable('message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('kind')->nullable();
            $table->timestamps();
        });

        $createTable('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('label');
            $table->string('recipient_name');
            $table->string('phone');
            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('city');
            $table->string('province');
            $table->string('postal_code');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        $createTable('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('category');
            $table->string('title');
            $table->text('body');
            $table->string('action_type')->nullable();
            $table->string('action_label')->nullable();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        $createTable('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->string('status')->default('open');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        $createTable('report_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();
        });

        $createTable('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained('order_items')->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('status')->default('pending');
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('not_helpful_count')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('moderated_at')->nullable();
            $table->text('moderation_note')->nullable();
            $table->timestamps();
        });

        $createTable('review_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->unique()->constrained('reviews')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
        });

        $createTable('seller_followers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('followed_at')->nullable();
            $table->timestamps();

            $table->unique(['seller_id', 'user_id'], 'seller_followers_unique');
        });

        $createTable('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('sellers')->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('type');
            $table->decimal('value', 12, 2);
            $table->decimal('min_order', 12, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('status')->default('active');
            $table->string('applies_to_label')->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->boolean('new_customers_only')->default(false);
            $table->timestamps();
        });

        $createTable('wishlist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamp('added_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'product_id'], 'wishlist_items_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_items');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('seller_followers');
        Schema::dropIfExists('review_replies');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('report_attachments');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('message_attachments');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('tracking_events');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('seller_orders');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('variant_options');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
        Schema::dropIfExists('seller_categories');
        Schema::dropIfExists('sellers');
        Schema::dropIfExists('couriers');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('users');
    }
};
