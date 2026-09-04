<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceProfile;
use App\Models\UserDocument;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use App\Services\PsgcService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketplaceApplicationController extends Controller
{
    public function current(Request $request): JsonResponse
    {
        $profile = $request->user()->marketplaceProfile()->first();

        return response()->json(['data' => $profile ? [
            'status' => $profile->status,
            'submitted_at' => optional($profile->submitted_at)->toISOString(),
            'reviewed_at' => optional($profile->approved_at ?? $profile->rejected_at)->toISOString(),
            'rejection_reason' => $profile->rejection_reason,
        ] : null]);
    }

    public function store(Request $request, PsgcService $psgc, MediaStorageService $storage): JsonResponse
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Administrators cannot apply for Marketplace access.', 'code' => 'marketplace_access_invalid'], 403);
        }
        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Verify your email before applying.', 'code' => 'email_unverified'], 403);
        }
        if ($user->marketplaceProfile()->exists()) {
            return response()->json(['message' => 'A Marketplace application already exists.', 'code' => 'marketplace_application_exists'], 409);
        }

        $maxKb = max(1024, (int) config('courier.document_max_kilobytes', 8192));
        $data = $request->validate([
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['required', 'string', 'size:10'],
            'barangay_code' => ['required', 'string', 'size:10'],
            'postal_code' => ['required', 'string', 'max:20'],
            'id_document' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.$maxKb],
        ]);
        $data = array_merge($data, $psgc->validateHierarchy($data));

        $stored = $storage->storePrivateFile(
            $request->file('id_document'),
            "user-registration-ids/{$user->id}",
            (string) config('courier.document_disk', 'r2'),
        );

        try {
            $profile = DB::transaction(function () use ($user, $data, $stored, $request) {
                if (MarketplaceProfile::where('user_id', $user->id)->lockForUpdate()->exists()) {
                    return null;
                }

                $makeDefaultAddress = ! $user->addresses()->exists();
                $user->addresses()->create([
                    'label' => 'Home', 'recipient_name' => $user->display_name,
                    'phone' => $user->phone ?? $user->mobile,
                    'line1' => trim($data['address_line1']), 'line2' => $data['address_line2'] ?? null,
                    'region' => $data['region'], 'region_code' => $data['region_code'],
                    'province' => $data['province'] ?? null, 'province_code' => $data['province_code'] ?? null,
                    'city' => $data['city'], 'city_code' => $data['city_code'],
                    'barangay' => $data['barangay'], 'barangay_code' => $data['barangay_code'],
                    'postal_code' => $data['postal_code'], 'is_default' => $makeDefaultAddress,
                ]);

                UserDocument::create([
                    'user_id' => $user->id, 'document_type' => UserDocument::TYPE_GOVERNMENT_ID,
                    'storage_disk' => $stored['storage_disk'], 'file_path' => $stored['storage_path'],
                    'original_filename' => $stored['original_filename'], 'mime_type' => $stored['mime_type'],
                    'file_size' => $stored['file_size'], 'status' => 'pending', 'uploaded_at' => now(),
                ]);

                $profile = MarketplaceProfile::create([
                    'user_id' => $user->id, 'status' => 'pending', 'submitted_at' => now(),
                ]);
                app(ActivityLogger::class)->log('marketplace.application.submitted', 'marketplace', 'Marketplace application submitted.', $user, $request, $profile);

                return $profile;
            });
        } catch (\Throwable $exception) {
            $storage->delete($stored['storage_path'], $stored['storage_disk']);
            throw $exception;
        }

        if (! $profile) {
            $storage->delete($stored['storage_path'], $stored['storage_disk']);

            return response()->json(['message' => 'A Marketplace application already exists.', 'code' => 'marketplace_application_exists'], 409);
        }

        return response()->json(['message' => 'Marketplace application submitted.', 'data' => ['status' => 'pending']], 201);
    }
}
