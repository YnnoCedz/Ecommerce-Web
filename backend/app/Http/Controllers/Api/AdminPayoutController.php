<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommissionEntry;
use App\Models\CommissionRate;
use App\Models\Courier;
use App\Models\Payout;
use App\Models\Seller;
use App\Services\ActionChallengeService;
use App\Services\ActivityLogger;
use App\Services\PayoutService;
use Carbon\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPayoutController extends Controller
{
    public function __construct(private readonly PayoutService $payouts, private readonly ActionChallengeService $challenges, private readonly ActivityLogger $activity) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['recipient_type' => ['nullable', Rule::in(['seller', 'courier'])], 'recipient_id' => ['nullable', 'integer', 'min:1'], 'status' => ['nullable', 'string'], 'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'], 'search' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $query = Payout::query()->withCount('items')->latest('id');
        $query->when($data['recipient_type'] ?? null, fn ($q, $value) => $q->where('recipient_type', $value));
        $query->when($data['recipient_id'] ?? null, fn ($q, $value) => $q->where('recipient_id', $value));
        $query->when($data['status'] ?? null, fn ($q, $value) => $q->where('status', $value));
        $query->when($data['from'] ?? null, fn ($q, $value) => $q->where('period_end', '>=', $value));
        $query->when($data['to'] ?? null, fn ($q, $value) => $q->where('period_start', '<=', $value));
        $query->when(trim((string) ($data['search'] ?? '')), fn ($q, $value) => $q->where('payout_number', 'like', "%{$value}%")->orWhere('payment_reference', 'like', "%{$value}%"));
        $page = $query->paginate((int) ($data['per_page'] ?? 25));
        $summary = Payout::query()->selectRaw('COUNT(*) total')->selectRaw("SUM(CASE WHEN status='paid' THEN net_amount ELSE 0 END) paid")
            ->selectRaw("SUM(CASE WHEN status IN ('draft','pending','approved','processing','withheld','failed') THEN net_amount ELSE 0 END) outstanding")->first();
        $commissionSummary = CommissionEntry::query()->selectRaw('SUM(CASE WHEN commission_taken = 1 THEN commission_amount ELSE 0 END) taken')
            ->selectRaw("SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) pending")->first();
        $byStatus = Payout::query()->selectRaw("SUM(CASE WHEN recipient_type='seller' AND status IN ('draft','pending','approved','processing','withheld','failed') THEN net_amount ELSE 0 END) pending_seller")
            ->selectRaw("SUM(CASE WHEN recipient_type='courier' AND status IN ('draft','pending','approved','processing','withheld','failed') THEN net_amount ELSE 0 END) pending_courier")
            ->selectRaw("SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed_count")->first();

        return response()->json(['data' => $page->getCollection()->map(fn ($payout) => $this->payload($payout))->values(), 'summary' => ['total' => (int) $summary->total, 'paid' => (string) ($summary->paid ?? '0.00'), 'outstanding' => (string) ($summary->outstanding ?? '0.00'), 'pending_seller' => (string) ($byStatus->pending_seller ?? '0.00'), 'pending_courier' => (string) ($byStatus->pending_courier ?? '0.00'), 'failed_count' => (int) ($byStatus->failed_count ?? 0), 'commission_taken' => (string) ($commissionSummary->taken ?? '0.00'), 'commission_pending' => (string) ($commissionSummary->pending ?? '0.00')], 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]]);
    }

    public function show(Payout $payout): JsonResponse
    {
        return response()->json(['data' => $this->payload($payout->load('items.commissionEntry'))]);
    }

    public function generate(Request $request): JsonResponse
    {
        $data = $request->validate(['recipient_type' => ['required', Rule::in(['seller', 'courier'])], 'recipient_id' => ['required', 'integer', 'min:1'], 'period_start' => ['required', 'date'], 'period_end' => ['required', 'date', 'after_or_equal:period_start']]);
        $exists = $data['recipient_type'] === 'seller' ? Seller::query()->whereKey($data['recipient_id'])->exists() : Courier::query()->whereKey($data['recipient_id'])->exists();
        abort_unless($exists, 422, 'The payout recipient does not exist.');
        $payout = $this->payouts->generate($data['recipient_type'], (int) $data['recipient_id'], Carbon::parse($data['period_start']), Carbon::parse($data['period_end']), $request->user());

        return response()->json(['message' => 'Payout generated as draft.', 'data' => $this->payload($payout)], 201);
    }

    public function transition(Request $request, Payout $payout): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'processing', 'paid', 'failed', 'withheld', 'cancelled'])], 'payment_method' => ['nullable', 'string', 'max:40'], 'payment_reference' => ['nullable', 'string', 'max:120'], 'notes' => ['nullable', 'string', 'max:2000']]);
        $updated = $this->payouts->transition($payout, $data['status'], $request->user(), $data);

        return response()->json(['message' => 'Payout status updated.', 'data' => $this->payload($updated)]);
    }

    public function commissions(Request $request): JsonResponse
    {
        $data = $request->validate(['commission_type' => ['nullable', Rule::in(['marketplace', 'courier_delivery'])], 'recipient_id' => ['nullable', 'integer', 'min:1'], 'status' => ['nullable', Rule::in(['pending', 'taken', 'waived', 'reversed', 'refunded'])], 'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'], 'page' => ['nullable', 'integer'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $query = CommissionEntry::query()->with('rate')->latest('id');
        $query->when($data['commission_type'] ?? null, fn ($q, $value) => $q->where('commission_type', $value));
        $query->when($data['recipient_id'] ?? null, fn ($q, $value) => $q->where('recipient_id', $value));
        $query->when($data['status'] ?? null, fn ($q, $value) => $q->where('status', $value));
        $query->when($data['from'] ?? null, fn ($q, $value) => $q->where('created_at', '>=', Carbon::parse($value)->startOfDay()));
        $query->when($data['to'] ?? null, fn ($q, $value) => $q->where('created_at', '<=', Carbon::parse($value)->endOfDay()));
        $page = $query->paginate((int) ($data['per_page'] ?? 25));

        return response()->json(['data' => $page->items(), 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]]);
    }

    public function rates(): JsonResponse
    {
        return response()->json(['data' => CommissionRate::query()->latest('effective_from')->latest('id')->get()]);
    }

    public function exportCommissions(Request $request): StreamedResponse
    {
        $request->validate(['commission_type' => ['nullable', Rule::in(['marketplace', 'courier_delivery'])], 'status' => ['nullable', Rule::in(['pending', 'taken', 'waived', 'reversed', 'refunded'])], 'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']]);
        $query = CommissionEntry::query()->orderBy('id');
        $query->when($request->string('commission_type')->toString(), fn ($q, $value) => $q->where('commission_type', $value));
        $query->when($request->string('status')->toString(), fn ($q, $value) => $q->where('status', $value));
        $query->when($request->date('from'), fn ($q, $value) => $q->where('created_at', '>=', $value->startOfDay()));
        $query->when($request->date('to'), fn ($q, $value) => $q->where('created_at', '<=', $value->endOfDay()));

        return response()->streamDownload(function () use ($query) {
            $stream = fopen('php://output', 'wb');
            fputcsv($stream, ['Date', 'Reference', 'Type', 'Recipient type', 'Recipient ID', 'Gross', 'Rate', 'Commission', 'Net', 'Taken', 'Status', 'Payout ID', 'Taken at']);
            $query->chunkById(500, function ($entries) use ($stream) {
                foreach ($entries as $entry) {
                    fputcsv($stream, [$entry->created_at?->toISOString(), $entry->reference, $entry->commission_type, $entry->recipient_type, $entry->recipient_id, $entry->gross_amount, $entry->percentage_rate, $entry->commission_amount, $entry->net_amount, $entry->commission_taken ? 'YES' : 'NO', $entry->status, $entry->payout_id, $entry->taken_at?->toISOString()]);
                }
            });
            fclose($stream);
        }, 'maketo-commission-ledger-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function rateChallenge(Request $request): JsonResponse
    {
        $data = $request->validate(['current_password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'code' => 'current_password_invalid'], 422);
        }
        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'MFA is not enabled for this administrator.', 'code' => 'mfa_not_enabled'], 409);
        }
        $issued = $this->challenges->issue($user, 'admin.change_commission_rate');

        return response()->json(['message' => 'A verification code was sent to your email.', 'data' => ['challenge_id' => $issued['challenge']->id, 'challenge_token' => $issued['token'], 'expires_at' => $issued['challenge']->expires_at->toISOString()]], 201);
    }

    public function storeRate(Request $request): JsonResponse
    {
        $data = $request->validate(['commission_type' => ['required', Rule::in(['marketplace', 'courier_delivery'])], 'calculation_type' => ['required', Rule::in(['percentage', 'fixed', 'hybrid'])], 'percentage_rate' => ['required_if:calculation_type,percentage,hybrid', 'nullable', 'decimal:0,4', 'min:0', 'max:100'], 'fixed_amount' => ['required_if:calculation_type,fixed,hybrid', 'nullable', 'decimal:0,2', 'min:0'], 'effective_from' => ['required', 'date', 'after_or_equal:today'], 'current_password' => ['required', 'string'], 'challenge_id' => ['nullable', 'integer'], 'challenge_token' => ['nullable', 'string', 'size:64'], 'code' => ['nullable', 'string', 'regex:/^\d{6}$/']]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.'], 422);
        }
        $challenge = null;
        if ($user->two_factor_enabled) {
            $request->validate(['challenge_id' => ['required'], 'challenge_token' => ['required'], 'code' => ['required']]);
            $challenge = $this->challenges->verify($user, 'admin.change_commission_rate', (int) $data['challenge_id'], $data['challenge_token'], $data['code']);
        }
        $rate = DB::transaction(function () use ($data, $user, $challenge, $request) {
            $newAt = Carbon::parse($data['effective_from']);
            abort_if(CommissionRate::query()->where('commission_type', $data['commission_type'])->where('effective_from', $newAt)->exists(), 409, 'A rate version already starts at this time.');
            $next = CommissionRate::query()->where('commission_type', $data['commission_type'])->where('effective_from', '>', $newAt)->oldest('effective_from')->first();
            CommissionRate::query()->where('commission_type', $data['commission_type'])->where('effective_from', '<', $newAt)
                ->where(fn ($query) => $query->whereNull('effective_until')->orWhere('effective_until', '>', $newAt))->update(['effective_until' => $newAt]);
            $rate = CommissionRate::create(['commission_type' => $data['commission_type'], 'calculation_type' => $data['calculation_type'], 'percentage_rate' => $data['percentage_rate'] ?? null, 'fixed_amount' => $data['fixed_amount'] ?? '0.00', 'effective_from' => $newAt, 'effective_until' => $next?->effective_from, 'is_active' => true, 'created_by' => $user->id]);
            $challenge?->update(['consumed_at' => now()]);
            $this->activity->log('commission.rate.changed', 'financial', 'Commission rate version created.', $user, $request, $rate, ['commission_type' => $rate->commission_type, 'previous_rate_id' => CommissionRate::query()->where('commission_type', $rate->commission_type)->where('effective_from', '<', $rate->effective_from)->latest('effective_from')->value('id'), 'new_rate' => $rate->percentage_rate, 'effective_from' => $rate->effective_from->toISOString()]);

            return $rate;
        });

        return response()->json(['message' => 'Commission rate version created.', 'data' => $rate], 201);
    }

    public function pdf(Payout $payout): Response
    {
        $payout->load(['items.commissionEntry', 'approver']);
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view('payouts.statement', ['payout' => $payout, 'recipientName' => $this->recipientName($payout)])->render());
        $dompdf->setPaper('A4');
        $dompdf->render();

        return response($dompdf->output(), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => "inline; filename={$payout->payout_number}.pdf"]);
    }

    private function payload(Payout $payout): array
    {
        return ['id' => $payout->id, 'payout_number' => $payout->payout_number, 'recipient_type' => $payout->recipient_type, 'recipient_id' => $payout->recipient_id, 'recipient_name' => $this->recipientName($payout), 'period_start' => $payout->period_start->toDateString(), 'period_end' => $payout->period_end->toDateString(), 'currency' => $payout->currency, 'gross_amount' => $payout->gross_amount, 'commission_amount' => $payout->commission_amount, 'adjustment_amount' => $payout->adjustment_amount, 'net_amount' => $payout->net_amount, 'status' => $payout->status, 'payment_method' => $payout->payment_method, 'payment_reference' => $payout->payment_reference, 'notes' => $payout->notes, 'paid_at' => optional($payout->paid_at)->toISOString(), 'created_at' => optional($payout->created_at)->toISOString(), 'items_count' => $payout->items_count ?? $payout->items?->count(), 'items' => $payout->relationLoaded('items') ? $payout->items : null];
    }

    private function recipientName(Payout $payout): string
    {
        if ($payout->recipient_type === 'seller') {
            $seller = Seller::withTrashed()->find($payout->recipient_id);

            return $seller?->trade_name ?: $seller?->business_name ?: "Seller #{$payout->recipient_id}";
        }

        return Courier::find($payout->recipient_id)?->name ?? "Courier #{$payout->recipient_id}";
    }
}
