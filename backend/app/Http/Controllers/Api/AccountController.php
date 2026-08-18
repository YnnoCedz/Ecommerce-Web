<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $data = $request->validate([
            'label' => ['required', 'string', 'max:120'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'line1' => ['required', 'string', 'max:255'],
            'line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'province' => ['required', 'string', 'max:120'],
            'postal_code' => ['required', 'string', 'max:20'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();

        if ($request->boolean('is_default')) {
            $user->addresses()->update(['is_default' => false]);
        }

        $address = $user->addresses()->create([
            'label' => $data['label'],
            'recipient_name' => $data['recipient_name'],
            'phone' => $data['phone'],
            'line1' => $data['line1'],
            'line2' => $data['line2'] ?? null,
            'city' => $data['city'],
            'province' => $data['province'],
            'postal_code' => $data['postal_code'],
            'is_default' => $request->boolean('is_default'),
        ]);

        return response()->json([
            'message' => 'Address saved.',
            'data' => [
                'id' => $address->id,
            ],
        ], 201);
    }
}
