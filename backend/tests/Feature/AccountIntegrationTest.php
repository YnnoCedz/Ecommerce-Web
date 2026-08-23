<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Conversation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private function fakePng(string $name): UploadedFile
    {
        $pngBytes = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2lN5sAAAAASUVORK5CYII='
        );

        return UploadedFile::fake()->createWithContent($name, $pngBytes === false ? '' : $pngBytes);
    }

    public function test_profile_and_preferences_are_persisted_for_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patchJson('/api/account/profile', [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'phone' => '9171234567',
            'role' => 'admin',
            'status' => 'suspended',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Maria Santos',
            'phone' => '+639171234567',
            'role' => 'buyer',
            'status' => 'active',
        ]);

        $this->actingAs($user)->getJson('/api/account/preferences')
            ->assertOk()
            ->assertJsonPath('data.currency', 'PHP');

        $this->actingAs($user)->patchJson('/api/account/preferences', [
            'language' => 'fil-PH',
            'currency' => 'PHP',
            'number_format' => '1.000,00',
            'recommendations_enabled' => false,
            'recently_viewed_enabled' => true,
            'price_drop_alerts_enabled' => false,
            'analytics_cookies_enabled' => false,
            'marketing_cookies_enabled' => true,
        ])->assertOk();

        $this->assertDatabaseHas('user_preferences', [
            'user_id' => $user->id,
            'language' => 'fil-PH',
            'marketing_cookies_enabled' => true,
        ]);
    }

    public function test_profile_avatar_is_uploaded_and_exposed_to_authenticated_frontends(): void
    {
        Storage::fake('r2');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/api/account/profile', [
            '_method' => 'PATCH',
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'phone' => $user->phone ?? $user->mobile,
            'avatar_file' => $this->fakePng('avatar.png'),
        ])->assertOk()
            ->assertJsonPath('data.avatar_url', fn ($value) => is_string($value) && $value !== '');

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('r2')->assertExists($user->avatar_path);

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.avatar_url', fn ($value) => is_string($value) && $value !== '');
    }

    public function test_messages_are_persisted_and_hidden_from_non_participants(): void
    {
        $buyer = User::factory()->create();
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $outsider = User::factory()->create();
        $conversation = Conversation::create(['type' => 'direct', 'subject' => 'Product question']);

        foreach ([$buyer, $sellerUser] as $participant) {
            $conversation->participants()->create([
                'participantable_type' => User::class,
                'participantable_id' => $participant->id,
            ]);
        }

        $this->actingAs($buyer)->postJson("/api/messages/{$conversation->id}", ['body' => 'Is this available?'])
            ->assertCreated()
            ->assertJsonPath('data.is_mine', true);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'senderable_id' => $buyer->id,
            'body' => 'Is this available?',
        ]);
        $this->actingAs($sellerUser)->getJson("/api/messages/{$conversation->id}")
            ->assertOk()
            ->assertJsonPath('data.messages.0.body', 'Is this available?');
        $this->actingAs($sellerUser)->postJson("/api/messages/{$conversation->id}", ['body' => 'Yes, it is available.'])
            ->assertCreated()
            ->assertJsonPath('data.is_mine', true);
        $this->actingAs($buyer)->getJson("/api/messages/{$conversation->id}")
            ->assertOk()
            ->assertJsonPath('data.messages.1.body', 'Yes, it is available.');
        $this->actingAs($buyer)->patchJson("/api/messages/{$conversation->id}/read")->assertOk();
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $conversation->id,
            'participantable_id' => $buyer->id,
            'unread_count' => 0,
        ]);
        $this->actingAs($outsider)->getJson("/api/messages/{$conversation->id}")->assertNotFound();
    }

    public function test_password_change_rejects_weak_values_and_persists_a_valid_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('CurrentPassword1!')]);

        $this->actingAs($user)->patchJson('/api/account/password', [
            'current_password' => 'CurrentPassword1!',
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ])->assertUnprocessable();

        $this->actingAs($user)->patchJson('/api/account/password', [
            'current_password' => 'CurrentPassword1!',
            'password' => 'NewPassword2!',
            'password_confirmation' => 'NewPassword2!',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPassword2!', $user->refresh()->password));
        $this->assertFalse(Hash::check('CurrentPassword1!', $user->password));
    }

    public function test_only_a_completed_purchase_can_be_reviewed_once_and_only_by_its_buyer(): void
    {
        [$buyer, $item] = $this->deliveredOrderItem();
        $otherBuyer = User::factory()->create();

        $this->actingAs($otherBuyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 5,
            'body' => 'Not my purchase.',
        ])->assertUnprocessable();

        $response = $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 5,
            'title' => 'Excellent',
            'body' => 'The product arrived in good condition.',
        ])->assertCreated()->assertJsonPath('data.verified_purchase', true);

        $this->actingAs($buyer)->postJson('/api/reviews', [
            'order_item_id' => $item->id,
            'rating' => 4,
            'body' => 'Duplicate.',
        ])->assertConflict();

        $reviewId = $response->json('data.id');
        $this->actingAs($otherBuyer)->patchJson("/api/reviews/{$reviewId}", [
            'rating' => 1,
            'body' => 'Unauthorized edit.',
        ])->assertNotFound();
        $this->actingAs($buyer)->deleteJson("/api/reviews/{$reviewId}")->assertOk();
        $this->assertDatabaseMissing('reviews', ['id' => $reviewId]);
    }

    private function deliveredOrderItem(): array
    {
        $buyer = User::factory()->create();
        $sellerUser = User::factory()->create(['role' => 'seller']);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'approved']);
        $category = Category::create(['name' => 'Account test', 'slug' => 'account-test', 'active' => true]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Reviewable product',
            'slug' => 'reviewable-product',
            'sku' => 'REVIEW-1',
            'price' => 500,
            'status' => 'active',
            'stock_quantity' => 5,
        ]);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'order_number' => 'ORD-ACCOUNT-1',
            'status' => 'completed',
            'shipping_name' => 'Buyer',
            'shipping_phone' => '+639171234567',
            'shipping_line1' => 'Test street',
            'shipping_city' => 'Makati',
            'shipping_province' => 'Metro Manila',
            'shipping_postal_code' => '1200',
        ]);
        $sellerOrder = SellerOrder::create(['order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'completed', 'completed_at' => now()]);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'seller_order_id' => $sellerOrder->id,
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'unit_price' => 500,
            'quantity' => 1,
            'subtotal' => 500,
        ]);

        return [$buyer, $item];
    }
}
