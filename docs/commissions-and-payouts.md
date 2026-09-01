# Commissions and payouts

## Financial definitions

All authoritative calculations use integer cent arithmetic and are persisted as `DECIMAL`, never binary floating point.

- **Marketplace gross base:** seller-order product subtotal minus seller-order discount. Shipping is excluded.
- **Marketplace commission:** the effective marketplace percentage/fixed rate applied when the buyer completes the seller order.
- **Seller net:** gross base minus marketplace commission. Refunds are separate negative adjustment entries so the original sale remains auditable.
- **Buyer delivery fee:** the seller order's shipping fee.
- **Courier share:** the effective courier percentage of the delivery fee, snapshotted when an assigned shipment is delivered.
- **Platform delivery commission:** delivery fee minus courier share. This is the commission amount in the courier ledger entry.
- **Courier net:** courier share.

The initial migration establishes a 5% marketplace commission and an 80% courier share, effective from 2000-01-01 so pre-migration completed orders can be reconciled. These are explicit bootstrap assumptions and should be reviewed by the business before production migration. The previous seller UI statement about a 30-day 0% promotion is not an accounting rule and is not applied by this subsystem.

## Rate versioning

`commission_rates` is effective-dated. A new rate is inserted; existing versions and commission entries are never overwritten. Rate changes require the administrator's current password and, when enabled, a single-use MFA challenge. `commission_entries` stores the rate ID plus copied calculation type, percentage, fixed amount, gross, commission, and net amounts.

Zero commission is explicit: its entry has `status=waived`, `commission_taken=false`, and a waiver reason. A zero value is never interpreted as missing data.

## Ledger and refunds

Marketplace entries are created idempotently on buyer completion. Courier entries are created idempotently on delivery only when the shipment has a real `courier_id`. Each source has a unique key.

A successful refund produces a separate reversal entry linked to the original marketplace commission. The reversal restores the proportional commission and records a negative seller adjustment. The original entry remains unchanged, preserving history whether it was pending or already taken.

## Payout generation and lifecycle

Administrators generate a payout for one seller or courier and an inclusive date period. Seller eligibility requires a completed seller order and a paid/refunded payment state. Courier eligibility requires an assigned, delivered shipment. `payout_items.source_key` is unique, preventing a source from appearing in two payouts. Generation and every status change run inside retryable database transactions with row locks.

Lifecycle:

`draft -> pending -> approved -> processing -> paid`

Alternative controlled states are `withheld`, `failed`, and `cancelled`. Failed payouts retry by moving the same record back to processing. A payment reference is mandatory for `paid`. Paid payouts are immutable. When paid, linked pending commissions become `taken` and record actor, timestamp, and payment reference.

## Access and UI

- Admin API/UI: payout overview, seller payouts, courier payouts, commission ledger, generation, transitions, filters, pagination, detail, and A4 PDF statement.
- Seller API/UI: the authenticated approved seller can only view its own payout history and items.
- Courier self-service is intentionally not exposed. The current data model has couriers and shipments but no courier-to-user authentication mapping. Courier earnings and payouts remain admin-managed until a real courier identity architecture is introduced.

## API endpoints

Administrator routes require an active Sanctum-authenticated admin:

- `GET /api/admin/payouts`, `GET /api/admin/payouts/{payout}`
- `POST /api/admin/payouts/generate`
- `POST /api/admin/payouts/{payout}/transition`
- `GET /api/admin/payouts/{payout}/pdf`
- `GET /api/admin/commissions`, `GET /api/admin/commissions/export`
- `GET /api/admin/commission-rates`
- `POST /api/admin/commission-rates/challenge`, `POST /api/admin/commission-rates`

Approved seller routes are `GET /api/seller/payouts` and `GET /api/seller/payouts/{payout}`. Ownership is always resolved from the authenticated user's seller relation; the client cannot submit a seller ID to broaden access.

## Audit events

The financial activity log records `commission.calculated`, `commission.waived`, `commission.reversed`, `commission.taken`, `commission.rate.changed`, `payout.generated`, and each payout transition such as `payout.approved`, `payout.processing`, `payout.paid`, `payout.failed`, and `payout.cancelled`. Metadata contains safe references and amounts, never passwords, MFA codes, tokens, or bank credentials.

## Operational checks

Before production release:

1. Back up the database and run the additive migration.
2. Confirm the bootstrap rates with finance and create future effective versions if needed.
3. Reconcile a sample completed order, refund, courier delivery, and payout statement against manual cent calculations.
4. Restrict payout transition permissions to active administrators and keep activity logs under the existing retention policy.
5. Never delete paid payouts or ledger entries. Correct mistakes with explicit reversing/adjustment records.
