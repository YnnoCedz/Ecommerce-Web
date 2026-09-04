<?php

namespace App\Providers;

use App\Services\CapabilityResolver;
use Illuminate\Support\ServiceProvider;

class CapabilityServiceProvider extends ServiceProvider
{
    /**
     * Request-scoped so capability derivation is memoised for the lifetime of a
     * single request and never leaks across requests - an administrator
     * suspending an account must take effect on the very next request.
     */
    public function register(): void
    {
        $this->app->scoped(CapabilityResolver::class);
    }
}
