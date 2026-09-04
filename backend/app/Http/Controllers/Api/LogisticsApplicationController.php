<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogisticsDocument;
use App\Models\LogisticsProviderApplication;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use App\Services\PsgcService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LogisticsApplicationController extends Controller
{
    private const DOCUMENTS = [
        'applicant_id' => LogisticsDocument::TYPE_APPLICANT_ID,
        'business_permit' => LogisticsDocument::TYPE_BUSINESS_PERMIT,
    ];

    public function current(Request $request): JsonResponse
    {
        $application = $request->user()->latestLogisticsProviderApplication()->with('documents')->first();

        return response()->json(['data' => $application ? $this->payload($application) : null]);
    }

    public function store(Request $request, PsgcService $psgc, MediaStorageService $storage): JsonResponse
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Administrators cannot submit logistics applications.', 'code' => 'logistics_application_invalid'], 403);
        }
        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Verify your email before applying.', 'code' => 'email_unverified'], 403);
        }
        if ($user->hasActiveLogisticsStaffProfile()) {
            return response()->json(['message' => 'This identity already has Logistics access.', 'code' => 'logistics_already_active'], 409);
        }
        if ($user->logisticsProviderApplications()->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'A logistics application is already awaiting review.', 'code' => 'logistics_application_pending'], 409);
        }

        $maxKb = max(1024, (int) config('courier.document_max_kilobytes', 8192));
        $fileRules = ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:'.$maxKb];
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'], 'legal_name' => ['nullable', 'string', 'max:255'],
            'address_line1' => ['required', 'string', 'max:255'], 'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'size:10'], 'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['required', 'string', 'size:10'], 'barangay_code' => ['required', 'string', 'size:10'],
            'postal_code' => ['required', 'string', 'max:20'],
            'applicant_id' => $fileRules, 'business_permit' => $fileRules,
        ]);
        $data = array_merge($data, $psgc->validateHierarchy($data));

        $uploaded = [];
        try {
            foreach (self::DOCUMENTS as $field => $type) {
                $uploaded[$type] = $storage->storePrivateFile($request->file($field), "logistics-documents/{$user->id}/{$type}");
            }

            $application = DB::transaction(function () use ($user, $data, $uploaded, $request) {
                if ($user->logisticsProviderApplications()->where('status', 'pending')->lockForUpdate()->exists()) {
                    return null;
                }
                $application = LogisticsProviderApplication::create([
                    'user_id' => $user->id, 'company_name' => trim($data['company_name']), 'legal_name' => $data['legal_name'] ?? null,
                    'contact_name' => $user->display_name, 'contact_email' => $user->email, 'contact_phone' => $user->phone ?? $user->mobile,
                    'address_line1' => trim($data['address_line1']), 'address_line2' => $data['address_line2'] ?? null,
                    'region_code' => $data['region_code'], 'region_label' => $data['region'],
                    'province_code' => $data['province_code'] ?? null, 'province_label' => $data['province'] ?? null,
                    'city_code' => $data['city_code'], 'city_label' => $data['city'],
                    'barangay_code' => $data['barangay_code'], 'barangay_label' => $data['barangay'],
                    'postal_code' => $data['postal_code'], 'status' => 'pending', 'submitted_at' => now(),
                ]);
                foreach ($uploaded as $type => $file) {
                    $application->documents()->create([
                        'document_type' => $type, 'storage_disk' => $file['storage_disk'], 'file_path' => $file['storage_path'],
                        'original_filename' => $file['original_filename'], 'mime_type' => $file['mime_type'],
                        'file_size' => $file['file_size'], 'status' => 'pending', 'uploaded_at' => now(),
                    ]);
                }
                app(ActivityLogger::class)->log('logistics.application.submitted', 'logistics', 'Logistics provider application submitted.', $user, $request, $application);

                return $application->load('documents');
            });
        } catch (\Throwable $exception) {
            foreach ($uploaded as $file) {
                try {
                    $storage->delete($file['storage_path'], $file['storage_disk']);
                } catch (\Throwable) {
                }
            }
            throw $exception;
        }

        if (! $application) {
            foreach ($uploaded as $file) {
                $storage->delete($file['storage_path'], $file['storage_disk']);
            }

            return response()->json(['message' => 'A logistics application is already awaiting review.', 'code' => 'logistics_application_pending'], 409);
        }

        return response()->json(['message' => 'Logistics provider application submitted.', 'data' => $this->payload($application)], 201);
    }

    private function payload(LogisticsProviderApplication $application): array
    {
        return [
            'id' => $application->id, 'status' => $application->status, 'company_name' => $application->company_name,
            'submitted_at' => optional($application->submitted_at)->toISOString(),
            'reviewed_at' => optional($application->reviewed_at)->toISOString(), 'rejection_reason' => $application->rejection_reason,
            'documents' => $application->relationLoaded('documents') ? $application->documents->map(fn ($document) => [
                'id' => $document->id, 'document_type' => $document->document_type,
                'original_filename' => $document->original_filename, 'status' => $document->status,
            ])->values() : [],
        ];
    }
}
