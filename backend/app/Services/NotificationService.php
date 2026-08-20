<?php

namespace App\Services;

use App\Models\MarketplaceNotification;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class NotificationService
{
    public function publishToUser(User $user, array $payload): MarketplaceNotification
    {
        return $user->marketplaceNotifications()->create([
            'category' => $payload['category'],
            'title' => $payload['title'],
            'body' => $payload['body'],
            'action_type' => $payload['action_type'] ?? null,
            'action_label' => $payload['action_label'] ?? null,
            'order_id' => $payload['order_id'] ?? null,
            'product_id' => $payload['product_id'] ?? null,
            'conversation_id' => $payload['conversation_id'] ?? null,
            'read_at' => $payload['read_at'] ?? null,
            'dismissed_at' => $payload['dismissed_at'] ?? null,
        ]);
    }

    public function publishToUsers(iterable $users, array $payload): int
    {
        $count = 0;

        foreach ($users as $user) {
            if (! $user instanceof User) {
                continue;
            }

            $this->publishToUser($user, $payload);
            $count++;
        }

        return $count;
    }

    public function publishToRoles(string|array $roles, array $payload): int
    {
        $roles = Arr::wrap($roles);
        $users = User::query()->whereIn('role', $roles)->get();

        return $this->publishToUsers($users, $payload);
    }

    public function publish(array $payload): array
    {
        return [
            'category' => $payload['category'] ?? 'system',
            'title' => $payload['title'] ?? 'Notification',
            'body' => $payload['body'] ?? '',
            'action_type' => $payload['action_type'] ?? null,
            'action_label' => $payload['action_label'] ?? null,
            'order_id' => $payload['order_id'] ?? null,
            'product_id' => $payload['product_id'] ?? null,
            'conversation_id' => $payload['conversation_id'] ?? null,
            'read_at' => $payload['read_at'] ?? null,
            'dismissed_at' => $payload['dismissed_at'] ?? null,
        ];
    }
}
