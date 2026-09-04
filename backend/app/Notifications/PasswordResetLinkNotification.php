<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetLinkNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $token)
    {
    }

    public function token(): string
    {
        return $this->token;
    }

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $query = http_build_query([
            'token' => $this->token,
            'email' => $notifiable->email,
        ]);
        $resetUrl = $frontendUrl . '/auth/reset-password?' . $query;

        return (new MailMessage)
            ->subject('Reset your Marketo password')
            ->greeting("Hello {$notifiable->display_name},")
            ->line('We received a request to reset your Marketo password.')
            ->action('Reset password', $resetUrl)
            ->line('This reset link expires in 60 minutes.')
            ->line('If you did not request a password reset, you can ignore this email.');
    }
}
