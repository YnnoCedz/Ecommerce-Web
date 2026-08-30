<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DevelopmentSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EndpointPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_catalog_endpoints_stay_within_query_budgets(): void
    {
        $this->seed(DevelopmentSeeder::class);

        $products = $this->captureQueries(fn () => $this->getJson('/api/products')->assertOk());
        $deals = $this->captureQueries(fn () => $this->getJson('/api/deals')->assertOk());
        $sellers = $this->captureQueries(fn () => $this->getJson('/api/sellers')->assertOk());
        $categories = $this->captureQueries(fn () => $this->getJson('/api/categories')->assertOk());

        // Active timed promotions add one bounded eager-load query; this must not become N+1.
        $this->assertLessThanOrEqual(5, count($products));
        $this->assertLessThanOrEqual(5, count($deals));
        $this->assertLessThanOrEqual(3, count($sellers));
        $this->assertLessThanOrEqual(2, count($categories));
        $this->assertCount(0, array_filter(
            $sellers,
            fn (string $sql): bool => preg_match('/^select \* from "products"/i', $sql) === 1,
        ));
    }

    public function test_buyer_shell_endpoints_stay_within_query_budgets(): void
    {
        $this->seed(DevelopmentSeeder::class);
        $buyer = User::where('role', 'buyer')->where('status', 'active')->firstOrFail();
        $this->actingAs($buyer, 'sanctum');

        $cart = $this->captureQueries(fn () => $this->getJson('/api/cart')->assertOk());
        $wishlist = $this->captureQueries(fn () => $this->getJson('/api/wishlists')->assertOk());
        $notifications = $this->captureQueries(fn () => $this->getJson('/api/notifications?limit=5')->assertOk());

        $this->assertLessThanOrEqual(5, count($cart));
        $this->assertLessThanOrEqual(4, count($wishlist));
        $this->assertLessThanOrEqual(3, count($notifications));
    }

    public function test_admin_endpoints_stay_within_query_budgets(): void
    {
        $this->seed(DevelopmentSeeder::class);
        $admin = User::where('role', 'admin')->where('status', 'active')->firstOrFail();
        $this->actingAs($admin, 'sanctum');

        $dashboard = $this->captureQueries(fn () => $this->getJson('/api/admin/dashboard?days=30')->assertOk());
        $reports = $this->captureQueries(fn () => $this->getJson('/api/admin/reports')->assertOk());
        $applications = $this->captureQueries(fn () => $this->getJson('/api/admin/seller-applications?status=pending&per_page=1')->assertOk());
        $disputes = $this->captureQueries(fn () => $this->getJson('/api/admin/disputes')->assertOk());

        $this->assertLessThanOrEqual(7, count($dashboard));
        $this->assertLessThanOrEqual(4, count($reports));
        $this->assertLessThanOrEqual(6, count($applications));
        $this->assertLessThanOrEqual(7, count($disputes));
        $this->assertStringNotContainsString('seller_documents', strtolower(implode("\n", $applications)));
    }

    private function captureQueries(callable $request): array
    {
        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $request();

        return $queries;
    }
}
