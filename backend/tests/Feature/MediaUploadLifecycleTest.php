<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaUploadLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_upload_is_stored_and_serialized_as_an_absolute_media_url(): void
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
        $category = Category::factory()->create(['active' => true]);

        $response = $this->actingAs($user)->post('/api/seller/products', [
            'name' => 'Media lifecycle product',
            'description' => 'Verifies upload, persistence, API serialization, and browser-ready URL output.',
            'category_id' => $category->id,
            'tags' => '[]',
            'sku' => 'MEDIA-LIFECYCLE-1',
            'price' => 1299,
            'status' => 'active',
            'delivery_type' => 'both',
            'track_inventory' => '1',
            'stock_quantity' => 5,
            'low_stock_threshold' => 1,
            'free_shipping' => '0',
            'variants' => '[]',
            'images' => [$this->fakePng('product.png')],
        ], ['Accept' => 'application/json']);

        $response->assertCreated();

        $product = Product::query()
            ->with('images')
            ->where('seller_id', $seller->id)
            ->where('sku', 'MEDIA-LIFECYCLE-1')
            ->firstOrFail();
        $image = $product->images->firstOrFail();

        $this->assertSame('r2', $image->storage_disk);
        $this->assertStringStartsWith("products/{$product->id}/", $image->file_path);
        Storage::disk('r2')->assertExists($image->file_path);
        $this->assertMatchesRegularExpression('#^https?://#', (string) $response->json('data.image'));

        $this->getJson("/api/products/{$product->slug}")
            ->assertOk()
            ->assertJsonPath('data.image', fn ($value) => is_string($value) && preg_match('#^https?://#', $value) === 1)
            ->assertJsonPath('data.images.0.url', fn ($value) => is_string($value) && preg_match('#^https?://#', $value) === 1);
    }

    private function fakePng(string $name): UploadedFile
    {
        $bytes = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2lN5sAAAAASUVORK5CYII='
        );

        return UploadedFile::fake()->createWithContent($name, $bytes === false ? '' : $bytes);
    }
}
