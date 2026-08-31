<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_documents', function (Blueprint $table) {
            $table->foreignId('renewal_of_document_id')->nullable()->after('seller_id')->constrained('seller_documents')->nullOnDelete();
            $table->date('expires_at')->nullable()->after('uploaded_at');
            $table->timestamp('submitted_at')->nullable()->after('expires_at');
            $table->timestamp('reviewed_at')->nullable()->after('submitted_at');
            $table->timestamp('approved_at')->nullable()->after('reviewed_at');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->text('review_notes')->nullable()->after('rejected_at');

            $table->index(['seller_id', 'status', 'expires_at'], 'seller_documents_renewal_lookup');
        });
    }

    public function down(): void
    {
        Schema::table('seller_documents', function (Blueprint $table) {
            $table->dropIndex('seller_documents_renewal_lookup');
            $table->dropConstrainedForeignId('renewal_of_document_id');
            $table->dropColumn(['expires_at', 'submitted_at', 'reviewed_at', 'approved_at', 'rejected_at', 'review_notes']);
        });
    }
};
