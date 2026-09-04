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

        // Seller and Marketplace capability each use one bounded, indexed
        // relationship lookup. No commerce collections are loaded.
        $loginQueries = $queries;
        $this->assertCount(8, $loginQueries);
        $this->assertSingleActivityInsert($loginQueries);
        $this->assertSingleNarrowCourierQuery($loginQueries);
        $this->assertSingleNarrowLogisticsStaffQuery($loginQueries);
        $this->assertSingleMarketplaceProfileQuery($loginQueries);
        $this->assertAuthQueriesExcludeMarketplaceData($loginQueries, ['sellers']);

        $queries = [];
        $this->withToken($login->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonMissingPath('user.order_count')
            ->assertJsonMissingPath('user.wishlist_count');

        $this->assertCount(7, $queries);
        $this->assertSingleNarrowCourierQuery($queries);
        $this->assertSingleNarrowLogisticsStaffQuery($queries);
        $this->assertSingleMarketplaceProfileQuery($queries);
        $this->assertAuthQueriesExcludeMarketplaceData($queries, ['sellers']);
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
            fn (string $sql): bool => $this->selectsFrom($sql, 'sellers'),
        ));

        $this->assertCount(8, $queries);
        $this->assertSingleActivityInsert($queries);
        $this->assertSingleNarrowCourierQuery($queries);
        $this->assertSingleNarrowLogisticsStaffQuery($queries);
        $this->assertSingleMarketplaceProfileQuery($queries);
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

    private function assertSingleNarrowCourierQuery(array $queries): void
    {
        $courierQueries = array_values(array_filter(
            $queries,
            fn (string $sql): bool => $this->selectsFrom($sql, 'couriers'),
        ));

        $this->assertCount(1, $courierQueries);
        $this->assertStringNotContainsString('select *', strtolower($courierQueries[0]));
    }

    private function assertSingleNarrowLogisticsStaffQuery(array $queries): void
    {
        $staffQueries = array_values(array_filter(
            $queries,
            fn (string $sql): bool => $this->selectsFrom($sql, 'logistics_staff'),
        ));

        $this->assertCount(1, $staffQueries);
        $this->assertStringNotContainsString('select *', strtolower($staffQueries[0]));
    }

    private function assertSingleMarketplaceProfileQuery(array $queries): void
    {
        $profileQueries = array_values(array_filter(
            $queries,
            fn (string $sql): bool => $this->selectsFrom($sql, 'marketplace_profiles'),
        ));

        $this->assertCount(1, $profileQueries);
        $this->assertStringNotContainsString('select *', strtolower($profileQueries[0]));
    }

    private function selectsFrom(string $sql, string $table): bool
    {
        return preg_match('/\bfrom\s+[`"]'.preg_quote($table, '/').'[`"]/i', $sql) === 1;
    }
}
