<?php

namespace Tests\Feature;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerBrandingTest extends TestCase
{
    use RefreshDatabase;

    private function fakePng(string $name): UploadedFile
    {
        $pngBytes = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2lN5sAAAAASUVORK5CYII='
        );

        return UploadedFile::fake()->createWithContent($name, $pngBytes === false ? '' : $pngBytes);
    }

    protected function browserHeaders(): array
    {
        return [
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
            'Origin' => 'http://192.168.1.8:8443',
            'Referer' => 'http://192.168.1.8:8443/seller-center/store',
        ];
    }

    public function test_branding_uploads_persist_logo_banner_and_brand_colors(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $seller = Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved',
            'verified' => true,
            'logo_path' => null,
            'banner_path' => null,
            'brand_colors' => [],
        ]);

        $logo = $this->fakePng('logo.png');
        $banner = $this->fakePng('banner.png');

        $response = $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->patchJson('/api/seller/me', [
                'business_name' => $seller->business_name,
                'trade_name' => $seller->trade_name,
                'brand_colors' => ['#1A3550', '#C94E4E'],
                'logo_file' => $logo,
                'banner_file' => $banner,
            ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Seller profile updated.')
            ->assertJsonPath('data.business_name', $seller->business_name)
            ->assertJsonPath('data.logo_url', fn ($value) => is_string($value) && $value !== '')
            ->assertJsonPath('data.banner_url', fn ($value) => is_string($value) && $value !== '')
            ->assertJsonPath('data.brand_colors.0', '#1A3550')
            ->assertJsonPath('data.brand_colors.1', '#C94E4E');

        $seller->refresh();

        $this->assertNotNull($seller->logo_path);
        $this->assertNotNull($seller->banner_path);
        $this->assertSame(['#1A3550', '#C94E4E'], $seller->brand_colors);
        Storage::disk('r2')->assertExists($seller->logo_path);
        Storage::disk('r2')->assertExists($seller->banner_path);
    }

    public function test_branding_save_can_use_existing_business_name_when_not_resubmitted(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $seller = Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved',
            'verified' => true,
            'business_name' => 'Existing Store Name',
            'logo_path' => null,
            'banner_path' => null,
            'brand_colors' => [],
        ]);

        $response = $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->patchJson('/api/seller/me', [
                'brand_colors' => ['#1A3550'],
                'logo_file' => $this->fakePng('logo.png'),
            ]);

        $response->assertOk()
            ->assertJsonPath('data.business_name', 'Existing Store Name')
            ->assertJsonPath('data.brand_colors.0', '#1A3550');

        $seller->refresh();

        $this->assertSame('Existing Store Name', $seller->business_name);
        $this->assertSame(['#1A3550'], $seller->brand_colors);
        $this->assertNotNull($seller->logo_path);
    }

    public function test_browser_style_multipart_branding_upload_uses_method_spoofing(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $seller = Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved',
            'verified' => true,
            'brand_colors' => [],
        ]);

        $response = $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->post('/api/seller/me', [
                '_method' => 'PATCH',
                'business_name' => $seller->business_name,
                'brand_colors' => json_encode(['#123456']),
                'logo_file' => $this->fakePng('browser-logo.png'),
            ]);

        $response->assertOk()
            ->assertJsonPath('data.brand_colors.0', '#123456');

        $seller->refresh();

        $this->assertNotNull($seller->logo_path);
        Storage::disk('r2')->assertExists($seller->logo_path);
    }
}
