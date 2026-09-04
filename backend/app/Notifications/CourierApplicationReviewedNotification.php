<?php

namespace App\Notifications;

use App\Models\CourierApplication;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CourierApplicationReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected CourierApplication $application,
        protected string $decision,
        protected ?string $reason = null,
    ) {}

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $mail = (new MailMessage)->greeting("Hello {$notifiable->display_name},");

        if ($this->decision === 'approved') {
            return $mail->subject('Your Maketo courier application was approved')
                ->line('Your courier account has been approved.')
                ->line('The future Maketo Courier app will use this same account for delivery operations.');
        }

        return $mail->subject('Your Maketo courier application was reviewed')
            ->line('Your courier application was not approved.')
            ->line('Reason: '.($this->reason ?: 'Please contact Maketo support for details.'));
    }
}
