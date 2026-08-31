<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PlatformSettingsService
{
    private const DEFINITIONS = [
        'platform_name' => ['type' => 'string', 'group' => 'general', 'default' => 'Maketo', 'rules' => ['string', 'min:2', 'max:80']],
        'support_email' => ['type' => 'string', 'group' => 'general', 'default' => 'support@marketohub.online', 'rules' => ['email', 'max:255']],
        'seller_document_expiry_warning_days' => ['type' => 'integer', 'group' => 'seller', 'default' => 30, 'rules' => ['integer', 'min:1', 'max:180']],
    ];

    public function all(): array
    {
        return collect(self::DEFINITIONS)->mapWithKeys(fn (array $definition, string $key) => [$key => $this->get($key)])->all();
    }

    public function get(string $key): mixed
    {
        $definition = self::DEFINITIONS[$key] ?? null;
        if (! $definition) {
            throw ValidationException::withMessages(['settings' => ["Unsupported platform setting: {$key}."]]);
        }

        return Cache::remember("platform_setting:{$key}", now()->addMinutes(10), function () use ($key, $definition) {
            $stored = PlatformSetting::where('key', $key)->value('value');

            return $stored === null ? $definition['default'] : $this->cast($stored, $definition['type']);
        });
    }

    public function set(string $key, mixed $value, User $actor): array
    {
        $definition = self::DEFINITIONS[$key] ?? null;
        if (! $definition) {
            throw ValidationException::withMessages(['settings' => ["Unsupported platform setting: {$key}."]]);
        }

        $validated = Validator::make(['value' => $value], ['value' => array_merge(['required'], $definition['rules'])])->validate()['value'];
        $previous = $this->get($key);
        $cast = $this->cast($validated, $definition['type']);

        PlatformSetting::updateOrCreate(['key' => $key], [
            'value' => $this->serialize($cast, $definition['type']),
            'type' => $definition['type'],
            'group' => $definition['group'],
            'is_public' => false,
            'updated_by' => $actor->id,
        ]);
        Cache::forget("platform_setting:{$key}");

        return ['previous' => $previous, 'current' => $cast];
    }

    private function cast(mixed $value, string $type): mixed
    {
        return match ($type) {
            'integer' => (int) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'decimal' => (float) $value,
            'json' => is_array($value) ? $value : json_decode((string) $value, true, flags: JSON_THROW_ON_ERROR),
            default => (string) $value,
        };
    }

    private function serialize(mixed $value, string $type): string
    {
        return $type === 'json' ? json_encode($value, JSON_THROW_ON_ERROR) : (string) $value;
    }
}
