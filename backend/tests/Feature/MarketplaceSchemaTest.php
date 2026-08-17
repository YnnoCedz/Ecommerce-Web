<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketplaceSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seed_creates_core_marketplace_records(): void
    {
        $this->seed();

        $this->assertDatabaseHas('users', ['email' => 'ana.reyes@email.com']);
        $this->assertDatabaseHas('sellers', ['slug' => 'verde-botanics']);
        $this->assertDatabaseHas('products', ['sku' => 'VB-SRM-001']);
    }
}

