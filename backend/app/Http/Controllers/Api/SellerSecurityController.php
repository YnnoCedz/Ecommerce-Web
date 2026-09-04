<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SellerDocument;
use App\Notifications\SecurityActionCompletedNotification;
use App\Services\ActionChallengeService;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use App\Services\PlatformSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Laravel\Sanctum\PersonalAccessToken;

class SellerSecurityController extends Controller
{
    private const ACTIONS = [
        'deactivate' => ['purpose' => 'seller.danger_zone.deactivate', 'confirmation' => 'DEACTIVATE STORE'],
        'close' => ['purpose' => 'seller.danger_zone.close', 'confirmation' => 'CLOSE SELLER ACCOUNT'],
    ];

    public function __construct(
        private readonly ActivityLogger $activity,
        private readonly ActionChallengeService $challenges,
        private readonly PlatformSettingsService $settings,
    ) {}

    public function documents(Request $request): JsonResponse
    {
        $seller = $request->user()->seller;
        $documents = SellerDocument::query()->where('seller_id', $seller->id)
            ->with('renewals')->orderBy('document_type')->orderByDesc('created_at')->get();
        $current = $documents->groupBy('document_type')
            ->map(function ($history) {
                $document = $history->where('status', 'approved')->sortByDesc('approved_at')->sortByDesc('created_at')->first()
                    ?? $history->whereNull('renewal_of_document_id')->sortByDesc('created_at')->first();
                $renewal = $document ? $history->where('renewal_of_document_id', $document->id)->sortByDesc('created_at')->first() : null;

                return $document ? $this->payload($document, $renewal) : null;
            })
            ->filter()
            ->values();

        return response()->json(['data' => $current]);
    }

    public function renew(Request $request, SellerDocument $sellerDocument, MediaStorageService $storage): JsonResponse
    {
        $seller = $request->user()->seller;
        abort_unless($sellerDocument->seller_id === $seller->id, 404);
        abort_unless($sellerDocument->status === 'approved', 409, 'Only the current approved document can be renewed.');
        if ($sellerDocument->renewals()->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'A renewal for this document is already pending review.', 'code' => 'renewal_already_pending'], 409);
        }
        $data = $request->validate([
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ]);
        $stored = $storage->storePrivateFile($request->file('document'), "seller-documents/{$seller->id}/renewals/{$sellerDocument->document_type}");
        try {
            $renewal = DB::transaction(function () use ($sellerDocument, $seller, $stored, $data, $request) {
                $renewal = SellerDocument::create([
                    'seller_id' => $seller->id, 'seller_application_id' => $sellerDocument->seller_application_id,
                    'renewal_of_document_id' => $sellerDocument->id, 'document_type' => $sellerDocument->document_type,
                    'storage_disk' => $stored['storage_disk'], 'file_name' => basename($stored['storage_path']),
                    'file_path' => $stored['storage_path'], 'original_filename' => $stored['original_filename'],
                    'mime_type' => $stored['mime_type'], 'file_size' => $stored['file_size'], 'status' => 'pending',
                    'private' => true, 'uploaded_at' => now(), 'submitted_at' => now(), 'expires_at' => $data['expires_at'] ?? null,
                ]);
                $this->activity->log('seller.document.renewal.submitted', 'seller', 'Seller document renewal submitted.', $request->user(), $request, $renewal, ['document_type' => $renewal->document_type]);

                return $renewal;
            });
        } catch (\Throwable $exception) {
            $storage->delete($stored['storage_path'], $stored['storage_disk']);
            throw $exception;
        }

        return response()->json(['message' => 'Document renewal submitted for admin review.', 'data' => $this->payload($sellerDocument, $renewal)], 201);
    }

    public function dangerChallenge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(array_keys(self::ACTIONS))],
            'confirmation' => ['required', 'string', 'max:80'], 'password' => ['required', 'string'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'The account password is incorrect.', 'code' => 'password_invalid'], 422);
        }
        $definition = self::ACTIONS[$data['action']];
        if (! hash_equals($definition['confirmation'], trim($data['confirmation']))) {
            return response()->json(['message' => "Type {$definition['confirmation']} exactly to continue.", 'code' => 'confirmation_invalid'], 422);
        }
        if ($blocker = $this->blockingReason($user->seller)) {
            return response()->json(['message' => $blocker, 'code' => 'seller_obligations_open'], 409);
        }
        $issued = $this->challenges->issue($user, $definition['purpose']);
        $this->activity->log($data['action'] === 'close' ? 'seller.account.closure.requested' : 'seller.store.deactivation.requested', 'seller', 'Seller danger-zone verification requested.', $user, $request, $user->seller, ['action' => $data['action']]);

        return response()->json(['message' => 'A verification code was sent to your verified email.', 'data' => [
            'challenge_id' => $issued['challenge']->id, 'challenge_token' => $issued['token'],
            'expires_at' => $issued['challenge']->expires_at->toISOString(), 'action' => $data['action'],
        ]], 201);
    }

    public function dangerVerify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(array_keys(self::ACTIONS))], 'challenge_id' => ['required', 'integer'],
            'challenge_token' => ['required', 'string', 'size:64'], 'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);
        $user = $request->user();
        $seller = $user->seller;
        if ($blocker = $this->blockingReason($seller)) {
            return response()->json(['message' => $blocker, 'code' => 'seller_obligations_open'], 409);
        }
        $definition = self::ACTIONS[$data['action']];
        $challenge = $this->challenges->verify($user, $definition['purpose'], (int) $data['challenge_id'], $data['challenge_token'], $data['code']);
        DB::transaction(function () use ($seller, $challenge, $request, $data, $user) {
            $seller->forceFill(['status' => $data['action'] === 'close' ? 'closed' : 'inactive', 'verified' => false])->save();
            $challenge->update(['consumed_at' => now()]);
            $this->activity->log($data['action'] === 'close' ? 'seller.account.closed' : 'seller.store.deactivated', 'seller', $data['action'] === 'close' ? 'Seller account closed.' : 'Seller store deactivated.', $user, $request, $seller, ['action' => $data['action']]);
            if ($data['action'] === 'close') {
                DB::table('sessions')->where('user_id', $user->id)->delete();
                $user->tokens()->delete();
            }
        });
        Notification::send($user, new SecurityActionCompletedNotification(
            $data['action'] === 'close' ? 'Your Marketo seller account was closed. Historical orders and records were preserved.' : 'Your Marketo seller store was deactivated and hidden from buyers.',
            $this->settings->get('support_email'),
            $this->settings->get('platform_name'),
        ));

        return response()->json(['message' => $data['action'] === 'close' ? 'Seller account closed. Historical records were preserved.' : 'Store deactivated. Your marketplace history was preserved.', 'data' => ['status' => $seller->fresh()->status]]);
    }

    private function blockingReason($seller): ?string
    {
        if ($seller->sellerOrders()->whereIn('status', ['pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'in-transit', 'out-for-delivery'])->exists()) {
            return 'You cannot perform this action while orders are awaiting fulfillment.';
        }
        if ($seller->documents()->whereNotNull('renewal_of_document_id')->where('status', 'pending')->exists()) {
            return 'You cannot perform this action while a document renewal is pending review.';
        }
        if (DB::table('return_requests')->where('seller_id', $seller->id)->whereNotIn('status', ['rejected', 'refunded', 'closed'])->exists()) {
            return 'You cannot perform this action while a return request is unresolved.';
        }
        if (DB::table('disputes')->join('return_requests', 'return_requests.id', '=', 'disputes.return_request_id')
            ->where('return_requests.seller_id', $seller->id)->whereIn('disputes.status', ['open', 'reviewing'])->exists()) {
            return 'You cannot perform this action while a dispute is unresolved.';
        }
        if (DB::table('seller_orders')->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->where('seller_orders.seller_id', $seller->id)
            ->whereNotIn('seller_orders.status', ['cancelled', 'refunded'])
            ->whereNotIn('orders.status', ['cancelled', 'failed', 'refunded'])
            ->whereIn('orders.payment_status', ['pending', 'processing', 'authorized'])->exists()) {
            return 'You cannot perform this action while a seller payment obligation is unsettled.';
        }

        return null;
    }

    public function security(Request $request): JsonResponse
    {
        $user = $request->user();
        $current = $user->currentAccessToken();
        $currentId = $current instanceof PersonalAccessToken ? $current->getKey() : null;
        $lastPasswordChange = DB::table('activity_logs')->where('user_id', $user->id)
            ->whereIn('event_type', ['auth.password.changed', 'seller.password.changed'])->max('created_at');

        return response()->json(['data' => [
            'mfa' => ['enabled' => (bool) $user->two_factor_enabled, 'method' => $user->two_factor_method, 'confirmed_at' => $user->two_factor_confirmed_at?->toISOString()],
            'last_password_changed_at' => $lastPasswordChange,
            'sessions' => $user->tokens()->latest('last_used_at')->latest('created_at')->get()->map(fn ($token) => [
                'id' => $token->id, 'name' => $token->name, 'is_current' => $token->id === $currentId,
                'created_at' => $token->created_at?->toISOString(), 'last_used_at' => $token->last_used_at?->toISOString(),
                'expires_at' => $token->expires_at?->toISOString(),
            ])->values(),
        ]]);
    }

    public function passwordChallenge(Request $request): JsonResponse
    {
        $data = $request->validate(['current_password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'code' => 'current_password_invalid'], 422);
        }
        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'MFA is not enabled for this seller.', 'code' => 'mfa_not_enabled'], 409);
        }
        return $this->challengeResponse($this->challenges->issue($user, 'seller.change_password'), 'password');
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
            $challenge = $this->challenges->verify($user, 'seller.change_password', (int) $data['challenge_id'], $data['challenge_token'], $data['code']);
        }
        DB::transaction(function () use ($user, $data, $challenge, $request) {
            $user->forceFill(['password' => Hash::make($data['password']), 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $current = $user->currentAccessToken();
            $tokens = $user->tokens();
            if ($current instanceof PersonalAccessToken) $tokens->whereKeyNot($current->getKey());
            $tokens->delete();
            $challenge?->update(['consumed_at' => now()]);
            $this->activity->log('seller.password.changed', 'authentication', 'Seller password changed.', $user, $request, $user);
        });
        Notification::send($user, new SecurityActionCompletedNotification('Your Marketo seller password was changed.', $this->settings->get('support_email'), $this->settings->get('platform_name')));

        return response()->json(['message' => 'Password updated. Other sessions and access tokens were revoked.']);
    }

    public function mfaChallenge(Request $request): JsonResponse
    {
        $data = $request->validate(['action' => ['required', Rule::in(['enable', 'disable'])], 'current_password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'code' => 'current_password_invalid'], 422);
        }
        if ($data['action'] === 'enable' && $user->two_factor_enabled) return response()->json(['message' => 'MFA is already enabled.', 'code' => 'mfa_already_enabled'], 409);
        if ($data['action'] === 'disable' && ! $user->two_factor_enabled) return response()->json(['message' => 'MFA is already disabled.', 'code' => 'mfa_already_disabled'], 409);

        return $this->challengeResponse($this->challenges->issue($user, 'seller.mfa.'.$data['action']), $data['action']);
    }

    public function mfaVerify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['enable', 'disable'])], 'challenge_id' => ['required', 'integer'],
            'challenge_token' => ['required', 'string', 'size:64'], 'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);
        $user = $request->user();
        $challenge = $this->challenges->verify($user, 'seller.mfa.'.$data['action'], (int) $data['challenge_id'], $data['challenge_token'], $data['code']);
        DB::transaction(function () use ($user, $challenge, $data, $request) {
            $enabled = $data['action'] === 'enable';
            $user->forceFill(['two_factor_enabled' => $enabled, 'two_factor_method' => $enabled ? 'email' : null, 'two_factor_confirmed_at' => $enabled ? now() : null])->save();
            $challenge->update(['consumed_at' => now()]);
            $this->activity->log('seller.mfa.'.($enabled ? 'enabled' : 'disabled'), 'authentication', 'Seller email MFA '.($enabled ? 'enabled.' : 'disabled.'), $user, $request, $user);
        });
        Notification::send($user, new SecurityActionCompletedNotification('Email MFA was '.($data['action'] === 'enable' ? 'enabled' : 'disabled').' for your Marketo seller account.', $this->settings->get('support_email'), $this->settings->get('platform_name')));

        return response()->json(['message' => 'Email MFA '.$data['action'].'d.', 'data' => ['enabled' => $data['action'] === 'enable', 'method' => $data['action'] === 'enable' ? 'email' : null]]);
    }

    public function revokeSession(Request $request, int $tokenId): JsonResponse
    {
        $token = $request->user()->tokens()->whereKey($tokenId)->firstOrFail();
        $current = $request->user()->currentAccessToken();
        if ($current instanceof PersonalAccessToken && $current->getKey() === $token->getKey()) {
            return response()->json(['message' => 'Sign out to end the current session.', 'code' => 'current_session'], 409);
        }
        $token->delete();
        $this->activity->log('seller.session.revoked', 'authentication', 'Seller access token revoked.', $request->user(), $request, $request->user(), ['token_id' => $tokenId]);

        return response()->json(['message' => 'Session revoked.']);
    }

    private function challengeResponse(array $issued, string $action): JsonResponse
    {
        return response()->json(['message' => 'A verification code was sent to your verified email.', 'data' => [
            'challenge_id' => $issued['challenge']->id, 'challenge_token' => $issued['token'],
            'expires_at' => $issued['challenge']->expires_at->toISOString(), 'action' => $action,
        ]], 201);
    }

    private function payload(SellerDocument $document, ?SellerDocument $renewal = null): array
    {
        $warningDays = (int) $this->settings->get('seller_document_expiry_warning_days');
        $status = match (true) {
            $renewal?->status === 'pending' => 'renewal_pending',
            $renewal?->status === 'rejected' => 'renewal_rejected',
            $document->expires_at?->isPast() => 'expired',
            $document->expires_at && $document->expires_at->lte(now()->addDays($warningDays)) => 'expiring_soon',
            default => 'valid',
        };

        return [
            'id' => $document->id, 'document_type' => $document->document_type, 'status' => $document->status,
            'display_status' => $status, 'uploaded_at' => $document->uploaded_at?->toISOString(),
            'expires_at' => $document->expires_at?->toDateString(), 'original_filename' => $document->original_filename,
            'renewal' => $renewal ? ['id' => $renewal->id, 'status' => $renewal->status, 'submitted_at' => $renewal->submitted_at?->toISOString(), 'expires_at' => $renewal->expires_at?->toDateString(), 'review_notes' => $renewal->review_notes] : null,
        ];
    }
}
