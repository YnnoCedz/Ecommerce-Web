<?php

namespace Tests\Feature;

use Database\Seeders\CourierE2ESeeder;
use RuntimeException;
use Tests\TestCase;

class CourierE2ESeederSafetyTest extends TestCase
{
    public function test_e2e_seeder_refuses_non_local_test_environment(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('restricted to local maketo_local');

        (new CourierE2ESeeder)->run();
    }
}
