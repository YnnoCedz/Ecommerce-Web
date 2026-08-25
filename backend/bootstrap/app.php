<?php

use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureSellerApproved;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\MeasureApiPerformance;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/health',
        then: function () {
            Route::get('/up', fn () => response('OK', 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
            ]));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(append: [MeasureApiPerformance::class]);

        $middleware->alias([
            'account.active' => EnsureAccountIsActive::class,
            'role' => EnsureUserRole::class,
            'seller.approved' => EnsureSellerApproved::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
