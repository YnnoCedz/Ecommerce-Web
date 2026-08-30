<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProductionCorsTest extends TestCase
{
    private const FRONTEND_ORIGIN = 'https://marketohub.online';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('cors.allowed_origins', [self::FRONTEND_ORIGIN]);
        config()->set('cors.supports_credentials', false);
    }

    public function test_production_frontend_can_preflight_required_api_routes(): void
    {
        foreach ([
            ['api/categories', 'GET'],
            ['api/auth/me', 'GET'],
            ['api/auth/login', 'POST'],
        ] as [$path, $method]) {
            $this->call('OPTIONS', $path, server: [
                'HTTP_ORIGIN' => self::FRONTEND_ORIGIN,
                'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => $method,
                'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,content-type',
            ])->assertNoContent()
                ->assertHeader('Access-Control-Allow-Origin', self::FRONTEND_ORIGIN)
                ->assertHeader('Access-Control-Allow-Methods', $method);
        }
    }

    public function test_unknown_origin_is_not_allowed(): void
    {
        $response = $this->call('OPTIONS', 'api/auth/login', server: [
            'HTTP_ORIGIN' => 'https://untrusted.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type',
        ]);

        $response->assertNoContent();
        $this->assertNotSame(
            'https://untrusted.example',
            $response->headers->get('Access-Control-Allow-Origin'),
        );
    }

    public function test_cross_site_frontend_can_post_login_without_csrf_cookie(): void
    {
        $this->withHeaders([
            'Origin' => self::FRONTEND_ORIGIN,
        ])->postJson('/api/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password'])
            ->assertHeader('Access-Control-Allow-Origin', self::FRONTEND_ORIGIN);
    }
}
