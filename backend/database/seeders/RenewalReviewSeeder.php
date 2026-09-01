<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Seller;
use App\Models\SellerDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RenewalReviewSeeder extends Seeder
{
    public function run(): void
    {
        $category = Category::firstOrCreate(
            ['slug' => 'renewal-review-goods'],
            ['name' => 'Renewal Review Goods', 'icon' => '*', 'active' => true, 'sort_order' => 90]
        );

        $fixtures = [
            [
                'email' => 'renewal.botanica@example.test',
                'mobile' => '+639190001101',
                'name' => 'Botanica Niño Trading',
                'slug' => 'renewal-botanica-nino',
                'city' => 'Las Piñas City',
                'logo' => 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=85',
                'banner' => 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1600&q=85',
                'expires' => now()->addDays(8)->toDateString(),
                'color' => [33, 110, 82],
                'products' => [
                    ['name' => 'Niño Botanical Renewal Kit', 'slug' => 'renewal-nino-botanical-kit', 'sku' => 'RR-BOT-001', 'price' => 1290, 'image' => 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=1000&q=85'],
                    ['name' => 'Calming Facial Oil', 'slug' => 'renewal-calming-facial-oil', 'sku' => 'RR-BOT-002', 'price' => 780, 'image' => 'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&w=1000&q=85'],
                ],
            ],
            [
                'email' => 'renewal.habitat@example.test',
                'mobile' => '+639190001102',
                'name' => 'Habitat Home Studio',
                'slug' => 'renewal-habitat-home',
                'city' => 'Makati City',
                'logo' => 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=85',
                'banner' => 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=85',
                'expires' => now()->subDays(3)->toDateString(),
                'color' => [174, 103, 54],
                'products' => [
                    ['name' => 'Handwoven Accent Basket', 'slug' => 'renewal-handwoven-accent-basket', 'sku' => 'RR-HAB-001', 'price' => 950, 'image' => 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1000&q=85'],
                    ['name' => 'Artisan Stoneware Vase', 'slug' => 'renewal-artisan-stoneware-vase', 'sku' => 'RR-HAB-002', 'price' => 1680, 'image' => 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85'],
                ],
            ],
        ];

        foreach ($fixtures as $index => $fixture) {
            $user = User::firstOrCreate(['email' => $fixture['email']], [
                'first_name' => $index === 0 ? 'Elena' : 'Marco',
                'last_name' => $index === 0 ? 'Peña' : 'Reyes',
                'name' => $index === 0 ? 'Elena Peña' : 'Marco Reyes',
                'mobile' => $fixture['mobile'],
                'phone' => $fixture['mobile'],
                'password' => Hash::make(Str::random(48)),
                'role' => 'seller',
                'status' => 'active',
                'location_label' => $fixture['city'],
                'email_verified_at' => now(),
                'two_factor_enabled' => false,
            ]);

            $seller = Seller::updateOrCreate(['slug' => $fixture['slug']], [
                'user_id' => $user->id,
                'business_name' => $fixture['name'],
                'trade_name' => $fixture['name'],
                'tagline' => 'Renewal review demonstration store',
                'description' => 'A complete seller fixture with product imagery and a private document renewal for administrator review.',
                'owner_id_number' => 'RR-OWNER-'.($index + 1),
                'tin' => '900-000-00'.($index + 1).'-000',
                'registration_number' => 'BN-2024-RR'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'established_on' => '2021-01-15',
                'address_line1' => (101 + $index).' Review Avenue',
                'region' => 'National Capital Region (NCR)',
                'region_code' => '1300000000',
                'province' => 'Metro Manila',
                'city' => $fixture['city'],
                'postal_code' => $index === 0 ? '1740' : '1200',
                'contact_name' => $user->name,
                'contact_email' => $user->email,
                'contact_phone' => $fixture['mobile'],
                'logo_path' => $fixture['logo'],
                'banner_path' => $fixture['banner'],
                'verified' => true,
                'status' => 'approved',
                'response_rate' => 98,
                'response_time_label' => 'within 1 hour',
                'joined_year' => 2021,
            ]);

            $seller->categories()->syncWithoutDetaching([$category->id]);

            foreach ($fixture['products'] as $productFixture) {
                $product = Product::updateOrCreate(['slug' => $productFixture['slug']], [
                    'seller_id' => $seller->id,
                    'category_id' => $category->id,
                    'name' => $productFixture['name'],
                    'description' => 'Image-backed catalog item for renewal review and storefront verification.',
                    'sku' => $productFixture['sku'],
                    'price' => $productFixture['price'],
                    'status' => 'active',
                    'delivery_type' => 'both',
                    'track_inventory' => true,
                    'stock_quantity' => 24,
                    'low_stock_threshold' => 5,
                    'free_shipping' => true,
                    'published_at' => now(),
                ]);

                ProductImage::updateOrCreate(
                    ['product_id' => $product->id, 'is_primary' => true],
                    ['storage_disk' => 'r2', 'file_path' => $productFixture['image'], 'alt_text' => $productFixture['name'], 'sort_order' => 0]
                );
            }

            $seller->update(['product_count' => count($fixture['products'])]);
            $this->seedRenewalDocuments($seller, $fixture['expires'], $fixture['color']);
        }
    }

    private function seedRenewalDocuments(Seller $seller, string $originalExpiry, array $color): void
    {
        $disk = Storage::disk('r2');
        $base = "review-data/seller-renewals/{$seller->slug}";
        $originalPath = "{$base}/original-certificate.png";
        $renewalPath = "{$base}/renewal-certificate.png";

        if (! $disk->exists($originalPath)) {
            $disk->put($originalPath, $this->png($color), ['visibility' => 'private', 'ContentType' => 'image/png']);
        }
        if (! $disk->exists($renewalPath)) {
            $renewalColor = [min(255, $color[0] + 35), min(255, $color[1] + 35), min(255, $color[2] + 35)];
            $disk->put($renewalPath, $this->png($renewalColor), ['visibility' => 'private', 'ContentType' => 'image/png']);
        }

        $original = SellerDocument::firstOrCreate([
            'seller_id' => $seller->id,
            'document_type' => 'seller_certificate',
            'file_path' => $originalPath,
        ], [
            'storage_disk' => 'r2',
            'file_name' => 'original-certificate.png',
            'original_filename' => 'original-seller-certificate.png',
            'mime_type' => 'image/png',
            'file_size' => strlen($this->png($color)),
            'status' => 'approved',
            'private' => true,
            'uploaded_at' => now()->subYear(),
            'expires_at' => $originalExpiry,
            'reviewed_at' => now()->subYear(),
            'approved_at' => now()->subYear(),
        ]);

        SellerDocument::firstOrCreate([
            'seller_id' => $seller->id,
            'renewal_of_document_id' => $original->id,
        ], [
            'document_type' => 'seller_certificate',
            'storage_disk' => 'r2',
            'file_name' => 'renewal-certificate.png',
            'file_path' => $renewalPath,
            'original_filename' => 'renewal-seller-certificate.png',
            'mime_type' => 'image/png',
            'file_size' => strlen($this->png($color)),
            'status' => 'pending',
            'private' => true,
            'uploaded_at' => now()->subDay(),
            'expires_at' => now()->addYear()->toDateString(),
            'submitted_at' => now()->subDay(),
        ]);
    }

    private function png(array $rgb): string
    {
        $width = 640;
        $height = 400;
        $row = chr(0).str_repeat(chr($rgb[0]).chr($rgb[1]).chr($rgb[2]), $width);
        $data = str_repeat($row, $height);

        return "\x89PNG\r\n\x1a\n"
            .$this->pngChunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0))
            .$this->pngChunk('IDAT', gzcompress($data, 9))
            .$this->pngChunk('IEND', '');
    }

    private function pngChunk(string $type, string $data): string
    {
        return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
    }
}
