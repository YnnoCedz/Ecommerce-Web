<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ActivityLogger
{
    private const SENSITIVE_KEYS = [
        'password', 'password_confirmation', 'current_password', 'token', 'access_token',
        'authorization', 'code', 'code_hash', 'challenge_token', 'secret', 'mfa_secret',
    ];

    public function log(
        string $eventType,
        string $category,
        string $description,
        ?User $actor = null,
        ?Request $request = null,
        ?Model $subject = null,
        array $metadata = [],
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => $actor?->id,
            'actor_role' => $actor?->role,
            'event_type' => $eventType,
            'event_category' => $category,
            'description' => $description,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'ip_address' => $request?->ip(),
            'user_agent' => mb_substr((string) $request?->userAgent(), 0, 1024) ?: null,
            'metadata' => $this->sanitize($metadata),
        ]);
    }

    public function sanitize(array $metadata): array
    {
        $safe = [];
        foreach ($metadata as $key => $value) {
            $normalized = strtolower((string) $key);
            if (in_array($normalized, self::SENSITIVE_KEYS, true)
                || str_contains($normalized, 'password')
                || str_contains($normalized, 'secret')
                || str_contains($normalized, 'token')
                || str_contains($normalized, 'code')) {
                continue;
            }
            $safe[$key] = is_array($value) ? $this->sanitize($value) : $value;
        }

        return $safe;
    }
}
