# Maketo Courier Architecture

## Current implementation

The courier registration flow is part of the existing Maketo modular Laravel API. The React website, admin website, and future Flutter Courier app share the same `users` identity, Sanctum bearer-token authentication, Aiven MySQL database, notification records, activity logs, and Cloudflare R2 storage service.

Public discovery starts at the `Become a Courier` Footer link and opens `/courier/apply`. Guests first see the public courier landing page, requirements, privacy summary, and separate `Create Maketo Account` and `Sign In` actions. Both existing authentication flows preserve `/courier/apply` as the return destination. Verified, active users may submit an application. Admin accounts are ineligible.

Applicants may save one scalar-only draft and resume it later. Draft saves do not upload documents; all three images are selected and validated during final submission. Submitting promotes the same record to `pending`. It does not create an active courier or grant courier permissions. The page displays the current pending, approved, or rejected state instead of rendering a second blank form.

## Existing architecture reused

- Authentication: Laravel Sanctum bearer tokens and the existing `/api/auth/login` and `/api/auth/me` endpoints.
- Users: one `users` identity; no `courier_users` table or separate credentials.
- Roles: the existing single `users.role` column remains unchanged by courier approval. Courier access is represented by an active one-to-one courier profile so an approved buyer or seller retains their original role.
- Private media: `MediaStorageService::storePrivateFile()` and temporary signed R2 URLs.
- Addresses: the existing PSGC hierarchy and React Philippine address selector.
- Admin: existing admin middleware, shell, status badges, notifications, and activity logs.
- Delivery domain: existing `seller_orders`, `shipments`, `couriers`, and append-only `tracking_events` remain authoritative and unchanged.

The single role column is a current platform limitation. Courier approval deliberately does not set `users.role = courier`, because that would destroy a seller or buyer identity. Future authorization for `/api/courier/*` must check the active courier profile/capability as well as the active user account.

## Data model

`courier_applications` stores the applicant, structured Philippine address, mobile number, vehicle snapshot, review state, reviewer, reason, submission/review times, and approved courier link. Supported application states are `draft`, `pending`, `approved`, and `rejected`.

`courier_documents` stores one row per required type:

- `driver_license`
- `vehicle_or`
- `vehicle_cr`

Each row stores the private disk/key, original filename, server-detected MIME type, file size, document status, and upload/review timestamps. The unique application-and-type key prevents duplicate document slots.

The existing `couriers` table now also supports user-backed courier profiles through a nullable unique `user_id`, an approved application link, separate account and availability states, an approved vehicle snapshot, and approval time. Nullable fields retain compatibility with existing legacy carrier/company rows.

Every new base table has a primary key. The migration is additive; production rollout must use the normal `php artisan migrate` command. Do not use destructive migration commands.

## Document security

The Driver's License, Vehicle Official Receipt (OR), and Vehicle Certificate of Registration (CR) are three separate required image uploads. Allowed formats are JPEG, PNG, and WEBP, with an 8 MB default per-file limit configurable through `COURIER_DOCUMENT_MAX_KB`.

Laravel performs content-aware image and MIME validation; browser validation is only a usability aid. Objects are stored with private visibility in R2. Database records store object metadata, never a permanent public URL. API resources never expose R2 credentials, object keys, or disk configuration.

Authenticated applicants may request a temporary ten-minute URL only for a document belonging to their own application. Ownership failures return a not-found response so another applicant's records are not disclosed. Authenticated admins use a separate role-protected review endpoint. R2 object contents, storage keys, disk names, and signed URLs are not included in application payloads or activity logs.

## Review lifecycle

Admin list filtering is performed by Laravel using the requested `pending`, `approved`, or `rejected` state. Approval runs in a transaction and locks the application. It verifies the pending state and all three document types, creates or updates one courier profile, marks the documents approved, and links the approved profile. Retrying approval returns the existing approved result without creating a duplicate profile, notification, or audit event.

Rejection requires a reason, marks the application and documents rejected, and preserves all historical records and private files. No appeal or reconsideration workflow is implemented.

Activity events are:

- `courier.application.submitted`
- `courier.application.approved`
- `courier.application.rejected`

The existing in-app notification table and Laravel mail notification system notify admins of submissions and applicants when an application is submitted, approved, or rejected.

## Future Flutter compatibility — PLANNED

The future native Flutter Courier app will call the same `POST /api/auth/login` endpoint, store its bearer token in secure device storage, and call `GET /api/auth/me`. The response now includes a domain-oriented `courier` object only when a courier profile exists, including account status, availability status, and vehicle information.

Future operational APIs should live under `/api/courier/*` and require an active account plus active courier profile. Candidate APIs for profile, assigned deliveries, delivery detail, lifecycle transitions, earnings, payouts, and notifications are PLANNED and are not registered yet.

Delivery assignment should continue to target `shipments.courier_id`. Courier status transitions must be validated against the existing order and shipment lifecycle, and new tracking entries should append to `tracking_events` with actor metadata. The current registration work does not alter delivery statuses.

Mobile push delivery is PLANNED. It should consume the existing notification/event domain rather than adding aggressive polling. Courier payout integration is PLANNED and should reuse the platform's commission and payout boundaries without creating registration-specific payout tables.

Vehicle and document renewal workflows are PLANNED. Future changes should create historical submissions rather than overwriting approved application evidence.

## Explicitly out of scope

- Flutter courier application
- Separate courier authentication, backend, or database
- Courier delivery dashboard on the website
- Operational `/api/courier/*` endpoints
- Delivery acceptance or status transitions
- GPS or realtime location tracking
- Push-notification infrastructure
- Courier earnings and payout implementation
- Appeals and document/vehicle renewal workflows
