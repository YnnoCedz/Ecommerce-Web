<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('mobile')->nullable()->index();
            $table->string('password');
            $table->enum('role', ['buyer', 'seller', 'admin', 'courier', 'support'])->default('buyer')->index();
            $table->enum('status', ['active', 'suspended', 'banned', 'pending'])->default('active')->index();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('last_active_at')->nullable()->index();
            $table->unsignedInteger('flags_count')->default(0);
            $table->string('location_label')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon', 32)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('sellers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('business_name');
            $table->string('trade_name')->nullable();
            $table->string('slug')->unique();
            $table->string('tagline', 160)->nullable();
            $table->text('description')->nullable();
            $table->string('owner_id_number')->nullable();
            $table->string('tin')->nullable()->index();
            $table->string('registration_number')->nullable()->index();
            $table->date('established_on')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('province');
            $table->string('city');
            $table->string('postal_code', 20);
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable()->index();
            $table->string('public_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('messaging_phone')->nullable();
            $table->string('banner_path')->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('verified')->default(false)->index();
            $table->enum('status', ['pending', 'approved', 'rejected', 'active', 'suspended'])->default('pending')->index();
            $table->unsignedDecimal('response_rate', 5, 2)->default(0);
            $table->string('response_time_label')->nullable();
            $table->unsignedInteger('follower_count')->default(0);
            $table->unsignedInteger('product_count')->default(0);
            $table->unsignedSmallInteger('joined_year')->nullable();
            $table->string('payout_method')->nullable();
            $table->string('payout_schedule')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_name')->nullable();
            $table->string('account_number_last4', 4)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('seller_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('approved')->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['seller_id', 'category_id']);
        });

        Schema::create('seller_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained()->cascadeOnDelete();
            $table->enum('document_type', ['government_id', 'business_document', 'seller_certificate'])->index();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('file_size');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->boolean('private')->default(true);
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('seller_followers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('followed_at')->nullable();
            $table->timestamps();
            $table->unique(['seller_id', 'user_id']);
        });

        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('service_area')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('sku')->unique();
            $table->string('barcode')->nullable()->index();
            $table->unsignedDecimal('price', 12, 2);
            $table->unsignedDecimal('sale_price', 12, 2)->nullable();
            $table->unsignedDecimal('cost_price', 12, 2)->nullable();
            $table->enum('status', ['draft', 'active', 'archived', 'out-of-stock'])->default('draft')->index();
            $table->enum('delivery_type', ['standard', 'express', 'both', 'pickup-only'])->default('standard')->index();
            $table->boolean('track_inventory')->default(true);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(0);
            $table->unsignedInteger('weight_grams')->nullable();
            $table->unsignedInteger('length_cm')->nullable();
            $table->unsignedInteger('width_cm')->nullable();
            $table->unsignedInteger('height_cm')->nullable();
            $table->boolean('free_shipping')->default(false)->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('alt_text')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0)->index();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('sku')->unique();
            $table->string('barcode')->nullable()->index();
            $table->unsignedDecimal('price_override', 12, 2)->nullable();
            $table->unsignedDecimal('sale_price_override', 12, 2)->nullable();
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(0);
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('variant_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->string('value');
            $table->unsignedSmallInteger('sort_order')->default(0)->index();
            $table->timestamps();
            $table->unique(['product_variant_id', 'value']);
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['active', 'converted', 'abandoned'])->default('active')->index();
            $table->string('promo_code')->nullable()->index();
            $table->unsignedDecimal('subtotal', 12, 2)->default(0);
            $table->unsignedDecimal('shipping_total', 12, 2)->default(0);
            $table->unsignedDecimal('discount_total', 12, 2)->default(0);
            $table->unsignedDecimal('grand_total', 12, 2)->default(0);
            $table->timestamp('last_checked_out_at')->nullable();
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedDecimal('unit_price', 12, 2);
            $table->unsignedDecimal('line_total', 12, 2);
            $table->boolean('saved_for_later')->default(false)->index();
            $table->timestamps();
            $table->unique(['cart_id', 'product_variant_id', 'saved_for_later']);
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('recipient_name');
            $table->string('phone');
            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('city');
            $table->string('province');
            $table->string('postal_code', 20);
            $table->boolean('is_default')->default(false)->index();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('wishlist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamp('added_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->restrictOnDelete();
            $table->string('order_number')->unique();
            $table->enum('status', ['pending', 'confirmed', 'processing', 'ready', 'picked-up', 'in-transit', 'delivered', 'completed', 'cancelled', 'failed', 'refunded'])->default('pending')->index();
            $table->enum('payment_status', ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'])->default('pending')->index();
            $table->string('payment_method')->nullable()->index();
            $table->string('currency', 3)->default('PHP');
            $table->string('shipping_name');
            $table->string('shipping_phone');
            $table->string('shipping_line1');
            $table->string('shipping_line2')->nullable();
            $table->string('shipping_city');
            $table->string('shipping_province');
            $table->string('shipping_postal_code', 20);
            $table->unsignedDecimal('subtotal', 12, 2)->default(0);
            $table->unsignedDecimal('shipping_total', 12, 2)->default(0);
            $table->unsignedDecimal('discount_total', 12, 2)->default(0);
            $table->unsignedDecimal('tax_total', 12, 2)->default(0);
            $table->unsignedDecimal('grand_total', 12, 2)->default(0);
            $table->text('buyer_notes')->nullable();
            $table->timestamp('placed_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('seller_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['new', 'confirmed', 'preparing', 'ready', 'picked-up', 'in-transit', 'delivered', 'completed', 'cancelled', 'failed'])->default('new')->index();
            $table->unsignedDecimal('subtotal', 12, 2)->default(0);
            $table->unsignedDecimal('shipping_fee', 12, 2)->default(0);
            $table->unsignedDecimal('discount_total', 12, 2)->default(0);
            $table->unsignedDecimal('grand_total', 12, 2)->default(0);
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->string('tracking_number')->nullable()->index();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'seller_id']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->string('product_name');
            $table->string('product_slug');
            $table->string('variant_name')->nullable();
            $table->string('sku');
            $table->unsignedDecimal('unit_price', 12, 2);
            $table->unsignedInteger('quantity');
            $table->unsignedDecimal('subtotal', 12, 2);
            $table->timestamps();
            $table->unique(['order_id', 'seller_order_id', 'product_variant_id']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('method', ['card', 'gcash', 'maya', 'cod', 'bank'])->index();
            $table->string('provider')->nullable();
            $table->enum('status', ['idle', 'processing', 'success', 'failed', 'refunded'])->default('idle')->index();
            $table->unsignedDecimal('amount', 12, 2);
            $table->string('currency', 3)->default('PHP');
            $table->string('provider_reference')->nullable()->index();
            $table->string('card_brand')->nullable();
            $table->string('card_last4', 4)->nullable();
            $table->string('proof_path')->nullable();
            $table->timestamp('paid_at')->nullable()->index();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->string('tracking_number')->nullable()->index();
            $table->string('driver_name')->nullable();
            $table->enum('status', ['pending', 'picked-up', 'in-transit', 'delivered', 'completed', 'failed'])->default('pending')->index();
            $table->timestamp('expected_delivery_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('in_transit_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('tracking_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'failed', 'returned'])->index();
            $table->string('location')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['buyer-seller', 'buyer-courier', 'seller-courier'])->index();
            $table->string('subject')->nullable();
            $table->string('order_number')->nullable()->index();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('last_message_preview')->nullable();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->unsignedInteger('unread_count')->default(0);
            $table->boolean('muted')->default(false)->index();
            $table->boolean('archived')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->morphs('participantable');
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamp('last_read_at')->nullable();
            $table->boolean('muted')->default(false);
            $table->boolean('archived')->default(false);
            $table->timestamps();
            $table->unique(['conversation_id', 'participantable_type', 'participantable_id'], 'conversation_participant_unique');
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->morphs('senderable');
            $table->longText('body')->nullable();
            $table->enum('status', ['sending', 'sent', 'delivered', 'read'])->default('sent')->index();
            $table->boolean('is_system')->default(false)->index();
            $table->string('order_number')->nullable()->index();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('sent_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('file_size');
            $table->enum('kind', ['image', 'file'])->default('file')->index();
            $table->timestamps();
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_item_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('title', 120);
            $table->text('body');
            $table->enum('status', ['published', 'pending', 'rejected'])->default('pending')->index();
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('not_helpful_count')->default(0);
            $table->timestamp('submitted_at')->nullable()->index();
            $table->timestamp('moderated_at')->nullable();
            $table->text('moderation_note')->nullable();
            $table->timestamps();
        });

        Schema::create('review_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_user_id')->constrained('users')->restrictOnDelete();
            $table->morphs('targetable');
            $table->string('reason');
            $table->text('details')->nullable();
            $table->enum('status', ['open', 'under_review', 'resolved', 'dismissed'])->default('open')->index();
            $table->timestamp('submitted_at')->nullable()->index();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('report_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('file_size');
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('category', ['orders', 'delivery', 'messages', 'account', 'promotions', 'system'])->index();
            $table->string('title');
            $table->text('body');
            $table->string('action_type')->nullable();
            $table->string('action_label')->nullable();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->enum('type', ['percentage', 'fixed', 'free-shipping'])->index();
            $table->unsignedDecimal('value', 12, 2)->default(0);
            $table->unsignedDecimal('min_order', 12, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('ends_at')->nullable()->index();
            $table->enum('status', ['active', 'scheduled', 'expired', 'draft'])->default('draft')->index();
            $table->string('applies_to_label')->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->boolean('new_customers_only')->default(false);
            $table->timestamps();
            $table->unique(['seller_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        foreach ([
            'promotions',
            'notifications',
            'report_attachments',
            'reports',
            'review_replies',
            'reviews',
            'message_attachments',
            'messages',
            'conversation_participants',
            'conversations',
            'tracking_events',
            'shipments',
            'payments',
            'order_items',
            'seller_orders',
            'orders',
            'wishlist_items',
            'addresses',
            'cart_items',
            'carts',
            'variant_options',
            'product_variants',
            'product_images',
            'products',
            'couriers',
            'seller_followers',
            'seller_documents',
            'seller_categories',
            'sellers',
            'categories',
            'users',
        ] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::enableForeignKeyConstraints();
    }
};

