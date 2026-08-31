<?php

namespace App\Notifications;

use App\Models\SellerDocument;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerDocumentExpiryNotification extends Notification
{
    use Queueable;

    public function __construct(private SellerDocument $document, private int $daysRemaining) {}

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $label = str_replace('_', ' ', $this->document->document_type);
        $timing = $this->daysRemaining === 0 ? 'has expired' : "expires in {$this->daysRemaining} days";

        return (new MailMessage)
            ->subject('Maketo seller document renewal reminder')
            ->greeting("Hello {$notifiable->display_name},")
            ->line("Your {$label} {$timing}.")
            ->line('Open Seller Center → Store → Renewal to submit a private replacement for administrator review.');
    }
}
