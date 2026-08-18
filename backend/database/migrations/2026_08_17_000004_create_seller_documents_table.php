<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_application_id')->nullable()->constrained('seller_applications')->nullOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('sellers')->nullOnDelete();
            $table->string('document_type');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('status')->default('pending');
            $table->boolean('private')->default(true);
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_documents');
    }
};
