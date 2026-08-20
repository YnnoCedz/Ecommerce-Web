<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModerationController extends Controller
{
    public function reports(Request $request): JsonResponse
    {
        return response()->json(['data' => []]);
    }

    public function storeReport(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Report submitted.'], 201);
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

        $totalQuery = clone $baseQuery;
        $unreadQuery = clone $baseQuery;
        $categoryQuery = clone $baseQuery;

        $limit = (int) $request->input('limit', 25);
        $limit = $limit > 0 ? min($limit, 100) : 25;

        $notifications = $query
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

        return response()->json([
            'data' => $notifications,
            'meta' => [
                'total_count' => (clone $totalQuery)->count(),
                'unread_count' => (clone $unreadQuery)->whereNull('read_at')->count(),
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
}
