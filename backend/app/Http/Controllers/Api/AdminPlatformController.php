<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SellerDocument;
use App\Notifications\SecurityActionCompletedNotification;
use App\Services\ActionChallengeService;
use App\Services\ActivityLogger;
use App\Services\PlatformActivityService;
use App\Services\PlatformSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Laravel\Sanctum\PersonalAccessToken;

class AdminPlatformController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activity,
        private readonly PlatformSettingsService $settings,
        private readonly ActionChallengeService $challenges,
        private readonly PlatformActivityService $platformActivity,
    ) {}

    public function analytics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', Rule::in([7, 30, 90, 365])],
            'range' => ['nullable', Rule::in(['7d', '30d', '90d', '12m'])],
            'section' => ['nullable', Rule::in(['overview', 'commerce', 'users-sellers', 'catalog', 'operations', 'security'])],
        ]);
        $range = $validated['range'] ?? (($validated['days'] ?? 30) === 365 ? '12m' : (string) ($validated['days'] ?? 30).'d');
        $days = match ($range) {
            '7d' => 7, '90d' => 90, '12m' => 365, default => 30
        };
        $from = now()->subDays($days - 1)->startOfDay();
        $to = now()->endOfDay();
        $previousFrom = $from->copy()->subDays($days);
        $previousTo = $from->copy()->subSecond();
        if (isset($validated['section'])) {
            return response()->json(['data' => $this->sectionAnalytics(
                $validated['section'], $range, $days, $from, $to, $previousFrom, $previousTo
            )]);
        }
        $today = now()->startOfDay();
        $warningDate = now()->addDays((int) $this->settings->get('seller_document_expiry_warning_days'))->endOfDay();

        $summary = DB::selectOne(<<<'SQL'
            SELECT
              (SELECT COUNT(*) FROM users WHERE role = 'buyer') buyers_total,
              (SELECT COUNT(*) FROM users WHERE role = 'seller') seller_users_total,
              (SELECT COUNT(*) FROM users WHERE role != 'admin' AND status = 'active') active_users,
              (SELECT COUNT(*) FROM users WHERE role != 'admin' AND status IN ('suspended','restricted')) suspended_users,
              (SELECT COUNT(*) FROM users WHERE role != 'admin' AND email_verified_at IS NOT NULL) verified_users,
              (SELECT COUNT(*) FROM users WHERE role != 'admin' AND email_verified_at IS NULL) unverified_users,
              (SELECT COUNT(*) FROM users WHERE role != 'admin' AND created_at >= ?) new_registrations,
              (SELECT COUNT(*) FROM sellers WHERE deleted_at IS NULL AND status = 'approved') approved_sellers,
              (SELECT COUNT(*) FROM sellers WHERE deleted_at IS NULL AND status = 'approved') active_stores,
              (SELECT COUNT(*) FROM seller_applications WHERE status IN ('pending','reviewing')) pending_applications,
              (SELECT COUNT(*) FROM seller_applications WHERE status = 'rejected') rejected_applications,
              (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'active') active_products,
              (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status != 'active') inactive_products,
              (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND track_inventory = 1 AND stock_quantity <= 0) out_of_stock_products,
              (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND created_at >= ?) new_products,
              (SELECT COUNT(*) FROM orders) orders_total,
              (SELECT COUNT(*) FROM orders WHERE created_at >= ?) orders_today,
              (SELECT COUNT(*) FROM orders WHERE status IN ('delivered','completed')) completed_orders,
              (SELECT COUNT(*) FROM orders WHERE status IN ('cancelled','failed')) cancelled_orders,
              (SELECT COUNT(*) FROM return_requests) returned_orders,
              (SELECT COUNT(*) FROM disputes WHERE status IN ('open','reviewing')) disputed_orders,
              (SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE payment_status IN ('paid','partially_refunded')) gross_sales,
              (SELECT COALESCE(AVG(grand_total),0) FROM orders) average_order_value,
              (SELECT COUNT(*) FROM promotions WHERE status = 'active' AND starts_at <= CURRENT_TIMESTAMP AND ends_at >= CURRENT_TIMESTAMP) active_deals,
              (SELECT COUNT(*) FROM promotions WHERE starts_at > CURRENT_TIMESTAMP) scheduled_deals,
              (SELECT COUNT(*) FROM promotions WHERE ends_at < CURRENT_TIMESTAMP OR status IN ('expired','cancelled')) expired_deals
            SQL, [$from, $from, $today]);

        $auth = ActivityLog::query()->where('created_at', '>=', $today)
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.success' THEN 1 ELSE 0 END) successful_logins")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.failed' THEN 1 ELSE 0 END) failed_logins")
            ->selectRaw("COUNT(DISTINCT CASE WHEN event_type = 'auth.login.success' THEN user_id END) unique_users")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.success' AND actor_role = 'buyer' THEN 1 ELSE 0 END) buyer_logins")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.success' AND actor_role = 'seller' THEN 1 ELSE 0 END) seller_logins")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.success' AND actor_role = 'admin' THEN 1 ELSE 0 END) admin_logins")
            ->first();

        $renewals = [
            'due_for_renewal' => SellerDocument::where('status', 'approved')->whereBetween('expires_at', [now(), $warningDate])->count(),
            'expired' => SellerDocument::where('status', 'approved')->where('expires_at', '<', now())->count(),
            'pending' => SellerDocument::whereNotNull('renewal_of_document_id')->where('status', 'pending')->count(),
        ];

        $periodOrders = DB::table('orders')->whereBetween('created_at', [$from, $to])
            ->selectRaw('COUNT(*) total, COALESCE(SUM(grand_total),0) gmv, COALESCE(AVG(grand_total),0) average_order_value')->first();
        $previousOrders = DB::table('orders')->whereBetween('created_at', [$previousFrom, $previousTo])
            ->selectRaw('COUNT(*) total, COALESCE(SUM(grand_total),0) gmv')->first();
        $periodUsers = DB::table('users')->where('role', '!=', 'admin')->whereBetween('created_at', [$from, $to])->count();
        $previousUsers = DB::table('users')->where('role', '!=', 'admin')->whereBetween('created_at', [$previousFrom, $previousTo])->count();
        $activityVolume = ActivityLog::whereBetween('created_at', [$from, $to])->count();
        $previousActivityVolume = ActivityLog::whereBetween('created_at', [$previousFrom, $previousTo])->count();
        $periodReturns = DB::table('return_requests')->whereBetween('requested_at', [$from, $to])->count();
        $periodDisputes = DB::table('disputes')->whereBetween('opened_at', [$from, $to])->count();
        $periodCancellations = DB::table('order_cancellations')->whereBetween('cancelled_at', [$from, $to])->count();
        $approvedApplications = DB::table('seller_applications')->whereBetween('reviewed_at', [$from, $to])->where('status', 'approved')->count();
        $reviewedApplications = DB::table('seller_applications')->whereBetween('reviewed_at', [$from, $to])->whereIn('status', ['approved', 'rejected'])->count();
        $activeMarketplaceUsers = ActivityLog::whereBetween('created_at', [$from, $to])->whereNotNull('user_id')
            ->whereIn('actor_role', ['buyer', 'seller'])->distinct('user_id')->count('user_id');

        $kpis = [
            'gross_marketplace_value' => $this->comparison((float) $periodOrders->gmv, (float) $previousOrders->gmv),
            'orders' => $this->comparison((int) $periodOrders->total, (int) $previousOrders->total),
            'average_order_value' => $this->comparison((float) $periodOrders->average_order_value,
                (int) $previousOrders->total > 0 ? (float) $previousOrders->gmv / (int) $previousOrders->total : null),
            'new_registrations' => $this->comparison($periodUsers, $previousUsers),
            'active_marketplace_users' => ['value' => $activeMarketplaceUsers, 'previous' => null, 'change_percent' => null],
            'active_sellers' => ['value' => (int) $summary->active_stores, 'previous' => null, 'change_percent' => null],
            'active_products' => ['value' => (int) $summary->active_products, 'previous' => null, 'change_percent' => null],
            'platform_activity' => $this->comparison($activityVolume, $previousActivityVolume),
            'return_rate' => ['value' => $this->rate($periodReturns, (int) $periodOrders->total), 'previous' => null, 'change_percent' => null],
            'cancellation_rate' => ['value' => $this->rate($periodCancellations, (int) $periodOrders->total), 'previous' => null, 'change_percent' => null],
            'dispute_rate' => ['value' => $this->rate($periodDisputes, (int) $periodOrders->total), 'previous' => null, 'change_percent' => null],
            'seller_approval_rate' => ['value' => $this->rate($approvedApplications, $reviewedApplications), 'previous' => null, 'change_percent' => null],
        ];

        return response()->json(['data' => [
            'range_days' => $days,
            'range' => $range,
            'generated_at' => now()->toISOString(),
            'period' => ['from' => $from->toISOString(), 'to' => $to->toISOString(), 'previous_from' => $previousFrom->toISOString(), 'previous_to' => $previousTo->toISOString()],
            'kpis' => $kpis,
            'users' => [
                'buyers' => (int) $summary->buyers_total, 'sellers' => (int) $summary->seller_users_total,
                'active' => (int) $summary->active_users, 'suspended' => (int) $summary->suspended_users,
                'verified' => (int) $summary->verified_users, 'unverified' => (int) $summary->unverified_users,
                'new_registrations' => (int) $summary->new_registrations,
                'growth' => $this->userGrowth($from, $days === 365),
            ],
            'sellers' => [
                'approved' => (int) $summary->approved_sellers, 'active_stores' => (int) $summary->active_stores,
                'pending_applications' => (int) $summary->pending_applications, 'rejected_applications' => (int) $summary->rejected_applications,
                ...$renewals,
            ],
            'products' => [
                'active' => (int) $summary->active_products, 'inactive' => (int) $summary->inactive_products,
                'out_of_stock' => (int) $summary->out_of_stock_products, 'new' => (int) $summary->new_products,
                'by_category' => DB::table('categories')->leftJoin('products', function ($join) {
                    $join->on('products.category_id', '=', 'categories.id')->whereNull('products.deleted_at');
                })->whereNull('categories.deleted_at')->groupBy('categories.id', 'categories.name')->select('categories.name', DB::raw('COUNT(products.id) total'))->orderByDesc('total')->limit(12)->get(),
            ],
            'orders' => [
                'total' => (int) $summary->orders_total, 'today' => (int) $summary->orders_today,
                'completed' => (int) $summary->completed_orders, 'cancelled' => (int) $summary->cancelled_orders,
                'returned' => (int) $summary->returned_orders, 'disputed' => (int) $summary->disputed_orders,
                'gross_sales' => (float) $summary->gross_sales, 'average_order_value' => (float) $summary->average_order_value,
                'trend' => $this->orderTrend($from),
            ],
            'promotions' => ['active' => (int) $summary->active_deals, 'scheduled' => (int) $summary->scheduled_deals, 'expired' => (int) $summary->expired_deals],
            'authentication' => [
                'successful_today' => (int) ($auth->successful_logins ?? 0), 'failed_today' => (int) ($auth->failed_logins ?? 0),
                'unique_users_today' => (int) ($auth->unique_users ?? 0), 'buyer_logins_today' => (int) ($auth->buyer_logins ?? 0),
                'seller_logins_today' => (int) ($auth->seller_logins ?? 0), 'admin_logins_today' => (int) ($auth->admin_logins ?? 0),
                'tracking_started_at' => ($trackingStarted = ActivityLog::min('created_at')) ? Carbon::parse($trackingStarted)->toISOString() : null,
                'trend' => $this->authenticationTrend($from, $days === 365),
                'by_role' => ActivityLog::whereBetween('created_at', [$from, $to])->where('event_type', 'auth.login.success')
                    ->selectRaw("COALESCE(actor_role, 'unknown') role, COUNT(*) total")->groupBy('actor_role')->get(),
                'mfa_failures' => ActivityLog::whereBetween('created_at', [$from, $to])->where('event_type', 'auth.mfa.failed')->count(),
                'password_changes' => ActivityLog::whereBetween('created_at', [$from, $to])->where('event_type', 'auth.password.changed')->count(),
                'definition' => 'Authentication metrics include captured activity_logs only; no token or last-active timestamps are treated as logins.',
            ],
            'seller_performance' => [
                'top_sellers' => $this->topSellers($from, $to),
                'application_trend' => $this->sellerApplicationTrend($from, $days === 365),
                'document_compliance' => [
                    'valid' => SellerDocument::where('status', 'approved')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))->count(),
                    'expiring_soon' => $renewals['due_for_renewal'], 'expired' => $renewals['expired'], 'renewal_pending' => $renewals['pending'],
                ],
                'deactivated' => DB::table('sellers')->whereNull('deleted_at')->whereIn('status', ['inactive', 'suspended', 'closed'])->count(),
            ],
            'catalog' => [
                'growth' => $this->productGrowth($from, $days === 365),
                'top_products' => $this->topProducts($from, $to),
                'status' => ['active' => (int) $summary->active_products, 'inactive' => (int) $summary->inactive_products],
                'inventory' => ['in_stock' => DB::table('products')->whereNull('deleted_at')->where(fn ($q) => $q->where('track_inventory', false)->orWhere('stock_quantity', '>', 0))->count(), 'out_of_stock' => (int) $summary->out_of_stock_products],
            ],
            'operations' => $this->operationsAnalytics($from, $to, $days === 365),
            'experience' => [
                'return_rate' => $this->rate($periodReturns, (int) $periodOrders->total),
                'cancellation_rate' => $this->rate($periodCancellations, (int) $periodOrders->total),
                'dispute_rate' => $this->rate($periodDisputes, (int) $periodOrders->total),
                'refund_volume' => (float) DB::table('return_requests')->whereBetween('requested_at', [$from, $to])->sum('refunded_amount'),
                'rating_distribution' => DB::table('reviews')->whereBetween(DB::raw('COALESCE(submitted_at, created_at)'), [$from, $to])->selectRaw('rating, COUNT(*) total')->groupBy('rating')->orderBy('rating')->get(),
                'moderation' => DB::table('reports')->whereBetween(DB::raw('COALESCE(submitted_at, created_at)'), [$from, $to])->selectRaw('status, COUNT(*) total')->groupBy('status')->get(),
            ],
            'activity' => [
                'volume' => $activityVolume,
                'trend' => $this->activityTrend($from, $days === 365),
                'definition' => 'Volume chart counts captured audit events. Historical reconstructed records remain available in the unified activity feed.',
            ],
        ]]);
    }

    public function activity(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'], 'category' => ['nullable', 'string', 'max:60'],
            'event_type' => ['nullable', 'string', 'max:120'], 'role' => ['nullable', Rule::in(['buyer', 'seller', 'admin'])],
            'source' => ['nullable', Rule::in(['audit_log', 'historical_record'])],
            'outcome' => ['nullable', Rule::in(['success', 'failure'])],
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $logs = $this->platformActivity->paginate($data);

        return response()->json(['data' => $logs->getCollection()->map(fn ($log) => $this->platformActivity->normalize($log))->values(),
            'meta' => ['current_page' => $logs->currentPage(), 'last_page' => $logs->lastPage(), 'per_page' => $logs->perPage(), 'total' => $logs->total()]]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => $this->settings->all()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['settings' => ['required', 'array', 'min:1', 'max:10']]);
        $changed = [];
        DB::transaction(function () use ($data, $request, &$changed) {
            foreach ($data['settings'] as $key => $value) {
                $result = $this->settings->set((string) $key, $value, $request->user());
                $changed[$key] = $result['current'];
                $this->activity->log('platform.setting.changed', 'settings', 'Platform setting changed.', $request->user(), $request, null, [
                    'setting_key' => $key, 'previous_value' => $result['previous'], 'new_value' => $result['current'],
                ]);
            }
        });

        return response()->json(['message' => 'Platform settings updated.', 'data' => $this->settings->all(), 'changed' => array_keys($changed)]);
    }

    public function passwordChallenge(Request $request): JsonResponse
    {
        $data = $request->validate(['current_password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'code' => 'current_password_invalid'], 422);
        }
        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'MFA is not enabled for this administrator.', 'code' => 'mfa_not_enabled'], 409);
        }
        $issued = $this->challenges->issue($user, 'admin.change_password');

        return response()->json(['message' => 'A verification code was sent to your email.', 'data' => [
            'challenge_id' => $issued['challenge']->id, 'challenge_token' => $issued['token'],
            'expires_at' => $issued['challenge']->expires_at->toISOString(),
        ]], 201);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'max:16', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
            'challenge_id' => ['nullable', 'integer', 'min:1'], 'challenge_token' => ['nullable', 'string', 'size:64'],
            'code' => ['nullable', 'string', 'regex:/^\d{6}$/'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'code' => 'current_password_invalid'], 422);
        }
        $challenge = null;
        if ($user->two_factor_enabled) {
            $request->validate(['challenge_id' => ['required'], 'challenge_token' => ['required'], 'code' => ['required']]);
            $challenge = $this->challenges->verify($user, 'admin.change_password', (int) $data['challenge_id'], $data['challenge_token'], $data['code']);
        }

        DB::transaction(function () use ($user, $data, $challenge, $request) {
            $user->forceFill(['password' => Hash::make($data['password']), 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $current = $user->currentAccessToken();
            $query = $user->tokens();
            if ($current instanceof PersonalAccessToken) {
                $query->whereKeyNot($current->getKey());
            }
            $query->delete();
            $challenge?->update(['consumed_at' => now()]);
            $this->activity->log('auth.password.changed', 'authentication', 'Administrator password changed.', $user, $request, $user);
        });
        Notification::send($user, new SecurityActionCompletedNotification('Your Maketo administrator password was changed.', $this->settings->get('support_email'), $this->settings->get('platform_name')));

        return response()->json(['message' => 'Password updated. Other sessions and access tokens were revoked.']);
    }

    public function renewals(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])]])['status'] ?? null;
        $query = SellerDocument::query()->whereNotNull('renewal_of_document_id')->with(['seller.user:id,name,email', 'renewedDocument']);
        $query->when($status, fn ($q, $value) => $q->where('status', $value));
        $documents = $query->latest('submitted_at')->paginate(25);

        return response()->json(['data' => $documents->getCollection()->map(fn ($document) => $this->documentPayload($document))->values(), 'meta' => ['total' => $documents->total(), 'current_page' => $documents->currentPage(), 'last_page' => $documents->lastPage()]]);
    }

    public function reviewRenewal(Request $request, SellerDocument $sellerDocument): JsonResponse
    {
        abort_if(! $sellerDocument->renewal_of_document_id, 404);
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'review_notes' => ['nullable', 'string', 'max:2000'], 'expires_at' => ['nullable', 'date', 'after:today']]);
        abort_if($sellerDocument->status !== 'pending', 409, 'This renewal has already been reviewed.');
        if ($data['decision'] === 'reject') {
            $request->validate(['review_notes' => ['required', 'string', 'max:2000']]);
        }
        DB::transaction(function () use ($sellerDocument, $data, $request) {
            if ($data['decision'] === 'approve') {
                $sellerDocument->renewedDocument()->update(['status' => 'superseded']);
                $sellerDocument->update(['status' => 'approved', 'reviewed_at' => now(), 'approved_at' => now(), 'expires_at' => $data['expires_at'] ?? $sellerDocument->expires_at, 'review_notes' => $data['review_notes'] ?? null]);
            } else {
                $sellerDocument->update(['status' => 'rejected', 'reviewed_at' => now(), 'rejected_at' => now(), 'review_notes' => $data['review_notes']]);
            }
            $this->activity->log('seller.document.renewal.'.($data['decision'] === 'approve' ? 'approved' : 'rejected'), 'seller', 'Seller document renewal reviewed.', $request->user(), $request, $sellerDocument, ['decision' => $data['decision'], 'document_type' => $sellerDocument->document_type]);
        });

        return response()->json(['message' => 'Document renewal reviewed.', 'data' => $this->documentPayload($sellerDocument->fresh(['seller.user', 'renewedDocument']))]);
    }

    private function sectionAnalytics(string $section, string $range, int $days, Carbon $from, Carbon $to, Carbon $previousFrom, Carbon $previousTo): array
    {
        $base = ['section' => $section, 'range' => $range, 'range_days' => $days, 'generated_at' => now()->toISOString()];

        return match ($section) {
            'overview' => [...$base, ...$this->overviewAnalytics($from, $to, $previousFrom, $previousTo, $days === 365)],
            'commerce' => [...$base, ...$this->commerceAnalytics($from, $to, $previousFrom, $previousTo)],
            'users-sellers' => [...$base, ...$this->usersSellersAnalytics($from, $to, $days === 365)],
            'catalog' => [...$base, ...$this->catalogAnalytics($from, $to, $days === 365)],
            'operations' => [...$base, ...$this->operationsSectionAnalytics($from, $to, $days === 365)],
            'security' => [...$base, ...$this->securityAnalytics($from, $to, $days === 365)],
        };
    }

    private function overviewAnalytics(Carbon $from, Carbon $to, Carbon $previousFrom, Carbon $previousTo, bool $monthly): array
    {
        $current = $this->orderPeriodSummary($from, $to);
        $previous = $this->orderPeriodSummary($previousFrom, $previousTo);
        $activeBuyers = DB::table('orders')->whereBetween('created_at', [$from, $to])->distinct()->count('buyer_id');
        $activeSellers = DB::table('sellers')->whereNull('deleted_at')->where('status', 'approved')->count();

        return [
            'kpis' => [
                'gross_marketplace_value' => $this->comparison((float) $current->gmv, (float) $previous->gmv),
                'orders' => $this->comparison((int) $current->total, (int) $previous->total),
                'average_order_value' => $this->comparison((float) $current->average_order_value, (float) $previous->average_order_value),
                'active_buyers' => ['value' => $activeBuyers, 'previous' => null, 'change_percent' => null],
                'active_sellers' => ['value' => $activeSellers, 'previous' => null, 'change_percent' => null],
                'order_completion_rate' => ['value' => $this->rate((int) $current->completed, (int) $current->total), 'previous' => $this->rate((int) $previous->completed, (int) $previous->total), 'change_percent' => null],
            ],
            'revenue_orders_trend' => $this->orderTrend($from),
            'order_status' => $this->orderStatusBreakdown($from, $to),
            'marketplace_growth' => $this->userGrowth($from, $monthly),
            'top_sellers' => $this->topSellers($from, $to)->take(5)->values(),
            'top_products' => $this->topProducts($from, $to)->take(5)->values(),
            'definitions' => ['active_buyers' => 'Unique Maketo accounts that placed an order during the selected period, regardless of current role.'],
        ];
    }

    private function commerceAnalytics(Carbon $from, Carbon $to, Carbon $previousFrom, Carbon $previousTo): array
    {
        $current = $this->orderPeriodSummary($from, $to);
        $previous = $this->orderPeriodSummary($previousFrom, $previousTo);
        $returns = DB::table('return_requests')->whereBetween('requested_at', [$from, $to])->count();
        $cancellations = DB::table('order_cancellations')->whereBetween('cancelled_at', [$from, $to])->count();
        $disputes = DB::table('disputes')->whereBetween('opened_at', [$from, $to])->count();

        return [
            'kpis' => [
                'gross_marketplace_value' => $this->comparison((float) $current->gmv, (float) $previous->gmv),
                'orders' => $this->comparison((int) $current->total, (int) $previous->total),
                'average_order_value' => $this->comparison((float) $current->average_order_value, (float) $previous->average_order_value),
                'cancellation_rate' => ['value' => $this->rate($cancellations, (int) $current->total), 'previous' => null, 'change_percent' => null],
                'return_rate' => ['value' => $this->rate($returns, (int) $current->total), 'previous' => null, 'change_percent' => null],
                'dispute_rate' => ['value' => $this->rate($disputes, (int) $current->total), 'previous' => null, 'change_percent' => null],
            ],
            'revenue_orders_trend' => $this->orderTrend($from),
            'order_status' => $this->orderStatusBreakdown($from, $to),
            'top_products' => $this->topProducts($from, $to),
            'top_sellers' => $this->topSellers($from, $to),
        ];
    }

    private function usersSellersAnalytics(Carbon $from, Carbon $to, bool $monthly): array
    {
        $applications = DB::table('seller_applications')->whereBetween(DB::raw('COALESCE(submitted_at, created_at)'), [$from, $to])
            ->selectRaw('COUNT(*) total')->selectRaw("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) approved")
            ->selectRaw("SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) rejected")->first();
        $activeBuyers = DB::table('orders')->whereBetween('created_at', [$from, $to])->distinct()->count('buyer_id');
        $activeSellers = DB::table('sellers')->whereNull('deleted_at')->where('status', 'approved')->count();
        $warningDate = now()->addDays((int) $this->settings->get('seller_document_expiry_warning_days'))->endOfDay();

        return [
            'kpis' => [
                'active_buyers' => ['value' => $activeBuyers, 'previous' => null, 'change_percent' => null],
                'active_sellers' => ['value' => $activeSellers, 'previous' => null, 'change_percent' => null],
                'seller_applications' => ['value' => (int) $applications->total, 'previous' => null, 'change_percent' => null],
                'approval_rate' => ['value' => $this->rate((int) $applications->approved, (int) $applications->approved + (int) $applications->rejected), 'previous' => null, 'change_percent' => null],
                'rejection_rate' => ['value' => $this->rate((int) $applications->rejected, (int) $applications->approved + (int) $applications->rejected), 'previous' => null, 'change_percent' => null],
                'seller_deactivations' => ['value' => DB::table('sellers')->whereNull('deleted_at')->whereIn('status', ['inactive', 'suspended', 'closed'])->count(), 'previous' => null, 'change_percent' => null],
            ],
            'user_growth' => $this->userGrowth($from, $monthly),
            'application_trend' => $this->sellerApplicationTrend($from, $monthly),
            'document_compliance' => [
                'valid' => SellerDocument::where('status', 'approved')->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', now()))->count(),
                'expiring_soon' => SellerDocument::where('status', 'approved')->whereBetween('expires_at', [now(), $warningDate])->count(),
                'expired' => SellerDocument::where('status', 'approved')->where('expires_at', '<', now())->count(),
                'renewal_pending' => SellerDocument::whereNotNull('renewal_of_document_id')->where('status', 'pending')->count(),
            ],
        ];
    }

    private function catalogAnalytics(Carbon $from, Carbon $to, bool $monthly): array
    {
        $summary = DB::table('products')->whereNull('deleted_at')->selectRaw('COUNT(*) total')
            ->selectRaw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) active")
            ->selectRaw("SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) inactive")
            ->selectRaw('SUM(CASE WHEN track_inventory = 1 AND stock_quantity <= 0 THEN 1 ELSE 0 END) out_of_stock')->first();

        return [
            'kpis' => [
                'active_products' => ['value' => (int) $summary->active, 'previous' => null, 'change_percent' => null],
                'inactive_products' => ['value' => (int) $summary->inactive, 'previous' => null, 'change_percent' => null],
                'out_of_stock' => ['value' => (int) $summary->out_of_stock, 'previous' => null, 'change_percent' => null],
                'products_added' => ['value' => DB::table('products')->whereNull('deleted_at')->whereBetween('created_at', [$from, $to])->count(), 'previous' => null, 'change_percent' => null],
            ],
            'product_growth' => $this->productGrowth($from, $monthly),
            'categories' => DB::table('categories')->leftJoin('products', function ($join) {
                $join->on('products.category_id', '=', 'categories.id')->whereNull('products.deleted_at');
            })->whereNull('categories.deleted_at')->groupBy('categories.id', 'categories.name')
                ->select('categories.name')->selectRaw('COUNT(products.id) total')->orderByDesc('total')->limit(12)->get(),
            'inventory' => ['in_stock' => max(0, (int) $summary->total - (int) $summary->out_of_stock), 'out_of_stock' => (int) $summary->out_of_stock],
            'top_products' => $this->topProducts($from, $to),
        ];
    }

    private function operationsSectionAnalytics(Carbon $from, Carbon $to, bool $monthly): array
    {
        $operations = $this->operationsAnalytics($from, $to, $monthly);
        $completed = DB::table('seller_orders')->whereBetween('delivered_at', [$from, $to])->count();
        $returns = DB::table('return_requests')->whereBetween('requested_at', [$from, $to])->count();
        $disputes = DB::table('disputes')->whereBetween('opened_at', [$from, $to])->count();

        return [
            'kpis' => [
                'awaiting_shipment' => ['value' => $operations['awaiting_shipment'], 'previous' => null, 'change_percent' => null],
                'in_transit' => ['value' => $operations['in_transit'], 'previous' => null, 'change_percent' => null],
                'completed_deliveries' => ['value' => $completed, 'previous' => null, 'change_percent' => null],
                'returns' => ['value' => $returns, 'previous' => null, 'change_percent' => null],
                'disputes' => ['value' => $disputes, 'previous' => null, 'change_percent' => null],
                'average_fulfillment_hours' => ['value' => $operations['average_fulfillment_hours'], 'previous' => null, 'change_percent' => null],
                'average_delivery_hours' => ['value' => $operations['average_delivery_hours'], 'previous' => null, 'change_percent' => null],
            ],
            'fulfillment_trend' => $this->fulfillmentTrend($from, $monthly),
            'delivery_status' => [
                'awaiting_shipment' => $operations['awaiting_shipment'], 'in_transit' => $operations['in_transit'], 'completed' => $completed,
            ],
            'exceptions' => DB::table('seller_orders')->join('orders', 'orders.id', '=', 'seller_orders.order_id')
                ->join('sellers', 'sellers.id', '=', 'seller_orders.seller_id')->whereNull('seller_orders.picked_up_at')
                ->whereIn('seller_orders.status', ['pending', 'confirmed', 'processing', 'ready'])
                ->orderBy('seller_orders.created_at')->limit(10)->get([
                    'seller_orders.id', 'orders.order_number', 'sellers.business_name as seller', 'seller_orders.status', 'seller_orders.created_at',
                ]),
        ];
    }

    private function securityAnalytics(Carbon $from, Carbon $to, bool $monthly): array
    {
        $auth = ActivityLog::whereBetween('created_at', [$from, $to])
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.success' THEN 1 ELSE 0 END) successful")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.failed' THEN 1 ELSE 0 END) failed")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.mfa.failed' THEN 1 ELSE 0 END) mfa_failures")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.password.changed' THEN 1 ELSE 0 END) password_changes")
            ->selectRaw("SUM(CASE WHEN event_type LIKE 'seller.danger.%' OR event_type LIKE 'seller.store.%' OR event_type LIKE 'seller.account.%' THEN 1 ELSE 0 END) danger_actions")->first();

        return [
            'kpis' => [
                'successful_logins' => ['value' => (int) ($auth->successful ?? 0), 'previous' => null, 'change_percent' => null],
                'failed_logins' => ['value' => (int) ($auth->failed ?? 0), 'previous' => null, 'change_percent' => null],
                'mfa_failures' => ['value' => (int) ($auth->mfa_failures ?? 0), 'previous' => null, 'change_percent' => null],
                'password_changes' => ['value' => (int) ($auth->password_changes ?? 0), 'previous' => null, 'change_percent' => null],
                'account_suspensions' => ['value' => DB::table('users')->whereIn('status', ['suspended', 'restricted'])->count(), 'previous' => null, 'change_percent' => null],
                'danger_zone_actions' => ['value' => (int) ($auth->danger_actions ?? 0), 'previous' => null, 'change_percent' => null],
            ],
            'login_trend' => $this->authenticationTrend($from, $monthly),
            'logins_by_role' => ActivityLog::whereBetween('created_at', [$from, $to])->where('event_type', 'auth.login.success')
                ->selectRaw("COALESCE(actor_role, 'unknown') role, COUNT(*) total")->groupBy('actor_role')->orderByDesc('total')->get(),
            'activity_by_category' => ActivityLog::whereBetween('created_at', [$from, $to])->selectRaw('event_category category, COUNT(*) total')
                ->groupBy('event_category')->orderByDesc('total')->get(),
            'tracking_started_at' => ($started = ActivityLog::min('created_at')) ? Carbon::parse($started)->toISOString() : null,
            'definition' => 'Authentication metrics use captured audit events only. Token usage and last-active timestamps are not treated as logins.',
        ];
    }

    private function orderPeriodSummary(Carbon $from, Carbon $to): object
    {
        return DB::table('orders')->whereBetween('created_at', [$from, $to])
            ->selectRaw('COUNT(*) total, COALESCE(SUM(grand_total),0) gmv, COALESCE(AVG(grand_total),0) average_order_value')
            ->selectRaw("SUM(CASE WHEN status IN ('delivered','completed') THEN 1 ELSE 0 END) completed")
            ->selectRaw("SUM(CASE WHEN status IN ('processing','confirmed','shipped','in_transit') THEN 1 ELSE 0 END) processing")
            ->selectRaw("SUM(CASE WHEN status IN ('cancelled','failed') THEN 1 ELSE 0 END) cancelled")->first();
    }

    private function orderStatusBreakdown(Carbon $from, Carbon $to): array
    {
        $orders = $this->orderPeriodSummary($from, $to);

        return [
            'completed' => (int) $orders->completed, 'processing' => (int) $orders->processing,
            'cancelled' => (int) $orders->cancelled,
            'returned' => DB::table('return_requests')->whereBetween('requested_at', [$from, $to])->count(),
        ];
    }

    private function fulfillmentTrend(Carbon $from, bool $monthly)
    {
        $bucket = $this->dateBucket('created_at', $monthly);

        return DB::table('seller_orders')->where('created_at', '>=', $from)->selectRaw("{$bucket} date, COUNT(*) total")
            ->selectRaw('SUM(CASE WHEN ready_at IS NOT NULL THEN 1 ELSE 0 END) ready')
            ->selectRaw('SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) delivered')
            ->groupByRaw($bucket)->orderByRaw($bucket)->get();
    }

    private function orderTrend($from)
    {
        $date = $this->dateBucket('created_at', now()->diffInDays($from) > 100);

        return DB::table('orders')->where('created_at', '>=', $from)->groupByRaw($date)->orderByRaw($date)
            ->selectRaw("{$date} date, COUNT(*) total, COALESCE(SUM(grand_total),0) gross_sales")
            ->selectRaw("SUM(CASE WHEN status IN ('delivered','completed') THEN 1 ELSE 0 END) completed")
            ->selectRaw("SUM(CASE WHEN status IN ('cancelled','failed') THEN 1 ELSE 0 END) cancelled")->get();
    }

    private function comparison(float|int $current, float|int|null $previous): array
    {
        return ['value' => $current, 'previous' => $previous,
            'change_percent' => $previous === null || (float) $previous === 0.0 ? null : round((($current - $previous) / abs($previous)) * 100, 1)];
    }

    private function rate(float|int $value, float|int $total): float
    {
        return $total > 0 ? round(($value / $total) * 100, 2) : 0.0;
    }

    private function dateBucket(string $column, bool $monthly): string
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return $monthly ? "strftime('%Y-%m', {$column})" : "strftime('%Y-%m-%d', {$column})";
        }

        return $monthly ? "DATE_FORMAT({$column}, '%Y-%m')" : "DATE({$column})";
    }

    private function authenticationTrend($from, bool $monthly)
    {
        $bucket = $this->dateBucket('created_at', $monthly);

        return ActivityLog::where('created_at', '>=', $from)->whereIn('event_type', ['auth.login.success', 'auth.login.failed'])
            ->selectRaw("{$bucket} date")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.success' THEN 1 ELSE 0 END) successful")
            ->selectRaw("SUM(CASE WHEN event_type = 'auth.login.failed' THEN 1 ELSE 0 END) failed")
            ->groupByRaw($bucket)->orderByRaw($bucket)->get();
    }

    private function sellerApplicationTrend($from, bool $monthly)
    {
        $bucket = $this->dateBucket('reviewed_at', $monthly);

        return DB::table('seller_applications')->whereNotNull('reviewed_at')->where('reviewed_at', '>=', $from)
            ->selectRaw("{$bucket} date")
            ->selectRaw("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) approved")
            ->selectRaw("SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) rejected")
            ->groupByRaw($bucket)->orderByRaw($bucket)->get();
    }

    private function productGrowth($from, bool $monthly)
    {
        $bucket = $this->dateBucket('created_at', $monthly);

        return DB::table('products')->whereNull('deleted_at')->where('created_at', '>=', $from)
            ->selectRaw("{$bucket} date, COUNT(*) total")->groupByRaw($bucket)->orderByRaw($bucket)->get();
    }

    private function userGrowth($from, bool $monthly)
    {
        $bucket = $this->dateBucket('created_at', $monthly);

        return DB::table('users')->whereIn('role', ['buyer', 'seller'])->where('created_at', '>=', $from)
            ->selectRaw("{$bucket} date")
            ->selectRaw("SUM(CASE WHEN role = 'buyer' THEN 1 ELSE 0 END) buyers")
            ->selectRaw("SUM(CASE WHEN role = 'seller' THEN 1 ELSE 0 END) sellers")
            ->groupByRaw($bucket)->orderByRaw($bucket)->get();
    }

    private function activityTrend($from, bool $monthly)
    {
        $bucket = $this->dateBucket('created_at', $monthly);

        return ActivityLog::where('created_at', '>=', $from)->selectRaw("{$bucket} date, COUNT(*) total")
            ->groupByRaw($bucket)->orderByRaw($bucket)->get();
    }

    private function topSellers($from, $to)
    {
        return DB::table('sellers')->join('seller_orders', 'seller_orders.seller_id', '=', 'sellers.id')
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')->whereBetween('orders.created_at', [$from, $to])
            ->whereNull('sellers.deleted_at')->groupBy('sellers.id', 'sellers.business_name')
            ->select('sellers.id', 'sellers.business_name as name')->selectRaw('COUNT(DISTINCT orders.id) orders, COALESCE(SUM(seller_orders.grand_total),0) gmv')
            ->orderByDesc('gmv')->limit(10)->get();
    }

    private function topProducts($from, $to)
    {
        return DB::table('products')->join('order_items', 'order_items.product_id', '=', 'products.id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')->whereBetween('orders.created_at', [$from, $to])
            ->whereNull('products.deleted_at')->groupBy('products.id', 'products.name')
            ->select('products.id', 'products.name')->selectRaw('SUM(order_items.quantity) units, COALESCE(SUM(order_items.subtotal),0) sales')
            ->orderByDesc('sales')->limit(10)->get();
    }

    private function operationsAnalytics($from, $to, bool $monthly): array
    {
        $driver = DB::connection()->getDriverName();
        $fulfillment = $driver === 'sqlite' ? '(julianday(ready_at) - julianday(created_at)) * 24' : 'TIMESTAMPDIFF(SECOND, created_at, ready_at) / 3600';
        $delivery = $driver === 'sqlite' ? '(julianday(delivered_at) - julianday(picked_up_at)) * 24' : 'TIMESTAMPDIFF(SECOND, picked_up_at, delivered_at) / 3600';

        return [
            'average_fulfillment_hours' => round((float) DB::table('seller_orders')->whereBetween('created_at', [$from, $to])->whereNotNull('ready_at')->avg(DB::raw($fulfillment)), 1),
            'average_delivery_hours' => round((float) DB::table('seller_orders')->whereBetween('created_at', [$from, $to])->whereNotNull('picked_up_at')->whereNotNull('delivered_at')->avg(DB::raw($delivery)), 1),
            'awaiting_shipment' => DB::table('seller_orders')->whereIn('status', ['pending', 'confirmed', 'processing', 'ready'])->whereNull('picked_up_at')->count(),
            'in_transit' => DB::table('seller_orders')->whereNotNull('picked_up_at')->whereNull('delivered_at')->count(),
        ];
    }

    private function documentPayload(SellerDocument $document): array
    {
        return [
            'id' => $document->id, 'document_type' => $document->document_type, 'status' => $document->status,
            'original_filename' => $document->original_filename, 'uploaded_at' => $document->uploaded_at?->toISOString(),
            'submitted_at' => $document->submitted_at?->toISOString(), 'expires_at' => $document->expires_at?->toDateString(),
            'reviewed_at' => $document->reviewed_at?->toISOString(), 'review_notes' => $document->review_notes,
            'renewal_of_document_id' => $document->renewal_of_document_id,
            'seller' => $document->seller ? ['id' => $document->seller->id, 'name' => $document->seller->business_name, 'email' => $document->seller->user?->email] : null,
        ];
    }
}
