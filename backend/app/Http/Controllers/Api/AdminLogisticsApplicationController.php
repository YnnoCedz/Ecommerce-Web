<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogisticsDocument;
use App\Models\LogisticsProvider;
use App\Models\LogisticsProviderApplication;
use App\Models\LogisticsStaff;
use App\Notifications\LogisticsApplicationReviewedNotification;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class AdminLogisticsApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(LogisticsProviderApplication::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $query = LogisticsProviderApplication::query()
            ->with('applicant:id,name,first_name,last_name,email')
            ->withCount('documents')->where('status', $data['status'] ?? 'pending')
            ->when(trim((string) ($data['search'] ?? '')), fn (Builder $q, string $search) => $q
                ->where(fn (Builder $nested) => $nested->where('company_name', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%")));
        $page = $query->orderBy('submitted_at')->orderBy('id')->paginate((int) ($data['per_page'] ?? 20));

        return response()->json(['data' => $page->getCollection()->map(fn ($app) => $this->payload($app))->values(), 'meta' => [
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(),
        ]]);
    }

    public function show(LogisticsProviderApplication $logisticsApplication): JsonResponse
    {
        return response()->json(['data' => $this->payload($logisticsApplication->load(['applicant', 'documents', 'approvedProvider']))]);
    }

    public function approve(Request $request, LogisticsProviderApplication $logisticsApplication): JsonResponse
    {
        $admin = $request->user();
        $provider = DB::transaction(function () use ($logisticsApplication, $admin, $request) {
            $application = LogisticsProviderApplication::query()->with(['documents', 'applicant'])
                ->whereKey($logisticsApplication->id)->lockForUpdate()->firstOrFail();
            if ($application->status !== 'pending') {
                return null;
            }
            if (collect([
                LogisticsDocument::TYPE_APPLICANT_ID, LogisticsDocument::TYPE_BUSINESS_PERMIT,
            ])->diff($application->documents->pluck('document_type'))->isNotEmpty()) {
                abort(409, 'Required logistics documents are incomplete.');
            }

            $provider = LogisticsProvider::create([
                'code' => $this->providerCode($application), 'company_name' => $application->company_name,
                'legal_name' => $application->legal_name, 'status' => 'active',
                'contact_name' => $application->contact_name, 'contact_email' => $application->contact_email,
                'contact_phone' => $application->contact_phone, 'address_line1' => $application->address_line1,
                'address_line2' => $application->address_line2, 'region_code' => $application->region_code,
                'region_label' => $application->region_label, 'province_code' => $application->province_code,
                'province_label' => $application->province_label, 'city_code' => $application->city_code,
                'city_label' => $application->city_label, 'barangay_code' => $application->barangay_code,
                'barangay_label' => $application->barangay_label, 'postal_code' => $application->postal_code,
                'approved_at' => now(), 'approved_by' => $admin->id,
            ]);
            LogisticsStaff::create([
                'user_id' => $application->user_id, 'logistics_provider_id' => $provider->id,
                'primary_hub_id' => null, 'staff_type' => 'provider_manager', 'status' => 'active',
                'approved_at' => now(), 'approved_by' => $admin->id,
            ]);
            $application->forceFill([
                'status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $admin->id,
                'rejection_reason' => null, 'approved_provider_id' => $provider->id,
            ])->save();
            $application->documents()->update(['status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $admin->id]);
            app(ActivityLogger::class)->log('logistics.application.approved', 'logistics', 'Logistics provider application approved.', $admin, $request, $application, ['provider_id' => $provider->id]);

            return $provider;
        });

        if (! $provider) {
            return response()->json(['message' => 'This application has already been reviewed.', 'code' => 'application_state_invalid'], 409);
        }
        $fresh = $logisticsApplication->fresh(['applicant', 'documents', 'approvedProvider']);
        $this->notify($fresh, 'approved');

        return response()->json(['message' => 'Logistics provider application approved.', 'data' => $this->payload($fresh)]);
    }

    public function reject(Request $request, LogisticsProviderApplication $logisticsApplication): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:2000']]);
        $admin = $request->user();
        $updated = DB::transaction(function () use ($logisticsApplication, $admin, $data, $request) {
            $application = LogisticsProviderApplication::query()->whereKey($logisticsApplication->id)->lockForUpdate()->firstOrFail();
            if ($application->status !== 'pending') {
                return false;
            }
            $application->forceFill(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $admin->id, 'rejection_reason' => trim($data['reason'])])->save();
            $application->documents()->update(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $admin->id]);
            app(ActivityLogger::class)->log('logistics.application.rejected', 'logistics', 'Logistics provider application rejected.', $admin, $request, $application, ['reason_provided' => true]);

            return true;
        });
        if (! $updated) {
            return response()->json(['message' => 'This application has already been reviewed.', 'code' => 'application_state_invalid'], 409);
        }
        $fresh = $logisticsApplication->fresh(['applicant', 'documents']);
        $this->notify($fresh, 'rejected', $fresh->rejection_reason);

        return response()->json(['message' => 'Logistics provider application rejected.', 'data' => $this->payload($fresh)]);
    }

    public function viewDocument(LogisticsDocument $logisticsDocument, MediaStorageService $storage): JsonResponse
    {
        return response()->json(['data' => [
            'id' => $logisticsDocument->id, 'document_type' => $logisticsDocument->document_type,
            'original_filename' => $logisticsDocument->original_filename, 'mime_type' => $logisticsDocument->mime_type,
            'file_size' => $logisticsDocument->file_size,
            'temporary_url' => $storage->temporaryUrl($logisticsDocument->file_path, 10, $logisticsDocument->storage_disk),
        ]]);
    }

    private function providerCode(LogisticsProviderApplication $application): string
    {
        $base = 'LP-'.str_pad((string) $application->id, 6, '0', STR_PAD_LEFT);
        $code = $base;
        $suffix = 1;
        while (LogisticsProvider::where('code', $code)->exists()) {
            $code = $base.'-'.$suffix++;
        }

        return $code;
    }

    private function notify(LogisticsProviderApplication $application, string $decision, ?string $reason = null): void
    {
        try {
            Notification::send($application->applicant, new LogisticsApplicationReviewedNotification($decision, $reason));
        } catch (\Throwable) {
        }
    }

    private function payload(LogisticsProviderApplication $application): array
    {
        return [
            'id' => $application->id, 'reference' => 'LPA-'.str_pad((string) $application->id, 6, '0', STR_PAD_LEFT),
            'status' => $application->status, 'company_name' => $application->company_name, 'legal_name' => $application->legal_name,
            'contact_name' => $application->contact_name, 'contact_email' => $application->contact_email,
            'contact_phone' => $application->contact_phone, 'submitted_at' => optional($application->submitted_at)->toISOString(),
            'reviewed_at' => optional($application->reviewed_at)->toISOString(), 'rejection_reason' => $application->rejection_reason,
            'address' => [
                'line1' => $application->address_line1, 'line2' => $application->address_line2,
                'region' => $application->region_label, 'province' => $application->province_label,
                'city' => $application->city_label, 'barangay' => $application->barangay_label,
                'postal_code' => $application->postal_code,
            ],
            'applicant' => $application->relationLoaded('applicant') && $application->applicant ? [
                'id' => $application->applicant->id, 'name' => $application->applicant->display_name, 'email' => $application->applicant->email,
            ] : null,
            'provider_id' => $application->approved_provider_id,
            'documents' => $application->relationLoaded('documents') ? $application->documents->map(fn ($document) => [
                'id' => $document->id, 'document_type' => $document->document_type,
                'original_filename' => $document->original_filename, 'mime_type' => $document->mime_type,
                'file_size' => $document->file_size, 'status' => $document->status,
            ])->values() : [],
        ];
    }
}
