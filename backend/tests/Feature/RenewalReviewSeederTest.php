<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerDocument;
use Database\Seeders\RenewalReviewSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RenewalReviewSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_idempotently_creates_image_backed_renewal_review_data(): void
    {
        Storage::fake('r2');

        $this->seed(RenewalReviewSeeder::class);
        $this->seed(RenewalReviewSeeder::class);

        $this->assertSame(2, Seller::where('slug', 'like', 'renewal-%')->count());
        $this->assertSame(4, Product::where('slug', 'like', 'renewal-%')->count());
        $this->assertSame(2, SellerDocument::whereNotNull('renewal_of_document_id')->where('status', 'pending')->count());

        $document = SellerDocument::whereNotNull('renewal_of_document_id')->firstOrFail();
        Storage::disk('r2')->assertExists($document->file_path);
        $this->assertSame('image/png', $document->mime_type);
        $this->assertNotNull($document->seller);
        $this->assertNotNull($document->renewedDocument);
    }
}
