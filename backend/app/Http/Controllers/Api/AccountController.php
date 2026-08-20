<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AccountController extends Controller
{
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
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
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
            'remember_token' => \Illuminate\Support\Str::random(60),
        ])->save();

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

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
}
