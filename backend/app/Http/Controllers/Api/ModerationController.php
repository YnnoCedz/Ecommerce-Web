<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Courier;
use App\Models\MarketplaceNotification;
use App\Models\Product;
use App\Models\Report;
use App\Models\ReportAttachment;
use App\Models\Seller;
use App\Models\User;
use App\Services\MediaStorageService;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ModerationController extends Controller
{
    public function __construct(
        private readonly MediaStorageService $media,
        private readonly NotificationService $notifications,
    ) {}

    public function reports(Request $request): JsonResponse
    {
        $reports = Report::query()
            ->where('reporter_user_id', $request->user()->id)
            ->withCount('attachments')
            ->latest('submitted_at')
            ->latest('id')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $reports->map(fn (Report $report) => $this->reportPayload($report))->values(),
        ]);
    }

    public function storeReport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'target_type' => ['required', Rule::in(['seller', 'buyer', 'courier', 'product', 'conversation'])],
            'target_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'min:10', 'max:3000'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf,doc,docx', 'max:10240'],
        ]);

        $targetName = $this->resolveTargetName($request->user(), $data['target_type'], (int) $data['target_id']);
        $storedFiles = [];

        try {
            $report = DB::transaction(function () use ($request, $data, $targetName, &$storedFiles) {
                $report = Report::create([
                    'reporter_user_id' => $request->user()->id,
                    'target_type' => $data['target_type'],
                    'target_id' => (int) $data['target_id'],
                    'target_name' => $targetName,
                    'reason' => $data['reason'],
                    'details' => trim($data['description']),
                    'severity' => $this->severityForReason($data['reason']),
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]);

                foreach ($request->file('attachments', []) as $file) {
                    $stored = $this->media->storePrivateFile($file, "reports/{$report->id}/attachments");
                    $storedFiles[] = $stored;
                    $report->attachments()->create([
                        'storage_disk' => $stored['storage_disk'],
                        'file_name' => basename($stored['storage_path']),
                        'file_path' => $stored['storage_path'],
                        'original_filename' => $stored['original_filename'],
                        'mime_type' => $stored['mime_type'],
                        'file_size' => $stored['file_size'],
                    ]);
                }

                $this->notifications->publishToRoles('admin', [
                    'category' => 'moderation',
                    'title' => 'New report submitted',
                    'body' => "Report #{$report->id} requires moderation review.",
                    'action_type' => 'admin_report',
                    'action_label' => 'Review report',
                ]);

                return $report->load(['reporter', 'resolver', 'attachments'])->loadCount('attachments');
            }, 3);
        } catch (\Throwable $exception) {
            foreach ($storedFiles as $stored) {
                $this->media->delete($stored['storage_path'], $stored['storage_disk']);
            }

            throw $exception;
        }

        return response()->json([
            'message' => 'Report submitted.',
            'data' => $this->reportPayload($report, true),
        ], 201);
    }

    public function adminReports(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'reviewing', 'resolved', 'dismissed'])],
            'target_type' => ['nullable', Rule::in(['seller', 'buyer', 'courier', 'product', 'conversation'])],
            'severity' => ['nullable', Rule::in(['low', 'medium', 'high', 'critical'])],
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Report::query()->with(['reporter', 'resolver'])->withCount('attachments');
        $query->when($data['status'] ?? null, fn (Builder $builder, string $status) => $builder->where('status', $status));
        $query->when($data['target_type'] ?? null, fn (Builder $builder, string $type) => $builder->where('target_type', $type));
        $query->when($data['severity'] ?? null, fn (Builder $builder, string $severity) => $builder->where('severity', $severity));
        $query->when(trim((string) ($data['search'] ?? '')), function (Builder $builder, string $search) {
            $builder->where(function (Builder $nested) use ($search) {
                $nested->where('target_name', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('reporter', fn (Builder $reporter) => $reporter->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            });
        });

        $reports = $query->latest('submitted_at')->latest('id')->limit((int) ($data['limit'] ?? 100))->get();
        $counts = Report::query()
            ->selectRaw('COUNT(*) as total_count')
            ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count")
            ->selectRaw("SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing_count")
            ->selectRaw("SUM(CASE WHEN status = 'pending' AND severity = 'critical' THEN 1 ELSE 0 END) as critical_pending_count")
            ->first();

        return response()->json([
            'data' => $reports->map(fn (Report $report) => $this->reportPayload($report))->values(),
            'meta' => [
                'total_count' => (int) $counts->total_count,
                'pending_count' => (int) $counts->pending_count,
                'reviewing_count' => (int) $counts->reviewing_count,
                'critical_pending_count' => (int) $counts->critical_pending_count,
            ],
        ]);
    }

    public function adminReport(Report $report): JsonResponse
    {
        $report->load(['reporter', 'resolver', 'attachments'])->loadCount('attachments');

        return response()->json(['data' => $this->reportPayload($report, true)]);
    }

    public function updateReport(Request $request, Report $report): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'reviewing', 'resolved', 'dismissed'])],
            'moderation_notes' => ['nullable', 'string', 'max:3000', Rule::requiredIf(in_array($request->input('status'), ['resolved', 'dismissed'], true))],
        ]);

        $report = DB::transaction(function () use ($request, $report, $data) {
            $locked = Report::query()->whereKey($report->id)->lockForUpdate()->firstOrFail();
            $final = in_array($data['status'], ['resolved', 'dismissed'], true);
            $locked->forceFill([
                'status' => $data['status'],
                'moderation_notes' => $data['moderation_notes'] ?? $locked->moderation_notes,
                'resolved_by' => $final ? $request->user()->id : null,
                'resolved_at' => $final ? now() : null,
            ])->save();

            if ($final && $locked->reporter) {
                $this->notifications->publishToUser($locked->reporter, [
                    'category' => 'moderation',
                    'title' => 'Report reviewed',
                    'body' => "Report #{$locked->id} was {$data['status']}.",
                    'action_type' => 'report',
                    'action_label' => 'View report',
                ]);
            }

            return $locked->fresh(['reporter', 'resolver', 'attachments'])->loadCount('attachments');
        }, 3);

        return response()->json([
            'message' => 'Report status updated.',
            'data' => $this->reportPayload($report, true),
        ]);
    }

    public function reportAttachment(Report $report, ReportAttachment $attachment): RedirectResponse
    {
        abort_unless($attachment->report_id === $report->id, 404);

        return redirect()->away($this->media->temporaryUrl($attachment->file_path, 10, $attachment->storage_disk));
    }

    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();

        $baseQuery = $user->marketplaceNotifications()
            ->whereNull('dismissed_at');

        $query = (clone $baseQuery)
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($category = trim((string) $request->input('category', ''))) {
            $query->where('category', $category);
            $baseQuery->where('category', $category);
        }

        $categoryQuery = clone $baseQuery;

        $limit = (int) $request->input('limit', 25);
        $limit = $limit > 0 ? min($limit, 100) : 25;

        $notifications = $query
            ->with('order:id,order_number')
            ->limit($limit)
            ->get()
            ->map(fn (MarketplaceNotification $notification) => $this->notificationPayload($notification))
            ->values();

        $categoryStats = $categoryQuery
            ->select([
                'category',
                DB::raw('COUNT(*) as total_count'),
                DB::raw('SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread_count'),
            ])
            ->groupBy('category')
            ->orderByDesc('unread_count')
            ->orderByDesc('total_count')
            ->get()
            ->map(fn ($row) => [
                'category' => (string) $row->category,
                'label' => $this->categoryLabel((string) $row->category),
                'count' => (int) $row->total_count,
                'unread_count' => (int) $row->unread_count,
            ])
            ->values();
        $counts = (clone $baseQuery)
            ->selectRaw('COUNT(*) as total_count')
            ->selectRaw('SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread_count')
            ->first();

        return response()->json([
            'data' => $notifications,
            'meta' => [
                'total_count' => (int) $counts->total_count,
                'unread_count' => (int) $counts->unread_count,
                'categories' => $categoryStats,
                'limit' => $limit,
            ],
        ]);
    }

    public function markNotificationRead(Request $request, MarketplaceNotification $notification): JsonResponse
    {
        $this->assertNotificationOwnership($request, $notification);

        if (! $notification->read_at) {
            $notification->forceFill(['read_at' => now()])->save();
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'data' => $this->notificationPayload($notification->fresh()),
        ]);
    }

    public function dismissNotification(Request $request, MarketplaceNotification $notification): JsonResponse
    {
        $this->assertNotificationOwnership($request, $notification);

        if (! $notification->dismissed_at) {
            $notification->forceFill([
                'dismissed_at' => now(),
                'read_at' => $notification->read_at ?? now(),
            ])->save();
        }

        return response()->json([
            'message' => 'Notification dismissed.',
            'data' => $this->notificationPayload($notification->fresh()),
        ]);
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        $count = $request->user()
            ->marketplaceNotifications()
            ->whereNull('dismissed_at')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'data' => [
                'updated' => $count,
            ],
        ]);
    }

    private function assertNotificationOwnership(Request $request, MarketplaceNotification $notification): void
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
    }

    private function notificationPayload(MarketplaceNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'category' => $notification->category,
            'title' => $notification->title,
            'body' => $notification->body,
            'action_type' => $notification->action_type,
            'action_label' => $notification->action_label,
            'order_id' => $notification->order_id,
            'order_number' => $notification->order?->order_number,
            'seller_order_id' => $notification->seller_order_id,
            'product_id' => $notification->product_id,
            'conversation_id' => $notification->conversation_id,
            'read_at' => optional($notification->read_at)->toISOString(),
            'dismissed_at' => optional($notification->dismissed_at)->toISOString(),
            'created_at' => optional($notification->created_at)->toISOString(),
        ];
    }

    private function categoryLabel(string $category): string
    {
        return match ($category) {
            'orders' => 'Orders',
            'delivery' => 'Delivery',
            'messages' => 'Messages',
            'account' => 'Account',
            'promotions' => 'Promotions',
            'moderation' => 'Moderation',
            'inventory' => 'Inventory',
            default => ucfirst(str_replace(['-', '_'], ' ', $category)),
        };
    }

    private function resolveTargetName(User $reporter, string $type, int $id): string
    {
        return match ($type) {
            'seller' => (function () use ($id) {
                $seller = Seller::query()->findOrFail($id);

                return $seller->trade_name ?: $seller->business_name;
            })(),
            'buyer' => User::query()->where('role', '!=', 'admin')->findOrFail($id)->display_name,
            'courier' => Courier::query()->findOrFail($id)->name,
            'product' => Product::query()->findOrFail($id)->name,
            'conversation' => (function () use ($reporter, $id) {
                $conversation = Conversation::query()
                    ->whereHas('participants', fn (Builder $query) => $query
                        ->where('participantable_type', User::class)
                        ->where('participantable_id', $reporter->id))
                    ->findOrFail($id);

                return $conversation->subject ?: ($conversation->order_number ? "Order {$conversation->order_number}" : "Conversation #{$conversation->id}");
            })(),
        };
    }

    private function severityForReason(string $reason): string
    {
        return match ($reason) {
            'fraud', 'counterfeit', 'theft', 'safety', 'scam' => 'critical',
            'harassment', 'false-delivery', 'prohibited', 'ip', 'fake-return' => 'high',
            'misleading', 'policy', 'inappropriate', 'damaged' => 'medium',
            default => 'low',
        };
    }

    private function reportPayload(Report $report, bool $withAttachments = false): array
    {
        $payload = [
            'id' => $report->id,
            'reference' => 'RPT-'.str_pad((string) $report->id, 6, '0', STR_PAD_LEFT),
            'status' => $report->status,
            'reason' => $report->reason,
            'description' => $report->details,
            'severity' => $report->severity,
            'target_type' => $report->target_type,
            'target_id' => $report->target_id,
            'target_name' => $report->target_name,
            'reporter' => $report->relationLoaded('reporter') && $report->reporter ? [
                'id' => $report->reporter->id,
                'name' => $report->reporter->display_name,
                'email' => $report->reporter->email,
            ] : null,
            'attachment_count' => (int) ($report->attachments_count ?? $report->attachments()->count()),
            'moderation_notes' => $report->moderation_notes,
            'resolved_by' => $report->relationLoaded('resolver') && $report->resolver ? [
                'id' => $report->resolver->id,
                'name' => $report->resolver->display_name,
            ] : null,
            'submitted_at' => optional($report->submitted_at)->toISOString(),
            'resolved_at' => optional($report->resolved_at)->toISOString(),
            'created_at' => optional($report->created_at)->toISOString(),
        ];

        if ($withAttachments) {
            $payload['attachments'] = $report->attachments->map(fn (ReportAttachment $attachment) => [
                'id' => $attachment->id,
                'name' => $attachment->original_filename ?: $attachment->file_name,
                'mime_type' => $attachment->mime_type,
                'file_size' => $attachment->file_size,
                'url' => "/api/admin/reports/{$report->id}/attachments/{$attachment->id}",
            ])->values();
        }

        return $payload;
    }
}
