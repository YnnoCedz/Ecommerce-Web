<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_registration_are_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => 'missing@example.com',
                'password' => 'WrongPassword123!',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', [
            'email' => 'missing@example.com',
            'password' => 'WrongPassword123!',
        ])->assertTooManyRequests();

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.2'])
                ->postJson('/api/auth/register', [])
                ->assertUnprocessable();
        }

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.2'])
            ->postJson('/api/auth/register', [])
            ->assertTooManyRequests();
    }
}
