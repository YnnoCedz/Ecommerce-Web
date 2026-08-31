<?php

namespace App\Services;

use App\Models\AuthChallenge;
use App\Models\User;
use App\Notifications\SecurityChallengeNotification;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class ActionChallengeService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function issue(User $user, string $purpose): array
    {
        $user->authChallenges()->where('purpose', $purpose)->whereNull('consumed_at')->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(64);
        $challenge = $user->authChallenges()->create([
            'purpose' => $purpose,
            'channel' => 'email',
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
            'sent_to' => $user->email,
            'metadata' => ['token_hash' => hash('sha256', $token), 'action' => $purpose],
        ]);

        Notification::send($user, new SecurityChallengeNotification($challenge, $code));

        return ['challenge' => $challenge, 'token' => $token];
    }

    public function verify(User $user, string $purpose, int $challengeId, string $token, string $code): AuthChallenge
    {
        $challenge = AuthChallenge::query()
            ->whereKey($challengeId)
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->first();
        $expected = (string) data_get($challenge?->metadata, 'token_hash');

        if (! $challenge || $expected === '' || ! hash_equals($expected, hash('sha256', $token))) {
            $this->activity->log($this->failureEvent($purpose), 'authentication', 'Security challenge verification failed.', $user, request(), $user, ['purpose' => $purpose, 'reason' => 'invalid_challenge']);
            $this->fail('The security challenge is invalid or has already been used.', 'challenge_invalid', 422);
        }
        if ($challenge->expires_at->isPast()) {
            $challenge->update(['consumed_at' => now()]);
            $this->activity->log($this->failureEvent($purpose), 'authentication', 'Security challenge verification failed.', $user, request(), $user, ['purpose' => $purpose, 'reason' => 'expired']);
            $this->fail('The security challenge has expired.', 'challenge_expired', 410);
        }
        if ($challenge->attempts >= $challenge->max_attempts) {
            $challenge->update(['consumed_at' => now()]);
            $this->fail('Too many incorrect verification attempts.', 'challenge_locked', 429);
        }
        if (! Hash::check($code, $challenge->code_hash)) {
            $challenge->increment('attempts');
            $this->activity->log($this->failureEvent($purpose), 'authentication', 'Security challenge verification failed.', $user, request(), $user, ['purpose' => $purpose, 'reason' => 'incorrect_code']);
            if ($challenge->fresh()->attempts >= $challenge->max_attempts) {
                $challenge->update(['consumed_at' => now()]);
                $this->fail('Too many incorrect verification attempts.', 'challenge_locked', 429);
            }
            $this->fail('The verification code is incorrect.', 'challenge_code_invalid', 422);
        }

        return $challenge;
    }

    private function failureEvent(string $purpose): string
    {
        return str_starts_with($purpose, 'seller.danger_zone.') ? 'seller.danger.challenge.failed' : 'auth.mfa.failed';
    }

    private function fail(string $message, string $code, int $status): never
    {
        throw new HttpResponseException(response()->json(['message' => $message, 'code' => $code], $status));
    }
}
