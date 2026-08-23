<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('language')->default('en-PH');
            $table->char('currency', 3)->default('PHP');
            $table->string('number_format')->default('1,000.00');
            $table->boolean('recommendations_enabled')->default(true);
            $table->boolean('recently_viewed_enabled')->default(true);
            $table->boolean('price_drop_alerts_enabled')->default(true);
            $table->boolean('analytics_cookies_enabled')->default(true);
            $table->boolean('marketing_cookies_enabled')->default(false);
            $table->timestamps();
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->unique('order_item_id', 'reviews_order_item_unique');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->index(['conversation_id', 'sent_at'], 'messages_conversation_sent_index');
            $table->index(['senderable_type', 'senderable_id'], 'messages_senderable_index');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_conversation_sent_index');
            $table->dropIndex('messages_senderable_index');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique('reviews_order_item_unique');
        });

        Schema::dropIfExists('user_preferences');
    }
};
