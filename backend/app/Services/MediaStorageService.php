<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MediaStorageService
{
    public function storePublicFile(UploadedFile $file, string $prefix, ?string $disk = 'r2'): array
    {
        return $this->storeFile($file, $prefix, 'public', $disk);
    }

    public function storePrivateFile(UploadedFile $file, string $prefix, ?string $disk = 'r2'): array
    {
        return $this->storeFile($file, $prefix, 'private', $disk);
    }

    public function delete(string $path, ?string $disk = 'r2'): bool
    {
        return Storage::disk($disk)->delete($path);
    }

    public function temporaryUrl(string $path, int $minutes = 10, ?string $disk = 'r2'): string
    {
        try {
            return Storage::disk($disk)->temporaryUrl($path, now()->addMinutes($minutes));
        } catch (\Throwable $e) {
            throw new RuntimeException('Unable to generate a temporary URL for the requested file.');
        }
    }

    public function publicUrl(?string $path, ?string $disk = 'r2'): ?string
    {
        $path = trim((string) $path);

        if ($path === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://', 'data:', 'blob:'])) {
            return $path;
        }

        if (Str::startsWith($path, ['/storage/', 'storage/'])) {
            return rtrim((string) config('app.url'), '/').'/'.ltrim($path, '/');
        }

        try {
            $diskInstance = Storage::disk($disk);
            $url = method_exists($diskInstance, 'url') ? $diskInstance->url($path) : null;

            if ($this->isAbsoluteWebUrl($url)) {
                return $url;
            }

            $temporaryUrl = method_exists($diskInstance, 'temporaryUrl')
                ? $diskInstance->temporaryUrl($path, now()->addHours(12))
                : null;

            return $this->isAbsoluteWebUrl($temporaryUrl) ? $temporaryUrl : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function isAbsoluteWebUrl(mixed $value): bool
    {
        return is_string($value)
            && filter_var($value, FILTER_VALIDATE_URL) !== false
            && Str::startsWith($value, ['http://', 'https://']);
    }

    public function snapshotPublicFile(string $sourcePath, string $prefix, ?string $disk = 'r2'): ?array
    {
        if ($sourcePath === '' || Str::startsWith($sourcePath, ['http://', 'https://', 'data:'])) {
            return null;
        }

        $storage = Storage::disk($disk);
        if (! $storage->exists($sourcePath)) {
            return null;
        }

        $extension = pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'bin';
        $snapshotPath = trim($prefix, '/').'/'.Str::uuid().'.'.$extension;
        if (! $storage->copy($sourcePath, $snapshotPath)) {
            throw new RuntimeException('Unable to create the historical order image snapshot.');
        }

        return ['storage_disk' => $disk, 'storage_path' => $snapshotPath];
    }

    public function testConnection(string $prefix = 'maketo-system-test'): array
    {
        $this->assertR2Configured();

        $key = $prefix.'/r2-connection-test.txt';
        $payload = 'Maketo R2 connection test at '.now()->toDateTimeString();

        $disk = Storage::disk('r2');
        $disk->put($key, $payload);

        if (! $disk->exists($key)) {
            throw new RuntimeException('R2 write check failed: object was not found after upload.');
        }

        $contents = (string) $disk->get($key);

        if ($contents !== $payload) {
            throw new RuntimeException('R2 read check failed: downloaded content did not match the uploaded payload.');
        }

        $deleted = $disk->delete($key);

        if (! $deleted || $disk->exists($key)) {
            throw new RuntimeException('R2 delete check failed: object still exists after delete.');
        }

        return [
            'key' => $key,
            'payload' => $payload,
            'verified' => true,
        ];
    }

    private function storeFile(UploadedFile $file, string $prefix, string $visibility, ?string $disk): array
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $safePrefix = trim($prefix, '/');
        $fileName = Str::uuid()->toString().'.'.$extension;
        $path = $safePrefix === '' ? $fileName : $safePrefix.'/'.$fileName;

        $storedPath = Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path), [
            'visibility' => $visibility,
        ]);

        if (! is_string($storedPath) || $storedPath === '') {
            throw new RuntimeException('Unable to store the uploaded file.');
        }

        return [
            'storage_disk' => $disk,
            'storage_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'extension' => $extension,
            'visibility' => $visibility,
            'url' => $visibility === 'public' ? $this->publicUrl($path, $disk) : null,
        ];
    }

    private function assertR2Configured(): void
    {
        $missing = [];

        foreach ([
            'key' => config('filesystems.disks.r2.key'),
            'secret' => config('filesystems.disks.r2.secret'),
            'bucket' => config('filesystems.disks.r2.bucket'),
            'endpoint' => config('filesystems.disks.r2.endpoint'),
        ] as $label => $value) {
            if (! is_string($value) || trim($value) === '') {
                $missing[] = strtoupper($label);
            }
        }

        if ($missing !== []) {
            throw new RuntimeException(
                'R2 is not configured. Set the following environment variables in backend/.env: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT.'
            );
        }
    }
}
