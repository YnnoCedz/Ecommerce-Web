<?php

namespace Tests\Feature;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
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

    public function test_branding_uploads_persist_logo_and_banner_without_exposing_brand_colors(): void
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
        ]);

        $logo = $this->fakePng('logo.png');
        $banner = $this->fakePng('banner.png');

        $response = $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->patchJson('/api/seller/me', [
                'business_name' => $seller->business_name,
                'trade_name' => $seller->trade_name,
                'logo_file' => $logo,
                'banner_file' => $banner,
            ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Seller profile updated.')
            ->assertJsonPath('data.business_name', $seller->business_name)
            ->assertJsonPath('data.logo_url', fn ($value) => is_string($value) && $value !== '')
            ->assertJsonPath('data.banner_url', fn ($value) => is_string($value) && $value !== '')
            ->assertJsonMissingPath('data.brand_colors');

        $seller->refresh();

        $this->assertNotNull($seller->logo_path);
        $this->assertNotNull($seller->banner_path);
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
        ]);

        $response = $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->patchJson('/api/seller/me', [
                'logo_file' => $this->fakePng('logo.png'),
            ]);

        $response->assertOk()
            ->assertJsonPath('data.business_name', 'Existing Store Name')
            ->assertJsonMissingPath('data.brand_colors');

        $seller->refresh();

        $this->assertSame('Existing Store Name', $seller->business_name);
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
        ]);

        $response = $this->actingAs($user)
            ->withHeaders($this->browserHeaders())
            ->post('/api/seller/me', [
                '_method' => 'PATCH',
                'business_name' => $seller->business_name,
                'logo_file' => $this->fakePng('browser-logo.png'),
            ]);

        $response->assertOk()
            ->assertJsonMissingPath('data.brand_colors');

        $seller->refresh();

        $this->assertNotNull($seller->logo_path);
        Storage::disk('r2')->assertExists($seller->logo_path);
    }

    public function test_store_profile_persists_a_canonical_structured_business_location(): void
    {
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '0400000000', 'name' => 'Region IV-A (CALABARZON)']]]),
            '*/regions/0400000000/provinces' => Http::response(['data' => [['code' => '0403400000', 'name' => 'Laguna']]]),
            '*/provinces/0403400000/cities-municipalities' => Http::response(['data' => [['code' => '0403424000', 'name' => 'Santa Cruz', 'zip_code' => '4009']]]),
            '*/cities-municipalities/0403424000/barangays' => Http::response(['data' => [['code' => '0403424001', 'name' => 'Barangay One', 'zip_code' => '4009']]]),
        ]);

        $user = User::factory()->create(['role' => 'seller', 'status' => 'active', 'email_verified_at' => now()]);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'approved', 'verified' => true]);

        $this->actingAs($user)->patchJson('/api/seller/me', [
            'business_name' => $seller->business_name,
            'region_code' => '0400000000',
            'province_code' => '0403400000',
            'city_code' => '0403424000',
            'barangay_code' => '0403424001',
            'postal_code' => '4009',
        ])->assertOk()
            ->assertJsonPath('data.region', 'Region IV-A (CALABARZON)')
            ->assertJsonPath('data.province', 'Laguna')
            ->assertJsonPath('data.city', 'Santa Cruz')
            ->assertJsonPath('data.postal_code', '4009')
            ->assertJsonMissingPath('data.brand_colors');

        $this->assertDatabaseHas('sellers', [
            'id' => $seller->id,
            'region_code' => '0400000000',
            'province_code' => '0403400000',
            'city_code' => '0403424000',
            'barangay_code' => '0403424001',
            'postal_code' => '4009',
        ]);
    }
}
