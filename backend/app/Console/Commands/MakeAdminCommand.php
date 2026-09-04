<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

class MakeAdminCommand extends Command
{
    protected $signature = 'make:admin';

    protected $description = 'Create one verified active Marketo administrator account';

    public function handle(): int
    {
        $firstName = $this->askName('Admin first name');
        $lastName = $this->askName('Admin last name');
        $mobile = $this->askMobile();
        $email = $this->askEmail();
        if ($email === null) {
            return self::FAILURE;
        }

        $password = $this->askPassword();

        try {
            User::create([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => trim($firstName.' '.$lastName),
                'email' => $email,
                'mobile' => $mobile,
                'password' => Hash::make($password),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
                'last_active_at' => now(),
                'two_factor_enabled' => false,
            ]);
        } catch (Throwable $exception) {
            report($exception);
            $this->error('The administrator account could not be created. No credentials were displayed.');

            return self::FAILURE;
        }

        $this->info("Admin account created successfully for {$email}.");

        return self::SUCCESS;
    }

    private function askName(string $question): string
    {
        while (true) {
            $name = trim((string) $this->ask($question));
            $validator = Validator::make(
                ['name' => $name],
                ['name' => ['required', 'string', 'max:255']],
            );

            if (! $validator->fails()) {
                return $name;
            }

            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
        }
    }

    private function askMobile(): string
    {
        while (true) {
            $mobile = trim((string) $this->ask('Admin mobile'));
            $validator = Validator::make(
                ['mobile' => $mobile],
                ['mobile' => ['required', 'string', 'max:255', 'unique:users,mobile']],
            );

            if (! $validator->fails()) {
                return $mobile;
            }

            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
        }
    }

    private function askEmail(): ?string
    {
        while (true) {
            $email = strtolower(trim((string) $this->ask('Admin email')));
            $validator = Validator::make(
                ['email' => $email],
                ['email' => ['required', 'email', 'max:255', 'unique:users,email']],
            );

            if (! $validator->fails()) {
                return $email;
            }

            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            if (User::where('email', $email)->exists()) {
                $this->error('An account with this email already exists. No administrator was created.');

                return null;
            }
        }
    }

    private function askPassword(): string
    {
        $rules = [
            'password' => [
                'required',
                'string',
                'max:16',
                PasswordRule::min(8)->mixedCase()->numbers()->symbols(),
            ],
        ];

        while (true) {
            $password = (string) $this->secret('Admin password');
            $confirmation = (string) $this->secret('Confirm password');

            $validator = Validator::make(
                ['password' => $password, 'password_confirmation' => $confirmation],
                [...$rules, 'password_confirmation' => ['same:password']],
            );

            if (! $validator->fails()) {
                return $password;
            }

            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
        }
    }
}
