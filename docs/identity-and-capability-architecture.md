# Maketo Shared Identity and Capability Architecture

## Invariants

Maketo has one identity per person: one `users` row, one unique email, one
normalized unique Philippine mobile number, one password, one email-verification
state, and one two-factor configuration. Buyer, Seller, Rider, Logistics, and
Admin are independently derived capabilities attached to that identity.

No capability-specific user table, duplicate login system, or stored
`is_buyer` / `is_seller` / `is_rider` / `is_logistics` flag is permitted.
`users.age` is not stored; it is computed from `birthdate`.

`users.status` is global identity moderation only:

- `active`: the identity may authenticate and use any approved capability.
- `suspended` or `restricted`: all capabilities are denied immediately.
- legacy non-active values remain denied but are not used for new capability
  decisions.

Pending or rejected capability applications never mutate global account status.

## Capability derivation

`App\Services\CapabilityResolver` is the backend authority. It derives each
result from bounded relationship queries on every request; clients use the
summary for presentation but never authorize themselves.

| Capability | Authoritative condition |
|---|---|
| Buyer | globally eligible, verified, non-admin identity plus approved `marketplace_profiles` row |
| Seller | Buyer plus approved seller profile |
| Rider | globally eligible identity plus active approved courier and active provider affiliation; approved legacy couriers without provider ownership remain compatible |
| Logistics | globally eligible identity plus active `logistics_staff` under an active provider |
| Admin | `users.role = admin` |

`users.role` remains authoritative for Admin only. `buyer` and `seller` values
are legacy compatibility data and do not prove Marketplace or Seller access.
Approving Seller, Rider, or Logistics never changes the role.

The `marketplace_profiles.status` values are `pending`, `approved`, and
`rejected`. Seller, courier, provider application, staff, and affiliation tables
own their corresponding lifecycle states.

## Legacy Marketplace backfill

Migration `2026_09_04_000002_add_shared_capability_onboarding` creates an
approved Marketplace profile only when historical evidence supports Buyer
access. It includes non-admin users created before the capability rollout or
users with seller, order, cart, or address evidence. It excludes Rider- or
Logistics-only identities unless they also have Marketplace evidence, and it
does not approve identities already represented by an unresolved legacy
Marketplace registration review. The migration is additive and reversible; it
does not delete or rewrite identity, order, seller, courier, or logistics data.

## Authentication and `/api/auth/me`

Sanctum bearer tokens prove shared identity only. Authentication succeeds for a
globally active, verified identity even when an individual capability is pending
or rejected. Operational middleware then enforces the requested capability.

`GET /api/auth/me` returns the canonical capability map plus compatibility
fields:

```json
{
  "user": {
    "id": 1,
    "role": "buyer",
    "status": "active",
    "marketplace_status": "approved",
    "registration_status": "approved",
    "capabilities": {
      "buyer": true,
      "seller": false,
      "rider": true,
      "logistics": false,
      "admin": false
    },
    "seller_approved": false,
    "courier_approved": true,
    "logistics_access": false,
    "logistics_staff_type": null
  }
}
```

`registration_status` now mirrors Marketplace review for older clients;
`marketplace_status` is explicit. Compatibility fields are derived, not stored
grants.

Marketplace login routing is intentionally limited:

| Identity | Destination |
|---|---|
| Admin | `/admin` |
| Buyer | safe Marketplace `returnTo`, otherwise `/` |
| Non-Buyer | `/marketplace-unavailable` |

Rider and Logistics capabilities never auto-redirect a Marketplace login into
their clients. The dedicated Logistics portal performs its own capability-aware
route decision after the same shared login and 2FA flow.

## Registration and applications

`/register` offers two web choices: Marketplace User and Logistics Provider.
Rider registration is app-only; `/register/rider` is not a web registration
route. `/courier/apply` is informational and directs users to the Rider app.
Seller is not a registration type and can only be requested by an approved
Buyer through Become a Seller.

### New Marketplace identity

1. `POST /api/auth/register` stores a short-lived pending identity and private ID.
2. Email verification creates an active verified `users` row, address,
   `user_documents` metadata, and a pending `marketplace_profiles` row.
3. A bearer token is issued because identity verification is complete.
4. Maketo Admin approves or rejects only the Marketplace profile and document.
5. Shopping and Seller application middleware remain denied until approval.

An existing verified identity can submit `POST /api/marketplace/applications`
without creating another account or re-verifying email.

### New or existing Logistics identity

`POST /api/auth/register/logistics` performs shared identity verification once,
then creates a pending `logistics_provider_applications` row and two private
documents (`applicant_id`, `business_permit`). An existing verified identity
uses `POST /api/logistics/applications` instead. Buyer approval is irrelevant.

Maketo Admin reviews the application. Approval transactionally creates an
active `logistics_providers` row and the applicant's first active
`provider_manager` staff row. Rejection leaves the global identity usable and
does not create provider access.

### New Rider identity

Rider onboarding is consumed by the separate Flutter app through
`POST /api/auth/register/rider`. The applicant selects an approved active
provider from `GET /api/logistics/providers`, verifies the shared identity once,
and submits three private documents. The resulting courier application belongs
to that provider. Buyer approval is neither required nor implied.

Provider-manager routes are tenant-scoped before pagination and serialization.
The manager reviews documents, selects a provider-owned active hub, and approves
or rejects the application. Approval creates or activates the courier profile
and its provider affiliation. Maketo Admin retains read-only oversight and does
not own Rider decisions.

## Authorization matrix

| Middleware | Proves |
|---|---|
| `account.active` | global identity status is active |
| `marketplace.shopper` | approved Buyer capability |
| `seller.approved` | Buyer prerequisite plus approved Seller profile |
| `courier.active` | active Rider capability |
| `logistics.staff.active` | active staff and provider capability |
| `role:admin` | platform administrator |

Capability failures use stable codes such as
`marketplace_application_pending`, `marketplace_application_rejected`,
`marketplace_access_required`, `rider_not_active`, and
`logistics_access_denied`. Global moderation uses `account_suspended` or
`account_restricted`. Invalid credentials remain distinct.

## Private-document handling

All identity, courier, and logistics documents are stored through
`MediaStorageService` on the configured private disk. Database rows keep object
metadata; API payloads hide disk and object paths. Reviewers receive short-lived
authorized URLs only after the applicable Admin or provider-tenant guard.

Pending identity document objects are promoted to their final document rows
after verification without copying the object. Failed uploads and expired
pending registrations receive best-effort cleanup. Review decisions update
document status without making an object public.

## Dedicated Logistics frontend

`logistics-frontend` is a standalone React/Vite client for
`https://logistics.marketohub.online`. It currently exposes only `/login`,
`/access-denied`, and `/dashboard`; it reuses `/api/auth/login`, the shared 2FA
challenge, `/api/auth/me`, `/api/auth/logout`, and `/api/logistics/context`.
The dashboard is deliberately a minimal authenticated context shell, not a full
operations portal.

## Compatibility boundaries

The existing order, shipment, provider, hub, dispatch, last-mile transition,
private POD, commission, and payout flows remain intact. Legacy active couriers
without provider-owned applications continue to work until a separately
reviewed affiliation migration is authorized.

This alignment does not add first-mile workflows, sorting workflows, waybills,
automated provider/rider recommendation, scoring, batch dispatch, GPS tracking,
or a full Logistics operations UI. No migration is executed by this change;
deployment must run the additive migrations through the normal authorized
workflow.
