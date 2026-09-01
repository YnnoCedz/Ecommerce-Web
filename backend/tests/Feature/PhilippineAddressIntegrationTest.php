<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PhilippineAddressIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_location_endpoints_normalize_and_cache_psgc_responses(): void
    {
        $this->fakePsgc();

        $this->getJson('/api/locations/regions')->assertOk()->assertExactJson([
            'data' => [['code' => '0400000000', 'name' => 'Region IV-A (CALABARZON)']],
        ]);
        $this->getJson('/api/locations/regions/0400000000/provinces')->assertOk()->assertJsonPath('data.0.name', 'Cavite');
        $this->getJson('/api/locations/provinces/0402100000/cities-municipalities')->assertOk()->assertJsonPath('data.0.postal_code', '4114');
        $this->getJson('/api/locations/cities-municipalities/0402106000/barangays')->assertOk()->assertJsonPath('data.0.name', 'Paliparan III');

        $this->getJson('/api/locations/regions')->assertOk();
        Http::assertSentCount(4);
    }

    public function test_provider_failure_returns_controlled_503(): void
    {
        Http::fake(fn () => Http::response(['message' => 'down'], 503));

        $this->getJson('/api/locations/regions')->assertStatus(503)->assertExactJson([
            'message' => 'Address reference service is temporarily unavailable.',
            'code' => 'address_reference_unavailable',
        ]);
    }

    public function test_phlpost_corrections_override_stale_psgc_zip_codes(): void
    {
        Http::fake([
            '*/provinces/0403400000/cities-municipalities' => Http::response(['data' => [
                ['code' => '0403409000', 'name' => 'Kalayaan', 'zip_code' => '4014'],
                ['code' => '0403413000', 'name' => 'Lumban', 'zip_code' => '4015'],
            ]]),
            '*/cities-municipalities/0403413000/barangays' => Http::response(['data' => [
                ['code' => '0403413001', 'name' => 'Bagong Silang', 'zip_code' => '4015'],
            ]]),
        ]);

        $this->getJson('/api/locations/provinces/0403400000/cities-municipalities')
            ->assertOk()
            ->assertJsonPath('data.0.postal_code', '4015')
            ->assertJsonPath('data.1.postal_code', '4014');

        $this->getJson('/api/locations/cities-municipalities/0403413000/barangays')
            ->assertOk()
            ->assertJsonPath('data.0.postal_code', '4014');
    }

    public function test_santo_nino_uses_the_correct_enye(): void
    {
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '0400000000', 'name' => 'Region IV-A']]]),
            '*/regions/0400000000/provinces' => Http::response(['data' => []]),
            '*/regions/0400000000/cities-municipalities' => Http::response(['data' => [
                ['code' => '1374040000', 'name' => 'Santo Nino', 'zip_code' => '1000'],
                ['code' => '1374040001', 'name' => 'Santo Ni%C3%B1o', 'zip_code' => '1000'],
            ]]),
        ]);

        $this->getJson('/api/locations/regions/0400000000/cities-municipalities')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Santo Niño')
            ->assertJsonPath('data.1.name', 'Santo Niño');
    }

    public function test_uppercase_and_lowercase_enye_are_preserved_at_every_psgc_level(): void
    {
        Http::fake([
            '*/regions/9900000000/provinces' => Http::response(['data' => [
                ['code' => '9900100000', 'name' => 'Peña Province'],
                ['code' => '9900200000', 'name' => 'Ñandú Province'],
            ]]),
            '*/provinces/9900100000/cities-municipalities' => Http::response(['data' => [
                ['code' => '9900101000', 'name' => 'Las Piñas', 'zip_code' => '1700'],
                ['code' => '9900102000', 'name' => 'Ñueva City', 'zip_code' => '1701'],
            ]]),
            '*/cities-municipalities/9900101000/barangays' => Http::response(['data' => [
                ['code' => '9900101001', 'name' => 'Santo Niño', 'zip_code' => '1700'],
                ['code' => '9900101002', 'name' => 'Ñarra', 'zip_code' => '1700'],
            ]]),
        ]);

        $this->getJson('/api/locations/regions/9900000000/provinces')->assertOk()
            ->assertJsonPath('data.0.name', 'Peña Province')->assertJsonPath('data.1.name', 'Ñandú Province');
        $this->getJson('/api/locations/provinces/9900100000/cities-municipalities')->assertOk()
            ->assertJsonPath('data.0.name', 'Las Piñas')->assertJsonPath('data.1.name', 'Ñueva City');
        $this->getJson('/api/locations/cities-municipalities/9900101000/barangays')->assertOk()
            ->assertJsonPath('data.0.name', 'Santo Niño')->assertJsonPath('data.1.name', 'Ñarra');
    }

    public function test_valid_hierarchy_is_canonicalized_and_invalid_hierarchy_is_rejected(): void
    {
        $this->fakePsgc();
        $buyer = User::factory()->create();

        $valid = $this->actingAs($buyer)->postJson('/api/account/addresses', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.region', 'Region IV-A (CALABARZON)')
            ->assertJsonPath('data.province', 'Cavite')
            ->assertJsonPath('data.city', 'City of Dasmariñas')
            ->assertJsonPath('data.barangay', 'Paliparan III')
            ->assertJsonPath('data.postal_code', '4114');

        $this->assertDatabaseHas('addresses', ['id' => $valid->json('data.id'), 'city_code' => '0402106000']);

        $this->actingAs($buyer)->postJson('/api/account/addresses', [
            ...$this->payload(),
            'city_code' => '0722170000',
        ])->assertUnprocessable()->assertJsonValidationErrors(['city_code']);
    }

    public function test_province_less_region_hierarchy_is_accepted(): void
    {
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '1300000000', 'name' => 'National Capital Region (NCR)']]]),
            '*/regions/1300000000/provinces' => Http::response(['data' => []]),
            '*/regions/1300000000/cities-municipalities' => Http::response(['data' => [['code' => '1374040000', 'name' => 'Quezon City', 'zip_code' => '1100']]]),
            '*/cities-municipalities/1374040000/barangays' => Http::response(['data' => [['code' => '1374040001', 'name' => 'Bagong Pag-asa', 'zip_code' => '1105']]]),
        ]);
        $buyer = User::factory()->create();

        $this->actingAs($buyer)->postJson('/api/account/addresses', [
            ...$this->payload(),
            'region_code' => '1300000000', 'province_code' => null,
            'city_code' => '1374040000', 'barangay_code' => '1374040001',
        ])->assertCreated()->assertJsonPath('data.province', null)->assertJsonPath('data.postal_code', '1105');
    }

    private function payload(): array
    {
        return ['label' => 'Home', 'recipient_name' => 'Juan Dela Cruz', 'phone' => '+639171234567', 'line1' => '123 Sample Street', 'line2' => null, 'region_code' => '0400000000', 'province_code' => '0402100000', 'city_code' => '0402106000', 'barangay_code' => '0402106012', 'postal_code' => '9999'];
    }

    private function fakePsgc(): void
    {
        Http::fake([
            '*/regions' => Http::response(['data' => [['code' => '0400000000', 'name' => 'Region IV-A (CALABARZON)']]]),
            '*/regions/0400000000/provinces' => Http::response(['data' => [['code' => '0402100000', 'name' => 'Cavite']]]),
            '*/provinces/0402100000/cities-municipalities' => Http::response(['data' => [['code' => '0402106000', 'name' => 'City of Dasmariñas', 'zip_code' => '4114']]]),
            '*/cities-municipalities/0402106000/barangays' => Http::response(['data' => [['code' => '0402106012', 'name' => 'Paliparan III', 'zip_code' => '4114']]]),
        ]);
    }
}
