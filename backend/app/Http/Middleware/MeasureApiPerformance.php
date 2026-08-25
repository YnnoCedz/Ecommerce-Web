<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class MeasureApiPerformance
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('performance.logging_enabled')) {
            return $next($request);
        }

        $queryCount = 0;
        $databaseMs = 0.0;
        $slowestQueryMs = 0.0;
        DB::listen(function (QueryExecuted $query) use (&$queryCount, &$databaseMs, &$slowestQueryMs): void {
            $queryCount++;
            $databaseMs += $query->time;
            $slowestQueryMs = max($slowestQueryMs, $query->time);
        });

        $startedAt = hrtime(true);
        $response = null;

        try {
            $response = $next($request);

            return $response;
        } finally {
            $totalMs = (hrtime(true) - $startedAt) / 1_000_000;

            Log::info('API performance', [
                'method' => $request->method(),
                'path' => $request->path(),
                'status' => $response?->getStatusCode(),
                'total_ms' => round($totalMs, 2),
                'database_ms' => round($databaseMs, 2),
                'application_ms' => round(max(0, $totalMs - $databaseMs), 2),
                'query_count' => $queryCount,
                'slowest_query_ms' => round($slowestQueryMs, 2),
                'peak_memory_mb' => round(memory_get_peak_usage(true) / 1_048_576, 2),
            ]);
        }
    }
}
