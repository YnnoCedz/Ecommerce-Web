# Schema Review

## Frontend Coverage

The schema covers the features visible in the frontend:

- Public catalog browsing
- Product detail pages
- Seller storefronts
- Seller onboarding
- Cart
- Checkout
- Order history and seller fulfillment
- Messaging
- Reviews
- Reports
- Notifications
- Addresses
- Wishlists
- Promotions

## Validation Notes

- Multi-seller checkout is represented by `orders` plus `seller_orders`.
- Product historical data is preserved through `order_items` snapshots.
- Messaging can represent buyer-seller, buyer-courier, and seller-courier threads.
- Seller onboarding supports multi-category selection and document uploads.
- Category management supports a parent-child hierarchy.
- Admin moderation has the required entities for users, sellers, products, categories, and reports.

## Deliberate Omissions

- No GPS tracking tables.
- No coupons table beyond seller-owned promotions.
- No auctions, loyalty, subscriptions, warehouse, or delivery geolocation tables.

## Remaining Backend Work

- Wire Laravel controllers, policies, requests, and API resources later.
- Connect the frontend to API endpoints after the schema is finalized.

