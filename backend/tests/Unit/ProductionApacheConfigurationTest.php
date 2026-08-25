<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ProductionApacheConfigurationTest extends TestCase
{
    public function test_authorization_header_is_forwarded_to_laravel(): void
    {
        $configuration = file_get_contents(dirname(__DIR__, 2).'/docker/apache-maketo.conf');

        $this->assertIsString($configuration);
        $this->assertStringContainsString('RewriteCond %{HTTP:Authorization} .', $configuration);
        $this->assertStringContainsString(
            'RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]',
            $configuration,
        );
    }

    public function test_prefork_worker_limit_is_explicit_and_bounded(): void
    {
        $configuration = file_get_contents(dirname(__DIR__, 2).'/docker/apache-maketo.conf');

        $this->assertIsString($configuration);
        $this->assertMatchesRegularExpression('/ServerLimit\s+4\b/', $configuration);
        $this->assertMatchesRegularExpression('/MaxRequestWorkers\s+4\b/', $configuration);
        $this->assertDoesNotMatchRegularExpression('/MaxRequestWorkers\s+(?:[1-9]\d{2,}|[5-9]\d*)\b/', $configuration);
    }
}
