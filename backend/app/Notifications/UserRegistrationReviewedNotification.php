<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Marketo Admin decision on a marketplace User registration.
 *
 * Deliberately concise: it carries the decision and, on rejection, only the
 * reason the reviewer chose to share. No internal review metadata is exposed.
 */
class UserRegistrationReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(
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
            return $mail->subject('Your Marketo Marketplace access is approved')
                ->line('A Marketo administrator has approved your Marketplace application.')
                ->line('You can now shop and use the marketplace with this Marketo identity.')
                ->action('Sign in to Marketo', url('/auth/login'));
        }

        return $mail->subject('Your Marketo Marketplace application was reviewed')
            ->line('Your Marketplace application was reviewed and was not approved.')
            ->line('Reason: '.($this->reason ?: 'Please contact Marketo support for details.'));
    }
}
