<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SellerProductStockTest extends TestCase
{
    use RefreshDatabase;

    private User $sellerUser;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sellerUser = User::factory()->create(['role' => 'seller']);
        Seller::factory()->create([
            'user_id' => $this->sellerUser->id,
            'status' => 'approved',
            'verified' => true,
        ]);
        $this->category = Category::factory()->create();
    }

    public static function createStockCases(): array
    {
        return [
            'one item' => [1],
            'fifteen items' => [15],
            'one hundred items' => [100],
        ];
    }

    #[DataProvider('createStockCases')]
    public function test_create_stores_the_submitted_absolute_stock_once(int $quantity): void
    {
        $beforeCount = Product::count();

        $response = $this->actingAs($this->sellerUser)->postJson(
            '/api/seller/products',
            $this->productPayload($quantity, 'active', "STOCK-{$quantity}"),
        );

        $response->assertCreated()
            ->assertJsonPath('data.stock_quantity', $quantity)
            ->assertJsonPath('data.status', 'active');

        $this->assertSame($beforeCount + 1, Product::count());
        $this->assertDatabaseHas('products', [
            'sku' => "STOCK-{$quantity}",
            'stock_quantity' => $quantity,
            'low_stock_threshold' => 3,
        ]);
        $product = Product::where('sku', "STOCK-{$quantity}")->firstOrFail();
        $this->assertDatabaseMissing('product_variants', ['product_id' => $product->id]);
    }

    public function test_save_draft_and_publish_keep_the_submitted_stock(): void
    {
        $this->actingAs($this->sellerUser)->postJson(
            '/api/seller/products',
            $this->productPayload(15, 'draft', 'DRAFT-15'),
        )->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.stock_quantity', 15);

        $this->actingAs($this->sellerUser)->postJson(
            '/api/seller/products',
            $this->productPayload(15, 'active', 'PUBLISH-15'),
        )->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.stock_quantity', 15);

        $this->assertDatabaseHas('products', ['sku' => 'DRAFT-15', 'status' => 'draft', 'stock_quantity' => 15]);
        $this->assertDatabaseHas('products', ['sku' => 'PUBLISH-15', 'status' => 'active', 'stock_quantity' => 15]);
    }

    public function test_edit_replaces_stock_instead_of_adding_to_it(): void
    {
        $createResponse = $this->actingAs($this->sellerUser)->postJson(
            '/api/seller/products',
            $this->productPayload(15, 'active', 'EDIT-STOCK'),
        )->assertCreated();

        $productId = $createResponse->json('data.id');

        $this->actingAs($this->sellerUser)->patchJson(
            "/api/seller/products/{$productId}",
            $this->productPayload(20, 'active', 'EDIT-STOCK'),
        )->assertOk()
            ->assertJsonPath('data.stock_quantity', 20);

        $this->assertSame(1, Product::whereKey($productId)->count());
        $this->assertDatabaseHas('products', ['id' => $productId, 'stock_quantity' => 20]);
    }

    public function test_browser_compatible_multipart_edit_preserves_unchanged_product_fields(): void
    {
        $created = $this->actingAs($this->sellerUser)->postJson(
            '/api/seller/products',
            $this->productPayload(15, 'active', 'MULTIPART-EDIT'),
        )->assertCreated();

        $productId = $created->json('data.id');
        $payload = $this->productPayload(15, 'active', 'MULTIPART-EDIT');
        $payload['_method'] = 'PATCH';
        $payload['tags'] = json_encode($payload['tags'], JSON_THROW_ON_ERROR);
        $payload['variants'] = json_encode($payload['variants'], JSON_THROW_ON_ERROR);
        $payload['keep_image_ids'] = '[]';

        $this->actingAs($this->sellerUser)->post("/api/seller/products/{$productId}", $payload, [
            'Accept' => 'application/json',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Stock test MULTIPART-EDIT')
            ->assertJsonPath('data.price', 1000)
            ->assertJsonPath('data.stock_quantity', 15);

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Stock test MULTIPART-EDIT',
            'category_id' => $this->category->id,
            'price' => 1000,
            'stock_quantity' => 15,
        ]);
    }

    public function test_browser_compatible_edit_changes_one_field_and_preserves_the_rest(): void
    {
        $created = $this->actingAs($this->sellerUser)->postJson(
            '/api/seller/products',
            $this->productPayload(15, 'active', 'SINGLE-FIELD-EDIT'),
        )->assertCreated();

        $productId = $created->json('data.id');
        $payload = $this->productPayload(15, 'active', 'SINGLE-FIELD-EDIT');
        $payload['_method'] = 'PATCH';
        $payload['name'] = 'Updated product name';
        $payload['tags'] = '[]';
        $payload['variants'] = '[]';
        $payload['keep_image_ids'] = '[]';

        $this->actingAs($this->sellerUser)->post("/api/seller/products/{$productId}", $payload, [
            'Accept' => 'application/json',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Updated product name')
            ->assertJsonPath('data.price', 1000)
            ->assertJsonPath('data.stock_quantity', 15);

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Updated product name',
            'category_id' => $this->category->id,
            'sku' => 'SINGLE-FIELD-EDIT',
            'price' => 1000,
            'stock_quantity' => 15,
            'status' => 'active',
        ]);
    }

    public function test_empty_edit_body_exposes_the_required_product_contract(): void
    {
        $product = Product::factory()->create([
            'seller_id' => $this->sellerUser->seller->id,
            'category_id' => $this->category->id,
        ]);

        $this->actingAs($this->sellerUser)->patchJson("/api/seller/products/{$product->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name',
                'category_id',
                'sku',
                'price',
                'status',
                'delivery_type',
                'stock_quantity',
            ]);
    }

    public function test_variant_combinations_are_persisted_independently_and_define_product_total(): void
    {
        $payload = $this->productPayload(999, 'active', 'VARIANT-PARENT');
        $payload['variants'] = [
            $this->variantPayload('Space Gray / 64GB', 'IPA5-SG-64', 35990, 5, [['name' => 'Color', 'value' => 'Space Gray'], ['name' => 'Storage', 'value' => '64GB']]),
            $this->variantPayload('Space Gray / 256GB', 'IPA5-SG-256', 45990, 3, [['name' => 'Color', 'value' => 'Space Gray'], ['name' => 'Storage', 'value' => '256GB']]),
            $this->variantPayload('Silver / 64GB', 'IPA5-SL-64', 35990, 4, [['name' => 'Color', 'value' => 'Silver'], ['name' => 'Storage', 'value' => '64GB']]),
            $this->variantPayload('Silver / 256GB', 'IPA5-SL-256', 45990, 2, [['name' => 'Color', 'value' => 'Silver'], ['name' => 'Storage', 'value' => '256GB']]),
        ];

        $response = $this->actingAs($this->sellerUser)->postJson('/api/seller/products', $payload)
            ->assertCreated()
            ->assertJsonPath('data.stock_quantity', 14)
            ->assertJsonCount(4, 'data.variants');

        $product = Product::with('variants.options')->findOrFail($response->json('data.id'));

        $this->assertCount(4, $product->variants);
        $this->assertSame(14, (int) $product->variants->sum('stock_quantity'));
        $this->assertSame(14, $product->stock_quantity);
        $this->assertDatabaseHas('product_variants', ['product_id' => $product->id, 'sku' => 'IPA5-SG-256', 'price_override' => 45990, 'stock_quantity' => 3]);
        $this->assertDatabaseHas('variant_options', ['product_variant_id' => $product->variants->firstWhere('sku', 'IPA5-SG-64')->id, 'option_name' => 'Color', 'value' => 'Space Gray']);

        $this->actingAs($this->sellerUser)->getJson("/api/seller/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.stock_quantity', 14)
            ->assertJsonCount(4, 'data.variants')
            ->assertJsonPath('data.variants.1.sku', 'IPA5-SG-256')
            ->assertJsonPath('data.variants.1.option_values.1.name', 'Storage')
            ->assertJsonPath('data.variants.1.option_values.1.value', '256GB');
    }

    public function test_editing_one_combination_preserves_every_other_variant(): void
    {
        $payload = $this->productPayload(0, 'draft', 'VARIANT-EDIT');
        $payload['variants'] = [
            $this->variantPayload('Space Gray / 64GB', 'EDIT-SG-64', 35990, 5, [['name' => 'Color', 'value' => 'Space Gray'], ['name' => 'Storage', 'value' => '64GB']]),
            $this->variantPayload('Space Gray / 256GB', 'EDIT-SG-256', 45990, 3, [['name' => 'Color', 'value' => 'Space Gray'], ['name' => 'Storage', 'value' => '256GB']]),
            $this->variantPayload('Silver / 64GB', 'EDIT-SL-64', 35990, 4, [['name' => 'Color', 'value' => 'Silver'], ['name' => 'Storage', 'value' => '64GB']]),
            $this->variantPayload('Silver / 256GB', 'EDIT-SL-256', 45990, 2, [['name' => 'Color', 'value' => 'Silver'], ['name' => 'Storage', 'value' => '256GB']]),
        ];

        $createResponse = $this->actingAs($this->sellerUser)->postJson('/api/seller/products', $payload)
            ->assertCreated();
        $product = Product::with('variants.options')->findOrFail($createResponse->json('data.id'));
        $originalVariantIds = $product->variants->pluck('id', 'sku')->all();

        $updatePayload = $this->productPayload(500, 'draft', 'VARIANT-EDIT');
        $updatePayload['variants'] = $product->variants->map(fn ($variant) => [
            ...$this->variantPayload(
                $variant->name,
                $variant->sku,
                (float) $variant->price_override,
                $variant->sku === 'EDIT-SG-64' ? 8 : $variant->stock_quantity,
                $variant->options->map(fn ($option) => ['name' => $option->option_name, 'value' => $option->value])->all(),
            ),
            'server_id' => $variant->id,
        ])->all();

        $this->actingAs($this->sellerUser)->patchJson("/api/seller/products/{$product->id}", $updatePayload)
            ->assertOk()
            ->assertJsonPath('data.stock_quantity', 17);

        $product->refresh()->load('variants');
        $this->assertSame(17, $product->stock_quantity);
        $this->assertSame(8, $product->variants->firstWhere('sku', 'EDIT-SG-64')->stock_quantity);
        $this->assertSame(3, $product->variants->firstWhere('sku', 'EDIT-SG-256')->stock_quantity);
        $this->assertSame(4, $product->variants->firstWhere('sku', 'EDIT-SL-64')->stock_quantity);
        $this->assertSame(2, $product->variants->firstWhere('sku', 'EDIT-SL-256')->stock_quantity);
        foreach ($originalVariantIds as $sku => $variantId) {
            $this->assertSame($variantId, $product->variants->firstWhere('sku', $sku)->id);
        }
    }

    public function test_adding_an_option_value_creates_only_new_combinations_and_preserves_existing_ids(): void
    {
        $payload = $this->productPayload(0, 'draft', 'ADD-COLOR-PARENT');
        $payload['variants'] = [
            $this->variantPayload('Space Gray / 64GB', 'ADD-SG-64', 35990, 5, [['name' => 'Color', 'value' => 'Space Gray'], ['name' => 'Storage', 'value' => '64GB']]),
            $this->variantPayload('Space Gray / 256GB', 'ADD-SG-256', 45990, 3, [['name' => 'Color', 'value' => 'Space Gray'], ['name' => 'Storage', 'value' => '256GB']]),
            $this->variantPayload('Silver / 64GB', 'ADD-SL-64', 35990, 4, [['name' => 'Color', 'value' => 'Silver'], ['name' => 'Storage', 'value' => '64GB']]),
            $this->variantPayload('Silver / 256GB', 'ADD-SL-256', 45990, 2, [['name' => 'Color', 'value' => 'Silver'], ['name' => 'Storage', 'value' => '256GB']]),
        ];

        $created = $this->actingAs($this->sellerUser)->postJson('/api/seller/products', $payload)->assertCreated();
        $product = Product::with('variants.options')->findOrFail($created->json('data.id'));
        $originalVariantIds = $product->variants->pluck('id', 'sku')->all();

        $updatePayload = $this->productPayload(0, 'draft', 'ADD-COLOR-PARENT');
        $updatePayload['variants'] = $product->variants->map(fn ($variant) => [
            ...$this->variantPayload(
                $variant->name,
                $variant->sku,
                (float) $variant->price_override,
                $variant->stock_quantity,
                $variant->options->map(fn ($option) => ['name' => $option->option_name, 'value' => $option->value])->all(),
            ),
            'server_id' => $variant->id,
        ])->push($this->variantPayload('Blue / 64GB', 'ADD-BL-64', 35990, 6, [['name' => 'Color', 'value' => 'Blue'], ['name' => 'Storage', 'value' => '64GB']]))
            ->push($this->variantPayload('Blue / 256GB', 'ADD-BL-256', 45990, 7, [['name' => 'Color', 'value' => 'Blue'], ['name' => 'Storage', 'value' => '256GB']]))
            ->all();

        $this->actingAs($this->sellerUser)->patchJson("/api/seller/products/{$product->id}", $updatePayload)
            ->assertOk()
            ->assertJsonCount(6, 'data.variants')
            ->assertJsonPath('data.stock_quantity', 27);

        $product->refresh()->load('variants.options');
        $this->assertCount(6, $product->variants);
        foreach ($originalVariantIds as $sku => $variantId) {
            $this->assertSame($variantId, $product->variants->firstWhere('sku', $sku)->id);
        }
        $this->assertDatabaseHas('product_variants', ['product_id' => $product->id, 'sku' => 'ADD-BL-64', 'stock_quantity' => 6]);
        $this->assertDatabaseHas('product_variants', ['product_id' => $product->id, 'sku' => 'ADD-BL-256', 'stock_quantity' => 7]);
    }

    public function test_duplicate_variant_skus_are_rejected_at_the_variant_row(): void
    {
        $payload = $this->productPayload(0, 'draft', 'DUPLICATE-PARENT');
        $payload['variants'] = [
            $this->variantPayload('Red / Small', 'DUPLICATE-SKU', 100, 2, [['name' => 'Color', 'value' => 'Red'], ['name' => 'Size', 'value' => 'Small']]),
            $this->variantPayload('Blue / Small', 'DUPLICATE-SKU', 100, 2, [['name' => 'Color', 'value' => 'Blue'], ['name' => 'Size', 'value' => 'Small']]),
        ];

        $this->actingAs($this->sellerUser)->postJson('/api/seller/products', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.1.sku']);

        $this->assertDatabaseMissing('products', ['sku' => 'DUPLICATE-PARENT']);
    }

    public function test_duplicate_option_combinations_are_rejected_regardless_of_option_order(): void
    {
        $payload = $this->productPayload(0, 'draft', 'DUPLICATE-COMBINATION-PARENT');
        $payload['variants'] = [
            $this->variantPayload('Red / Small', 'COMBO-ONE', 100, 2, [['name' => 'Color', 'value' => 'Red'], ['name' => 'Size', 'value' => 'Small']]),
            $this->variantPayload('Small / Red', 'COMBO-TWO', 100, 3, [['name' => 'Size', 'value' => 'Small'], ['name' => 'Color', 'value' => 'Red']]),
        ];

        $this->actingAs($this->sellerUser)->postJson('/api/seller/products', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.1.option_values']);

        $this->assertDatabaseMissing('products', ['sku' => 'DUPLICATE-COMBINATION-PARENT']);
    }

    public function test_removing_a_referenced_combination_deactivates_it_instead_of_deleting_history(): void
    {
        $payload = $this->productPayload(0, 'active', 'SAFE-REMOVE-PARENT');
        $payload['variants'] = [
            $this->variantPayload('Red / Small', 'SAFE-RED-S', 100, 5, [['name' => 'Color', 'value' => 'Red'], ['name' => 'Size', 'value' => 'Small']]),
            $this->variantPayload('Blue / Small', 'SAFE-BLUE-S', 100, 4, [['name' => 'Color', 'value' => 'Blue'], ['name' => 'Size', 'value' => 'Small']]),
        ];

        $created = $this->actingAs($this->sellerUser)->postJson('/api/seller/products', $payload)->assertCreated();
        $product = Product::with('variants.options')->findOrFail($created->json('data.id'));
        $removed = $product->variants->firstWhere('sku', 'SAFE-BLUE-S');
        $buyer = User::factory()->create();
        $cart = Cart::create(['user_id' => $buyer->id, 'status' => 'active']);
        CartItem::create([
            'cart_id' => $cart->id,
            'seller_id' => $product->seller_id,
            'product_id' => $product->id,
            'product_variant_id' => $removed->id,
            'quantity' => 1,
            'unit_price' => 100,
            'line_total' => 100,
            'saved_for_later' => false,
        ]);

        $kept = $product->variants->firstWhere('sku', 'SAFE-RED-S');
        $updatePayload = $this->productPayload(0, 'active', 'SAFE-REMOVE-PARENT');
        $updatePayload['variants'] = [[
            ...$this->variantPayload('Red / Small', 'SAFE-RED-S', 100, 5, $kept->options->map(fn ($option) => ['name' => $option->option_name, 'value' => $option->value])->all()),
            'server_id' => $kept->id,
        ]];

        $this->actingAs($this->sellerUser)->patchJson("/api/seller/products/{$product->id}", $updatePayload)
            ->assertOk()
            ->assertJsonPath('data.stock_quantity', 5);

        $this->assertDatabaseHas('product_variants', ['id' => $removed->id, 'active' => false, 'stock_quantity' => 4]);
        $this->assertDatabaseHas('cart_items', ['product_variant_id' => $removed->id]);
    }

    private function productPayload(int $quantity, string $status, string $sku): array
    {
        return [
            'name' => "Stock test {$sku}",
            'description' => 'Stock regression test product.',
            'category_id' => $this->category->id,
            'tags' => [],
            'sku' => $sku,
            'barcode' => null,
            'price' => 1000,
            'sale_price' => null,
            'cost_price' => null,
            'status' => $status,
            'delivery_type' => 'both',
            'track_inventory' => true,
            'stock_quantity' => $quantity,
            'low_stock_threshold' => 3,
            'weight_grams' => null,
            'length_cm' => null,
            'width_cm' => null,
            'height_cm' => null,
            'free_shipping' => false,
            'variants' => [],
        ];
    }

    private function variantPayload(string $name, string $sku, float $price, int $quantity, array $optionValues): array
    {
        return [
            'name' => $name,
            'sku' => $sku,
            'barcode' => null,
            'options' => array_column($optionValues, 'value'),
            'option_values' => $optionValues,
            'price_override' => $price,
            'sale_price_override' => null,
            'stock_quantity' => $quantity,
            'low_stock_threshold' => 3,
            'active' => true,
        ];
    }
}
