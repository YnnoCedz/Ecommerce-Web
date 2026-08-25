# Admin Backend Integration Audit

Date: 2026-08-25

## Overall Status

PARTIAL: every database-backed admin page uses live Laravel data. Platform settings remain intentionally read-only because the current schema has no global settings table.

## Admin Page Matrix

| Page | Frontend route | Data source | Final status | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | `/admin` | `GET /api/admin/dashboard` | REAL | Database counts, time series, and recent records |
| Users | `/admin/users` | `GET /api/admin/users`, `PATCH /api/admin/users/{user}/status` | REAL | Search, filters, totals, status actions |
| Sellers | `/admin/sellers` | `GET /api/admin/sellers`, `PATCH /api/admin/sellers/{seller}/status` | REAL | Seller aggregates and status actions |
| Seller applications | `/admin/sellers` | `/api/admin/seller-applications/*` | REAL | Approval, rejection, detail, private documents |
| Products | `/admin/products` | `GET /api/admin/products`, `PATCH /api/admin/products/{product}/status` | REAL | Search, filter, sales, stock, moderation status |
| Orders | `/admin/orders` | `GET /api/admin/orders` | REAL | Buyer, fulfillments, items, payments, delivery |
| Categories | `/admin/categories` | `/api/admin/categories*` | REAL | Hierarchy, counts, create and edit |
| Reports | `/admin/reports` | `/api/admin/reports*` | REAL | Persistence, detail, moderation, private attachments |
| Disputes | `/admin/disputes` | `/api/admin/disputes*` | REAL | Detail, evidence, resolution, simulated refunds |
| Analytics | `/admin/analytics` | `GET /api/admin/analytics` | REAL | Database time series and aggregates only |
| Notifications | `/admin/notifications` | `/api/notifications*` | REAL | Role-specific persisted feed |
| Settings | `/admin/settings` | None | MISSING BACKEND | Read-only disclosure replaces false local saves |

## Authorization

All `/api/admin/*` routes use `auth:sanctum`, `account.active`, and `role:admin`. Feature tests verify guest `401`, non-admin `403`, and admin success behavior.

## Database Tables

- Dashboard and analytics: `users`, `sellers`, `seller_applications`, `products`, `orders`, `seller_orders`, `order_items`, `reports`, `disputes`, `reviews`
- User management: `users`, `orders`, `personal_access_tokens`, `notifications`
- Seller management: `sellers`, `users`, `seller_categories`, `categories`, `products`, `seller_orders`, `reviews`, `notifications`
- Products: `products`, `product_images`, `categories`, `sellers`, `order_items`, `notifications`
- Orders: `orders`, `seller_orders`, `order_items`, `payments`, `shipments`, `users`, `sellers`
- Categories: `categories`, `products`
- Reports and disputes: `reports`, `report_attachments`, `disputes`, `return_requests`, `return_request_items`, `return_evidence`, `payments`, `notifications`

## Unsupported Settings

The schema has no reviewed global platform-settings entity. Commission, marketplace rules, moderation thresholds, integration toggles, and platform identity are therefore not editable in the admin UI. Adding persistence requires a separate specification and migration review.
