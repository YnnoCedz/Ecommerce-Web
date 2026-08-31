<?php

namespace App\Notifications;

use App\Models\AuthChallenge;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SecurityChallengeNotification extends Notification
{
    use Queueable;

    public function __construct(private AuthChallenge $challenge, private string $code) {}

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function code(): string
    {
        return $this->code;
    }

    public function challenge(): AuthChallenge
    {
        return $this->challenge;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $action = match ($this->challenge->purpose) {
            'admin.change_password' => 'change your administrator password',
            'seller.danger_zone.deactivate' => 'deactivate your seller store',
            'seller.danger_zone.close' => 'close your seller account',
            default => 'complete a security-sensitive action',
        };
        $minutes = max(1, now()->diffInMinutes($this->challenge->expires_at, false));

        return (new MailMessage)
            ->subject('Confirm your Maketo account action')
            ->greeting("Hello {$notifiable->display_name},")
            ->line("A request was made to {$action}.")
            ->line("Verification code: {$this->code}")
            ->line("This single-use code expires in {$minutes} minute".($minutes === 1 ? '' : 's').'.')
            ->line('If you did not request this action, do not share the code and contact Maketo support.');
    }
}
