<?php

namespace Tests\Feature;

use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_login_and_session_lookup_avoid_marketplace_queries(): void
    {
        $user = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'email_verified_at' => now(),
            'last_active_at' => now()->subDay(),
            'password' => Hash::make('Password123!'),
            'two_factor_enabled' => false,
        ]);

        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $login = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonMissingPath('user.order_count')
            ->assertJsonMissingPath('user.wishlist_count');

        $loginQueries = $queries;
        $this->assertCount(4, $loginQueries);
        $this->assertSingleActivityInsert($loginQueries);
        $this->assertAuthQueriesExcludeMarketplaceData($loginQueries);

        $queries = [];
        $this->withToken($login->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonMissingPath('user.order_count')
            ->assertJsonMissingPath('user.wishlist_count');

        $this->assertCount(3, $queries);
        $this->assertAuthQueriesExcludeMarketplaceData($queries);
    }

    public function test_seller_login_loads_only_the_access_fields_from_the_seller_profile(): void
    {
        $user = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email_verified_at' => now(),
            'last_active_at' => now()->subDay(),
            'password' => Hash::make('Password123!'),
            'two_factor_enabled' => false,
        ]);
        Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved',
        ]);

        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.seller_status', 'approved')
            ->assertJsonPath('user.seller_approved', true)
            ->assertJsonPath('redirect_to', '/');

        $sellerQueries = array_values(array_filter(
            $queries,
            fn (string $sql): bool => str_contains(strtolower($sql), 'from "sellers"'),
        ));

        $this->assertCount(5, $queries);
        $this->assertSingleActivityInsert($queries);
        $this->assertCount(1, $sellerQueries);
        $this->assertStringNotContainsString('select *', strtolower($sellerQueries[0]));
        $this->assertAuthQueriesExcludeMarketplaceData($queries, ['sellers']);
    }

    private function assertAuthQueriesExcludeMarketplaceData(array $queries, array $allowedTables = []): void
    {
        $sql = strtolower(implode("\n", $queries));

        foreach (['sellers', 'orders', 'wishlist_items', 'reviews', 'messages'] as $table) {
            if (in_array($table, $allowedTables, true)) {
                continue;
            }

            $this->assertStringNotContainsString($table, $sql);
        }
    }

    private function assertSingleActivityInsert(array $queries): void
    {
        $activityQueries = array_values(array_filter(
            $queries,
            fn (string $sql): bool => str_contains(strtolower($sql), 'activity_logs'),
        ));

        $this->assertCount(1, $activityQueries);
        $this->assertStringStartsWith('insert', strtolower(trim($activityQueries[0])));
    }
}
