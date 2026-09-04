# Marketo Courier API Contract

This defines the Laravel contract consumed by the separate Rider Flutter client. This alignment does not modify that Flutter project. All paths use the existing `/api` namespace and shared Sanctum bearer authentication.

## Identity and authorization

Courier operations use one Marketo user identity and the canonical `couriers.user_id` relationship. Operational routes require, in order:

1. `auth:sanctum`
2. `account.active`
3. `courier.active`

An eligible Rider has a globally active verified identity, a courier profile with `active = true`, `status = active`, and a non-null `approved_at`, plus an active affiliation to an active Logistics provider. Approved legacy couriers with no provider-owned application remain compatible. `users.role` remains legacy compatibility data; there is no courier role and Buyer capability is not required.

The courier application migration `2026_09_02_000001_add_courier_application_support` must be applied by an explicitly authorized deployment workflow before these endpoints are used against an existing database. Phase 4 does not execute it.

## Registration, provider ownership, and app boot

Rider registration is app-only. There is no web Rider registration or Rider login form.

- `GET /api/logistics/providers` returns the safe list of approved active providers for applicant selection.
- `POST /api/auth/register/rider` creates a pending shared identity, validates the selected provider and three private documents, and sends the shared email-verification challenge.
- Email verification creates an active shared identity and a pending provider-owned courier application; it does not grant Buyer or Rider capability.
- Existing authenticated identities use `POST /api/courier/applications` with `logistics_provider_id` and the same private application data.
- Provider managers use the tenant-scoped `/api/logistics/rider-applications` routes to list, view, view private documents, approve with a provider-owned hub, or reject.
- Marketo Admin `/api/admin/courier-applications` endpoints are read-only oversight; Admin does not approve or reject Riders.

The client uses the shared authentication endpoints:

- `POST /api/auth/login`
- `POST /api/auth/2fa/verify` when the login response requires 2FA
- `GET /api/auth/me`

Recommended boot sequence:

1. Restore the Sanctum token.
2. Request `/api/auth/me` and verify the safe courier capability fields.
3. Request `/api/courier/profile`.
4. Request `/api/courier/dashboard` or the first paginated deliveries page.

The client must not infer operational access from `users.role` and must not duplicate the delivery transition rules.

## Response conventions

Successful single-resource responses use `{ "data": ... }`. Mutations also include a human-readable `message`. Paginated responses use:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 0
  }
}
```

Common errors include:

- `401` unauthenticated
- `403 rider_not_active`
- `404 shipment_not_assigned`
- `422 invalid_delivery_transition`
- standard Laravel `422` field validation errors
- `429` rate limited

## Courier profile and availability

### `GET /api/courier/profile`

Returns safe operational fields: courier ID, name, profile status, active flag, availability, service area, approved vehicle summary, plate number, and approval timestamp. It excludes application documents, storage metadata, review notes, credentials, and private R2 paths.

### `PATCH /api/courier/availability`

Request:

```json
{ "availability": "available" }
```

Allowed values are `offline`, `available`, and `busy`. Profile status and availability remain separate. Inactive or suspended courier profiles are rejected by middleware.

## Dashboard

### `GET /api/courier/dashboard`

Returns availability, active delivery count, ready/assigned count, completed-today count, and at most one lightweight current-delivery card.

## Deliveries

### `GET /api/courier/deliveries`

Only records where `shipments.courier_id` equals the authenticated courier are returned. The request never accepts a courier ID.

Query parameters:

- `status`: `assigned`, `current`, `active`, `completed`, `failed`, or `all`; default `active`
- `search`: tracking number, recipient name, or seller/store name
- `page`: positive integer
- `per_page`: 1–50; default 15

`assigned` means `ready`. `current` and `active` mean `ready`, `picked-up`, `in-transit`, or `out-for-delivery`. `completed` means `delivered`. `failed` is compatible with existing historical `failed` or `cancelled` records; Phase 4 does not introduce a new failed-delivery state.

List rows contain only tracking/status, allowed transitions, store and pickup locality, recipient and delivery locality, item quantity, shipping fee, and operational timestamps. Tracking history and full item records are not loaded for each card.

### `GET /api/courier/deliveries/{shipment}`

The shipment must belong to the authenticated courier. The detail contains:

- tracking number, current status, and server-calculated `allowed_transitions`
- seller/store pickup contact and address
- recipient name, phone, order-address snapshot, and delivery note
- order-item snapshot names, variants, SKUs, and quantities
- delivery timestamps
- append-only tracking timeline in chronological order

It excludes buyer email/security data, saved address management data, seller payout data, payment credentials, admin notes, and private identity documents.

### `PATCH /api/courier/deliveries/{shipment}/status`

Request:

```json
{
  "status": "in-transit",
  "note": "Departed the Makati sorting point.",
  "location": "Makati City"
}
```

`note` and manual textual `location` are optional and bounded. No coordinates are accepted.

Canonical transition graph:

```text
ready -> picked-up -> in-transit -> out-for-delivery -> delivered
```

The generic status endpoint supports the first three edges only. It cannot set `delivered`; attempting that without a persisted proof returns `422 proof_of_delivery_required`. Delivery completion uses the dedicated proof endpoint below.

Each response contains `allowed_transitions`. A repeated identical courier transition returns the canonical current delivery without appending another event. Invalid or terminal transitions return `422 invalid_delivery_transition`. A courier cannot change payment, refund, dispute, payout, seller, buyer, or courier assignment fields.

Delivery updates lock the seller order and shipment in one database transaction, recheck assignment, synchronize the compatibility `seller_orders.courier_id`, append one tracking event, synchronize order status, update availability, create existing Marketo notifications, and create an activity record. `delivered` remains distinct from buyer-confirmed `completed`.

### `POST /api/courier/deliveries/{shipment}/deliver`

This is the only courier completion endpoint. It accepts `multipart/form-data` with:

- `proof_image`: required JPEG, PNG, or WebP image, maximum 8 MiB
- `note`: optional text, maximum 500 characters

The authenticated courier must own the shipment, have an active approved courier profile, and the shipment must currently be `out-for-delivery`. The server stores exactly one immutable proof image on the configured private disk, creates the proof record, transitions the shipment to `delivered`, appends the tracking event, and synchronizes the order lifecycle in one transaction. A failed transaction removes the newly uploaded object. Repeated completion returns the existing canonical delivered resource and never creates a second proof or tracking event.

Expected errors include `proof_image` validation errors for missing, unsupported, corrupt, or oversized files; `404 shipment_not_assigned`; `403 rider_not_active`; `422 invalid_delivery_transition`; `429` throttling; and a safe `503` when private storage is unavailable. The endpoint does not accept courier IDs, shipment status, timestamps, paths, URLs, coordinates, or client-supplied delivery ownership.

### Protected proof access

- `GET /api/shipments/{shipment}/proof-of-delivery` returns safe metadata plus an authenticated content endpoint.
- `GET /api/shipments/{shipment}/proof-of-delivery/content` streams the private image with `private, no-store` caching.

Access is limited to the assigned courier, owning buyer, owning seller, and administrators. Unrelated authenticated users receive `404`. Responses never expose the storage disk, object key, filesystem path, or public object-store URL. Buyer, seller, and admin order resources expose only proof existence, submission time, optional courier note, shipment ID where required for protected retrieval, and courier display name for the admin view.

## Admin dispatch

### `GET /api/admin/couriers/eligible`

Requires the existing admin middleware. Supports `search`, `page`, and `per_page` (maximum 50). Returns only approved active couriers whose Marketo account is active. Private application data is excluded.

### `PATCH /api/admin/shipments/{shipment}/courier`

Request:

```json
{ "courier_id": 42 }
```

Assignment and reassignment set authoritative `shipments.courier_id`, synchronize legacy `seller_orders.courier_id`, preserve an append-only assignment/reassignment event, audit old/new courier IDs, notify the new courier, and notify the previous courier after reassignment. Reassigning immediately changes authorization because every courier request rechecks `shipments.courier_id`.

The existing `PATCH /api/admin/seller-orders/{sellerOrder}/delivery-status` endpoint remains a distinct audited `admin_logistics` override. It delegates to the same transition service; an administrator does not impersonate a courier.

## Earnings and payouts

Marketo already has authoritative courier commission entries created from delivered shipment shipping fees and administrative payout records.

### `GET /api/courier/earnings/summary`

Returns own total net earnings, pending-payout amount, paid-out amount, delivery count, and currency from `commission_entries` and `payouts`.

### `GET /api/courier/payouts`

Returns only the authenticated courier's payout records with `page` and `per_page` (maximum 50). It is read-only and excludes provider credentials. Couriers cannot approve, mark paid, or otherwise mutate financial records.

## Assignment authority and compatibility debt

`shipments.courier_id` is the sole operational ownership authority. The older `seller_orders.courier_id` column remains temporarily synchronized by `CourierAssignmentService` and `CourierDeliveryService` for backward compatibility. Controllers do not write both independently. Removing the duplicate column requires a later reviewed migration and client audit.

## Explicit exclusions

Phase 4 does not implement Flutter/Dart code, GPS coordinates, continuous or background location, location history tables, geofencing, live tracking, aggressive polling, push-notification infrastructure, delivery acceptance, a new failed-delivery taxonomy, return-to-seller automation, or courier financial writes.
