# Marketo MySQL Schema

This schema is derived from the current frontend and intentionally avoids generic ecommerce tables that the UI does not require.

## Core Design

- MySQL 8+
- InnoDB
- utf8mb4
- big integer primary keys
- soft deletes only where the frontend suggests long-lived user content

## Table Summary

### Identity and taxonomy

- `users`
- `categories`

### Seller domain

- `sellers`
- `seller_categories`
- `seller_documents`
- `seller_followers`
- `couriers`

### Catalog

- `products`
- `product_images`
- `product_variants`
- `variant_options`

### Commerce

- `carts`
- `cart_items`
- `addresses`
- `wishlist_items`
- `orders`
- `seller_orders`
- `order_items`
- `payments`
- `promotions`
- `shipments`
- `tracking_events`

### Messaging and moderation

- `conversations`
- `conversation_participants`
- `messages`
- `message_attachments`
- `reviews`
- `review_replies`
- `reports`
- `report_attachments`
- `notifications`

## Important Business Rules

- Users have a single visible role in the frontend.
- Sellers can belong to multiple categories.
- Categories are hierarchical.
- Products belong to one primary category.
- Cart items can be saved for later without leaving the cart domain.
- One order can contain items from multiple sellers.
- Historical order rows snapshot product and pricing data.
- Review edits return the review to moderation.
- Report targets are polymorphic because the frontend allows multiple target types.
- Courier tracking is shipment-based, not GPS-based.

## Constraint Highlights

- `users.email` unique
- `categories.slug` unique
- `sellers.slug` unique
- `products.slug` unique
- `products.sku` unique
- `product_variants.sku` unique
- `seller_categories` unique on `(seller_id, category_id)`
- `cart_items` unique on `(cart_id, product_variant_id, saved_for_later)`
- `wishlist_items` unique on `(user_id, product_id)`
- `order_items` unique on `(order_id, product_variant_id, seller_order_id)`
- `seller_followers` unique on `(seller_id, user_id)`

## Delete Behavior

- Historical commerce records use `restrict` or `set null` where appropriate.
- Catalog deletions should not wipe order history.
- Reviews, reports, and notifications are preserved unless intentionally removed by moderation.

