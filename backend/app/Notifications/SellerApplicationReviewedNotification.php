<?php

namespace App\Notifications;

use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerApplicationReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected SellerApplication $application,
        protected string $decision,
        protected ?string $rejectionReason = null,
    ) {
    }

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->greeting("Hello {$notifiable->display_name},");

        if ($this->decision === 'approved') {
            return $mail
                ->subject('Your Maketo seller application was approved')
                ->line('Congratulations. Your Maketo seller application has been approved.')
                ->line('You can now sign in and access your seller dashboard.');
        }

        return $mail
            ->subject('Your Maketo seller application was reviewed')
            ->line('Your Maketo seller application was not approved.')
            ->line($this->rejectionReason ? 'Reason: ' . $this->rejectionReason : 'Reason: Please review the submission details and try again.')
            ->line('You may submit a new application after updating the information and documents.');
    }
}
