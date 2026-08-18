<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            if (! Schema::hasColumn('product_images', 'storage_disk')) {
                $table->string('storage_disk')->default('r2')->after('product_id');
            }

            if (! Schema::hasColumn('product_images', 'original_filename')) {
                $table->string('original_filename')->nullable()->after('file_path');
            }

            if (! Schema::hasColumn('product_images', 'mime_type')) {
                $table->string('mime_type')->nullable()->after('original_filename');
            }

            if (! Schema::hasColumn('product_images', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable()->after('mime_type');
            }

            if (! Schema::hasColumn('product_images', 'visibility')) {
                $table->string('visibility')->default('public')->after('file_size');
            }
        });

        Schema::table('seller_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('seller_documents', 'storage_disk')) {
                $table->string('storage_disk')->default('r2')->after('document_type');
            }

            if (! Schema::hasColumn('seller_documents', 'original_filename')) {
                $table->string('original_filename')->nullable()->after('file_path');
            }

            if (! Schema::hasColumn('seller_documents', 'visibility')) {
                $table->string('visibility')->default('private')->after('private');
            }
        });

        Schema::table('message_attachments', function (Blueprint $table) {
            if (! Schema::hasColumn('message_attachments', 'storage_disk')) {
                $table->string('storage_disk')->default('r2')->after('message_id');
            }

            if (! Schema::hasColumn('message_attachments', 'original_filename')) {
                $table->string('original_filename')->nullable()->after('file_path');
            }

            if (! Schema::hasColumn('message_attachments', 'visibility')) {
                $table->string('visibility')->default('private')->after('kind');
            }
        });

        Schema::table('report_attachments', function (Blueprint $table) {
            if (! Schema::hasColumn('report_attachments', 'storage_disk')) {
                $table->string('storage_disk')->default('r2')->after('report_id');
            }

            if (! Schema::hasColumn('report_attachments', 'original_filename')) {
                $table->string('original_filename')->nullable()->after('file_path');
            }

            if (! Schema::hasColumn('report_attachments', 'visibility')) {
                $table->string('visibility')->default('private')->after('file_size');
            }
        });
    }

    public function down(): void
    {
        Schema::table('report_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('report_attachments', 'visibility')) {
                $table->dropColumn('visibility');
            }

            if (Schema::hasColumn('report_attachments', 'original_filename')) {
                $table->dropColumn('original_filename');
            }

            if (Schema::hasColumn('report_attachments', 'storage_disk')) {
                $table->dropColumn('storage_disk');
            }
        });

        Schema::table('message_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('message_attachments', 'visibility')) {
                $table->dropColumn('visibility');
            }

            if (Schema::hasColumn('message_attachments', 'original_filename')) {
                $table->dropColumn('original_filename');
            }

            if (Schema::hasColumn('message_attachments', 'storage_disk')) {
                $table->dropColumn('storage_disk');
            }
        });

        Schema::table('seller_documents', function (Blueprint $table) {
            if (Schema::hasColumn('seller_documents', 'visibility')) {
                $table->dropColumn('visibility');
            }

            if (Schema::hasColumn('seller_documents', 'original_filename')) {
                $table->dropColumn('original_filename');
            }

            if (Schema::hasColumn('seller_documents', 'storage_disk')) {
                $table->dropColumn('storage_disk');
            }
        });

        Schema::table('product_images', function (Blueprint $table) {
            if (Schema::hasColumn('product_images', 'visibility')) {
                $table->dropColumn('visibility');
            }

            if (Schema::hasColumn('product_images', 'file_size')) {
                $table->dropColumn('file_size');
            }

            if (Schema::hasColumn('product_images', 'mime_type')) {
                $table->dropColumn('mime_type');
            }

            if (Schema::hasColumn('product_images', 'original_filename')) {
                $table->dropColumn('original_filename');
            }

            if (Schema::hasColumn('product_images', 'storage_disk')) {
                $table->dropColumn('storage_disk');
            }
        });
    }
};
