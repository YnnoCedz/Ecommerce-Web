<?php

namespace Tests\Unit;

use App\Services\MediaStorageService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class MediaStorageServiceTest extends TestCase
{
    public function test_it_returns_null_for_null_or_empty_values(): void
    {
        Storage::shouldReceive('disk')->never();

        $service = app(MediaStorageService::class);

        $this->assertNull($service->publicUrl(null));
        $this->assertNull($service->publicUrl(''));
        $this->assertNull($service->publicUrl('   '));
    }

    public function test_it_preserves_already_renderable_urls(): void
    {
        Storage::shouldReceive('disk')->never();

        $service = app(MediaStorageService::class);

        $this->assertSame('https://media.example.test/file.png', $service->publicUrl('https://media.example.test/file.png'));
        $this->assertSame('data:image/png;base64,abc', $service->publicUrl('data:image/png;base64,abc'));
        $this->assertSame('blob:https://marketohub.online/id', $service->publicUrl('blob:https://marketohub.online/id'));
    }

    public function test_it_resolves_laravel_storage_paths_against_the_backend_origin(): void
    {
        config(['app.url' => 'https://maketo-api.onrender.com']);
        Storage::shouldReceive('disk')->never();

        $service = app(MediaStorageService::class);

        $this->assertSame('https://maketo-api.onrender.com/storage/products/file.png', $service->publicUrl('/storage/products/file.png', 'public'));
        $this->assertSame('https://maketo-api.onrender.com/storage/products/file.png', $service->publicUrl('storage/products/file.png', 'public'));
    }

    public function test_it_uses_the_configured_absolute_disk_url(): void
    {
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('url')->once()->with('products/file.png')->andReturn('https://media.example.test/products/file.png');
        $disk->shouldReceive('temporaryUrl')->never();
        Storage::shouldReceive('disk')->once()->with('r2')->andReturn($disk);

        $this->assertSame(
            'https://media.example.test/products/file.png',
            app(MediaStorageService::class)->publicUrl('products/file.png')
        );
    }

    public function test_it_rejects_a_bare_disk_key_and_uses_a_signed_url_fallback(): void
    {
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('url')->once()->with('products/file.png')->andReturn('products/file.png');
        $disk->shouldReceive('temporaryUrl')->once()->with('products/file.png', Mockery::type(\DateTimeInterface::class))->andReturn('https://signed.example.test/products/file.png?token=abc');
        Storage::shouldReceive('disk')->once()->with('r2')->andReturn($disk);

        $this->assertSame(
            'https://signed.example.test/products/file.png?token=abc',
            app(MediaStorageService::class)->publicUrl('products/file.png')
        );
    }

    public function test_it_never_returns_an_unrenderable_storage_key(): void
    {
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('url')->once()->andReturn('products/file.png');
        $disk->shouldReceive('temporaryUrl')->once()->andReturn('products/file.png');
        Storage::shouldReceive('disk')->once()->with('r2')->andReturn($disk);

        $this->assertNull(app(MediaStorageService::class)->publicUrl('products/file.png'));
    }
}
