# Maketo Integration Audit

Date: 2026-08-17

## Scope

Reviewed the current frontend, Laravel backend, migrations, seeders, environment files, and the project specifications in:

- [MAKETO-SYSTEM-SPEC.md](../MAKETO-SYSTEM-SPEC.md)
- [docs/database/schema.md](database/schema.md)
- [docs/database/schema-review.md](database/schema-review.md)
- [docs/database/frontend-data-inventory.md](database/frontend-data-inventory.md)
- [INTEGRATION-PLAN.md](../INTEGRATION-PLAN.md)

## Phase 0 Summary

The project is currently a working UI scaffold with a Laravel API shell and a mostly complete marketplace database shape, but it is not yet a real end-to-end application.

## Existing Frontend

### What exists

- React + TypeScript + Vite app in `frontend/src`
- Routed storefront, auth, buyer, seller, admin, and account pages
- Shared layouts and shells for public, seller, and admin experiences
- Central API client in `frontend/src/api/client.ts`

### What is still mocked or simulated

- Auth pages simulate login and registration with local component state
- Checkout is simulated with timeout-based payment states
- Cart uses static demo sellers/items
- Public catalog uses hardcoded product/category/seller arrays
- Buyer account uses a `DEMO_USER`
- Seller dashboard, admin dashboard, and management pages are static demo data
- Messaging, notifications, reviews, reports, and orders are present visually but not connected to backend data

### Frontend/API mismatches

- Pages render real marketplace flows but do not call real endpoints
- `frontend/src/api/client.ts` exists, but the app does not yet use it for core flows
- The auth UI does not restore a session from backend state
- The checkout UI calculates totals in the browser instead of using authoritative backend calculations

## Existing Laravel Backend

### What exists

- Laravel 12 app in `backend`
- API route file with storefront/auth/account/cart/order/message/report/wishlist endpoints
- Placeholder controllers for auth, catalog, commerce, account, messaging, and moderation
- Scaffold service classes for checkout, inventory, product, seller, order, and notification logic
- `statefulApi()` is enabled and CORS is configured for the local frontend origin

### What is still scaffolded

- `AuthController` returns placeholder JSON responses
- Catalog and commerce controllers return placeholder payloads
- No real policies, guards, or authorization layer is present yet
- Services return stubbed data or no real persistence

## Existing Database / Schema

### What exists

- One broad marketplace migration:
  - `database/migrations/2026_08_17_000001_create_marketo_schema.php`
- Seeders:
  - `DatabaseSeeder`
  - `MarketplaceSeeder`
- Factory files for user, category, seller, product, and order

### Schema strengths

- Core tables exist for users, categories, sellers, products, variants, carts, orders, seller orders, order items, shipments, tracking, payments, messages, notifications, reviews, reports, promotions, wishlists, and addresses
- Multi-seller order architecture is represented
- Hierarchical categories are supported
- Soft deletes are used on long-lived catalog/account entities

### Schema gaps and conflicts

- `users` has `name` and `mobile`, but the specification also calls for `first_name`, `last_name`, and `phone`
- No dedicated `seller_applications` table exists yet
- No dedicated `seller_documents` table exists yet, even though the model file exists
- No OTP / 2FA challenge table exists yet
- `reports` is not polymorphic, while the schema documentation describes polymorphic moderation targets
- `messages` does not yet store sender polymorphic fields
- `cart_items` and `order_items` do not fully enforce the unique constraints described in the schema docs
- `MarketplaceSeeder` creates only a buyer, seller, category set, and one product
- No environment-driven development admin seeding exists yet

## Environment Review

- `backend/.env` points to `maketo` on MySQL, but `APP_KEY` is empty
- Frontend API base URL is documented in `frontend/.env.example`
- CORS allows the local frontend origin and Sanctum stateful mode is enabled

## Security / Implementation Risks

- Authentication and authorization are not real yet
- Frontend pages can be navigated directly regardless of backend role
- Static demo data could mask missing backend integration
- The API client currently throws only a generic error without structured API validation handling
- Several production-relevant business rules are enforced only by the UI, not by the backend

## Conflicting Source-of-Truth Decisions

### User identity fields

- Spec wants `first_name` + `last_name`
- Existing frontend and backend currently use a single display `name`
- Decision: preserve the current `name` field for compatibility, and add structured name fields during the database foundation work so both representations can coexist

### Role terminology

- Spec uses `customer`, while existing code uses `buyer`
- Decision: preserve backend compatibility with the existing `buyer` terminology for now, but normalize responses and authorization around the spec's customer-facing behavior

### Seller onboarding

- Spec requires seller applications and documents
- Existing code only models `Seller`
- Decision: add explicit seller application/document tables rather than overloading `sellers`

## Required API Endpoints

The following real endpoints are needed to replace the current scaffold:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/2fa/resend`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/{slug}`
- `GET /api/sellers`
- `GET /api/sellers/{slug}`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/{id}`
- `DELETE /api/cart/items/{id}`
- `POST /api/checkout`
- `GET /api/orders`
- `GET /api/orders/{orderNumber}`
- `GET /api/messages`
- `POST /api/messages`
- `GET /api/reviews`
- `POST /api/reviews`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/notifications`
- `GET /api/account/addresses`
- `POST /api/account/addresses`
- `GET /api/admin/*`
- `GET /api/seller/*`

## Implementation Order

1. Database foundation
2. Authentication
3. 2FA
4. Authorization
5. Frontend auth integration
6. Catalog/cart/checkout
7. Orders and seller workflows
8. Admin, messaging, reviews, reports, notifications

## Phase 0 Verdict

The repo is structurally ready for integration work, but the application is not yet a real connected marketplace.
The highest-risk gaps are authentication, authorization, seller onboarding, and the missing dev seeding strategy.
