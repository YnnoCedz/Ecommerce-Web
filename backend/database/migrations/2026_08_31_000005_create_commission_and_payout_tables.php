<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commission_rates', function (Blueprint $table) {
            $table->id();
            $table->string('commission_type', 40);
            $table->string('calculation_type', 20)->default('percentage');
            $table->decimal('percentage_rate', 7, 4)->nullable();
            $table->decimal('fixed_amount', 15, 2)->default(0);
            $table->dateTime('effective_from');
            $table->dateTime('effective_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['commission_type', 'is_active', 'effective_from'], 'cr_type_active_effective_idx');
        });

        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->string('payout_number', 40)->unique();
            $table->string('recipient_type', 20);
            $table->unsignedBigInteger('recipient_id');
            $table->date('period_start');
            $table->date('period_end');
            $table->char('currency', 3)->default('PHP');
            $table->decimal('gross_amount', 15, 2)->default(0);
            $table->decimal('commission_amount', 15, 2)->default(0);
            $table->decimal('adjustment_amount', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->string('payment_method', 40)->nullable();
            $table->string('payment_reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('requested_at')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->dateTime('processing_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('failed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['recipient_type', 'recipient_id', 'status'], 'payout_recipient_status_idx');
            $table->index(['period_start', 'period_end']);
        });

        Schema::create('commission_entries', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->string('source_key', 120)->unique();
            $table->string('commission_type', 40);
            $table->string('source_type', 40);
            $table->unsignedBigInteger('source_id');
            $table->string('recipient_type', 20);
            $table->unsignedBigInteger('recipient_id');
            $table->foreignId('rate_id')->nullable()->constrained('commission_rates')->nullOnDelete();
            $table->decimal('gross_amount', 15, 2);
            $table->string('calculation_type', 20);
            $table->decimal('percentage_rate', 7, 4)->nullable();
            $table->decimal('fixed_amount', 15, 2)->default(0);
            $table->decimal('commission_amount', 15, 2);
            $table->decimal('net_amount', 15, 2);
            $table->string('status', 20)->default('pending');
            $table->boolean('commission_taken')->default(false);
            $table->dateTime('taken_at')->nullable();
            $table->foreignId('taken_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('taken_reference', 120)->nullable();
            $table->text('waiver_reason')->nullable();
            $table->foreignId('reversal_of_id')->nullable()->constrained('commission_entries')->nullOnDelete();
            $table->dateTime('reversed_at')->nullable();
            $table->foreignId('payout_id')->nullable()->constrained('payouts')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['recipient_type', 'recipient_id', 'status'], 'ce_recipient_status_idx');
            $table->index(['source_type', 'source_id']);
            $table->index(['commission_type', 'created_at']);
        });

        Schema::create('payout_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_id')->constrained('payouts')->cascadeOnDelete();
            $table->string('source_key', 140)->unique();
            $table->string('source_type', 40);
            $table->unsignedBigInteger('source_id');
            $table->foreignId('commission_entry_id')->nullable()->constrained('commission_entries')->nullOnDelete();
            $table->string('description', 255);
            $table->decimal('gross_amount', 15, 2)->default(0);
            $table->decimal('commission_amount', 15, 2)->default(0);
            $table->decimal('adjustment_amount', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['payout_id', 'source_type']);
        });

        DB::table('commission_rates')->insert([
            ['commission_type' => 'marketplace', 'calculation_type' => 'percentage', 'percentage_rate' => '5.0000', 'fixed_amount' => '0.00', 'effective_from' => '2000-01-01 00:00:00', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['commission_type' => 'courier_delivery', 'calculation_type' => 'percentage', 'percentage_rate' => '80.0000', 'fixed_amount' => '0.00', 'effective_from' => '2000-01-01 00:00:00', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_items');
        Schema::dropIfExists('commission_entries');
        Schema::dropIfExists('payouts');
        Schema::dropIfExists('commission_rates');
    }
};
