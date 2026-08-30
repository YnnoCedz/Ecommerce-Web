<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tracking_events', function (Blueprint $table) {
            $table->string('actor_type', 40)->nullable()->after('note');
            $table->foreignId('actor_user_id')->nullable()->after('actor_type')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tracking_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actor_user_id');
            $table->dropColumn('actor_type');
        });
    }
};
