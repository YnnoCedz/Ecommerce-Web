# Marketo Messaging, Returns, and Simulated Payments

Date: 2026-08-22

## Architecture Decisions

- Order images are copied to immutable `orders/{order}/items` objects when the source is managed by Marketo storage. External legacy URLs are frozen as the historical reference but cannot be copied without importing the remote asset.
- Cancellation is scoped to `seller_orders`. Buyers may cancel pending portions; sellers may cancel pending or confirmed portions. Inventory restoration and cancellation records are idempotent.
- Returns are item and quantity scoped. Refund amounts use the historical `order_items.unit_price`, never a current product price or a frontend amount.
- GCash, Maya, and card payments use the `simulated` provider. COD begins `unpaid`. No real provider is contacted and no money moves.
- Card CVV, expiry, and full card number remain in the browser only. Laravel receives only the cardholder name, brand, and last four digits.
- Message and return evidence files are private R2 objects. Authorized API endpoints generate short-lived URLs.

## Status

| Domain | Status | Notes |
| --- | --- | --- |
| Historical order image | WORKING | Managed images are copied; historical payloads prefer the snapshot. |
| Seller review management | WORKING | Seller-scoped list, reply, edit, and remove. |
| Buyer/seller messaging | WORKING | Product/store/order entry points, contextual deduplication, persistence, attachments. |
| Unread state | WORKING | Participant unread counts and mark-read state persist. |
| Cancellation | WORKING | Buyer and seller actions use allowed states and seller-order ownership. |
| Inventory restoration | WORKING | Exact quantities restored once in a transaction. |
| Returns | WORKING | Item selection, reasons, private evidence, seller state transitions. |
| Disputes | PARTIAL | Escalation is persisted; admin resolution UI/API is deferred. |
| Dynamic simulated payment | WORKING | COD, GCash, Maya, and card; backend total and configured outcomes. |
| Payment history | WORKING | Attempts, references, status, timestamps, and refunds are retained. |
| Payment retry | WORKING | Failed/pending electronic attempts create a new record. |
| Simulated refund | WORKING | Refund transactions reference the original charge. |
| Partial refund | WORKING | Seller-order cancellation and item returns refund historical amounts. |

## Payment Failure Policy

A failed or pending sandbox payment keeps the order and reserved inventory so the buyer can retry the same backend-authoritative order. Previous attempts are never overwritten. A successful retry updates the order payment status. Cancellation restores inventory and creates an eligible simulated refund.

## Remaining Work

- Add admin dispute review and resolution screens when the admin moderation phase begins.
- Import legacy remote product images into managed storage if immutable copies are required for already-external URLs.
- Replace `SimulatedPaymentProvider` with provider implementations and webhooks only when real payment credentials and production reconciliation rules are approved.
