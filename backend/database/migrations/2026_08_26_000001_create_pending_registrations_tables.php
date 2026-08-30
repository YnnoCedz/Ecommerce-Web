<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pending_registrations')) {
            Schema::create('pending_registrations', function (Blueprint $table) {
                $table->id();
                $table->string('first_name');
                $table->string('last_name');
                $table->string('name');
                $table->string('email')->unique();
                $table->string('mobile')->unique();
                $table->string('phone')->unique();
                $table->string('password');
                $table->timestamp('expires_at')->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('pending_registration_challenges')) {
            Schema::create('pending_registration_challenges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pending_registration_id')->constrained()->cascadeOnDelete();
                $table->string('code_hash');
                $table->unsignedSmallInteger('attempts')->default(0);
                $table->unsignedSmallInteger('max_attempts')->default(5);
                $table->timestamp('expires_at');
                $table->timestamp('resend_available_at')->nullable();
                $table->timestamp('consumed_at')->nullable();
                $table->string('sent_to')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
                $table->index(['pending_registration_id', 'expires_at'], 'prc_pending_expires_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_registration_challenges');
        Schema::dropIfExists('pending_registrations');
    }
};
