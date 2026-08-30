<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PsgcService;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    public function __construct(private readonly PsgcService $psgc) {}

    public function regions(): JsonResponse
    {
        return $this->respond(fn () => $this->psgc->regions());
    }

    public function provinces(string $regionCode): JsonResponse
    {
        return $this->respond(fn () => $this->psgc->provinces($regionCode));
    }

    public function regionCities(string $regionCode): JsonResponse
    {
        return $this->respond(fn () => $this->psgc->citiesByRegion($regionCode));
    }

    public function provinceCities(string $provinceCode): JsonResponse
    {
        return $this->respond(fn () => $this->psgc->citiesByProvince($provinceCode));
    }

    public function barangays(string $cityCode): JsonResponse
    {
        return $this->respond(fn () => $this->psgc->barangays($cityCode));
    }

    public function city(string $cityCode): JsonResponse
    {
        return $this->respond(fn () => $this->psgc->city($cityCode));
    }

    private function respond(callable $callback): JsonResponse
    {
        try {
            return response()->json(['data' => $callback()]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Address reference service is temporarily unavailable.',
                'code' => 'address_reference_unavailable',
            ], 503);
        }
    }
}
