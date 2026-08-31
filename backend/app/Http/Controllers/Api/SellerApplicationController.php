<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MarketplaceNotification;
use App\Models\Seller;
use App\Models\SellerApplication;
use App\Models\SellerDocument;
use App\Models\User;
use App\Notifications\SellerApplicationReviewedNotification;
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

class SellerApplicationController extends Controller
{
    public function current(Request $request): JsonResponse
    {
        $application = SellerApplication::query()
            ->with(['categories', 'documents', 'reviewer', 'approvedSeller'])
            ->where('applicant_user_id', $request->user()->id)
            ->latest('id')
            ->first();

        return response()->json([
            'data' => $application ? $this->applicationPayload($application, true) : null,
        ]);
    }

    public function store(Request $request, MediaStorageService $storage, PsgcService $psgc): JsonResponse
    {
        $user = $request->user();

        if (! $user->isBuyer()) {
            return response()->json([
                'message' => 'Only buyer accounts can submit a seller application.',
                'code' => 'seller_application_role_invalid',
            ], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email address before applying to become a seller.',
                'code' => 'email_verification_required',
            ], 403);
        }

        if ($user->hasApprovedSellerProfile()) {
            return response()->json([
                'message' => 'Your seller application has already been approved.',
                'code' => 'seller_already_active',
            ], 409);
        }

        if ($user->sellerApplications()->whereIn('status', ['pending', 'reviewing'])->exists()) {
            return response()->json([
                'message' => 'You already have a seller application under review.',
                'code' => 'seller_application_pending',
            ], 409);
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'business_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'owner_id_number' => ['required', 'string', 'max:255'],
            'tin' => ['required', 'string', 'max:255'],
            'registration_number' => ['required', 'string', 'max:255'],
            'established_on' => ['required', 'date'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'size:10'],
            'province_code' => ['nullable', 'string', 'size:10'],
            'city_code' => ['required', 'string', 'size:10'],
            'barangay_code' => ['required', 'string', 'size:10'],
            'postal_code' => ['required', 'string', 'max:20'],
            'contact_email' => ['required', 'email:rfc,dns', 'max:255'],
            'public_email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'contact_phone' => ['required', 'string', 'max:30'],
            'messaging_phone' => ['nullable', 'string', 'max:30'],
            'categories' => ['required', 'array', 'min:1', 'max:5'],
            'categories.*' => ['integer', 'distinct', Rule::exists('categories', 'id')],
            'owner_id_file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'seller_certificate_file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'business_document_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ]);

        $data = array_merge($data, $psgc->validateHierarchy($data));

        $businessName = trim($data['business_name']);
        $slug = $this->generateUniqueSlug($businessName);
        $uploadedPaths = [];

        try {
            $ownerDoc = $this->storeDocument($storage, $request->file('owner_id_file'), $user, 'owner-id');
            $uploadedPaths[] = $ownerDoc['storage_path'];

            $certificateDoc = $this->storeDocument($storage, $request->file('seller_certificate_file'), $user, 'seller-certificate');
            $uploadedPaths[] = $certificateDoc['storage_path'];

            $businessDoc = null;
            if ($request->hasFile('business_document_file')) {
                $businessDoc = $this->storeDocument($storage, $request->file('business_document_file'), $user, 'business-document');
                $uploadedPaths[] = $businessDoc['storage_path'];
            }

            $application = DB::transaction(function () use ($user, $data, $slug, $ownerDoc, $certificateDoc, $businessDoc) {
                $application = SellerApplication::create([
                    'applicant_user_id' => $user->id,
                    'business_name' => trim($data['business_name']),
                    'trade_name' => $this->nullableTrim($data['trade_name'] ?? null),
                    'slug' => $slug,
                    'tagline' => $this->nullableTrim($data['tagline'] ?? null),
                    'description' => trim($data['description']),
                    'owner_id_number' => trim($data['owner_id_number']),
                    'tin' => trim($data['tin']),
                    'registration_number' => trim($data['registration_number']),
                    'established_on' => $data['established_on'],
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
                    'contact_name' => trim($data['first_name'].' '.$data['last_name']),
                    'contact_email' => trim($data['contact_email']),
                    'public_email' => $this->nullableTrim($data['public_email'] ?? null),
                    'contact_phone' => trim($data['contact_phone']),
                    'messaging_phone' => $this->nullableTrim($data['messaging_phone'] ?? null),
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]);

                $application->categories()->attach(collect($data['categories'])->map(fn ($id) => (int) $id)->all());

                $application->documents()->createMany(array_values(array_filter([
                    [
                        'document_type' => 'owner_id',
                        'storage_disk' => $ownerDoc['storage_disk'],
                        'file_name' => $ownerDoc['file_name'],
                        'file_path' => $ownerDoc['storage_path'],
                        'original_filename' => $ownerDoc['original_filename'],
                        'mime_type' => $ownerDoc['mime_type'],
                        'file_size' => $ownerDoc['file_size'],
                        'status' => 'pending',
                        'private' => true,
                        'uploaded_at' => now(),
                    ],
                    [
                        'document_type' => 'seller_certificate',
                        'storage_disk' => $certificateDoc['storage_disk'],
                        'file_name' => $certificateDoc['file_name'],
                        'file_path' => $certificateDoc['storage_path'],
                        'original_filename' => $certificateDoc['original_filename'],
                        'mime_type' => $certificateDoc['mime_type'],
                        'file_size' => $certificateDoc['file_size'],
                        'status' => 'pending',
                        'private' => true,
                        'uploaded_at' => now(),
                    ],
                    $businessDoc ? [
                        'document_type' => 'business_document',
                        'storage_disk' => $businessDoc['storage_disk'],
                        'file_name' => $businessDoc['file_name'],
                        'file_path' => $businessDoc['storage_path'],
                        'original_filename' => $businessDoc['original_filename'],
                        'mime_type' => $businessDoc['mime_type'],
                        'file_size' => $businessDoc['file_size'],
                        'status' => 'pending',
                        'private' => true,
                        'uploaded_at' => now(),
                    ] : null,
                ])));

                return $application->load(['categories', 'documents', 'applicant']);
            });
        } catch (\Throwable $e) {
            foreach (array_reverse($uploadedPaths) as $path) {
                $storage->delete($path);
            }

            report($e);

            return response()->json([
                'message' => 'Unable to submit your seller application right now. Please try again.',
                'code' => 'seller_application_failed',
            ], 500);
        }

        app(ActivityLogger::class)->log('seller.application.submitted', 'seller', 'Seller application submitted.', $user, $request, $application);

        return response()->json([
            'message' => 'Seller application submitted successfully.',
            'application' => $this->applicationPayload($application),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = SellerApplication::query()
            ->with([
                'applicant:id,name,first_name,last_name,email,mobile,phone',
                'categories:id,name,slug',
                'reviewer:id,name,first_name,last_name',
                'approvedSeller:id,slug,status',
            ]);

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('business_name', 'like', '%'.$search.'%')
                    ->orWhere('trade_name', 'like', '%'.$search.'%')
                    ->orWhere('slug', 'like', '%'.$search.'%')
                    ->orWhereHas('applicant', function ($applicantQuery) use ($search) {
                        $applicantQuery
                            ->where('email', 'like', '%'.$search.'%')
                            ->orWhere('name', 'like', '%'.$search.'%')
                            ->orWhereRaw("CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) LIKE ?", ['%'.$search.'%']);
                    });
            });
        }

        if ($status = trim((string) $request->input('status', ''))) {
            $query->where('status', $status);
        }

        if ($categoryId = (int) $request->input('category_id', 0)) {
            $query->whereHas('categories', fn ($categoryQuery) => $categoryQuery->whereKey($categoryId));
        }

        if ($from = $request->input('from')) {
            $query->whereDate('submitted_at', '>=', $from);
        }

        if ($to = $request->input('to')) {
            $query->whereDate('submitted_at', '<=', $to);
        }

        $perPage = min(50, max(1, (int) $request->input('per_page', 15)));

        $applications = $query
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (SellerApplication $application) => $this->applicationPayload($application, false));

        return response()->json($applications);
    }

    public function show(SellerApplication $sellerApplication): JsonResponse
    {
        $sellerApplication->load(['applicant', 'categories', 'documents', 'reviewer', 'approvedSeller']);

        return response()->json([
            'data' => $this->applicationPayload($sellerApplication, true),
        ]);
    }

    public function approve(Request $request, SellerApplication $sellerApplication): JsonResponse
    {
        $admin = $request->user();

        if (! in_array($sellerApplication->status, ['pending', 'reviewing', 'flagged'], true)) {
            return response()->json([
                'message' => 'This seller application cannot be approved in its current state.',
                'code' => 'application_state_invalid',
            ], 409);
        }

        $sellerApplication->load(['applicant', 'categories', 'documents']);

        $seller = DB::transaction(function () use ($sellerApplication, $admin) {
            $seller = Seller::firstOrNew(['user_id' => $sellerApplication->applicant_user_id]);

            if ($seller->exists && $seller->status === 'approved') {
                return null;
            }

            $seller->fill([
                'business_name' => $sellerApplication->business_name,
                'trade_name' => $sellerApplication->trade_name,
                'slug' => $sellerApplication->slug,
                'tagline' => $sellerApplication->tagline,
                'description' => $sellerApplication->description,
                'owner_id_number' => $sellerApplication->owner_id_number,
                'tin' => $sellerApplication->tin,
                'registration_number' => $sellerApplication->registration_number,
                'established_on' => $sellerApplication->established_on,
                'address_line1' => $sellerApplication->address_line1,
                'address_line2' => $sellerApplication->address_line2,
                'region' => $sellerApplication->region,
                'region_code' => $sellerApplication->region_code,
                'province' => $sellerApplication->province,
                'province_code' => $sellerApplication->province_code,
                'city' => $sellerApplication->city,
                'city_code' => $sellerApplication->city_code,
                'barangay' => $sellerApplication->barangay,
                'barangay_code' => $sellerApplication->barangay_code,
                'postal_code' => $sellerApplication->postal_code,
                'contact_name' => $sellerApplication->contact_name,
                'contact_email' => $sellerApplication->contact_email,
                'public_email' => $sellerApplication->public_email,
                'contact_phone' => $sellerApplication->contact_phone,
                'messaging_phone' => $sellerApplication->messaging_phone,
                'verified' => true,
                'status' => 'approved',
                'joined_year' => $sellerApplication->established_on?->year,
            ]);
            $seller->user_id = $sellerApplication->applicant_user_id;
            $seller->save();

            $seller->categories()->sync($sellerApplication->categories->pluck('id')->all());

            $sellerApplication->documents()->update([
                'seller_id' => $seller->id,
                'status' => 'approved',
                'approved_at' => now(),
                'reviewed_at' => now(),
            ]);

            $sellerApplication->forceFill([
                'status' => 'approved',
                'reviewed_by' => $admin?->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
                'approved_seller_id' => $seller->id,
            ])->save();

            $sellerApplication->applicant?->forceFill([
                'role' => 'seller',
                'status' => 'active',
            ])->save();

            return $seller->fresh();
        });

        if (! $seller) {
            return response()->json([
                'message' => 'This application was already approved.',
                'code' => 'application_already_approved',
            ], 409);
        }

        $this->notifyApplicant($sellerApplication->applicant, 'approved', $sellerApplication);
        app(ActivityLogger::class)->log('seller.application.approved', 'seller', 'Seller application approved.', $admin, $request, $sellerApplication);

        return response()->json([
            'message' => 'Seller application approved.',
            'data' => $this->applicationPayload($sellerApplication->fresh(['applicant', 'categories', 'documents', 'reviewer', 'approvedSeller']), true),
        ]);
    }

    public function reject(Request $request, SellerApplication $sellerApplication): JsonResponse
    {
        $admin = $request->user();

        if (! in_array($sellerApplication->status, ['pending', 'reviewing', 'flagged'], true)) {
            return response()->json([
                'message' => 'This seller application cannot be rejected in its current state.',
                'code' => 'application_state_invalid',
            ], 409);
        }

        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:2000'],
        ]);

        $sellerApplication->forceFill([
            'status' => 'rejected',
            'reviewed_by' => $admin?->id,
            'reviewed_at' => now(),
            'rejection_reason' => trim($data['rejection_reason']),
        ])->save();

        $this->notifyApplicant($sellerApplication->applicant, 'rejected', $sellerApplication, $sellerApplication->rejection_reason);
        app(ActivityLogger::class)->log('seller.application.rejected', 'seller', 'Seller application rejected.', $admin, $request, $sellerApplication, ['reason_provided' => true]);

        return response()->json([
            'message' => 'Seller application rejected.',
            'data' => $this->applicationPayload($sellerApplication->fresh(['applicant', 'categories', 'documents', 'reviewer', 'approvedSeller']), true),
        ]);
    }

    public function viewDocument(Request $request, SellerDocument $sellerDocument, MediaStorageService $storage): JsonResponse
    {
        $sellerDocument->load(['seller', 'sellerApplication']);

        if (! $sellerDocument->private) {
            return response()->json([
                'message' => 'This document is not available through the private document viewer.',
                'code' => 'document_not_private',
            ], 409);
        }

        if (! $sellerDocument->file_path) {
            return response()->json([
                'message' => 'The requested document is missing from storage.',
                'code' => 'document_missing',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $sellerDocument->id,
                'document_type' => $sellerDocument->document_type,
                'file_name' => $sellerDocument->file_name,
                'original_filename' => $sellerDocument->original_filename,
                'mime_type' => $sellerDocument->mime_type,
                'file_size' => $sellerDocument->file_size,
                'private' => (bool) $sellerDocument->private,
                'temporary_url' => $storage->temporaryUrl($sellerDocument->file_path, 10, $sellerDocument->storage_disk ?: 'r2'),
            ],
        ]);
    }

    private function notifyApplicant(?User $user, string $decision, SellerApplication $application, ?string $reason = null): void
    {
        if (! $user) {
            return;
        }

        try {
            Notification::send($user, new SellerApplicationReviewedNotification($application, $decision, $reason));

            $title = $decision === 'approved'
                ? 'Seller application approved'
                : 'Seller application reviewed';

            $body = $decision === 'approved'
                ? 'Your seller application has been approved. You can now access your seller dashboard.'
                : ($reason
                    ? 'Your seller application was not approved. Reason: '.$reason
                    : 'Your seller application was not approved. Please review the details and try again.');

            MarketplaceNotification::create([
                'user_id' => $user->id,
                'category' => 'account',
                'title' => $title,
                'body' => $body,
                'action_type' => 'seller-application',
                'action_label' => $decision === 'approved' ? 'Open seller dashboard' : 'Review application',
                'read_at' => null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function applicationPayload(SellerApplication $application, bool $includeDocuments = false): array
    {
        return [
            'id' => $application->id,
            'slug' => $application->slug,
            'business_name' => $application->business_name,
            'trade_name' => $application->trade_name,
            'tagline' => $application->tagline,
            'description' => $application->description,
            'owner_id_number' => $application->owner_id_number,
            'tin' => $application->tin,
            'registration_number' => $application->registration_number,
            'established_on' => optional($application->established_on)->toDateString(),
            'address_line1' => $application->address_line1,
            'address_line2' => $application->address_line2,
            'province' => $application->province,
            'city' => $application->city,
            'postal_code' => $application->postal_code,
            'contact_name' => $application->contact_name,
            'contact_email' => $application->contact_email,
            'public_email' => $application->public_email,
            'contact_phone' => $application->contact_phone,
            'messaging_phone' => $application->messaging_phone,
            'status' => $application->status,
            'rejection_reason' => $application->rejection_reason,
            'submitted_at' => optional($application->submitted_at)->toISOString(),
            'reviewed_at' => optional($application->reviewed_at)->toISOString(),
            'reviewed_by' => $application->reviewer?->display_name,
            'approved_seller_id' => $application->approved_seller_id,
            'categories' => $application->relationLoaded('categories')
                ? $application->categories->map(fn (Category $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                ])->values()
                : [],
            'documents' => $includeDocuments && $application->relationLoaded('documents')
                ? $application->documents->map(fn (SellerDocument $document) => $this->documentPayload($document))->values()
                : [],
            'applicant' => $application->relationLoaded('applicant') && $application->applicant ? [
                'id' => $application->applicant->id,
                'name' => $application->applicant->display_name,
                'email' => $application->applicant->email,
                'mobile' => $application->applicant->mobile,
                'phone' => $application->applicant->phone,
            ] : null,
            'approved_seller' => $application->relationLoaded('approvedSeller') && $application->approvedSeller ? [
                'id' => $application->approvedSeller->id,
                'slug' => $application->approvedSeller->slug,
                'status' => $application->approvedSeller->status,
            ] : null,
        ];
    }

    private function documentPayload(SellerDocument $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'storage_disk' => $document->storage_disk,
            'file_name' => $document->file_name,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'status' => $document->status,
            'private' => (bool) $document->private,
            'uploaded_at' => optional($document->uploaded_at)->toISOString(),
        ];
    }

    private function storeDocument(MediaStorageService $storage, UploadedFile $file, User $user, string $type): array
    {
        $prefix = match ($type) {
            'owner-id' => "seller-documents/{$user->id}/owner-id",
            'seller-certificate' => "seller-documents/{$user->id}/seller-certificate",
            default => "seller-documents/{$user->id}/{$type}",
        };

        $stored = $storage->storePrivateFile($file, $prefix);
        $stored['file_name'] = basename($stored['storage_path']);

        return $stored;
    }

    private function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base !== '' ? $base : 'seller-application';
        $attempt = 0;

        while (
            SellerApplication::where('slug', $slug)->exists()
            || Seller::where('slug', $slug)->exists()
        ) {
            $attempt++;
            $slug = $base.'-'.Str::lower(Str::random(6 + $attempt));
        }

        return $slug;
    }

    private function nullableTrim(?string $value): ?string
    {
        $trimmed = is_string($value) ? trim($value) : '';

        return $trimmed !== '' ? $trimmed : null;
    }
}
