# Marketo Order Lifecycle Audit

Date: 2026-08-22

## Scope

This audit covers the implemented marketplace transaction from a persisted cart through checkout, multi-seller fulfillment, buyer completion, and verified product reviews. The repository and migrations describe the current implementation; `MAKETO-SYSTEM-SPEC.md` and the phase brief describe intended behavior.

## Lifecycle Classification

| Stage | Before this phase | Current classification | Evidence |
| --- | --- | --- | --- |
| Cart | LIVE | WORKING | Authenticated cart items are persisted and ownership-scoped. |
| Checkout | PARTIAL | WORKING | Laravel validates address, COD, products, sellers, variants, stock, and selected cart items. |
| Order creation | LIVE | WORKING | Checkout creates one parent order in a database transaction. |
| Multi-seller split | LIVE | WORKING | Cart lines are grouped into `seller_orders`; `order_items` link to the correct portion. |
| Order snapshots | PARTIAL | PARTIAL | Product name, slug, variant, SKU, price, quantity, seller ID, and shipping address are copied. Product image is still read from the product relation. |
| Inventory update | LIVE | WORKING | Product/variant rows are locked and stock is deducted only inside the transaction. |
| Cart cleanup | LIVE | WORKING | Only purchased items are removed; remaining items are recalculated. |
| Payment handling | LIVE | WORKING | COD is the only accepted method; payment becomes paid after all portions are delivered. |
| Buyer orders | LIVE | WORKING | History and detail APIs are buyer-owned and database-driven. |
| Seller orders | LIVE | WORKING | Approved sellers see only their `seller_orders`. |
| Fulfillment | SCAFFOLDED | WORKING | Backend state machine and seller actions persist confirmation, preparation, packing, shipment, and delivery. |
| Delivery | PARTIAL | WORKING | Shipment and append-only tracking events distinguish in-transit from delivered. No carrier API is used. |
| Order Received | NOT IMPLEMENTED | WORKING | Only the owning buyer can complete a delivered seller portion. |
| Completion | NOT IMPLEMENTED | WORKING | `completed_at` is persisted per seller portion and on the parent when every portion completes. |
| Review modal | NOT IMPLEMENTED | WORKING | It opens only after completion succeeds and uses real unreviewed order items. |
| Review submission | PARTIAL | WORKING | One integer 1-5 rating and optional comment are persisted per order item. |
| Verified Purchase | PARTIAL | WORKING | Computed from buyer ownership, order item linkage, and completed seller portion. |
| Duplicate prevention | PARTIAL | WORKING | Laravel checks eligibility and the database has a unique `reviews.order_item_id` index. |
| Product rating refresh | LIVE | WORKING | Approved reviews appear in the public review API and its aggregate. |
| Seller replies | PARTIAL | PARTIAL | Authorized seller-owned reply API is live; a dedicated seller review-management UI is not present. |
| Cancellation/refunds | SCAFFOLDED | NOT IMPLEMENTED | Status labels exist, but no approved transition/restock rules exist. No unsafe frontend action is exposed. |

## Implemented Flow

1. Buyer selects persisted cart items, an owned saved address, and COD.
2. `CheckoutService` locks the address, cart, cart items, products, and variants.
3. Laravel rechecks availability and computes current prices, shipping, discounts, and totals.
4. One `orders` record is created with shipping and monetary snapshots.
5. One `seller_orders` record is created per seller and linked `order_items` preserve product transaction data.
6. Inventory is deducted and purchased cart items are removed in the same transaction.
7. Seller advances only through `pending -> confirmed -> preparing -> ready -> in-transit -> delivered`.
8. Shipment records and tracking events are persisted when the portion enters transit and is delivered.
9. Buyer can mark only an owned, delivered seller portion as received.
10. That portion becomes completed and its unreviewed items become review-eligible.
11. Review submission accepts one 1-5 rating per order item plus an optional comment.
12. The database unique constraint and backend ownership rules prevent duplicate or forged reviews.

## Backend Authority

- Client prices, totals, seller IDs, buyer IDs, verified-purchase flags, and order statuses are ignored.
- Seller transitions are sequential and enforced by `OrderLifecycleService`.
- Seller routes retain `auth:sanctum`, active-account, seller-role, and approved-seller middleware.
- Buyer routes retain `auth:sanctum` and active-account middleware, with query-level ownership checks.
- A seller cannot access another seller's order or reply to another seller's review.
- A buyer cannot access or complete another buyer's order.

## Multi-Seller Decision

Seller portions complete independently. A completed Seller A portion becomes reviewable even while Seller B remains pending. The parent order becomes completed only when every seller portion is completed. This follows the existing `orders -> seller_orders -> order_items` architecture and avoids blocking one seller's products on an unrelated seller.

## Status Rules

| Actor | Current status | Allowed next status |
| --- | --- | --- |
| Seller | `pending` or legacy `new` | `confirmed` |
| Seller | `confirmed` | `preparing` |
| Seller | `preparing` | `ready` |
| Seller | `ready` | `in-transit` |
| Seller | `in-transit` | `delivered` |
| Buyer | `delivered` | `completed` |

Arbitrary jumps and repeated completion return validation errors. Cancellation and refund transitions are intentionally not exposed until inventory restoration, actor permissions, reason capture, and financial rules are specified together.

## Notifications

- Buyer receives a persisted notification for each real seller status transition.
- Seller receives a persisted notification when the buyer confirms receipt.
- Seller receives a persisted notification for a new product review.
- Buyer receives a persisted notification when the seller replies to a review.
- Notifications are emitted only after the associated backend mutation succeeds.

## Test Coverage

- Real single and multi-seller checkout.
- Variant authoritative pricing and stock deduction.
- Foreign address, unsupported payment, insufficient stock, and inactive seller rejection.
- Full rollback with no partial order, stock change, or cart cleanup on failure.
- Sequential seller transitions and invalid transition rejection.
- Seller ownership and buyer ownership enforcement.
- Shipment/tracking persistence and COD payment synchronization.
- Delivered-but-not-completed review denial.
- Independent multi-seller completion/review eligibility.
- Rating bounds, optional comment, duplicate prevention, and verified purchase.
- Seller reply ownership and public product review refresh.

## Remaining Intentional Work

- Product image snapshot column for immutable historical thumbnails.
- Explicit region/barangay snapshot columns if the address model is expanded beyond `line2`, city, and province.
- Buyer/seller cancellation, inventory restoration, refund, and dispute rules.
- Dedicated seller review-management UI for the live reply endpoint.
- Review images and per-user helpful voting.
- Carrier API integration and exact delivery estimates.
- Advanced GCash, Maya, card, or bank-transfer payment gateways.
- Seller response-time metrics.
