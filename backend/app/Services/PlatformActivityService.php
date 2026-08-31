<?php

namespace App\Services;

use App\Models\SellerApplication;
use App\Models\SellerDocument;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class PlatformActivityService
{
    public function __construct(private readonly ActivityLogger $logger) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $events = DB::query()->fromSub($this->eventUnion(), 'platform_events')
            ->leftJoin('users as actors', 'actors.id', '=', 'platform_events.user_id')
            ->select('platform_events.*', 'actors.name as actor_name', 'actors.first_name as actor_first_name',
                'actors.last_name as actor_last_name', 'actors.email as actor_email');

        $events->when($filters['category'] ?? null, fn (Builder $query, string $value) => $query->where('event_category', $value));
        $events->when($filters['event_type'] ?? null, fn (Builder $query, string $value) => $query->where('event_type', $value));
        $events->when($filters['role'] ?? null, fn (Builder $query, string $value) => $query->where('actor_role', $value));
        $events->when($filters['source'] ?? null, fn (Builder $query, string $value) => $value === 'audit_log'
            ? $query->where('source', 'audit_log')
            : $query->where('source', '!=', 'audit_log'));
        $events->when($filters['from'] ?? null, fn (Builder $query, string $value) => $query->whereDate('occurred_at', '>=', $value));
        $events->when($filters['to'] ?? null, fn (Builder $query, string $value) => $query->whereDate('occurred_at', '<=', $value));
        $events->when($filters['outcome'] ?? null, function (Builder $query, string $value) {
            $patterns = $value === 'failure' ? ['%failed%', '%rejected%', '%cancelled%'] : ['%success%', '%approved%', '%completed%'];
            $query->where(fn (Builder $nested) => collect($patterns)->each(
                fn (string $pattern, int $index) => $index === 0 ? $nested->where('event_type', 'like', $pattern) : $nested->orWhere('event_type', 'like', $pattern)
            ));
        });
        $events->when(trim((string) ($filters['search'] ?? '')), function (Builder $query, string $value) {
            $query->where(function (Builder $nested) use ($value) {
                $nested->where('description', 'like', "%{$value}%")
                    ->orWhere('event_type', 'like', "%{$value}%")
                    ->orWhere('actors.name', 'like', "%{$value}%")
                    ->orWhere('actors.email', 'like', "%{$value}%");
            });
        });

        return $events->orderByDesc('occurred_at')->orderByDesc('source_record_id')
            ->paginate($filters['per_page'] ?? 25);
    }

    public function normalize(object $event): array
    {
        $displayName = trim(implode(' ', array_filter([$event->actor_first_name, $event->actor_last_name]))) ?: $event->actor_name;
        $metadata = is_string($event->metadata) ? json_decode($event->metadata, true) : $event->metadata;

        return [
            'id' => ($event->source === 'audit_log' ? 'audit' : $event->source).':'.$event->source_record_id,
            'occurred_at' => $event->occurred_at,
            'category' => $event->event_category,
            'event_type' => $event->event_type,
            'description' => $event->description,
            'role' => $event->actor_role,
            'ip_address' => $event->ip_address,
            'user_agent' => $event->user_agent,
            'metadata' => $this->logger->sanitize(is_array($metadata) ? $metadata : []),
            'source' => $event->source === 'audit_log' ? 'audit_log' : 'historical_record',
            'source_label' => $event->source === 'audit_log' ? 'Audit Log' : 'Historical Record',
            'source_table' => $event->source,
            'target' => $event->subject_type ? ['type' => $event->subject_type, 'id' => $event->subject_id] : null,
            'user' => $event->user_id ? ['id' => (int) $event->user_id, 'name' => $displayName ?: 'Unknown user', 'email' => $event->actor_email] : null,
        ];
    }

    private function eventUnion(): Builder
    {
        $audit = DB::table('activity_logs')->select([
            'id as source_record_id', DB::raw("'audit_log' as source"), 'event_category', 'event_type', 'description',
            'user_id', 'actor_role', 'created_at as occurred_at', 'subject_type', 'subject_id', 'ip_address', 'user_agent', 'metadata',
        ]);

        $branches = [
            DB::table('users')->where('role', '!=', 'admin')->select([
                'id as source_record_id', DB::raw("'users' as source"), DB::raw("'user' as event_category"),
                DB::raw("'user.registered' as event_type"), DB::raw("'Marketplace user registered.' as description"),
                'id as user_id', 'role as actor_role', 'created_at as occurred_at', $this->stringColumn(User::class, 'subject_type'),
                'id as subject_id', DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
            ]),
            $this->historical('seller_applications', 'seller_applications', 'seller', 'seller.application.submitted', 'Seller application submitted.',
                'applicant_user_id', "'buyer'", 'COALESCE(submitted_at, created_at)', SellerApplication::class, 'id', null, 'seller.application.submitted')
                ->whereIn('seller_applications.status', ['pending', 'reviewing', 'approved', 'rejected']),
            DB::table('seller_applications')->whereNotNull('reviewed_at')->select([
                'id as source_record_id', DB::raw("'seller_applications_review' as source"), DB::raw("'seller' as event_category"),
                DB::raw("CASE WHEN status = 'approved' THEN 'seller.application.approved' ELSE 'seller.application.rejected' END as event_type"),
                DB::raw("CASE WHEN status = 'approved' THEN 'Seller application approved.' ELSE 'Seller application rejected.' END as description"),
                'reviewed_by as user_id', DB::raw("'admin' as actor_role"), 'reviewed_at as occurred_at',
                $this->stringColumn(SellerApplication::class, 'subject_type'), 'id as subject_id',
                DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
            ])->whereNotExists(fn (Builder $q) => $q->selectRaw('1')->from('activity_logs as duplicate_audit')
                ->whereColumn('duplicate_audit.subject_id', 'seller_applications.id')
                ->where('duplicate_audit.subject_type', SellerApplication::class)
                ->whereRaw("duplicate_audit.event_type = CASE WHEN seller_applications.status = 'approved' THEN 'seller.application.approved' ELSE 'seller.application.rejected' END")),
            DB::table('products')->join('sellers', 'sellers.id', '=', 'products.seller_id')->whereNull('products.deleted_at')->select([
                'products.id as source_record_id', DB::raw("'products' as source"), DB::raw("'catalog' as event_category"),
                DB::raw("'product.created' as event_type"), DB::raw("'Product created.' as description"), 'sellers.user_id',
                DB::raw("'seller' as actor_role"), 'products.created_at as occurred_at', $this->stringColumn('App\\Models\\Product', 'subject_type'),
                'products.id as subject_id', DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
            ]),
            $this->historical('orders', 'orders', 'order', 'order.created', 'Order created.', 'buyer_id', "'buyer'", 'COALESCE(placed_at, created_at)', 'App\Models\Order'),
            DB::table('tracking_events')->leftJoin('users as tracking_actor', 'tracking_actor.id', '=', 'tracking_events.actor_user_id')->select([
                'tracking_events.id as source_record_id', DB::raw("'tracking_events' as source"), DB::raw("'operations' as event_category"),
                DB::raw("'shipment.tracking.updated' as event_type"), DB::raw("'Shipment tracking status updated.' as description"),
                'tracking_events.actor_user_id as user_id', 'tracking_actor.role as actor_role', 'tracking_events.occurred_at',
                $this->stringColumn('App\\Models\\TrackingEvent', 'subject_type'), 'tracking_events.id as subject_id',
                DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
            ]),
            $this->historical('return_requests', 'return_requests', 'commerce', 'return.requested', 'Return requested.', 'buyer_id', "'buyer'", 'requested_at', 'App\Models\ReturnRequest'),
            $this->historical('disputes', 'disputes', 'moderation', 'dispute.opened', 'Dispute opened.', 'opened_by', '(SELECT role FROM users WHERE users.id = disputes.opened_by)', 'opened_at', 'App\Models\Dispute'),
            $this->historical('reviews', 'reviews', 'commerce', 'review.submitted', 'Product or seller review submitted.', 'user_id', "'buyer'", 'COALESCE(submitted_at, created_at)', 'App\Models\Review'),
            $this->historical('reports', 'reports', 'moderation', 'report.submitted', 'Marketplace report submitted.', 'reporter_user_id', '(SELECT role FROM users WHERE users.id = reports.reporter_user_id)', 'COALESCE(submitted_at, created_at)', 'App\Models\Report'),
            DB::table('promotions')->join('sellers as promotion_seller', 'promotion_seller.id', '=', 'promotions.seller_id')->select([
                'promotions.id as source_record_id', DB::raw("'promotions' as source"), DB::raw("'commerce' as event_category"),
                DB::raw("'promotion.created' as event_type"), DB::raw("'Seller promotion created.' as description"), 'promotion_seller.user_id',
                DB::raw("'seller' as actor_role"), 'promotions.created_at as occurred_at', $this->stringColumn('App\\Models\\Promotion', 'subject_type'),
                'promotions.id as subject_id', DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
            ]),
            DB::table('seller_documents')->leftJoin('sellers as document_seller', 'document_seller.id', '=', 'seller_documents.seller_id')->select([
                'seller_documents.id as source_record_id', DB::raw("'seller_documents' as source"), DB::raw("'seller' as event_category"),
                DB::raw("CASE WHEN renewal_of_document_id IS NULL THEN 'seller.document.submitted' ELSE 'seller.document.renewal.submitted' END as event_type"),
                DB::raw("CASE WHEN renewal_of_document_id IS NULL THEN 'Seller document submitted.' ELSE 'Seller document renewal submitted.' END as description"),
                'document_seller.user_id', DB::raw("'seller' as actor_role"), DB::raw('COALESCE(seller_documents.submitted_at, seller_documents.uploaded_at, seller_documents.created_at) as occurred_at'),
                $this->stringColumn(SellerDocument::class, 'subject_type'), 'seller_documents.id as subject_id',
                DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
            ])->whereNotExists(fn (Builder $q) => $q->selectRaw('1')->from('activity_logs as duplicate_audit')
                ->whereColumn('duplicate_audit.subject_id', 'seller_documents.id')->where('duplicate_audit.subject_type', SellerDocument::class)
                ->whereRaw("duplicate_audit.event_type = CASE WHEN seller_documents.renewal_of_document_id IS NULL THEN 'seller.document.submitted' ELSE 'seller.document.renewal.submitted' END")),
        ];

        foreach ($branches as $branch) {
            $audit->unionAll($branch);
        }

        return $audit;
    }

    private function historical(string $table, string $source, string $category, string $eventType, string $description,
        string $userColumn, string $roleExpression, string $dateExpression, string $subjectType, string $subjectId = 'id',
        ?string $requiredDate = null, ?string $duplicateEvent = null): Builder
    {
        $query = DB::table($table)->select([
            "{$table}.{$subjectId} as source_record_id", DB::raw("'{$source}' as source"), DB::raw("'{$category}' as event_category"),
            DB::raw("'{$eventType}' as event_type"), DB::raw("'{$description}' as description"), "{$table}.{$userColumn} as user_id",
            DB::raw("{$roleExpression} as actor_role"), DB::raw("{$dateExpression} as occurred_at"),
            $this->stringColumn($subjectType, 'subject_type'), "{$table}.{$subjectId} as subject_id",
            DB::raw('NULL as ip_address'), DB::raw('NULL as user_agent'), DB::raw('NULL as metadata'),
        ]);
        if ($requiredDate) {
            $query->whereNotNull("{$table}.{$requiredDate}");
        }
        if ($duplicateEvent) {
            $query->whereNotExists(fn (Builder $duplicate) => $duplicate->selectRaw('1')->from('activity_logs as duplicate_audit')
                ->whereColumn('duplicate_audit.subject_id', "{$table}.{$subjectId}")
                ->where('duplicate_audit.subject_type', $subjectType)->where('duplicate_audit.event_type', $duplicateEvent));
        }

        return $query;
    }

    private function stringColumn(string $value, string $alias)
    {
        $escaped = str_replace("'", "''", $value);
        if (DB::connection()->getDriverName() === 'mysql') {
            $escaped = str_replace('\\', '\\\\', $escaped);
        }

        return DB::raw("'{$escaped}' as {$alias}");
    }
}
