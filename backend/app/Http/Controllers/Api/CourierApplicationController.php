<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\CourierApplication;
use App\Models\CourierDocument;
use App\Models\LogisticsProvider;
use App\Models\LogisticsStaff;
use App\Models\MarketplaceNotification;
use App\Models\User;
use App\Notifications\CourierApplicationReviewedNotification;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use App\Services\PsgcService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CourierApplicationController extends Controller
{
    private const DOCUMENT_FIELDS = [
        'driver_license_image' => 'driver_license',
        'vehicle_or_image' => 'vehicle_or',
        'vehicle_cr_image' => 'vehicle_cr',
    ];

    public function current(Request $request): JsonResponse
    {
        $application = CourierApplication::query()
            ->with(['documents', 'reviewer', 'approvedCourier', 'provider:id,code,company_name'])
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->first();

        return response()->json([
            'data' => $application ? $this->applicationPayload($application, true) : null,
            'eligible' => ! $request->user()->isAdmin(),
        ]);
    }

    public function store(Request $request, MediaStorageService $storage, PsgcService $psgc): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'Administrator accounts cannot submit courier applications.',
                'code' => 'courier_application_role_invalid',
            ], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email address before applying to become a courier.',
                'code' => 'email_verification_required',
            ], 403);
        }

        if ($user->courier()->where('status', 'active')->exists()) {
            return response()->json([
                'message' => 'Your courier account is already active.',
                'code' => 'courier_already_active',
            ], 409);
        }

        if ($user->courierApplications()->where('status', 'pending')->exists()) {
            return response()->json([
                'message' => 'You already have a courier application in progress.',
                'code' => 'courier_application_pending',
            ], 409);
        }

        $request->merge([
            'mobile' => trim((string) $request->input('mobile', '')),
            'vehicle_plate_number' => strtoupper(trim((string) $request->input('vehicle_plate_number', ''))),
        ]);

        $maxKb = max(1024, (int) config('courier.document_max_kilobytes', 8192));
        $imageRules = ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.$maxKb];
        $currentYear = (int) now()->year + 1;

        $data = $request->validate([
            'mobile' => ['required', 'string', 'regex:/^\+639\d{9}$/'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['required', 'string', 'size:10'],
            'barangay_code' => ['required', 'string', 'size:10'],
            'postal_code' => ['required', 'string', 'max:20'],
            'logistics_provider_id' => ['required', 'integer', 'exists:logistics_providers,id'],
            'vehicle_type' => ['required', Rule::in(['motorcycle', 'car', 'van'])],
            'vehicle_make' => ['required', 'string', 'max:100'],
            'vehicle_model' => ['required', 'string', 'max:100'],
            'vehicle_year' => ['required', 'integer', 'min:1980', 'max:'.$currentYear],
            'vehicle_plate_number' => ['required', 'string', 'max:30'],
            'vehicle_color' => ['required', 'string', 'max:50'],
            'driver_license_image' => $imageRules,
            'vehicle_or_image' => $imageRules,
            'vehicle_cr_image' => $imageRules,
        ], [
            'mobile.regex' => 'The mobile number must use the format +639XXXXXXXXX.',
            '*.image' => 'Each courier document must be a valid image.',
            '*.mimes' => 'Courier documents must be JPEG, PNG, or WEBP images.',
            '*.max' => 'Each courier document must not exceed '.round($maxKb / 1024, 1).' MB.',
        ]);

        $data = array_merge($data, $psgc->validateHierarchy($data));
        $provider = LogisticsProvider::query()->findOrFail($data['logistics_provider_id']);
        if (! $provider->isActive()) {
            return response()->json(['message' => 'Select an approved active logistics provider.', 'code' => 'logistics_provider_unavailable'], 422);
        }
        $uploaded = [];

        try {
            foreach (self::DOCUMENT_FIELDS as $field => $type) {
                $uploaded[$type] = $this->storeDocument($storage, $request->file($field), $user, $type);
            }

            $application = DB::transaction(function () use ($user, $data, $uploaded, $request) {
                $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

                if ($lockedUser->courier()->where('status', 'active')->exists()
                    || $lockedUser->courierApplications()->where('status', 'pending')->exists()) {
                    return null;
                }

                $application = $lockedUser->courierApplications()->where('status', 'draft')->latest('id')->first()
                    ?? new CourierApplication(['user_id' => $lockedUser->id]);
                $application->fill([
                    'user_id' => $lockedUser->id,
                    'logistics_provider_id' => $data['logistics_provider_id'],
                    'mobile' => $data['mobile'],
                    'address_line1' => trim($data['address_line1']),
                    'address_line2' => $this->nullableTrim($data['address_line2'] ?? null),
                    'region' => $data['region'],
                    'region_code' => $data['region_code'],
                    'province' => $data['province'],
                    'province_code' => $data['province_code'],
                    'city' => $data['city'],
                    'city_code' => $data['city_code'],
                    'barangay' => $data['barangay'],
                    'barangay_code' => $data['barangay_code'],
                    'postal_code' => trim($data['postal_code']),
                    'vehicle_type' => $data['vehicle_type'],
                    'vehicle_make' => trim($data['vehicle_make']),
                    'vehicle_model' => trim($data['vehicle_model']),
                    'vehicle_year' => (int) $data['vehicle_year'],
                    'vehicle_plate_number' => $data['vehicle_plate_number'],
                    'vehicle_color' => trim($data['vehicle_color']),
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]);
                $application->save();

                foreach ($uploaded as $type => $file) {
                    $application->documents()->create([
                        'document_type' => $type,
                        'storage_disk' => $file['storage_disk'],
                        'file_path' => $file['storage_path'],
                        'original_filename' => $file['original_filename'],
                        'mime_type' => $file['mime_type'],
                        'file_size' => $file['file_size'],
                        'status' => 'pending',
                        'uploaded_at' => now(),
                    ]);
                }

                $application->load(['documents', 'applicant']);
                app(ActivityLogger::class)->log('courier.application.submitted', 'courier', 'Courier application submitted.', $user, $request, $application);

                return $application;
            });

            if (! $application) {
                $this->deleteUploaded($storage, $uploaded);

                return response()->json([
                    'message' => 'You already have a courier application in progress.',
                    'code' => 'courier_application_pending',
                ], 409);
            }
        } catch (\Throwable $exception) {
            $this->deleteUploaded($storage, $uploaded);
            report($exception);

            return response()->json([
                'message' => 'Unable to submit your courier application right now. Please try again.',
                'code' => 'courier_application_failed',
            ], 500);
        }

        $this->notifySubmission($application);

        return response()->json([
            'message' => 'Courier application submitted successfully.',
            'data' => $this->applicationPayload($application, true),
        ], 201);
    }

    public function saveDraft(Request $request, PsgcService $psgc): JsonResponse
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Administrator accounts cannot submit courier applications.', 'code' => 'courier_application_role_invalid'], 403);
        }
        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Please verify your email address before applying to become a courier.', 'code' => 'email_verification_required'], 403);
        }
        if ($user->courier()->where('status', 'active')->exists() || $user->courierApplications()->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'A draft cannot be saved for this account.', 'code' => 'courier_draft_unavailable'], 409);
        }

        $request->merge([
            'mobile' => trim((string) $request->input('mobile', '')) ?: null,
            'vehicle_plate_number' => strtoupper(trim((string) $request->input('vehicle_plate_number', ''))) ?: null,
        ]);
        $currentYear = (int) now()->year + 1;
        $data = $request->validate([
            'mobile' => ['nullable', 'string', 'regex:/^\+639\d{9}$/'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['nullable', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['nullable', 'string', 'size:10'],
            'barangay_code' => ['nullable', 'string', 'size:10'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'vehicle_type' => ['nullable', Rule::in(['motorcycle', 'car', 'van'])],
            'vehicle_make' => ['nullable', 'string', 'max:100'],
            'vehicle_model' => ['nullable', 'string', 'max:100'],
            'vehicle_year' => ['nullable', 'integer', 'min:1980', 'max:'.$currentYear],
            'vehicle_plate_number' => ['nullable', 'string', 'max:30'],
            'vehicle_color' => ['nullable', 'string', 'max:50'],
        ]);

        $hasCompleteHierarchy = filled($data['region_code'] ?? null)
            && filled($data['city_code'] ?? null)
            && filled($data['barangay_code'] ?? null);
        if ($hasCompleteHierarchy) {
            $data = array_merge($data, $psgc->validateHierarchy($data));
        }

        $draft = DB::transaction(function () use ($user, $data, $hasCompleteHierarchy) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($lockedUser->courier()->where('status', 'active')->exists() || $lockedUser->courierApplications()->where('status', 'pending')->exists()) {
                return null;
            }
            $draft = $lockedUser->courierApplications()->where('status', 'draft')->latest('id')->first()
                ?? new CourierApplication(['user_id' => $lockedUser->id]);
            $draft->fill([
                'mobile' => $data['mobile'] ?? null,
                'address_line1' => $this->nullableTrim($data['address_line1'] ?? null),
                'address_line2' => $this->nullableTrim($data['address_line2'] ?? null),
                'region_code' => $data['region_code'] ?? null,
                'province_code' => $data['province_code'] ?? null,
                'city_code' => $data['city_code'] ?? null,
                'barangay_code' => $data['barangay_code'] ?? null,
                'postal_code' => $data['postal_code'] ?? null,
                'vehicle_type' => $data['vehicle_type'] ?? null,
                'vehicle_make' => $this->nullableTrim($data['vehicle_make'] ?? null),
                'vehicle_model' => $this->nullableTrim($data['vehicle_model'] ?? null),
                'vehicle_year' => $data['vehicle_year'] ?? null,
                'vehicle_plate_number' => $data['vehicle_plate_number'] ?? null,
                'vehicle_color' => $this->nullableTrim($data['vehicle_color'] ?? null),
                'status' => 'draft',
            ]);
            if ($hasCompleteHierarchy) {
                $draft->fill([
                    'region' => $data['region'], 'province' => $data['province'],
                    'city' => $data['city'], 'barangay' => $data['barangay'],
                ]);
            }
            $draft->save();

            return $draft->load(['documents', 'applicant']);
        });

        if (! $draft) {
            return response()->json(['message' => 'A draft cannot be saved for this account.', 'code' => 'courier_draft_unavailable'], 409);
        }

        return response()->json(['message' => 'Courier application draft saved.', 'data' => $this->applicationPayload($draft, true)]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = CourierApplication::query()->whereIn('status', ['pending', 'approved', 'rejected'])->with([
            'applicant:id,name,first_name,last_name,email,mobile,phone',
            'reviewer:id,name,first_name,last_name',
            'approvedCourier:id,user_id,status',
        ]);

        $query->when($validated['status'] ?? null, fn ($builder, $status) => $builder->where('status', $status));
        $query->when(trim((string) ($validated['search'] ?? '')), function ($builder, $search) {
            $builder->where(function ($nested) use ($search) {
                $nested->where('vehicle_plate_number', 'like', '%'.$search.'%')
                    ->orWhereHas('applicant', fn ($applicant) => $applicant
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%'));
            });
        });

        $applications = $query->orderByDesc('submitted_at')->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15)
            ->through(fn (CourierApplication $application) => $this->applicationPayload($application));

        return response()->json($applications);
    }

    public function show(CourierApplication $courierApplication): JsonResponse
    {
        return response()->json([
            'data' => $this->applicationPayload($courierApplication->load(['applicant', 'documents', 'reviewer', 'approvedCourier']), true),
        ]);
    }

    public function approve(Request $request, CourierApplication $courierApplication): JsonResponse
    {
        $admin = $request->user();

        try {
            [$courier, $alreadyApproved] = DB::transaction(function () use ($courierApplication, $admin, $request) {
                $application = CourierApplication::query()->with(['applicant', 'documents'])
                    ->whereKey($courierApplication->id)->lockForUpdate()->firstOrFail();

                if ($application->status === 'approved' && $application->approved_courier_id) {
                    return [$application->approvedCourier()->firstOrFail(), true];
                }

                if ($application->status !== 'pending') {
                    return [null, false];
                }

                $types = $application->documents->pluck('document_type')->unique();
                if (collect(array_values(self::DOCUMENT_FIELDS))->diff($types)->isNotEmpty()) {
                    throw new \DomainException('All three required courier documents must be present before approval.');
                }

                $courier = Courier::firstOrNew(['user_id' => $application->user_id]);
                $courier->fill([
                    'approved_application_id' => $application->id,
                    'name' => $application->applicant->display_name,
                    'slug' => $courier->slug ?: $this->uniqueCourierSlug($application->applicant),
                    'contact_email' => $application->applicant->email,
                    'contact_phone' => $application->mobile,
                    'service_area' => collect([$application->city, $application->province])->filter()->join(', '),
                    'active' => true,
                    'status' => 'active',
                    'availability_status' => 'offline',
                    'vehicle_type' => $application->vehicle_type,
                    'vehicle_make' => $application->vehicle_make,
                    'vehicle_model' => $application->vehicle_model,
                    'vehicle_year' => $application->vehicle_year,
                    'vehicle_plate_number' => $application->vehicle_plate_number,
                    'vehicle_color' => $application->vehicle_color,
                    'approved_at' => now(),
                ]);
                $courier->save();

                $application->forceFill([
                    'status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $admin->id,
                    'rejection_reason' => null, 'approved_courier_id' => $courier->id,
                ])->save();
                $application->documents()->update(['status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $admin->id]);
                app(ActivityLogger::class)->log('courier.application.approved', 'courier', 'Courier application approved.', $admin, $request, $application);

                return [$courier, false];
            });
        } catch (\DomainException $exception) {
            return response()->json(['message' => $exception->getMessage(), 'code' => 'courier_documents_incomplete'], 409);
        }

        if (! $courier) {
            return response()->json([
                'message' => 'This courier application cannot be approved in its current state.',
                'code' => 'application_state_invalid',
            ], 409);
        }

        $fresh = $courierApplication->fresh(['applicant', 'documents', 'reviewer', 'approvedCourier']);
        if (! $alreadyApproved) {
            $this->notifyApplicant($fresh, 'approved');
        }

        return response()->json([
            'message' => $alreadyApproved ? 'Courier application was already approved.' : 'Courier application approved.',
            'data' => $this->applicationPayload($fresh, true),
        ]);
    }

    public function reject(Request $request, CourierApplication $courierApplication): JsonResponse
    {
        $data = $request->validate(['rejection_reason' => ['required', 'string', 'min:5', 'max:2000']]);
        $admin = $request->user();

        $updated = DB::transaction(function () use ($courierApplication, $admin, $data, $request) {
            $application = CourierApplication::query()->whereKey($courierApplication->id)->lockForUpdate()->firstOrFail();
            if ($application->status !== 'pending') {
                return false;
            }

            $application->forceFill([
                'status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $admin->id,
                'rejection_reason' => trim($data['rejection_reason']),
            ])->save();
            $application->documents()->update(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $admin->id]);
            app(ActivityLogger::class)->log('courier.application.rejected', 'courier', 'Courier application rejected.', $admin, $request, $application, ['reason_provided' => true]);

            return true;
        });

        if (! $updated) {
            return response()->json(['message' => 'This courier application has already been reviewed.', 'code' => 'application_state_invalid'], 409);
        }

        $fresh = $courierApplication->fresh(['applicant', 'documents', 'reviewer', 'approvedCourier']);
        $this->notifyApplicant($fresh, 'rejected', $fresh->rejection_reason);

        return response()->json(['message' => 'Courier application rejected.', 'data' => $this->applicationPayload($fresh, true)]);
    }

    public function viewOwnDocument(Request $request, CourierDocument $courierDocument, MediaStorageService $storage): JsonResponse
    {
        $courierDocument->loadMissing('application:id,user_id');
        abort_unless($courierDocument->application?->user_id === $request->user()->id, 404);

        return $this->documentAccessPayload($courierDocument, $storage);
    }

    public function viewDocument(CourierDocument $courierDocument, MediaStorageService $storage): JsonResponse
    {
        return $this->documentAccessPayload($courierDocument, $storage);
    }

    private function documentAccessPayload(CourierDocument $courierDocument, MediaStorageService $storage): JsonResponse
    {
        return response()->json(['data' => [
            'id' => $courierDocument->id,
            'document_type' => $courierDocument->document_type,
            'original_filename' => $courierDocument->original_filename,
            'mime_type' => $courierDocument->mime_type,
            'file_size' => $courierDocument->file_size,
            'temporary_url' => $storage->temporaryUrl($courierDocument->file_path, 10, $courierDocument->storage_disk),
        ]]);
    }

    private function applicationPayload(CourierApplication $application, bool $includeDocuments = false): array
    {
        return [
            'id' => $application->id,
            'reference' => 'CA-'.str_pad((string) $application->id, 6, '0', STR_PAD_LEFT),
            'status' => $application->status,
            'logistics_provider' => $application->relationLoaded('provider') && $application->provider ? [
                'id' => $application->provider->id, 'code' => $application->provider->code,
                'company_name' => $application->provider->company_name,
            ] : null,
            'mobile' => $application->mobile,
            'address' => [
                'line1' => $application->address_line1, 'line2' => $application->address_line2,
                'region' => $application->region, 'region_code' => $application->region_code,
                'province' => $application->province, 'province_code' => $application->province_code,
                'city' => $application->city, 'city_code' => $application->city_code,
                'barangay' => $application->barangay, 'barangay_code' => $application->barangay_code,
                'postal_code' => $application->postal_code,
            ],
            'vehicle' => [
                'type' => $application->vehicle_type, 'make' => $application->vehicle_make,
                'model' => $application->vehicle_model, 'year' => $application->vehicle_year,
                'plate_number' => $application->vehicle_plate_number, 'color' => $application->vehicle_color,
            ],
            'submitted_at' => optional($application->submitted_at)->toISOString(),
            'reviewed_at' => optional($application->reviewed_at)->toISOString(),
            'reviewed_by' => $application->reviewer?->display_name,
            'rejection_reason' => $application->rejection_reason,
            'applicant' => $application->relationLoaded('applicant') && $application->applicant ? [
                'id' => $application->applicant->id, 'name' => $application->applicant->display_name,
                'email' => $application->applicant->email,
            ] : null,
            'courier' => $application->relationLoaded('approvedCourier') && $application->approvedCourier ? [
                'id' => $application->approvedCourier->id, 'status' => $application->approvedCourier->status,
            ] : null,
            'documents' => $includeDocuments && $application->relationLoaded('documents')
                ? $application->documents->map(fn (CourierDocument $document) => [
                    'id' => $document->id, 'document_type' => $document->document_type,
                    'original_filename' => $document->original_filename, 'mime_type' => $document->mime_type,
                    'file_size' => $document->file_size, 'status' => $document->status,
                    'uploaded_at' => optional($document->uploaded_at)->toISOString(),
                ])->values() : [],
        ];
    }

    private function storeDocument(MediaStorageService $storage, UploadedFile $file, User $user, string $type): array
    {
        $stored = $storage->storePrivateFile($file, "courier-documents/{$user->id}/{$type}");
        $stored['mime_type'] = $file->getMimeType() ?: $stored['mime_type'];

        return $stored;
    }

    private function deleteUploaded(MediaStorageService $storage, array $uploaded): void
    {
        foreach (array_reverse($uploaded) as $file) {
            try {
                $storage->delete($file['storage_path'], $file['storage_disk']);
            } catch (\Throwable) { /* best effort */
            }
        }
    }

    private function notifySubmission(CourierApplication $application): void
    {
        try {
            MarketplaceNotification::create([
                'user_id' => $application->user_id, 'category' => 'account', 'title' => 'Courier application submitted',
                'body' => 'Your courier application is awaiting review by the selected Logistics provider.',
                'action_type' => 'courier-application', 'action_label' => 'View application', 'read_at' => null,
            ]);

            LogisticsStaff::query()
                ->where('logistics_provider_id', $application->logistics_provider_id)
                ->where('staff_type', 'provider_manager')
                ->where('status', 'active')
                ->whereHas('user', fn ($query) => $query->where('status', 'active'))
                ->pluck('user_id')->unique()->each(
                    fn (int $managerId) => MarketplaceNotification::create([
                        'user_id' => $managerId, 'category' => 'account', 'title' => 'New courier application',
                        'body' => $application->applicant->display_name.' submitted a courier application for review.',
                        'action_type' => 'courier-application', 'action_label' => 'Review application', 'read_at' => null,
                    ])
                );
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function notifyApplicant(CourierApplication $application, string $decision, ?string $reason = null): void
    {
        if (! $application->applicant) {
            return;
        }
        try {
            Notification::send($application->applicant, new CourierApplicationReviewedNotification($application, $decision, $reason));
        } catch (\Throwable $exception) {
            report($exception);
        }

        try {
            MarketplaceNotification::create([
                'user_id' => $application->user_id, 'category' => 'account',
                'title' => $decision === 'approved' ? 'Courier application approved' : 'Courier application rejected',
                'body' => $decision === 'approved' ? 'Your Maketo courier account is now active.' : 'Your courier application was not approved. Review the application status for details.',
                'action_type' => 'courier-application', 'action_label' => 'View application', 'read_at' => null,
            ]);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function uniqueCourierSlug(User $user): string
    {
        $base = Str::slug($user->display_name) ?: 'courier';
        $slug = $base.'-'.$user->id;
        $suffix = 1;
        while (Courier::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$user->id.'-'.$suffix++;
        }

        return $slug;
    }

    private function nullableTrim(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
