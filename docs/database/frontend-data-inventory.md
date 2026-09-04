# Marketo Frontend Data Inventory

Source of truth: the React frontend under `frontend/src`.

## Scope

The frontend currently behaves like a marketplace with:

- Buyer storefront browsing
- Seller onboarding and seller center
- Admin moderation and analytics
- Cart and checkout
- Orders and seller fulfillment
- Messaging
- Reviews
- Reports
- Notifications
- Addresses
- Wishlists
- Promotions

## Persistent Entities

| Feature | Entity | Required Fields | Relationships |
| --- | --- | --- | --- |
| Login / account | `users` | name, email, mobile, password hash, role, status, verification flags | 1 user has many addresses, carts, orders, messages, reviews, notifications |
| Category browsing | `categories` | name, slug, icon, active, sort order, parent category | self-referential parent-child tree; products belong to one category |
| Seller onboarding | `sellers` | user, business name, trade name, slug, TIN, registration no., established date, address, contacts, status | 1 seller has many categories, documents, products, promotions, orders |
| Seller categories | `seller_categories` | seller, category, approval status | many-to-many between sellers and categories |
| Seller verification files | `seller_documents` | seller, type, file path, file name, mime type, size, status | documents belong to one seller |
| Seller storefront | `sellers` | banner, description, tagline, verified flag, response rate/time, follower count | one seller owns one storefront profile |
| Seller followers | `seller_followers` | seller, user | many buyers can follow many sellers |
| Product management | `products` | seller, category, name, slug, description, SKU, barcode, price, sale price, stock, status, shipping and sizing fields | one seller has many products; one category has many products |
| Product media | `product_images` | product, URL/path, sort order, primary flag | one product has many images |
| Product variants | `product_variants` | product, name, SKU, price override, sale price override, stock, low stock threshold, active flag | one product has many variants |
| Variant options | `variant_options` | variant, option value, sort order | one variant has many option values |
| Cart | `carts` | user, status, promo code, totals snapshot | one buyer can have carts; cart has many cart items |
| Cart items | `cart_items` | cart, product, variant, seller, quantity, unit price, saved-for-later flag | each item belongs to one cart and one product/variant |
| Address book | `addresses` | user, label, recipient name, phone, lines, city, province, postal, default flag | one user has many addresses |
| Wishlist | `wishlist_items` | user, product, date added | one user has many wishlisted products |
| Checkout / order header | `orders` | buyer, order number, totals, address snapshot, payment status, fulfillment summary | one order has many seller orders and order items |
| Seller-specific fulfillment | `seller_orders` | order, seller, subtotal, shipping fee, total, fulfillment status | one order can produce many seller orders |
| Order items | `order_items` | order, seller order, product snapshot, variant snapshot, SKU, unit price, qty, subtotal | line items preserve historical values |
| Payments | `payments` | order, method, status, amount, provider reference, card mask, paid at | one order can have one or more payment records |
| Shipments | `shipments` | seller order, courier, tracking number, status, pickup/delivery timestamps | one seller order usually has one shipment |
| Tracking events | `tracking_events` | shipment, status, location, note, occurred at | append-only event history |
| Couriers | `couriers` | name, slug, contact info, active flag | shipments can reference couriers; courier users are optional |
| Messaging | `conversations` | conversation type, subject, order reference, unread counts, mute/archive flags | one conversation has many participants and messages |
| Conversation participants | `conversation_participants` | conversation, participant type/id, unread count, last read at, mute/archive flags | supports buyer, seller, courier, support |
| Messages | `messages` | conversation, sender type/id, body, status, system flag, order reference | one conversation has many messages |
| Message attachments | `message_attachments` | message, file path, file name, mime type, size | one message can have many attachments |
| Reviews | `reviews` | reviewer, product, order item, rating, title, body, status, counts | one verified purchase review per order item |
| Seller replies | `review_replies` | review, seller, body | optional one-to-one reply |
| Reports | `reports` | reporter, target type/id, reason, details, status | polymorphic moderation queue |
| Report attachments | `report_attachments` | report, file path, file name, mime type, size | one report can have many attachments |
| Notifications | `notifications` | user, category, title, body, action metadata, unread flag | one user has many notifications |
| Promotions | `promotions` | seller, code, discount type/value, usage limits, date range, status, scope fields | seller-owned promo codes and campaigns |

## Notes From Frontend Inspection

- The cart is explicitly multi-seller.
- Checkout groups items by seller and chooses delivery per seller.
- Order history and seller orders preserve historical transaction values.
- Product pages and seller center both require categories, products, and variants.
- Messaging supports buyer-seller, buyer-courier, and seller-courier conversations.
- Reviews are tied to verified purchases and can be edited into a moderation queue.
- Seller onboarding requires multiple uploaded documents and multiple category selection.
- No GPS tracking is implied by the frontend.

