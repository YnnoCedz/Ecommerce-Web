<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('notifications', 'dismissed_at')) {
                $table->timestamp('dismissed_at')->nullable()->after('read_at');
            }

            $table->index(['user_id', 'read_at', 'dismissed_at'], 'notifications_user_read_dismissed_index');
            $table->index(['user_id', 'category'], 'notifications_user_category_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_dismissed_index');
            $table->dropIndex('notifications_user_category_index');

            if (Schema::hasColumn('notifications', 'dismissed_at')) {
                $table->dropColumn('dismissed_at');
            }
        });
    }
};
