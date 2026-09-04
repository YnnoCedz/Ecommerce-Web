<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\CourierApplication;
use App\Models\CourierDocument;
use App\Models\CourierLogisticsAffiliation;
use App\Models\LogisticsHub;
use App\Notifications\CourierApplicationReviewedNotification;
use App\Services\ActivityLogger;
use App\Services\LogisticsAccessService;
use App\Services\MediaStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LogisticsRiderApplicationController extends Controller
{
    private const REQUIRED_DOCUMENTS = ['driver_license', 'vehicle_or', 'vehicle_cr'];

    public function __construct(private readonly LogisticsAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $staff = $this->access->staff($request->user());
        $this->access->assertProviderManager($staff);
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'search' => ['nullable', 'string', 'max:100'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        // Tenant scope is the first query predicate and is applied before
        // pagination or payload generation.
        $query = CourierApplication::query()
            ->where('logistics_provider_id', $staff->logistics_provider_id)
            ->whereIn('status', ['pending', 'approved', 'rejected'])
            ->with(['applicant:id,name,first_name,last_name,email,phone', 'provider:id,code,company_name'])
            ->when($data['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when(trim((string) ($data['search'] ?? '')), fn (Builder $q, string $search) => $q
                ->where(fn (Builder $nested) => $nested->where('vehicle_plate_number', 'like', "%{$search}%")
                    ->orWhereHas('applicant', fn (Builder $user) => $user->where('name', 'like', "%{$search}%"))));
        $page = $query->orderByDesc('submitted_at')->orderByDesc('id')->paginate((int) ($data['per_page'] ?? 20));

        return response()->json(['data' => $page->getCollection()->map(fn ($application) => $this->payload($application))->values(), 'meta' => [
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(),
        ]]);
    }

    public function show(Request $request, CourierApplication $courierApplication): JsonResponse
    {
        $this->assertOwned($request, $courierApplication);

        return response()->json(['data' => $this->payload($courierApplication->load(['applicant', 'documents', 'provider', 'primaryHub']), true)]);
    }

    public function approve(Request $request, CourierApplication $courierApplication): JsonResponse
    {
        $staff = $this->assertOwned($request, $courierApplication);
        $data = $request->validate(['primary_hub_id' => ['required', 'integer', 'exists:logistics_hubs,id']]);
        $hub = LogisticsHub::query()->findOrFail($data['primary_hub_id']);
        $this->access->assertHub($staff, $hub);

        $courier = DB::transaction(function () use ($courierApplication, $staff, $hub, $request) {
            $application = CourierApplication::query()->with(['applicant', 'documents'])
                ->where('logistics_provider_id', $staff->logistics_provider_id)
                ->whereKey($courierApplication->id)->lockForUpdate()->firstOrFail();
            if ($application->status !== 'pending') {
                return null;
            }
            if (collect(self::REQUIRED_DOCUMENTS)->diff($application->documents->pluck('document_type'))->isNotEmpty()) {
                abort(409, 'All three required Rider documents must be present.');
            }

            $courier = Courier::firstOrNew(['user_id' => $application->user_id]);
            $courier->fill([
                'approved_application_id' => $application->id, 'name' => $application->applicant->display_name,
                'slug' => $courier->slug ?: $this->uniqueSlug($application), 'contact_email' => $application->applicant->email,
                'contact_phone' => $application->mobile, 'service_area' => collect([$application->city, $application->province])->filter()->join(', '),
                'active' => true, 'status' => 'active', 'availability_status' => 'offline',
                'vehicle_type' => $application->vehicle_type, 'vehicle_make' => $application->vehicle_make,
                'vehicle_model' => $application->vehicle_model, 'vehicle_year' => $application->vehicle_year,
                'vehicle_plate_number' => $application->vehicle_plate_number, 'vehicle_color' => $application->vehicle_color,
                'approved_at' => now(),
            ]);
            $courier->save();

            CourierLogisticsAffiliation::query()
                ->where('courier_id', $courier->id)->where('status', 'active')->whereNull('ended_at')
                ->update(['status' => 'inactive', 'ended_at' => now(), 'ended_by' => $staff->user_id, 'end_reason' => 'Replaced during approved Rider onboarding.']);
            CourierLogisticsAffiliation::create([
                'courier_id' => $courier->id, 'logistics_provider_id' => $staff->logistics_provider_id,
                'primary_hub_id' => $hub->id, 'status' => 'active', 'assigned_at' => now(), 'assigned_by' => $staff->user_id,
            ]);

            $application->forceFill([
                'status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $staff->user_id,
                'reviewed_by_staff_id' => $staff->id, 'primary_hub_id' => $hub->id,
                'rejection_reason' => null, 'approved_courier_id' => $courier->id,
            ])->save();
            $application->documents()->update(['status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $staff->user_id]);
            app(ActivityLogger::class)->log('courier.application.provider_approved', 'courier', 'Rider application approved by logistics provider.', $request->user(), $request, $application, ['provider_id' => $staff->logistics_provider_id, 'hub_id' => $hub->id]);

            return $courier;
        });

        if (! $courier) {
            return response()->json(['message' => 'This Rider application has already been reviewed.', 'code' => 'application_state_invalid'], 409);
        }
        $fresh = $courierApplication->fresh(['applicant', 'documents', 'provider', 'primaryHub', 'approvedCourier']);
        $this->notify($fresh, 'approved');

        return response()->json(['message' => 'Rider application approved.', 'data' => $this->payload($fresh, true)]);
    }

    public function reject(Request $request, CourierApplication $courierApplication): JsonResponse
    {
        $staff = $this->assertOwned($request, $courierApplication);
        $data = $request->validate(['rejection_reason' => ['required', 'string', 'min:5', 'max:2000']]);
        $updated = DB::transaction(function () use ($courierApplication, $staff, $data, $request) {
            $application = CourierApplication::query()->where('logistics_provider_id', $staff->logistics_provider_id)
                ->whereKey($courierApplication->id)->lockForUpdate()->firstOrFail();
            if ($application->status !== 'pending') {
                return false;
            }
            $application->forceFill([
                'status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $staff->user_id,
                'reviewed_by_staff_id' => $staff->id, 'rejection_reason' => trim($data['rejection_reason']),
            ])->save();
            $application->documents()->update(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $staff->user_id]);
            app(ActivityLogger::class)->log('courier.application.provider_rejected', 'courier', 'Rider application rejected by logistics provider.', $request->user(), $request, $application, ['provider_id' => $staff->logistics_provider_id, 'reason_provided' => true]);

            return true;
        });
        if (! $updated) {
            return response()->json(['message' => 'This Rider application has already been reviewed.', 'code' => 'application_state_invalid'], 409);
        }
        $fresh = $courierApplication->fresh(['applicant', 'documents', 'provider']);
        $this->notify($fresh, 'rejected', $fresh->rejection_reason);

        return response()->json(['message' => 'Rider application rejected.', 'data' => $this->payload($fresh, true)]);
    }

    public function viewDocument(Request $request, CourierDocument $courierDocument, MediaStorageService $storage): JsonResponse
    {
        $application = $courierDocument->application()->firstOrFail();
        $this->assertOwned($request, $application);

        return response()->json(['data' => [
            'id' => $courierDocument->id, 'document_type' => $courierDocument->document_type,
            'original_filename' => $courierDocument->original_filename, 'mime_type' => $courierDocument->mime_type,
            'file_size' => $courierDocument->file_size,
            'temporary_url' => $storage->temporaryUrl($courierDocument->file_path, 10, $courierDocument->storage_disk),
        ]]);
    }

    private function assertOwned(Request $request, CourierApplication $application)
    {
        $staff = $this->access->staff($request->user());
        $this->access->assertProviderManager($staff);
        abort_unless($application->logistics_provider_id === $staff->logistics_provider_id, 404, 'Rider application not found.');

        return $staff;
    }

    private function uniqueSlug(CourierApplication $application): string
    {
        $base = Str::slug($application->applicant->display_name) ?: 'rider';
        $slug = $base.'-'.$application->user_id;
        $suffix = 1;
        while (Courier::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$application->user_id.'-'.$suffix++;
        }

        return $slug;
    }

    private function notify(CourierApplication $application, string $decision, ?string $reason = null): void
    {
        try {
            Notification::send($application->applicant, new CourierApplicationReviewedNotification($application, $decision, $reason));
        } catch (\Throwable) {
        }
    }

    private function payload(CourierApplication $application, bool $documents = false): array
    {
        return [
            'id' => $application->id, 'status' => $application->status,
            'provider' => $application->provider ? ['id' => $application->provider->id, 'code' => $application->provider->code, 'company_name' => $application->provider->company_name] : null,
            'applicant' => $application->applicant ? ['id' => $application->applicant->id, 'name' => $application->applicant->display_name, 'email' => $application->applicant->email] : null,
            'vehicle' => ['type' => $application->vehicle_type, 'make' => $application->vehicle_make, 'model' => $application->vehicle_model, 'year' => $application->vehicle_year, 'plate_number' => $application->vehicle_plate_number, 'color' => $application->vehicle_color],
            'primary_hub' => $application->primaryHub ? ['id' => $application->primaryHub->id, 'code' => $application->primaryHub->code, 'name' => $application->primaryHub->name] : null,
            'submitted_at' => optional($application->submitted_at)->toISOString(), 'reviewed_at' => optional($application->reviewed_at)->toISOString(),
            'rejection_reason' => $application->rejection_reason,
            'documents' => $documents && $application->relationLoaded('documents') ? $application->documents->map(fn ($document) => [
                'id' => $document->id, 'document_type' => $document->document_type,
                'original_filename' => $document->original_filename, 'status' => $document->status,
            ])->values() : [],
        ];
    }
}
