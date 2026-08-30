<?php

namespace App\Notifications;

use App\Models\AuthChallenge;
use App\Models\PendingRegistrationChallenge;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class EmailVerificationCodeNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected AuthChallenge|PendingRegistrationChallenge $challenge,
        protected string $code,
    ) {}

    public function code(): string
    {
        return $this->code;
    }

    public function challenge(): AuthChallenge|PendingRegistrationChallenge
    {
        return $this->challenge;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Maketo verification code')
            ->greeting('Hello '.($notifiable->display_name ?? $notifiable->name ?? 'there').',')
            ->line('Use the code below to verify your Maketo email address.')
            ->line(new HtmlString('Verification code: <strong>'.e($this->code).'</strong>'))
            ->line('This code expires in 10 minutes.')
            ->line('Enter this code on the Maketo verification page. If you did not request it, you can ignore this email.');
    }
}
