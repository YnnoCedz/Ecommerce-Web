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
}
