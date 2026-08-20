# Buyer Commerce Integration Audit

Date: 2026-08-20

## Scope

This audit covers the routed catalog product page, catalog product cards, wishlist, cart, checkout, buyer addresses, and order creation.

## Current Status

| Flow | Status | Backend authority |
| --- | --- | --- |
| Add to cart | LIVE | Laravel validates product, seller, variant, quantity, and available stock before persisting `cart_items`. |
| Update/remove cart item | LIVE | Mutations are limited to the authenticated user's active cart. |
| Add wishlist | LIVE | Laravel derives `user_id` from the session and uses the existing unique `(user_id, product_id)` constraint. |
| Remove wishlist | LIVE | Deletion is scoped to the authenticated user and product. |
| Wishlist state after refresh | LIVE | Product and catalog-card hearts read persisted wishlist state. |
| Wishlist move to cart | LIVE | The cart write completes before the wishlist row is removed. |
| Buyer address list/create | LIVE | Records are read and created through authenticated Laravel endpoints. |
| Buyer address edit/delete/default | LIVE | Ownership is enforced by user-scoped queries; default changes are transactional. |
| Checkout address selection | LIVE | Checkout submits an owned `address_id`; Laravel rejects foreign/deleted addresses. |
| Add address during checkout | LIVE | The checkout form creates a real address and selects the returned record. |
| Buy Now | LIVE | The selected product is persisted to cart and checkout receives that cart-item ID. Other cart items remain untouched. |
| Checkout/order creation | LIVE | Laravel re-queries price and stock, creates `orders`, `seller_orders`, `order_items`, and `payments` atomically, then deducts stock. |
| Checkout confirmation | LIVE | Confirmation renders only from a successful order response and includes the persisted order number. |

## Decisions

- Checkout is rendered inside `PublicLayout`, reusing the normal header, navigation, and footer.
- Cash on Delivery is the only new-checkout payment method because no card or e-wallet processor exists in the repository.
- Bank Transfer is no longer offered or accepted for new checkout requests. Historical string values remain readable.
- Order shipping fields are snapshots copied from the selected address, so later address edits do not alter order history.
- Multi-seller checkout uses the existing `orders -> seller_orders -> order_items` architecture.

## Remaining Boundary

- The account address selector still uses the project's existing limited Philippine location list. The backend validates required components, a Philippine mobile number, and a four-digit postal code, but a complete PSGC dataset has not been introduced or invented in this phase.
- Online payment gateway processing is not implemented. COD payment records remain `pending` until the later fulfillment/payment workflow updates them.
