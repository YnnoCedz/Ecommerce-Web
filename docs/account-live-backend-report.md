# Marketo Account Live Backend Report

Date: 2026-08-20

## Account Layout Decision

The real application now uses `AccountRouteLayout` as a React Router parent for every `/account` page. The older `pages/account/AccountLayout.tsx` remains available to specification/demo screens, but the live application no longer depends on its callback-based page switching or demo user state.

## Page Status

| Page | Status | API / database source | Editable behavior | R2 | Authorization / remaining issue |
| --- | --- | --- | --- | --- | --- |
| `/account/profile` | LIVE | `GET /api/auth/me`, users/orders/wishlist | Overview; Edit opens the real personal-info route | None | Sanctum + active account |
| `/account/personal-info` | LIVE | `PATCH /api/account/profile`, users | First name, last name, Philippine mobile number persist and refresh AuthContext | Not used | Own authenticated user only; email editing is intentionally unavailable |
| `/account/security` | LIVE (password) | `PATCH /api/account/password`, users/sessions | Current/new/confirmation, visibility, strength feedback | None | Own authenticated user; editable 2FA and session listing are not implemented |
| `/account/orders` | LIVE | `GET /api/orders`, orders/seller_orders/order_items | Read-only order history | Existing product media only | Buyer ownership enforced |
| `/account/orders/:id` | LIVE | `GET /api/orders/{orderNumber}` | Read-only order detail | Existing product media only | Buyer ownership enforced |
| `/account/wishlist` | LIVE | wishlist endpoints, wishlist_items/products | Add/remove through backend | Existing product media only | Own wishlist only |
| `/account/addresses` | LIVE | account address endpoints, addresses | Create/update/delete/default address | None | Own addresses only |
| `/account/notifications` | LIVE | notification endpoints, notifications | Mark read and dismiss persist | None | Own notifications only |
| `/account/messages` | LIVE | message endpoints, conversations/conversation_participants/messages | Open, send, and mark read persist | Not used | Participant-only access; attachment UI is not implemented |
| `/account/preferences` | LIVE | account preference endpoints, user_preferences | Every visible select/toggle persists | None | Own preference row only |
| `/account/reviews` | LIVE | review endpoints, reviews/orders/order_items | Create, edit, and delete persist | Not used | Delivered/completed purchase required; one review per order item |

## Backend Changes

- Added account profile and preference handlers to `AccountController`.
- Aligned account password validation with the registration policy: 8-16 characters, mixed case, number, symbol, confirmation.
- Replaced the messaging stub with participant-scoped conversation listing, history, sending, and persisted read state.
- Replaced review stubs with buyer review listing, eligibility, create, update, and delete behavior.
- Added Eloquent relationships for preferences, conversations, messages, and reviews.
- Added `UserPreference`.
- Added authenticated account, messaging, and review routes under `auth:sanctum` and `account.active`.

## Frontend Changes

- Added a routed account shell using `NavLink` and `Outlet`.
- Added the missing `/account/personal-info` and `/account/reviews` routes.
- Connected personal information to live user data and AuthContext refresh.
- Connected password change to the existing backend endpoint with Lucide visibility controls.
- Connected every visible preference control to persisted backend values.
- Replaced the count-only inbox with live conversations, history, send, and read actions.
- Replaced the review placeholder with eligible-order review creation and owned edit/delete actions.
- Reused the single global toast provider; success appears only after successful API persistence.

## Migration

`2026_08_20_000018_add_account_integration_support.php`:

- Creates `user_preferences` with a unique user relationship and database defaults.
- Adds a unique `reviews.order_item_id` constraint.
- Adds conversation/timestamp and polymorphic sender indexes to `messages`.

The migration ran successfully against the local `maketo` MySQL database.

## Authorization and Validation

- No account endpoint accepts a client-supplied `user_id`.
- Profile updates allow only first name, last name, and phone; role/status/security fields are ignored.
- Preferences use strict booleans and allowlisted language, currency, and number-format values.
- Conversation history/send/read requires a matching participant row; unrelated users receive 404.
- Reviews derive product, seller, buyer, order, and order item from a delivered/completed purchase.
- Review ownership is enforced for update/delete and uniqueness is enforced in both application and database layers.

## Verification

- `php artisan migrate:status`: account integration migration is applied.
- `php artisan route:list`: 8 account, 6 messaging, and 5 review routes are registered.
- `php artisan test`: 47 tests passed, 335 assertions.
- `corepack pnpm build`: production frontend build passed.

## Not Implemented

- Avatar upload/replacement/removal: the real account UI does not expose an avatar upload control.
- Message attachments: the real inbox UI does not expose attachment controls; no public/private R2 behavior was invented.
- Editable 2FA settings: challenge-based 2FA exists, but enable/disable/method settings endpoints do not.
- Active-session listing and individual revocation: no compatible session management API currently exists. Password changes revoke other database sessions using the existing policy.
- Review images and replies: not exposed by the buyer account review UI in this phase.
