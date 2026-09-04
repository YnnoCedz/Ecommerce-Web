# Marketo Logistics API Contract

All routes are under `/api` and return JSON. Logistics routes require a Sanctum bearer token plus `account.active` and `logistics.staff.active`. Admin routes retain the existing authenticated active-account `role:admin` guard.

## Shared identity and provider registration

Logistics is independent of Marketplace Buyer capability. A new provider applicant uses `POST /auth/register/logistics`, verifies the same shared Marketo identity once, and receives an identity bearer token while the provider application remains pending. An existing verified identity uses `POST /logistics/applications`. Both paths require private applicant-ID and Business/DTI-permit uploads.

`GET /logistics/application` returns the current identity's latest application without private storage paths. Marketo Admin reviews applications through:

- `GET /admin/logistics-applications`
- `GET /admin/logistics-applications/{application}`
- `GET /admin/logistics-documents/{document}/view`
- `POST /admin/logistics-applications/{application}/approve`
- `POST /admin/logistics-applications/{application}/reject`

Approval transactionally creates an active provider and the applicant's first active `provider_manager` staff record. It does not create Buyer access or change `users.role`.

## Authentication and context

`GET /auth/me` adds only:

- `user.logistics_access`: whether the user currently has an approved active logistics staff capability under an approved active provider.
- `user.logistics_staff_type`: `provider_manager`, `hub_manager`, `dispatcher`, or `null`.

It does not return provider internals, hubs, or the staff record.

`GET /logistics/context` returns the authenticated staff type/status, a lightweight provider summary, and authorized active hub summaries. Provider managers receive all active hubs of their provider; hub managers and dispatchers receive only their primary hub. The endpoint never accepts a provider ID.

## Provider-scoped operations

Rider applications belong to the provider selected by the applicant. Provider managers—not Marketo Admin—own the decision and must select an active hub from their own tenant when approving:

- `GET /logistics/rider-applications`
- `GET /logistics/rider-applications/{application}`
- `GET /logistics/rider-documents/{document}/view`
- `POST /logistics/rider-applications/{application}/approve`
- `POST /logistics/rider-applications/{application}/reject`

Foreign-provider applications, documents, and hubs are constrained before serialization and return not found. Approval activates the courier profile and same-provider affiliation without changing the identity role or Marketplace status.

- `GET /logistics/hubs` — authorized provider/hub list with normalized address and service-area summaries.
- `POST /logistics/hubs` — provider-manager-only hub creation; provider is derived from staff context.
- `PATCH /logistics/hubs/{hub}` — provider-manager-only own-provider update/deactivation.
- `PUT /logistics/hubs/{hub}/service-areas` — provider-manager-only replacement using validated municipality PSGC codes.
- `GET /logistics/shipments` — paginated, provider-scoped shipment queue; supports `status`, `search`, and `per_page` up to 50.
- `GET /logistics/shipments/{shipment}` — provider and hub-scoped operational detail. Proof is represented only by safe existence metadata; no permanent private-file URL is exposed.
- `POST /logistics/shipments/{shipment}/check-in` — check a provider-owned ready shipment into an authorized active hub using `{ "hub_id": number }`.
- `GET /logistics/riders` — paginated active affiliations, provider-scoped and primary-hub-scoped for non-managers.
- `POST /logistics/riders/{courier}/affiliate` — provider-manager-only; input is `{ "primary_hub_id": number }`, with provider derived from staff.
- `POST /logistics/affiliations/{affiliation}/end` — provider-manager-only historical end using `{ "reason": string }`; blocked while active deliveries exist.
- `PATCH /logistics/shipments/{shipment}/courier` — same-provider, same-hub dispatch using `{ "courier_id": number }`; final write is delegated to `CourierAssignmentService`.

Tenant ownership is applied in the database query or checked before payload construction. A foreign-provider resource is returned as not found where appropriate to avoid tenant disclosure.

## Marketo Admin operations

- `GET /admin/logistics/providers` — paginated provider list; supports `status`, `search`, and `per_page` up to 50.
- `POST /admin/logistics/providers` — create a provider. `code` and `company_name` are required; omitted status defaults to `pending`.
- `GET /admin/logistics/providers/{provider}` — provider with hubs, service areas, staff summaries, and shipment count.
- `PATCH /admin/logistics/providers/{provider}` — update details or transition among `pending`, `active`, `suspended`, and `inactive`.
- `POST /admin/logistics/providers/{provider}/staff` — associate an eligible existing Marketo user with this provider and staff type.
- `PATCH /admin/logistics/staff/{staff}` — update staff status/type/primary hub with provider ownership checks.
- `PATCH /admin/logistics/shipments/{shipment}/provider` — explicitly assign an existing ready non-terminal shipment to an approved active provider using `{ "logistics_provider_id": number, "reason"?: string }`.

Provider assignment is idempotent for the same provider. Assigning another provider returns a conflict; no provider-transfer workflow exists.

## Check-in and dispatch invariants

Check-in locks and revalidates the shipment and hub, writes `current_hub_id` and `hub_received_at`, preserves `status=ready` and the existing courier, and appends tracking/audit evidence. Repeating the same check-in returns canonical state without duplicating the event or timestamp. Direct check-in to another hub is rejected.

Dispatch requires active staff/provider, matching shipment provider, an authorized current hub, an approved active courier account/capability, an active same-provider affiliation, and a primary hub equal to the shipment hub. Cross-provider dispatch is always forbidden. Cross-hub dispatch is not enabled in Phase 2.

When the assigned courier performs `ready -> picked-up`, hub custody is cleared while provider ownership and `hub_received_at` remain. The existing delivery state machine and mandatory proof-of-delivery endpoint are unchanged.

## Stable errors

Common application error codes include:

- `logistics_access_denied` (`403`) — staff capability or provider is not operational.
- `shipment_provider_conflict` (`409`) — shipment already belongs to another provider.
- `shipment_already_at_different_hub` (`409`) — direct hub transfer is not supported.
- `cross_provider_assignment_forbidden` (`403`) — selected rider is not actively affiliated with the shipment provider.
- Foreign-provider or unauthorized tenant resources generally return `404`.
- Rule validation failures return `422` with field errors.

## Dedicated frontend and exclusions

The standalone `logistics-frontend` client uses the shared login, shared 2FA, `/auth/me`, and `/logistics/context`. Its only routes are `/login`, `/access-denied`, and a minimal `/dashboard` context shell. It intentionally does not expose the operational endpoints above yet.

Recommendation endpoints, rider scores/ranking, automatic provider or courier selection, cross-hub override, transfers, batch dispatch, maps/GPS, provider billing, first-mile, sorting, waybills, a full Logistics operations portal, and Flutter current-area controls are **not implemented**.

The application CORS configuration accepts `LOGISTICS_FRONTEND_URL`; its non-production default list includes `https://logistics.marketohub.online` and local port 8450. No production environment value is changed by this work.
