<?php

namespace Database\Seeders;

use App\Models\MarketplaceNotification;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        User::firstOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@maketo.local')],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'name' => 'Admin User',
                'mobile' => env('ADMIN_MOBILE', '+639000000000'),
                'phone' => env('ADMIN_MOBILE', '+639000000000'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'password123')),
                'role' => 'admin',
                'status' => 'active',
                'location_label' => 'Marketo Admin',
                'two_factor_enabled' => false,
                'email_verified_at' => now(),
                'last_active_at' => now(),
            ]
        );

        $this->call(MarketplaceSeeder::class);

        $buyer = User::where('email', 'ana.reyes@email.com')->first();
        $seller = User::where('email', 'maria@verdebotanics.com')->first();
        $admin = User::where('email', env('ADMIN_EMAIL', 'admin@maketo.local'))->first();

        $seedNotifications = [
            $buyer ? [
                'user_id' => $buyer->id,
                'category' => 'orders',
                'title' => 'Order ORD-2837 confirmed',
                'body' => 'Atelier Manila has confirmed your order for the Brass Desk Clock. It will be prepared for shipment shortly.',
                'action_type' => 'order',
                'action_label' => 'View order',
            ] : null,
            $buyer ? [
                'user_id' => $buyer->id,
                'category' => 'delivery',
                'title' => 'Package out for delivery',
                'body' => 'Your package is now out for delivery and should arrive later today.',
                'action_type' => 'order',
                'action_label' => 'Track order',
            ] : null,
            $buyer ? [
                'user_id' => $buyer->id,
                'category' => 'messages',
                'title' => 'New message from Verde Botanics',
                'body' => 'Thanks for your order. We have packed your item and it is ready for courier pickup.',
                'action_type' => 'message',
                'action_label' => 'Open messages',
            ] : null,
            $seller ? [
                'user_id' => $seller->id,
                'category' => 'orders',
                'title' => 'New order received',
                'body' => 'A buyer just placed a new order for your Organic Lavender Serum.',
                'action_type' => 'order',
                'action_label' => 'View seller orders',
            ] : null,
            $seller ? [
                'user_id' => $seller->id,
                'category' => 'inventory',
                'title' => 'Low stock alert',
                'body' => 'Handmade Ceramic Bowl Set is running low and needs replenishment soon.',
                'action_type' => 'inventory',
                'action_label' => 'Review inventory',
            ] : null,
            $seller ? [
                'user_id' => $seller->id,
                'category' => 'account',
                'title' => 'Seller profile verified',
                'body' => 'Your seller profile is approved and visible to buyers.',
                'action_type' => 'seller-profile',
                'action_label' => 'Open seller center',
            ] : null,
            $admin ? [
                'user_id' => $admin->id,
                'category' => 'moderation',
                'title' => 'Seller application pending',
                'body' => 'A new seller application is waiting for review in the moderation queue.',
                'action_type' => 'seller-application',
                'action_label' => 'Review application',
            ] : null,
            $admin ? [
                'user_id' => $admin->id,
                'category' => 'system',
                'title' => 'New report received',
                'body' => 'A product report was submitted and needs moderation attention.',
                'action_type' => 'report',
                'action_label' => 'Open reports',
            ] : null,
            $admin ? [
                'user_id' => $admin->id,
                'category' => 'system',
                'title' => 'Platform analytics ready',
                'body' => 'This week’s platform summary is ready for review.',
                'action_type' => 'analytics',
                'action_label' => 'View analytics',
            ] : null,
        ];

        foreach (array_filter($seedNotifications) as $notification) {
            MarketplaceNotification::firstOrCreate(
                [
                    'user_id' => $notification['user_id'],
                    'category' => $notification['category'],
                    'title' => $notification['title'],
                ],
                array_merge($notification, [
                    'body' => $notification['body'],
                    'action_type' => $notification['action_type'],
                    'action_label' => $notification['action_label'],
                    'read_at' => null,
                    'dismissed_at' => null,
                ])
            );
        }
    }
}
