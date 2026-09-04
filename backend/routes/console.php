<?php

use App\Models\ActivityLog;
use App\Models\MarketplaceNotification;
use App\Models\SellerDocument;
use App\Notifications\SellerDocumentExpiryNotification;
use App\Services\ActivityLogger;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('mail:test {email?}', function () {
    if (app()->environment('production')) {
        $this->error('Mail test is disabled in production.');

        return self::FAILURE;
    }

    $recipient = $this->argument('email') ?: config('mail.from.address');

    if (! is_string($recipient) || trim($recipient) === '') {
        $this->error('No recipient email was provided and MAIL_FROM_ADDRESS is missing.');

        return self::FAILURE;
    }

    try {
        Mail::raw(
            'Marketo mail test sent at '.now()->toDateTimeString(),
            function ($message) use ($recipient) {
                $message->to($recipient);
                $message->subject('Marketo mail test');
            }
        );
    } catch (Throwable $e) {
        $this->error('Mail test failed: '.$e->getMessage());

        return self::FAILURE;
    }

    $this->info('Mail test sent successfully to '.$recipient.'.');

    return self::SUCCESS;
})->purpose('Send a safe development mail test using the configured mailer');

Artisan::command('r2:test', function () {
    if (app()->environment('production')) {
        $this->error('R2 test is disabled in production.');

        return self::FAILURE;
    }

    try {
        $result = app(MediaStorageService::class)->testConnection();
    } catch (Throwable $e) {
        $this->error('R2 test failed: '.$e->getMessage());

        return self::FAILURE;
    }

    $this->info('R2 connection verified successfully for key '.$result['key'].'.');

    return self::SUCCESS;
})->purpose('Verify the configured R2 disk with a write/read/delete cycle');

Artisan::command('auth:challenges:prune {--hours=24 : Delete consumed or expired auth challenges older than this many hours}', function () {
    $hours = max(1, (int) $this->option('hours'));
    $cutoff = now()->subHours($hours);

    $deleted = DB::table('auth_challenges')
        ->where(function ($query) use ($cutoff) {
            $query
                ->where('consumed_at', '<=', $cutoff)
                ->orWhere('expires_at', '<=', $cutoff);
        })
        ->delete();

    $this->info("Pruned {$deleted} auth challenge record".($deleted === 1 ? '' : 's').'.');

    return self::SUCCESS;
})->purpose('Delete old consumed or expired auth challenge records');

Artisan::command('auth:pending-registrations:prune', function () {
    $deleted = DB::table('pending_registrations')
        ->where('expires_at', '<=', now())
        ->delete();

    $this->info("Pruned {$deleted} expired pending registration".($deleted === 1 ? '' : 's').'.');

    return self::SUCCESS;
})->purpose('Delete expired temporary registration records');

Artisan::command('seller-documents:notify-expiry', function () {
    $sent = 0;
    foreach ([30, 14, 7, 0] as $threshold) {
        SellerDocument::query()
            ->where('status', 'approved')
            ->whereDate('expires_at', now()->addDays($threshold)->toDateString())
            ->with('seller.user')
            ->each(function (SellerDocument $document) use ($threshold, &$sent) {
                $user = $document->seller?->user;
                if (! $user || ActivityLog::query()->where('event_type', 'seller.document.expiry_notified')
                    ->where('subject_type', $document->getMorphClass())->where('subject_id', $document->id)
                    ->where('metadata->threshold_days', $threshold)->exists()) {
                    return;
                }
                Notification::send($user, new SellerDocumentExpiryNotification($document, $threshold));
                MarketplaceNotification::create([
                    'user_id' => $user->id, 'category' => 'account', 'title' => 'Seller document renewal reminder',
                    'body' => $threshold === 0 ? 'A seller document has expired.' : "A seller document expires in {$threshold} days.",
                    'action_type' => 'seller-document-renewal', 'action_label' => 'Open Renewal',
                ]);
                app(ActivityLogger::class)->log('seller.document.expiry_notified', 'seller', 'Seller document expiry notification sent.', $user, null, $document, ['threshold_days' => $threshold]);
                $sent++;
            });
    }
    $this->info("Sent {$sent} seller document expiry notification".($sent === 1 ? '' : 's').'.');

    return self::SUCCESS;
})->purpose('Send idempotent 30, 14, 7, and expiry-day seller document reminders');
