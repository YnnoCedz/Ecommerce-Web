<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class PsgcService
{
    private const CACHE_TTL = 86400;

    private const CACHE_VERSION = 'v3';

    public function regions(): array
    {
        return $this->collection('psgc.regions', '/regions');
    }

    public function provinces(string $regionCode): array
    {
        return $this->collection("psgc.region.{$regionCode}.provinces", "/regions/{$regionCode}/provinces");
    }

    public function citiesByRegion(string $regionCode): array
    {
        return $this->collection("psgc.region.{$regionCode}.cities", "/regions/{$regionCode}/cities-municipalities", true);
    }

    public function citiesByProvince(string $provinceCode): array
    {
        return $this->collection("psgc.province.{$provinceCode}.cities", "/provinces/{$provinceCode}/cities-municipalities", true);
    }

    public function barangays(string $cityCode): array
    {
        return $this->collection("psgc.city.{$cityCode}.barangays", "/cities-municipalities/{$cityCode}/barangays", true, $cityCode);
    }

    public function city(string $cityCode): array
    {
        return Cache::remember($this->cacheKey("city.{$cityCode}"), self::CACHE_TTL, function () use ($cityCode) {
            $data = $this->get("/cities-municipalities/{$cityCode}")['data'] ?? null;

            if (! is_array($data) || empty($data['code']) || empty($data['name'])) {
                throw new \RuntimeException('PSGC returned an invalid city response.');
            }

            return $this->normalize($data, true);
        });
    }

    public function validateHierarchy(array $input): array
    {
        $geography = $this->validateMunicipality($input);
        $city = ['code' => $geography['city_code'], 'name' => $geography['city'], 'postal_code' => $geography['postal_code'] ?? ''];
        $barangay = $this->find($this->barangays($city['code']), $input['barangay_code']);
        if (! $barangay) {
            throw ValidationException::withMessages(['barangay_code' => ['The selected barangay does not belong to this city or municipality.']]);
        }

        return [
            ...$geography,
            'barangay_code' => $barangay['code'], 'barangay' => $barangay['name'],
            'postal_code' => trim((string) ($barangay['postal_code'] ?: $city['postal_code'] ?: ($input['postal_code'] ?? ''))),
        ];
    }

    public function validateMunicipality(array $input): array
    {
        $region = $this->find($this->regions(), $input['region_code']);
        if (! $region) {
            throw ValidationException::withMessages(['region_code' => ['The selected region is invalid.']]);
        }

        $provinces = $this->provinces($region['code']);
        $province = null;
        if ($provinces !== []) {
            $province = $this->find($provinces, $input['province_code'] ?? null);
            if (! $province) {
                throw ValidationException::withMessages(['province_code' => ['The selected province does not belong to this region.']]);
            }
            $cities = $this->citiesByProvince($province['code']);
        } else {
            if (! empty($input['province_code'])) {
                throw ValidationException::withMessages(['province_code' => ['This region does not use a province selection.']]);
            }
            $cities = $this->citiesByRegion($region['code']);
        }

        $city = $this->find($cities, $input['city_code']);
        if (! $city) {
            throw ValidationException::withMessages(['city_code' => ['The selected city or municipality does not belong to the selected parent.']]);
        }

        return [
            'region_code' => $region['code'], 'region' => $region['name'],
            'province_code' => $province['code'] ?? null, 'province' => $province['name'] ?? null,
            'city_code' => $city['code'], 'city' => $city['name'],
            'postal_code' => trim((string) ($city['postal_code'] ?: ($input['postal_code'] ?? ''))),
        ];
    }

    private function collection(string $key, string $path, bool $postalCode = false, ?string $parentCityCode = null): array
    {
        return Cache::remember($this->cacheKey($key), self::CACHE_TTL, function () use ($path, $postalCode, $parentCityCode) {
            $data = $this->get($path)['data'] ?? null;
            if (! is_array($data)) {
                throw new \RuntimeException('PSGC returned an invalid response.');
            }

            return array_values(array_map(
                fn (array $item) => $this->normalize($item, $postalCode, $parentCityCode),
                $data
            ));
        });
    }

    private function get(string $path): array
    {
        return Http::baseUrl(rtrim((string) config('services.psgc.url'), '/'))
            ->acceptJson()->connectTimeout(5)->timeout(12)->retry(2, 200)
            ->get($path)->throw()->json();
    }

    private function normalize(array $item, bool $postalCode = false, ?string $parentCityCode = null): array
    {
        $locationCode = $parentCityCode ?: (string) $item['code'];
        $providerPostalCode = (string) ($item['zip_code'] ?? '');

        return array_filter([
            'code' => (string) $item['code'],
            'name' => $this->normalizeName((string) $item['name']),
            'postal_code' => $postalCode ? $this->postalCode($locationCode, $providerPostalCode) : null,
        ], fn ($value) => $value !== null);
    }

    private function postalCode(string $cityCode, string $providerValue): string
    {
        return (string) config("postal_codes.municipalities.{$cityCode}", $providerValue);
    }

    private function normalizeName(string $name): string
    {
        $decoded = preg_match('/%(?:[0-9A-Fa-f]{2})/', $name) ? rawurldecode($name) : $name;
        $decoded = str_replace(['ÃƒÂ±', 'ÃƒÂ‘', 'Ã±', 'Ã‘'], ['ñ', 'Ñ', 'ñ', 'Ñ'], $decoded);

        if (class_exists(\Normalizer::class)) {
            $decoded = \Normalizer::normalize($decoded, \Normalizer::FORM_C) ?: $decoded;
        }

        return str_ireplace(
            ['Santo Nino', 'Santo-Nino'],
            ['Santo Niño', 'Santo-Niño'],
            $decoded
        );
    }

    private function cacheKey(string $key): string
    {
        return 'psgc.'.self::CACHE_VERSION.'.'.preg_replace('/^psgc\./', '', $key);
    }

    private function find(array $items, ?string $code): ?array
    {
        foreach ($items as $item) {
            if ($code !== null && hash_equals((string) $item['code'], $code)) {
                return $item;
            }
        }

        return null;
    }
}
