<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;

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
            'Maketo mail test sent at ' . now()->toDateTimeString(),
            function ($message) use ($recipient) {
                $message->to($recipient);
                $message->subject('Maketo mail test');
            }
        );
    } catch (Throwable $e) {
        $this->error('Mail test failed: ' . $e->getMessage());

        return self::FAILURE;
    }

    $this->info('Mail test sent successfully to ' . $recipient . '.');

    return self::SUCCESS;
})->purpose('Send a safe development mail test using the configured mailer');

Artisan::command('r2:test', function () {
    if (app()->environment('production')) {
        $this->error('R2 test is disabled in production.');

        return self::FAILURE;
    }

    try {
        $result = app(\App\Services\MediaStorageService::class)->testConnection();
    } catch (Throwable $e) {
        $this->error('R2 test failed: ' . $e->getMessage());

        return self::FAILURE;
    }

    $this->info('R2 connection verified successfully for key ' . $result['key'] . '.');

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

    $this->info("Pruned {$deleted} auth challenge record" . ($deleted === 1 ? '' : 's') . '.');

    return self::SUCCESS;
})->purpose('Delete old consumed or expired auth challenge records');
