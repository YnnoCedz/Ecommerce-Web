# System Architecture Audit

Date: 2026-08-24

## Scope and Evidence

This report describes the repository as inspected on the date above. It does not treat a route, component, or prior audit as proof that a feature works.

Evidence collected before any application or deployment change:

- `php artisan about`: Laravel 12.66.0, PHP 8.2.12, MySQL, database sessions/cache/queue.
- `php artisan route:list --except-vendor`: 104 routes registered.
- `php artisan migrate:status`: all 20 migrations are applied locally.
- `php artisan test`: 67 tests passed with 536 assertions.
- `npm run build`: Vite production build passed; the largest generated entry chunk is 259.70 kB.
- Render DNS/TLS connects at `maketo-api.onrender.com`, but `GET /api/health` produced no response before a 20-second timeout.
- Cloudflare deployment state could not be queried because Wrangler is not authenticated in this environment.

## 1. Architecture Summary

The repository is a modular monolith split into two deployables:

```text
React route/page
  -> frontend/src/api/*.ts
  -> frontend/src/api/client.ts (fetch, JSON/FormData, credentials)
  -> HTTPS request to VITE_API_BASE_URL
  -> Laravel routes/api.php
  -> Sanctum stateful middleware + account/role middleware
  -> API controller
  -> domain service where transactional rules are needed
  -> Eloquent model
  -> MySQL
```

Public catalog requests skip authentication. Buyer/account requests use `auth:sanctum` and `account.active`. Seller requests additionally require `role:seller` and `seller.approved`. Admin requests additionally require `role:admin`.

Authentication is Laravel session/cookie authentication, not personal access-token authentication. `AuthController` logs into the `web` guard, regenerates the session, and Sanctum authenticates stateful API requests from the session cookie. The frontend sends `credentials: include` and the decoded `XSRF-TOKEN` as `X-XSRF-TOKEN`.

## 2. Deployment Architecture

```text
Browser
  -> Cloudflare static assets / SPA fallback
  -> absolute HTTPS API URL (required, currently misconfigured)
  -> Render Docker service
  -> Laravel 12
  -> Aiven MySQL
```

Additional services discovered:

- Cloudflare R2 through Laravel's S3-compatible filesystem disk for product images, seller branding, seller documents, message attachments, report attachments, and return evidence.
- SMTP through Laravel Notifications for verification codes, 2FA, password reset, and seller review outcomes.
- Simulated payment provider persisted in MySQL. It records attempts/refunds but transfers no real money.

Deployment file status:

- `frontend/wrangler.jsonc` correctly deploys `dist` and enables SPA fallback.
- `frontend/package.json` uses npm and has a valid Vite build.
- `frontend/make/*` still invokes pnpm and watches `pnpm-lock.yaml`, conflicting with the checked-in npm lockfile.
- `backend/Dockerfile` installs production Composer dependencies, creates writable cache/storage directories, binds to `$PORT`, and runs migrations.
- `backend/.dockerignore` excludes only `.env`, not `.env.production` or other `.env*` files.
- The ignored local `backend/.env.production` contains secret-bearing variables and development values. Docker currently copies that file into the image even though Laravel does not need it there.

## 3. Frontend API Inventory

The centralized client prefixes every path below with `VITE_API_BASE_URL`. `Auth` is `public`, `session`, `seller`, or `admin`.

| Frontend module | Method and path | Auth | Laravel match |
| --- | --- | --- | --- |
| `auth.ts` | `GET /auth/me` | session | yes |
| `auth.ts` | `POST /auth/login` | public + CSRF | yes |
| `auth.ts` | `POST /auth/register` | public + CSRF | yes |
| `auth.ts` | `POST /auth/logout` | session + CSRF | yes |
| `auth.ts` | `POST /auth/2fa/verify`, `POST /auth/2fa/resend` | challenge + CSRF | yes |
| `auth.ts` | `POST /auth/email/verify`, `POST /auth/email/resend` | public + CSRF | yes |
| `auth.ts` | `POST /auth/password/forgot`, `POST /auth/password/reset` | public + CSRF | yes |
| `auth.ts` | `PATCH /account/password` | session + CSRF | yes |
| `catalog.ts` | `GET /categories`, `/products`, `/products/{slug}`, `/products/{slug}/reviews` | public | yes |
| `catalog.ts` | `GET /search`, `/search/suggestions`, `/sellers`, `/sellers/{slug}` | public | yes |
| `cart.ts` | `GET /cart` | session | yes |
| `cart.ts` | `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `PATCH /cart/promo` | session + CSRF | yes |
| `buyer.ts` | `GET /orders`, `GET /orders/{number}` | session | yes |
| `buyer.ts` | order complete, cancel, return, payment retry POST routes | session + CSRF | yes |
| `buyer.ts` | wishlist GET/POST/status/DELETE routes | session + CSRF | yes |
| `buyer.ts` | address GET/POST/PATCH/DELETE routes | session + CSRF | yes |
| `buyer.ts` | `POST /checkout` | session + CSRF | yes |
| `account.ts` | profile PATCH or multipart POST with `_method=PATCH` | session + CSRF | yes |
| `account.ts` | preferences GET/PATCH | session + CSRF | yes |
| `account.ts` | message list/detail/start/send/read routes | session + CSRF | yes |
| `account.ts` | review list/eligible/create/update/delete routes | session + CSRF | yes |
| `notifications.ts` | notification list/read/dismiss/mark-all-read routes | session + CSRF | yes |
| `sellerApplications.ts` | current application and application submission | session + CSRF | yes |
| `sellerApplications.ts` | admin application list/detail/approve/reject/document routes | admin | yes |
| `seller.ts` | dashboard/profile/product/order/customer/promotion/review/return routes | seller | yes |
| `seller.ts` | product create/update/delete/inventory routes | seller + CSRF | yes |
| `adminModeration.ts` | report create/list/detail/update/attachment routes | session/admin | yes |
| `adminModeration.ts` | dispute list/detail/resolve/evidence routes | admin | yes |

No duplicate `/api/api` path or HTTP-method mismatch was found in the centralized API modules. The browser upload POST plus `_method=PATCH` is intentional because PHP does not reliably parse multipart PATCH bodies.

## 4. API Mismatches

| Frontend surface | Frontend behavior | Backend route | Status | Required action |
| --- | --- | --- | --- | --- |
| Production login | `POST /api/auth/login` on the Cloudflare origin because base URL is `/api` | `POST https://maketo-api.onrender.com/api/auth/login` | broken deployment routing | set an absolute Render API base URL at Vite build time |
| Production CSRF | derives origin from the same relative base and calls Cloudflare `/sanctum/csrf-cookie` | Render `GET /sanctum/csrf-cookie` | broken deployment routing | derive it from the absolute Render API URL |
| Admin products | local constants/actions | no admin product-management API | UI only | add APIs before enabling moderation actions |
| Admin orders | local `ADMIN_ORDERS` | no admin order-list/detail API | UI only | add admin read APIs |
| Admin categories | local `INITIAL_CATEGORIES` and local mutations | public categories GET only | UI only | add protected admin category CRUD |
| Admin analytics/settings | local constants and component state | no matching API | UI only | add APIs or label/remove unsupported controls |
| Seller promotions | real list; create UI does not persist | seller promotion GET only | partial | add protected CRUD and validation |
| Seller follow | local UI behavior | schema exists, no API | partial | add follow/unfollow API or remove affordance |

## 5. Authentication/Sanctum Findings

Actual flow:

1. Frontend requests `/sanctum/csrf-cookie` for mutating auth operations.
2. Frontend sends `POST /api/auth/login` with JSON and credentials.
3. Laravel validates credentials and account/email state.
4. Laravel logs into the `web` session guard and regenerates the session.
5. If enabled, 2FA defers login until the challenge is verified.
6. `GET /api/auth/me` restores the authenticated user on app load.
7. Logout clears both guard state and the session.

Findings:

- `bootstrap/app.php` correctly calls `$middleware->statefulApi()`.
- The client correctly uses `credentials: include` and supplies the XSRF header.
- No bearer token is created or stored. The optional `authToken` API-client option is unused and should not be interpreted as a second auth strategy.
- Local session persistence has automated coverage and passes for buyer, approved seller, admin, validation errors, forbidden requests, refresh-style `/me`, and logout.
- Login and registration routes are not rate-limited, while challenge/password routes are. This is an authentication brute-force/abuse gap.
- Cross-origin production cookies require exact frontend stateful/CORS configuration plus `SESSION_SECURE_COOKIE=true` and `SESSION_SAME_SITE=none`. The inspected ignored production file instead contains local/LAN values and must not be used as Render configuration.
- If the Cloudflare and Render hosts do not share a registrable parent domain, the browser cannot reliably expose Render's `XSRF-TOKEN` cookie to JavaScript on the Cloudflare origin and may block the session as a third-party cookie. Production must therefore use sibling custom domains (for example, `app.example.com` and `api.example.com`) or a same-origin Cloudflare `/api` and `/sanctum` proxy. An absolute `workers.dev`/`pages.dev` to `onrender.com` cookie flow is not a robust final architecture.

## 6. CORS Findings

`config/cors.php` is structurally correct for cookie auth:

- paths include `api/*` and `sanctum/csrf-cookie`;
- all methods and headers are allowed;
- credentials are enabled;
- origin is restricted to `FRONTEND_URL`, not `*`.

Production correctness depends on Render setting `FRONTEND_URL` to the exact Cloudflare origin, without a path. `SANCTUM_STATEFUL_DOMAINS` must contain the Cloudflare hostname (and port only when nonstandard), not a URL scheme. The current local production-named file does not contain the production frontend origin.

## 7. Backend Coverage

| Flow | Status | Evidence |
| --- | --- | --- |
| Registration, email code verification, login, logout, session restore, 2FA, password reset | working locally; production broken | controllers, notifications, session tests |
| Product browsing, search, suggestions, categories, product detail, seller storefront | working | catalog/search controllers and tests |
| Wishlist and cart | working | persisted models/controllers and integration tests |
| Checkout and multi-seller order creation | working | transactional checkout service and tests |
| Buyer orders, completion, cancellation, returns, disputes, reviews | working | controllers/services and lifecycle/resolution tests |
| Addresses, profile/avatar, preferences, password | working | account controller and tests |
| Messaging and private attachments | working | participant ownership checks and tests |
| Notifications, mark-read, dismiss | working | persisted notification controller/tests |
| Seller application and private documents | working | transactional controller, R2 storage, admin review routes |
| Seller products, inventory, orders, returns, review replies, store branding/settings | working or partial by UI | ownership-scoped controllers and tests |
| Reports and admin dispute resolution/refunds | working | persisted records, DB transactions, authorization and refund tests |
| Admin dashboard/users/sellers feeds | backend only or partially consumed | real read endpoints exist |
| Courier management | backend only | schema/models exist; no routed courier application surface |

## 8. UI-Only Features

- Admin product moderation page.
- Admin order page.
- Admin category mutations.
- Admin analytics controls and metrics.
- Admin platform/security/integration settings.
- Part of admin seller roster management; seller applications are real.
- Seller promotion creation/update/delete.
- Public seller follow action despite a `seller_followers` table.
- Several `/spec` and `Part*.tsx` screens are design/specification surfaces, not production feature implementations.

## 9. Database Findings

Strengths:

- The schema supports multi-seller checkout through `orders -> seller_orders -> order_items`.
- Money uses exact decimal columns.
- Product variants, stock, cart items, historical order fields, payments/refunds, returns, disputes, messaging, reports, reviews, and notifications are relational.
- Important unique constraints exist for emails, slugs, SKUs, cart items, seller/category pairs, wishlists, review/order items, and payment references.
- Checkout, inventory transitions, cancellations, returns, report storage, dispute resolution, and seller application review use DB transactions where consistency matters.
- Ownership checks scope buyer addresses/orders/cart and seller products/orders/returns/replies.

Risks:

- The original schema uses cascades on some historical commerce relationships (`orders.buyer_id`, `seller_orders.seller_id`). Soft deletes reduce immediate risk, but destructive hard deletes could remove historical transactions. This requires a future migration review, not an emergency production rewrite.
- Several list endpoints use fixed limits rather than pagination metadata.
- Admin pages needing real data do not yet have corresponding query endpoints.
- Automatic migrations in the Render container startup can race during parallel deploys and make rollback management harder.

## 10. Authorization Findings

- Backend middleware, not React visibility, is the security boundary.
- Buyer/account APIs require authenticated active users.
- Seller APIs require an active, approved seller role.
- Admin APIs require an active admin role.
- Seller product/order/return/review actions include seller ownership checks.
- Buyer order/address/cart/review actions are scoped to the authenticated user.
- Message and private attachment access requires conversation participation.
- Report/dispute evidence routes are authorized and use temporary storage URLs.
- Automated tests confirm guests, buyers, and sellers cannot access admin moderation/dispute actions.
- Remaining authorization risk is concentrated in future admin CRUD features because those endpoints do not yet exist; they must not be implemented as frontend-only controls.

## 11. Deployment Findings

P0/P1:

- The production frontend defaults to relative `/api`; Cloudflare static assets do not proxy that path to Render.
- The production-named backend env file can be copied into Docker and contains secrets.
- That production-named file is actually configured as local/debug/insecure-cookie/LAN state and must never be used on Render.
- Render `/api/health` did not respond within 20 seconds during this audit.

P2/P3:

- Figma deploy scripts use pnpm even though npm and `package-lock.json` are the repository standard.
- Root development scripts and Vite proxy hardcode a LAN address, reducing portability.
- Docker uses `php artisan serve` and runs migrations on every container startup. This can work for a small Render service but is weaker than a dedicated production server/release command.
- The build emits Vite future-compatibility warnings for `__dirname` and JSON imports.
- No tracked backend `.env.example` exists, so required Render variables are undocumented in the deployable backend.

## 12. Security Findings

| Priority | Finding | Exposure |
| --- | --- | --- |
| P0 | Docker context includes ignored `.env.production` | secret values can be embedded in image layers |
| P0 | Production-named env has debug/local/insecure session values | verbose errors and broken/insecure cookies if used |
| P1 | Login/register lack throttling | credential stuffing and registration abuse |
| P1 | Production frontend API origin is not configured | auth and all persistence calls go to Cloudflare |
| P2 | Production cookie settings are external and currently undocumented | session loss or CSRF/CORS failures after deployment |
| P3 | Automatic migration on each startup | deploy race/operational risk |

No tracked `.env`, `vendor`, `node_modules`, or `dist` content was found. No database password, APP key, SMTP credential, or R2 secret is used in a `VITE_*` variable. Actual secret values are intentionally omitted from this report.

## 13. Current 405 Root Cause

Exact code path:

```text
LoginPage.tsx submit()
  -> AuthContext.login()
  -> auth.ts loginRequest()
  -> ensureCsrfCookie()
  -> apiFetch('/auth/login', { method: 'POST' })
  -> client.ts API_BASE_URL
```

The request method is correctly `POST`; there is no form navigation or accidental GET in the login page.

The production URL is wrong:

- `frontend/.env` and `frontend/.env.example` set `VITE_API_BASE_URL=/api`.
- `client.ts` therefore builds `/api/auth/login` in production.
- Vite's `/api` proxy exists only in the development server.
- `wrangler.jsonc` serves static assets with SPA fallback and defines no `/api` reverse proxy.
- The browser consequently sends `POST https://<cloudflare-origin>/api/auth/login` to Cloudflare, not `POST https://maketo-api.onrender.com/api/auth/login` to Laravel.
- Cloudflare's static asset handler does not accept that POST path and returns 405.

Laravel's route is correct: `POST api/auth/login`. A direct GET to that Laravel URI would also return 405 by design, but the inspected frontend does not issue a GET. The production browser's destination origin, not the React method, is the confirmed repository-side defect.

## 14. Priority Fix Plan

### P0

1. Exclude every `.env*` file from Docker except intentionally safe examples.
2. Never deploy the local `backend/.env.production`; rotate affected credentials if an image containing it was ever published.
3. Configure Render entirely through service environment variables with `APP_ENV=production`, `APP_DEBUG=false`, secure cross-site session settings, exact CORS origin, and Aiven/R2/SMTP secrets.

### P1

1. Require an absolute `VITE_API_BASE_URL=https://maketo-api.onrender.com/api` for production builds and fail deployment clearly when it is relative/missing.
2. Keep `/api` only for Vite development proxying.
3. Add throttling to login and registration.
4. Verify or restore Render health before testing auth.

### P2

1. Replace pnpm deployment scripts with npm.
2. Add safe backend and frontend environment examples documenting all required production variables.
3. Implement admin products/orders/categories/analytics/settings APIs only when those features are prioritized.
4. Complete seller promotion CRUD and seller follows.

### P3

1. Replace hardcoded LAN development targets with environment-driven host settings.
2. Move migrations to a controlled Render release/predeploy step if the service supports it.
3. Address Vite native config warnings and paginate fixed-limit admin/list endpoints.

### P4

1. Remove stale specification-only code from production bundles if `/spec` is no longer needed.

## 15. Files That Need Modification

File: `backend/.dockerignore`

Problem: `.env.production` can enter Docker image layers.

Required change: ignore `.env*` while allowing only safe example files if needed.

Risk: low; runtime configuration must come from Render variables.

Priority: P0.

File: `frontend/vite.config.ts`

Problem: production builds can silently accept relative `/api` and deploy a broken Cloudflare bundle.

Required change: validate the production API base URL and keep development proxy behavior separate.

Risk: medium; production builds will intentionally fail until the public Render API URL is configured.

Priority: P1.

File: `frontend/.env.example` and a production example

Problem: the current example teaches the development-only relative URL for every environment.

Required change: document development and production values without secrets.

Risk: low.

Priority: P1.

File: `backend/routes/api.php`

Problem: login and registration are unthrottled.

Required change: apply explicit rate limits consistent with the existing challenge endpoints.

Risk: low; repeated attempts receive HTTP 429.

Priority: P1.

File: `backend/.env.example`

Problem: missing; Render, Sanctum, session, database, mail, and R2 requirements are undocumented.

Required change: add placeholders only.

Risk: low.

Priority: P2.

File: `frontend/make/deploy`, `frontend/make/deploy-preview`, `frontend/make/install`, `frontend/make/dev.json`

Problem: stale pnpm commands conflict with npm lockfile and package scripts.

Required change: use npm and watch `package-lock.json`.

Risk: low.

Priority: P2.

File: `package.json` and `frontend/vite.config.ts`

Problem: development host/proxy is tied to `192.168.1.8`.

Required change: read a development backend host from environment with a localhost-safe default.

Risk: medium because LAN-device testing requires an explicit override.

Priority: P3.

## Pre-Change Verdict

The application is substantially integrated and its local automated backend/build baseline is healthy. The production 405 does not originate in Laravel routing or an accidental GET form submission. It is caused by deploying a relative API base URL to an assets-only Cloudflare worker. The first code/config changes should therefore harden the Docker secret boundary, make bad production API builds impossible, document the exact Render/Sanctum settings, and rate-limit public auth endpoints without redesigning existing features.

## Post-Fix Verification

- Docker now excludes every `.env*` file except the placeholder-only example.
- Production Vite builds require an absolute HTTPS API URL ending in `/api`; a forced relative `/api` build fails as intended.
- The normal production build embeds the configured Render API origin and succeeds.
- Login and registration use separate named limits keyed by normalized email and IP, with broader IP caps to reduce distributed abuse.
- `php artisan test`: 68 tests passed with 548 assertions after the changes.
- `composer dump-autoload --optimize`: completed successfully. The local untracked vendor tree emitted duplicate-class warnings and should be replaced with a clean `composer install`; the committed lockfile was not changed.
- Cloudflare and Render deployment could not be completed from this machine: Wrangler is not authenticated, and the existing Render service did not answer `/api/health` within 20 seconds.

# Deployment Verification Checklist

- [ ] Cloudflare frontend loads.
- [ ] Render `/health` succeeds.
- [ ] Render `/api/health` succeeds.
- [ ] Cloudflare build has `VITE_API_BASE_URL=https://maketo-api.onrender.com/api` (or the final API custom domain).
- [ ] Frontend network requests reach Render rather than Cloudflare static `/api`.
- [ ] `FRONTEND_URL` exactly matches the deployed frontend origin.
- [ ] `SANCTUM_STATEFUL_DOMAINS` contains the frontend hostname without a scheme.
- [ ] Production uses sibling custom domains or a same-origin proxy for reliable Sanctum/XSRF cookies.
- [ ] `APP_ENV=production` and `APP_DEBUG=false` on Render.
- [ ] `SESSION_SECURE_COOKIE=true`; cookie domain and SameSite match the chosen domain architecture.
- [ ] CORS preflight succeeds with credentials and the exact frontend origin.
- [ ] CSRF cookie request succeeds.
- [ ] Registration succeeds and verification email is delivered.
- [ ] Login is a POST and succeeds.
- [ ] Authentication persists after navigation and refresh.
- [ ] Logout succeeds.
- [ ] Products and categories load.
- [ ] Cart and wishlist persist.
- [ ] Checkout creates an Aiven-backed multi-seller order.
- [ ] Buyer orders load.
- [ ] Seller APIs accept only approved sellers and persist changes.
- [ ] Admin APIs reject guests/buyers/sellers and allow admins.
- [ ] R2 public branding and authorized private evidence/document URLs work.
- [ ] Aiven persistence is confirmed after service restart.
- [ ] No localhost or LAN URL is present in the production browser bundle.
- [ ] No secret exists in `VITE_*`, Git, Docker layers, or API responses.
- [x] `npm run build` succeeds locally.
- [x] Laravel tests pass locally.
- [ ] Render deployment succeeds.
- [ ] Cloudflare deployment succeeds.
