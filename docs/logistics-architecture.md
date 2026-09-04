# Marketo Revised Logistics Phase 2 Architecture

## Implemented boundary

Marketo keeps one user identity and one Laravel/Sanctum authentication system. Third-party logistics access is an additive capability represented by a unique `logistics_staff.user_id` record. It is never derived from `users.role`, and an administrator receives no implicit logistics-portal access.

The V1 responsibility boundary is:

1. A seller makes a seller order ready and the existing shipment is created.
2. Marketo Admin explicitly assigns that ready shipment to one approved active logistics provider.
3. Active staff of that provider can see the shipment.
4. Authorized provider staff explicitly check the shipment into an active provider-owned hub.
5. Provider staff choose an eligible same-hub affiliated courier.
6. `CourierAssignmentService` remains the only courier-assignment writer.
7. The existing courier lifecycle and mandatory proof-of-delivery path continue unchanged.

## Ownership and custody

- `shipments.logistics_provider_id` is the organization responsible for logistics. It remains set after rider pickup and delivery.
- `shipments.current_hub_id` means current physical hub custody only. It is cleared when the assigned courier performs `ready -> picked-up`.
- `shipments.courier_id` remains the authoritative current rider assignment.
- `shipments.hub_received_at` records the first explicit hub receipt and is not rewritten by an idempotent same-hub check-in.
- Tracking and activity records preserve the releasing hub after `current_hub_id` is cleared.

These fields are orthogonal; none is inferred from another.

## Provider and staff capability

`logistics_providers` uses the centralized states `pending`, `active`, `suspended`, and `inactive`. An operational provider must be `active` and have `approved_at` set. Provider codes are stable and globally unique. Global uniqueness avoids ambiguous operational codes in logs, support tools, and cross-provider administration.

`logistics_staff` belongs to one Marketo user and one provider. V1 permits one staff capability per user:

- `provider_manager`: provider-wide access to all of its hubs; no primary hub required.
- `hub_manager`: one required active primary hub.
- `dispatcher`: one required active primary hub.

The `auth:sanctum`, `account.active`, and `logistics.staff.active` middleware chain checks authentication, active Marketo account, approved active staff capability, and approved active provider. Provider and hub context always comes from the authenticated staff record, never a client-supplied provider ID.

## Hubs and service areas

Every `logistics_hubs` row has a required provider. Hub geography is normalized through the existing PSGC integration when a hub is created or its geography changes. A hub is deactivated with `active=false`; historical records use restrictive foreign keys rather than cascade deletion.

`hub_service_areas` stores municipality/city PSGC codes plus display-label snapshots. `(hub_id, municipality_code)` is unique. Provider coverage is derived through provider-owned hubs; there is no duplicate `provider_service_areas` table and no external PSGC call on normal dispatch reads.

## Courier affiliation and dispatch policy

`courier_logistics_affiliations` preserves provider and primary-hub history. Affiliation is performed transactionally while locking the courier row; this serializes competing affiliation attempts and permits only one row with active status and no end time. The courier must already be an approved active Marketo courier with an active user account, and the selected active hub must belong to the active provider.

Couriers cannot self-affiliate. A provider manager may affiliate a courier only with their own provider and hub. Ending an affiliation updates the existing row instead of deleting it and is blocked while the courier has an active delivery.

`LogisticsDispatchPolicyService` authorizes logistics dispatch before delegating to `CourierAssignmentService`. Phase 2 permits only same-provider, same-primary-hub assignments. Cross-provider assignment is forbidden. Same-provider cross-hub override is deliberately deferred; there is no recommendation or scoring logic.

## Historical address snapshots

At checkout, each `seller_orders` row captures the seller/store pickup name, contact details, address text, and PSGC code/label values. The parent `orders` row keeps its existing delivery text snapshot and now also captures buyer region, province, city/municipality, and barangay PSGC values. Later seller or buyer profile edits do not synchronize into these order records.

Legacy rows remain nullable and are not backfilled with guessed geography. Courier resources use immutable seller-order pickup data when available, retain their documented legacy seller fallback, switch to the current hub while it has custody, and use recorded pickup/check-in tracking evidence after hub release.

## Data safety and indexes

The Phase 2 migration is additive and every new base table has a primary key. Foreign keys use restrictive or null-on-actor-delete behavior to protect historical logistics data. Queue, provider/status, hub/status, affiliation, municipality, current-area, and destination-city indexes match the implemented tenant-scoped list and dispatch reads.

Existing couriers and shipments receive nullable logistics fields only. No provider, hub, affiliation, or current area is guessed or backfilled.

## Explicitly deferred

Not implemented in this phase: rider recommendations or scores, automatic assignment, provider acceptance states, provider/hub transfers, multi-hub staff access, batch dispatch, GPS/location history, maps or route optimization, provider billing/settlement, public provider registration, logistics React frontend, Flutter current-area UI, production CORS changes, or deployment.

