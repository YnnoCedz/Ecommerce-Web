<?php

namespace Tests\Feature;

use App\Services\MediaStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class R2StorageTest extends TestCase
{
    public function test_r2_disk_configuration_is_present(): void
    {
        $this->assertSame('s3', config('filesystems.disks.r2.driver'));
        $this->assertArrayHasKey('endpoint', config('filesystems.disks.r2'));
        $this->assertArrayHasKey('bucket', config('filesystems.disks.r2'));
    }

    public function test_media_storage_service_writes_and_deletes_files_with_safe_paths(): void
    {
        Storage::fake('r2');

        $file = UploadedFile::fake()->createWithContent(
            'owner-id-card.pdf',
            str_repeat('Maketo R2 storage test.', 64)
        );

        $result = app(MediaStorageService::class)->storePrivateFile($file, 'seller-documents/42/owner-id');

        $this->assertSame('r2', $result['storage_disk']);
        $this->assertSame('private', $result['visibility']);
        $this->assertStringStartsWith('seller-documents/42/owner-id/', $result['storage_path']);
        $this->assertSame('owner-id-card.pdf', $result['original_filename']);
        $this->assertTrue(Storage::disk('r2')->exists($result['storage_path']));

        $deleted = app(MediaStorageService::class)->delete($result['storage_path']);

        $this->assertTrue($deleted);
        $this->assertFalse(Storage::disk('r2')->exists($result['storage_path']));
    }
}
