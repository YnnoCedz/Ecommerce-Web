<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\ReviewReply;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPageLiveDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_details_reviews_seller_metrics_and_policies_are_database_driven(): void
    {
        $sellerUser = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller = Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'approved',
            'shipping_policy' => 'Seller ships every weekday.',
            'return_policy' => 'Returns accepted within seven days.',
            'follower_count' => 9999,
        ]);
        $category = Category::factory()->create(['active' => true]);
        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'slug' => 'live-product',
        ]);
        $secondProduct = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'slug' => 'seller-second-product',
        ]);
        $related = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'slug' => 'related-live-product',
        ]);
        ProductImage::create([
            'product_id' => $product->id,
            'file_path' => 'https://cdn.example.test/products/live-product.jpg',
            'is_primary' => true,
        ]);

        $firstReview = $this->verifiedReview($product, $seller, 5, 'Ana', 'Lopez');
        $this->verifiedReview($product, $seller, 4, 'Ben', 'Santos');
        $this->verifiedReview($secondProduct, $seller, 3, 'Cara', 'Reyes');
        ReviewReply::create([
            'review_id' => $firstReview->id,
            'seller_id' => $seller->id,
            'body' => 'Thank you for your feedback.',
            'replied_at' => now(),
        ]);
        $firstReview->update(['submitted_at' => now()->addMinute()]);

        $response = $this->getJson('/api/products/live-product')
            ->assertOk()
            ->assertJsonPath('data.review_summary.average_rating', 4.5)
            ->assertJsonPath('data.review_summary.review_count', 2)
            ->assertJsonPath('data.review_summary.rating_distribution.5', 1)
            ->assertJsonPath('data.review_summary.rating_distribution.4', 1)
            ->assertJsonPath('data.seller.rating', 4)
            ->assertJsonPath('data.seller.rating_count', 3)
            ->assertJsonPath('data.seller.fulfilled_order_count', 3)
            ->assertJsonPath('data.shipping_policy', 'Seller ships every weekday.')
            ->assertJsonPath('data.return_policy', 'Returns accepted within seven days.')
            ->assertJsonPath('data.image_path', 'https://cdn.example.test/products/live-product.jpg')
            ->assertJsonPath('data.images.0.path', 'https://cdn.example.test/products/live-product.jpg')
            ->assertJsonPath('data.images.0.url', 'https://cdn.example.test/products/live-product.jpg');

        $this->assertContains('related-live-product', collect($response->json('data.related'))->pluck('slug')->all());

        $reviews = $this->getJson('/api/products/live-product/reviews?per_page=1&page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.verified_purchase', true)
            ->assertJsonPath('data.0.seller_reply.body', 'Thank you for your feedback.');

        $this->assertStringNotContainsString('@', (string) $reviews->json('data.0.buyer_display_name'));
        $reviews->assertJsonMissingPath('data.0.email');
    }

    public function test_product_without_images_uses_maketo_placeholder_and_hidden_sellers_return_not_found(): void
    {
        $activeSeller = Seller::factory()->create([
            'user_id' => User::factory()->create(['role' => 'seller', 'status' => 'active'])->id,
            'status' => 'approved',
        ]);
        $category = Category::factory()->create(['active' => true]);
        Product::factory()->create([
            'seller_id' => $activeSeller->id,
            'category_id' => $category->id,
            'slug' => 'no-image-product',
        ]);

        $this->getJson('/api/products/no-image-product')
            ->assertOk()
            ->assertJsonPath('data.image', '/images/product-placeholder.svg')
            ->assertJsonPath('data.review_summary.average_rating', 0)
            ->assertJsonPath('data.review_summary.review_count', 0);

        $suspendedSeller = Seller::factory()->create([
            'user_id' => User::factory()->create(['role' => 'seller', 'status' => 'suspended'])->id,
            'status' => 'approved',
        ]);
        Product::factory()->create([
            'seller_id' => $suspendedSeller->id,
            'category_id' => $category->id,
            'slug' => 'hidden-seller-product',
        ]);

        $this->getJson('/api/products/hidden-seller-product')->assertNotFound();
        $this->getJson('/api/products/hidden-seller-product/reviews')->assertNotFound();
    }

    public function test_variant_detail_and_cart_use_the_selected_variants_valid_price(): void
    {
        $seller = Seller::factory()->create([
            'user_id' => User::factory()->create(['role' => 'seller', 'status' => 'active'])->id,
            'status' => 'approved',
        ]);
        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => Category::factory()->create(['active' => true])->id,
            'slug' => 'variant-priced-product',
            'price' => 35000,
            'sale_price' => 31990,
            'track_inventory' => true,
            'stock_quantity' => 8,
        ]);
        $baseVariant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Space Gray / 64GB',
            'sku' => 'IPA5-SG-64',
            'price_override' => 35990,
            'sale_price_override' => 0,
            'stock_quantity' => 5,
            'active' => true,
        ]);
        $saleVariant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Space Gray / 256GB',
            'sku' => 'IPA5-SG-256',
            'price_override' => 45990,
            'sale_price_override' => 42990,
            'stock_quantity' => 3,
            'active' => true,
        ]);

        $this->getJson('/api/products/variant-priced-product')
            ->assertOk()
            ->assertJsonPath('data.variants.0.id', $baseVariant->id)
            ->assertJsonPath('data.variants.0.price', 35990)
            ->assertJsonPath('data.variants.0.original_price', null)
            ->assertJsonPath('data.variants.0.stock_quantity', 5)
            ->assertJsonPath('data.variants.1.id', $saleVariant->id)
            ->assertJsonPath('data.variants.1.price', 42990)
            ->assertJsonPath('data.variants.1.original_price', 45990)
            ->assertJsonPath('data.variants.1.stock_quantity', 3);

        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($buyer)->postJson('/api/cart/items', [
            'product_id' => $product->id,
            'product_variant_id' => $baseVariant->id,
            'quantity' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('data.items.0.product_variant_id', $baseVariant->id)
            ->assertJsonPath('data.items.0.unit_price', 35990);
    }

    public function test_non_variant_product_detail_keeps_its_product_price(): void
    {
        $seller = Seller::factory()->create([
            'user_id' => User::factory()->create(['role' => 'seller', 'status' => 'active'])->id,
            'status' => 'approved',
        ]);
        Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => Category::factory()->create(['active' => true])->id,
            'slug' => 'standard-priced-product',
            'price' => 2500,
            'sale_price' => null,
        ]);

        $this->getJson('/api/products/standard-priced-product')
            ->assertOk()
            ->assertJsonPath('data.price', 2500)
            ->assertJsonPath('data.original_price', null)
            ->assertJsonCount(0, 'data.variants');
    }

    public function test_public_seller_cards_expose_uploaded_avatar_logo_and_banner(): void
    {
        $sellerUser = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'avatar_path' => 'https://cdn.example.test/users/avatar.jpg',
        ]);
        $seller = Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'approved',
            'logo_path' => 'https://cdn.example.test/stores/logo.png',
            'banner_path' => 'https://cdn.example.test/stores/banner.jpg',
        ]);

        $this->getJson('/api/sellers')
            ->assertOk()
            ->assertJsonPath('data.0.id', $seller->id)
            ->assertJsonPath('data.0.avatar', 'https://cdn.example.test/users/avatar.jpg')
            ->assertJsonPath('data.0.logo_path', 'https://cdn.example.test/stores/logo.png')
            ->assertJsonPath('data.0.logo', 'https://cdn.example.test/stores/logo.png')
            ->assertJsonPath('data.0.banner_path', 'https://cdn.example.test/stores/banner.jpg')
            ->assertJsonPath('data.0.banner', 'https://cdn.example.test/stores/banner.jpg');
    }

    private function verifiedReview(Product $product, Seller $seller, int $rating, string $firstName, string $lastName): Review
    {
        $buyer = User::factory()->create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => strtolower($firstName).uniqid().'@example.test',
        ]);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => 'ORD-'.strtoupper(uniqid()),
            'status' => 'completed',
            'shipping_name' => $buyer->display_name,
            'shipping_phone' => '+639171234567',
            'shipping_line1' => 'Test Street',
            'shipping_city' => 'Makati',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
        ]);
        $sellerOrder = SellerOrder::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'status' => 'completed',
            'delivered_at' => now(),
            'completed_at' => now(),
        ]);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'seller_order_id' => $sellerOrder->id,
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'unit_price' => $product->price,
            'quantity' => 1,
            'subtotal' => $product->price,
        ]);

        return Review::create([
            'user_id' => $buyer->id,
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'rating' => $rating,
            'title' => "{$rating}-star review",
            'body' => 'A real review from a completed purchase.',
            'status' => 'approved',
            'submitted_at' => now(),
        ]);
    }
}
