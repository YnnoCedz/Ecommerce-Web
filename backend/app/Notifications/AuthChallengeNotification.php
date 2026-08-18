<?php

namespace App\Notifications;

use App\Models\AuthChallenge;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AuthChallengeNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected AuthChallenge $challenge,
        protected string $code,
    ) {
    }

    public function code(): string
    {
        return $this->code;
    }

    public function challenge(): AuthChallenge
    {
        return $this->challenge;
    }

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $expiresMinutes = max(1, now()->diffInMinutes($this->challenge->expires_at, false));

        return (new MailMessage)
            ->subject('Your Maketo sign-in code')
            ->greeting("Hello {$notifiable->display_name},")
            ->line('Use the code below to finish signing in to your Maketo account.')
            ->line("Verification code: {$this->code}")
            ->line("This code expires in {$expiresMinutes} minute" . ($expiresMinutes === 1 ? '' : 's') . '.')
            ->line('If you did not try to sign in, you can ignore this email.');
    }
}
