<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SecurityActionCompletedNotification extends Notification
{
    use Queueable;

    public function __construct(private string $action, private string $supportEmail = 'support@marketohub.online', private string $platformName = 'Maketo') {}

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->platformName} security action completed")
            ->greeting("Hello {$notifiable->display_name},")
            ->line($this->action)
            ->line('Completed at: '.now()->toDayDateTimeString())
            ->line("If you did not perform this action, contact {$this->supportEmail} immediately.");
    }
}
