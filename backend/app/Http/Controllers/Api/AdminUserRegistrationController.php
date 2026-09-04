<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceProfile;
use App\Models\User;
use App\Models\UserDocument;
use App\Notifications\UserRegistrationReviewedNotification;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

/**
 * Phase 2.6 - Maketo Admin review of marketplace User registrations.
 *
 * This queue holds User/Buyer registrations only. Seller, Rider and Logistics
 * applications keep their own separate queues and are never mixed in here.
 */
class AdminUserRegistrationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogger $activity,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(MarketplaceProfile::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = User::query()
            ->where('role', '!=', 'admin')
            ->whereHas('marketplaceProfile', fn (Builder $profile) => $profile
                ->where('status', $data['status'] ?? 'pending'))
            ->with(['marketplaceProfile.approver:id,name,first_name,last_name', 'marketplaceProfile.rejector:id,name,first_name,last_name'])
            ->withCount('documents');

        $query->when(trim((string) ($data['search'] ?? '')), function (Builder $builder, string $search) {
            $builder->where(fn (Builder $nested) => $nested
                ->where('name', 'like', "%{$search}%")
                ->orWhere('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%"));
        });

        $page = $query->orderBy(
            MarketplaceProfile::select('submitted_at')->whereColumn('marketplace_profiles.user_id', 'users.id')->limit(1),
        )->orderBy('id')
            ->paginate((int) ($data['per_page'] ?? 20));

        return response()->json([
            'data' => $page->getCollection()->map(fn (User $user) => $this->summaryPayload($user))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        abort_if($user->isAdmin(), 404);
        abort_if(! $user->marketplaceProfile()->exists(), 404);

        $user->load([
            'marketplaceProfile.approver:id,name,first_name,last_name',
            'marketplaceProfile.rejector:id,name,first_name,last_name',
            'documents',
            'addresses' => fn ($query) => $query->orderByDesc('is_default')->orderBy('id'),
        ]);

        return response()->json(['data' => [
            ...$this->summaryPayload($user),
            'address' => $this->addressPayload($user),
            'documents' => $user->documents->map(fn (UserDocument $document) => [
                'id' => $document->id,
                'document_type' => $document->document_type,
                'original_filename' => $document->original_filename,
                'mime_type' => $document->mime_type,
                'file_size' => $document->file_size,
                'status' => $document->status,
                'uploaded_at' => optional($document->uploaded_at)->toISOString(),
            ])->values(),
        ]]);
    }

    public function approve(Request $request, User $user): JsonResponse
    {
        abort_if($user->isAdmin(), 404);
        $admin = $request->user();

        $approved = DB::transaction(function () use ($user, $admin): bool {
            $locked = MarketplaceProfile::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'pending') {
                return false;
            }

            $locked->forceFill([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $admin->id,
                'rejected_at' => null,
                'rejected_by' => null,
                'rejection_reason' => null,
            ])->save();

            $user->documents()->where('status', 'pending')->update([
                'status' => 'approved',
                'reviewed_at' => now(),
                'reviewed_by' => $admin->id,
            ]);

            return true;
        });

        if (! $approved) {
            return response()->json([
                'message' => 'This registration has already been reviewed.',
                'code' => 'registration_state_invalid',
            ], 409);
        }

        $fresh = $user->fresh(['marketplaceProfile.approver', 'marketplaceProfile.rejector']);
        $this->notifyApplicant($fresh, 'approved');
        $this->activity->log('admin.user_registration.approved', 'moderation', 'User registration approved.', $admin, $request, $fresh);

        return response()->json([
            'message' => 'Registration approved.',
            'data' => $this->summaryPayload($fresh),
        ]);
    }

    public function reject(Request $request, User $user): JsonResponse
    {
        abort_if($user->isAdmin(), 404);
        $admin = $request->user();
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $rejected = DB::transaction(function () use ($user, $admin, $data): bool {
            $locked = MarketplaceProfile::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'pending') {
                return false;
            }

            $locked->forceFill([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by' => $admin->id,
                'approved_at' => null,
                'approved_by' => null,
                'rejection_reason' => trim($data['reason']),
            ])->save();

            $user->documents()->where('status', 'pending')->update([
                'status' => 'rejected',
                'reviewed_at' => now(),
                'reviewed_by' => $admin->id,
            ]);

            return true;
        });

        if (! $rejected) {
            return response()->json([
                'message' => 'This registration has already been reviewed.',
                'code' => 'registration_state_invalid',
            ], 409);
        }

        $fresh = $user->fresh(['marketplaceProfile.approver', 'marketplaceProfile.rejector']);
        $this->notifyApplicant($fresh, 'rejected', $fresh->marketplaceProfile?->rejection_reason);
        $this->activity->log('admin.user_registration.rejected', 'moderation', 'User registration rejected.', $admin, $request, $fresh, ['reason_provided' => true]);

        return response()->json([
            'message' => 'Registration rejected.',
            'data' => $this->summaryPayload($fresh),
        ]);
    }

    /**
     * Short-lived signed access to a private registration ID, admin only.
     */
    public function viewDocument(UserDocument $userDocument, MediaStorageService $storage): JsonResponse
    {
        return response()->json(['data' => [
            'id' => $userDocument->id,
            'document_type' => $userDocument->document_type,
            'original_filename' => $userDocument->original_filename,
            'mime_type' => $userDocument->mime_type,
            'file_size' => $userDocument->file_size,
            'temporary_url' => $storage->temporaryUrl($userDocument->file_path, 10, $userDocument->storage_disk),
        ]]);
    }

    private function notifyApplicant(User $user, string $decision, ?string $reason = null): void
    {
        try {
            Notification::send($user, new UserRegistrationReviewedNotification($decision, $reason));
        } catch (\Throwable) {
            // Delivery failure must not roll back a completed review decision.
        }

        $this->notifications->publishToUser($user, [
            'category' => 'account',
            'title' => $decision === 'approved' ? 'Your Marketplace access is approved' : 'Your Marketplace application was not approved',
            'body' => $decision === 'approved'
                ? 'You can now shop and use the Maketo Marketplace.'
                : 'Your Marketplace application was reviewed and not approved.',
        ]);
    }

    private function summaryPayload(User $user): array
    {
        $profile = $user->marketplaceProfile;
        $reviewer = $profile?->status === 'approved' ? $profile?->approver : $profile?->rejector;

        return [
            'id' => $user->id,
            'reference' => 'UR-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'display_name' => $user->display_name,
            'sex' => $user->sex,
            'birthdate' => optional($user->birthdate)->toDateString(),
            'age' => $user->age,
            'email' => $user->email,
            'phone' => $user->phone ?? $user->mobile,
            'status' => $user->status,
            'registration_status' => $profile?->status,
            'submitted_at' => optional($profile?->submitted_at)->toISOString(),
            'reviewed_at' => optional($profile?->approved_at ?? $profile?->rejected_at)->toISOString(),
            'reviewer' => $reviewer
                ? ['id' => $reviewer->id, 'name' => $reviewer->display_name]
                : null,
            'decision_reason' => $profile?->rejection_reason,
            'document_count' => (int) ($user->documents_count ?? $user->documents()->count()),
            'email_verified_at' => optional($user->email_verified_at)->toISOString(),
        ];
    }

    private function addressPayload(User $user): ?array
    {
        $address = $user->addresses->firstWhere('is_default', true) ?? $user->addresses->first();

        if (! $address) {
            return null;
        }

        return [
            'line1' => $address->line1,
            'line2' => $address->line2,
            'region' => $address->region,
            'region_code' => $address->region_code,
            'province' => $address->province,
            'province_code' => $address->province_code,
            'city' => $address->city,
            'city_code' => $address->city_code,
            'barangay' => $address->barangay,
            'barangay_code' => $address->barangay_code,
            'postal_code' => $address->postal_code,
        ];
    }
}
