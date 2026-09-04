<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LogisticsApplicationReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $decision, private readonly ?string $reason = null) {}

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $mail = (new MailMessage)->greeting("Hello {$notifiable->display_name},");
        if ($this->decision === 'approved') {
            return $mail->subject('Your Maketo logistics provider is approved')
                ->line('Your logistics provider application was approved.')
                ->line('You can now sign in to the Logistics Partner Portal.');
        }

        return $mail->subject('Your logistics provider application was reviewed')
            ->line('Your application was not approved.')
            ->line('Reason: '.($this->reason ?: 'Please contact Maketo support for details.'));
    }
}
