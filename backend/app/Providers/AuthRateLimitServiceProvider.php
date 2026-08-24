<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AuthRateLimitServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request): array {
            $email = Str::lower(trim((string) $request->input('email')));

            return [
                Limit::perMinute(5)->by("login-email:{$email}|{$request->ip()}"),
                Limit::perMinute(30)->by("login-ip:{$request->ip()}"),
            ];
        });

        RateLimiter::for('registration', function (Request $request): array {
            $email = Str::lower(trim((string) $request->input('email')));

            return [
                Limit::perMinute(5)->by("registration-email:{$email}|{$request->ip()}"),
                Limit::perMinute(20)->by("registration-ip:{$request->ip()}"),
            ];
        });
    }
}
