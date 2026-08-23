<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->string('target_type')->nullable()->after('reporter_user_id');
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
            $table->string('target_name')->nullable()->after('target_id');
            $table->string('severity')->default('medium')->after('details');
            $table->text('moderation_notes')->nullable()->after('status');
            $table->foreignId('resolved_by')->nullable()->after('moderation_notes')->constrained('users')->nullOnDelete();
            $table->index(['target_type', 'target_id'], 'reports_target_index');
            $table->index(['status', 'severity'], 'reports_status_severity_index');
        });

        Schema::table('disputes', function (Blueprint $table) {
            $table->string('resolution_type')->nullable()->after('seller_response');
            $table->text('resolution_notes')->nullable()->after('resolution_note');
            $table->foreignId('resolved_by')->nullable()->after('resolution_notes')->constrained('users')->nullOnDelete();
            $table->decimal('refund_amount', 12, 2)->default(0)->after('resolved_by');
            $table->index(['status', 'opened_at'], 'disputes_status_opened_index');
        });
    }

    public function down(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            $table->dropIndex('disputes_status_opened_index');
            $table->dropConstrainedForeignId('resolved_by');
            $table->dropColumn(['resolution_type', 'resolution_notes', 'refund_amount']);
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex('reports_target_index');
            $table->dropIndex('reports_status_severity_index');
            $table->dropConstrainedForeignId('resolved_by');
            $table->dropColumn(['target_type', 'target_id', 'target_name', 'severity', 'moderation_notes']);
        });
    }
};
