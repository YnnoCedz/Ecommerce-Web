<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\UserPreference;
use App\Services\MediaStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Laravel\Sanctum\PersonalAccessToken;

class AccountController extends Controller
{
    public function updateProfile(Request $request, MediaStorageService $storage): JsonResponse
    {
        $phone = $this->normalizePhilippinePhone((string) $request->input('phone'));
        $request->merge(['phone' => $phone]);
        $user = $request->user();

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'avatar_file' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'remove_avatar' => ['nullable', 'boolean'],
            'phone' => [
                'required',
                'string',
                'regex:/^\+639\d{9}$/',
                Rule::unique('users', 'phone')->ignore($user->id),
                Rule::unique('users', 'mobile')->ignore($user->id),
            ],
        ], [
            'phone.regex' => 'Enter a valid Philippine mobile number.',
        ]);

        $oldAvatarPath = $user->avatar_path;
        $storedAvatar = null;
        $avatarPath = $request->boolean('remove_avatar') ? null : $oldAvatarPath;

        try {
            if ($request->hasFile('avatar_file')) {
                $storedAvatar = $storage->storePublicFile($request->file('avatar_file'), "user-avatars/{$user->id}");
                $avatarPath = $storedAvatar['storage_path'];
            }

            $user->forceFill([
                'first_name' => trim($data['first_name']),
                'last_name' => trim($data['last_name']),
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'phone' => $data['phone'],
                'mobile' => $data['phone'],
                'avatar_path' => $avatarPath,
            ])->save();
        } catch (\Throwable $e) {
            if ($storedAvatar) {
                try {
                    $storage->delete($storedAvatar['storage_path'], $storedAvatar['storage_disk'] ?? 'r2');
                } catch (\Throwable) {
                }
            }

            throw $e;
        }

        if ($oldAvatarPath && $oldAvatarPath !== $avatarPath) {
            try {
                $storage->delete($oldAvatarPath, 'r2');
            } catch (\Throwable) {
            }
        }

        return response()->json([
            'message' => 'Profile updated.',
            'data' => [
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'display_name' => $user->display_name,
                'avatar_url' => $avatarPath ? $storage->publicUrl($avatarPath) : null,
                'email' => $user->email,
                'phone' => $user->phone,
                'mobile' => $user->mobile,
            ],
        ]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $preferences = $request->user()->preference()->firstOrCreate([]);

        return response()->json(['data' => $this->preferencePayload($preferences)]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'language' => ['required', Rule::in(['en-PH', 'fil-PH', 'ceb-PH'])],
            'currency' => ['required', Rule::in(['PHP'])],
            'number_format' => ['required', Rule::in(['1,000.00', '1.000,00'])],
            'recommendations_enabled' => ['required', 'boolean'],
            'recently_viewed_enabled' => ['required', 'boolean'],
            'price_drop_alerts_enabled' => ['required', 'boolean'],
            'analytics_cookies_enabled' => ['required', 'boolean'],
            'marketing_cookies_enabled' => ['required', 'boolean'],
        ]);

        $preferences = $request->user()->preference()->updateOrCreate([], $data);

        return response()->json([
            'message' => 'Preferences saved.',
            'data' => $this->preferencePayload($preferences),
        ]);
    }

    public function addresses(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => $user->addresses()
                ->latest('id')
                ->get()
                ->map(fn ($address) => [
                    'id' => $address->id,
                    'label' => $address->label,
                    'recipient_name' => $address->recipient_name,
                    'phone' => $address->phone,
                    'line1' => $address->line1,
                    'line2' => $address->line2,
                    'city' => $address->city,
                    'province' => $address->province,
                    'postal_code' => $address->postal_code,
                    'is_default' => (bool) $address->is_default,
                ])
                ->values(),
        ]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $data = $this->validateAddress($request);

        $user = $request->user();
        $address = DB::transaction(function () use ($user, $data) {
            $isDefault = (bool) ($data['is_default'] ?? false) || ! $user->addresses()->exists();

            if ($isDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create([
                ...$data,
                'line2' => $data['line2'] ?? null,
                'is_default' => $isDefault,
            ]);
        });

        return response()->json([
            'message' => 'Address saved.',
            'data' => $this->addressPayload($address),
        ], 201);
    }

    public function updateAddress(Request $request, int $addressId): JsonResponse
    {
        $data = $this->validateAddress($request);
        $user = $request->user();

        $address = DB::transaction(function () use ($user, $addressId, $data) {
            $address = $user->addresses()->whereKey($addressId)->firstOrFail();

            if (($data['is_default'] ?? false) === true) {
                $user->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
            }

            $address->update([
                ...$data,
                'line2' => $data['line2'] ?? null,
                'is_default' => ($data['is_default'] ?? false) || $address->is_default,
            ]);

            return $address->fresh();
        });

        return response()->json([
            'message' => 'Address updated.',
            'data' => $this->addressPayload($address),
        ]);
    }

    public function destroyAddress(Request $request, int $addressId): JsonResponse
    {
        DB::transaction(function () use ($request, $addressId) {
            $user = $request->user();
            $address = $user->addresses()->whereKey($addressId)->firstOrFail();
            $wasDefault = (bool) $address->is_default;
            $address->delete();

            if ($wasDefault) {
                $user->addresses()->latest('id')->first()?->update(['is_default' => true]);
            }
        });

        return response()->json(['message' => 'Address removed.']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'max:16', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'code' => 'current_password_invalid',
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'remember_token' => Str::random(60),
        ])->save();

        $sessions = DB::table('sessions')->where('user_id', $user->id);
        $sessions->delete();

        $currentToken = $user->currentAccessToken();
        $currentTokenId = $currentToken instanceof PersonalAccessToken
            ? $currentToken->getKey()
            : null;
        $otherTokens = $user->tokens();
        if ($currentTokenId) {
            $otherTokens->whereKeyNot($currentTokenId);
        }
        $otherTokens->delete();

        return response()->json([
            'message' => 'Password updated.',
        ]);
    }

    private function validateAddress(Request $request): array
    {
        $request->merge([
            'phone' => preg_replace('/[\s()-]+/', '', (string) $request->input('phone')),
            'postal_code' => trim((string) $request->input('postal_code')),
        ]);

        return $request->validate([
            'label' => ['required', 'string', 'max:120'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'regex:/^(?:\+639|09)\d{9}$/'],
            'line1' => ['required', 'string', 'max:255'],
            'line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'province' => ['required', 'string', 'max:120'],
            'postal_code' => ['required', 'regex:/^\d{4}$/'],
            'is_default' => ['sometimes', 'boolean'],
        ], [
            'phone.regex' => 'Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).',
            'postal_code.regex' => 'The postal code must contain exactly 4 digits.',
        ]);
    }

    private function addressPayload(Address $address): array
    {
        return [
            'id' => $address->id,
            'label' => $address->label,
            'recipient_name' => $address->recipient_name,
            'phone' => $address->phone,
            'line1' => $address->line1,
            'line2' => $address->line2,
            'city' => $address->city,
            'province' => $address->province,
            'postal_code' => $address->postal_code,
            'is_default' => (bool) $address->is_default,
        ];
    }

    private function preferencePayload(UserPreference $preferences): array
    {
        return [
            'language' => $preferences->language,
            'currency' => $preferences->currency,
            'number_format' => $preferences->number_format,
            'recommendations_enabled' => (bool) $preferences->recommendations_enabled,
            'recently_viewed_enabled' => (bool) $preferences->recently_viewed_enabled,
            'price_drop_alerts_enabled' => (bool) $preferences->price_drop_alerts_enabled,
            'analytics_cookies_enabled' => (bool) $preferences->analytics_cookies_enabled,
            'marketing_cookies_enabled' => (bool) $preferences->marketing_cookies_enabled,
        ];
    }

    private function normalizePhilippinePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '63')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '09')) {
            return '+63'.substr($digits, 1);
        }

        if (str_starts_with($digits, '9')) {
            return '+63'.$digits;
        }

        return $phone;
    }
}
