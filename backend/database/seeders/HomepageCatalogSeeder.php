<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Seller;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class HomepageCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = [
            ['Pet Supplies', 'pet-supplies', [
                ['Comfort-Padded Pet Harness', 'comfort-padded-pet-harness', 'PET-HAR-001', 699, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e'],
                ['Natural Rubber Chew Toy Set', 'natural-rubber-chew-toy-set', 'PET-TOY-002', 389, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee'],
                ['Portable Pet Travel Bottle', 'portable-pet-travel-bottle', 'PET-TRV-003', 549, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b'],
            ]],
            ['Electronics and Gadgets', 'electronics', [
                ['Compact Wireless Earbuds', 'compact-wireless-earbuds', 'ELE-AUD-001', 1890, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'],
                ['Aluminum Laptop Stand', 'aluminum-laptop-stand', 'ELE-CMP-002', 1290, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8'],
                ['Multi-Port USB-C Hub', 'multi-port-usb-c-hub', 'ELE-USB-003', 1590, 'https://images.unsplash.com/photo-1498049794561-7780e7231661'],
            ]],
            ["Women's Apparel", 'womens-apparel', [
                ['Linen Wrap Midi Dress', 'linen-wrap-midi-dress', 'WOM-DRS-001', 1790, 'https://images.unsplash.com/photo-1483985988355-763728e1935b'],
                ['Everyday Structured Tote', 'everyday-structured-tote', 'WOM-BAG-002', 1490, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d'],
                ['Relaxed Cotton Blouse', 'relaxed-cotton-blouse', 'WOM-TOP-003', 990, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b'],
            ]],
            ["Men's Apparel", 'mens-apparel', [
                ['Classic Oxford Button-Down', 'classic-oxford-button-down', 'MEN-SHT-001', 1290, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'],
                ['Tailored Everyday Chinos', 'tailored-everyday-chinos', 'MEN-PNT-002', 1490, 'https://images.unsplash.com/photo-1516257984-b1b4d707412e'],
                ['Lightweight Weekend Jacket', 'lightweight-weekend-jacket', 'MEN-JKT-003', 2290, 'https://images.unsplash.com/photo-1617137968427-85924c800a22'],
            ]],
            ['Kids and Baby', 'kids-baby', [
                ['Organic Cotton Baby Romper', 'organic-cotton-baby-romper', 'KID-BBY-001', 590, 'https://images.unsplash.com/photo-1522771930-78848d9293e8'],
                ['Wooden Learning Blocks', 'wooden-learning-blocks', 'KID-TOY-002', 790, 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1'],
                ['Soft Nursery Blanket', 'soft-nursery-blanket', 'KID-NUR-003', 890, 'https://images.unsplash.com/photo-1516627145497-ae6968895b74'],
            ]],
            ['Home and Garden', 'home-garden', [
                ['Hand-Glazed Ceramic Vase', 'hand-glazed-ceramic-vase', 'HOM-DEC-001', 1190, 'https://images.unsplash.com/photo-1607556672044-6110fc499247'],
                ['Woven Storage Basket Pair', 'woven-storage-basket-pair', 'HOM-STO-002', 990, 'https://images.unsplash.com/photo-1484101403633-562f891dc89a'],
                ['Minimalist Table Lamp', 'minimalist-table-lamp', 'HOM-LGT-003', 1690, 'https://images.unsplash.com/photo-1513694203232-719a280e022f'],
            ]],
            ['Sports and Outdoors', 'sports-outdoors', [
                ['Non-Slip Yoga Mat', 'non-slip-yoga-mat', 'SPT-YOG-001', 1090, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438'],
                ['Insulated Trail Bottle', 'insulated-trail-bottle', 'SPT-HIK-002', 790, 'https://images.unsplash.com/photo-1677055089360-c2aa1ac5d20e'],
                ['Compact Resistance Band Kit', 'compact-resistance-band-kit', 'SPT-FIT-003', 690, 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c'],
            ]],
            ['Books and Media', 'books-media', [
                ['Modern Filipino Short Stories', 'modern-filipino-short-stories', 'BOK-FIC-001', 499, 'https://images.unsplash.com/photo-1512820790803-83ca734da794'],
                ['Creative Business Workbook', 'creative-business-workbook', 'BOK-BUS-002', 649, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d'],
                ['Illustrated Philippine Travel Guide', 'illustrated-philippine-travel-guide', 'BOK-TRV-003', 799, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f'],
            ]],
        ];

        $sellers = Seller::query()->where('status', 'approved')->whereNull('deleted_at')->orderBy('id')->get();
        if ($sellers->isEmpty()) {
            throw new RuntimeException('Homepage catalog seeding requires at least one approved seller.');
        }

        foreach ($catalog as $categoryIndex => [$name, $slug, $products]) {
            $category = Category::withTrashed()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'icon' => '*', 'active' => true, 'sort_order' => $categoryIndex + 1]
            );
            if ($category->trashed()) {
                $category->restore();
            }
            $seller = $sellers[$categoryIndex % $sellers->count()];
            $seller->categories()->syncWithoutDetaching([$category->id => ['status' => 'approved', 'reviewed_at' => now()]]);

            foreach ($products as [$productName, $productSlug, $sku, $price, $image]) {
                $product = Product::withTrashed()->updateOrCreate(
                    ['slug' => $productSlug],
                    [
                        'seller_id' => $seller->id,
                        'category_id' => $category->id,
                        'name' => $productName,
                        'description' => 'A carefully selected marketplace product from an approved Marketo seller.',
                        'sku' => $sku,
                        'price' => $price,
                        'sale_price' => null,
                        'status' => 'active',
                        'delivery_type' => 'both',
                        'track_inventory' => true,
                        'stock_quantity' => 30,
                        'low_stock_threshold' => 5,
                        'free_shipping' => $price >= 1000,
                        'published_at' => now(),
                    ]
                );
                if ($product->trashed()) {
                    $product->restore();
                }

                ProductImage::updateOrCreate(
                    ['product_id' => $product->id, 'is_primary' => true],
                    [
                        'storage_disk' => 'external',
                        'file_path' => $image,
                        'original_filename' => null,
                        'mime_type' => 'image/jpeg',
                        'alt_text' => $productName,
                        'sort_order' => 0,
                    ]
                );
            }
        }

        Cache::forget('catalog.categories.v1');
        Cache::forget('catalog.sellers.v1');
    }
}
