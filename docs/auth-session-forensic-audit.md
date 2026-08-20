# Maketo Authentication and Session Forensic Audit

Date: 2026-08-20

## Scope

This audit covers the Laravel session/Sanctum stack, Vite proxy, React auth bootstrap, and buyer, seller, and admin route guards. It intentionally excludes marketplace, R2, branding, product, and payout behavior except where a protected endpoint is used to verify authentication.

## Canonical Development Topology

| Layer | Canonical URL | Browser usage |
| --- | --- | --- |
| React/Vite | `http://192.168.1.8:8443` | All browser navigation and API calls originate here. |
| Laravel | `http://192.168.1.8:8000` | Reached by Vite proxy for `/api` and `/sanctum`. |
| MySQL | `127.0.0.1:3306`, database `maketo` | Server-side only. |

Browser traffic must not mix `localhost`, `127.0.0.1`, and `192.168.1.8` because cookies are host-scoped.

## Pre-Fix Findings

### Laravel

- The default `web` guard is a session guard backed by the `users` provider.
- The `sanctum` guard is configured and protected endpoints use `auth:sanctum`.
- `bootstrap/app.php` correctly calls `statefulApi()`.
- Session storage uses the database `sessions` table.
- The development session cookie is host-only, path `/`, HTTP-only, non-secure over HTTP, and `SameSite=Lax`.
- CORS allows the canonical frontend origin and supports credentials.
- Login uses the `web` guard and regenerates the session ID.
- Logout logs out the `web` guard, invalidates the session, and regenerates the CSRF token.

### Frontend

- Development API calls use same-origin `/api` and `/sanctum` paths through Vite.
- Fetch requests use `credentials: "include"`.
- Mutating requests forward Laravel's readable `XSRF-TOKEN` as `X-XSRF-TOKEN`.
- `AuthProvider` bootstraps the current user from `/api/auth/me`.
- Route guards wait for the bootstrap request and distinguish a confirmed `401` from a transport failure.
- Seller and admin authorization is checked before their shells render; Laravel remains the security boundary.

### Primary Architecture Conflict

`statefulApi()` installs `EnsureFrontendRequestsAreStateful`, which runs Sanctum's cookie, session, and CSRF middleware for requests from the configured SPA origin. The API routes also explicitly add the complete `web` middleware group to auth, account, seller, and admin routes.

This produces nested cookie/session middleware on the same stateful request. The duplicate layer is unnecessary and makes session-cookie encryption, session startup, persistence, and response cookie ordering dependent on middleware nesting. It is the leading root cause of the browser-only refresh failure.

### Secondary Complexity

- Vite rewrites cookie domain and path even though Laravel already emits the required host-only `/` cookies for the canonical IP.
- The frontend writes a user snapshot to `sessionStorage` but never uses it as authority. It does not cause the failure, but it adds stale state without helping refresh persistence.
- The buyer dashboard separately requests `/auth/me`; request single-flight avoids most duplication, but global auth should remain the only authorization authority.
- Old database session rows have accumulated. This is operational cleanup debt, not evidence of a current authenticated session.

## Reproduction Evidence

### Raw HTTP Through Vite

Cookie-jar tests using browser-equivalent `Origin`, `Referer`, CSRF, and credential headers succeeded for all three roles:

| Role | Login | `/api/auth/me` | Protected endpoint | Follow-up `/api/auth/me` |
| --- | --- | --- | --- | --- |
| Buyer | `200` | `200` | `/api/orders` `200` | `200` |
| Seller | `200` | `200` | `/api/seller/dashboard` `200` | `200` |
| Admin | `200` | `200` | `/api/admin/dashboard` `200` | `200` |

The login response regenerated the session cookie and subsequent raw HTTP requests retained it.

### Real Browser

The browser reproduced the reported defect using only the canonical host:

1. Seller login succeeded and redirected to `/seller-center`.
2. Live seller dashboard data loaded successfully.
3. Client-side navigation to `/seller-center/analytics` succeeded.
4. A full browser refresh followed by a seven-second wait redirected to `/auth/login`.
5. No React console error occurred during the failure.

This separates the defect from seller role checks, seller data rendering, and initial login credentials. The failure is specifically at persisted session recovery after a new document load.

## Intended Fix Architecture

1. Keep `statefulApi()` as the single stateful SPA middleware mechanism.
2. Keep `auth:sanctum` on protected endpoints.
3. Remove explicit `web` middleware from API route groups.
4. Keep one host-only Laravel session cookie and one XSRF cookie.
5. Keep same-origin development calls through Vite, without unnecessary cookie rewrites.
6. Treat `/api/auth/me` as the only authority for restoring a user after refresh.
7. Preserve a known user on temporary transport failure, but clear auth only after a confirmed `401` or logout.

## Acceptance Matrix

The fix is not complete until buyer, seller, and admin each pass login, protected navigation, full refresh, delayed refresh verification, and logout. It must also verify a second tab, backend outage behavior, `401`, `403`, and `422` handling, CSRF-protected mutations, and that invalid requests do not silently log out a valid user.

## Final Root Cause Report

### 1. Exact Root Cause

The first incorrect assumption was that API routes needed the full Laravel `web` middleware group in addition to Laravel 12 Sanctum's `statefulApi()` middleware. Stateful SPA requests therefore passed through Sanctum's internal cookie/session/CSRF pipeline and a second explicitly attached `web` pipeline.

The nested session middleware produced browser-dependent response-cookie/session persistence. Login returned a user and client-side requests could initially succeed, but a new document load could present a session cookie that Laravel could not resolve as the authenticated session. React then correctly received `401` from `/api/auth/me` and redirected to login.

### 2. Evidence

- Before the fix, real-browser seller login and client navigation succeeded, but refreshing `/seller-center/analytics` and waiting seven seconds redirected to `/auth/login`.
- The same pre-fix credentials and endpoints succeeded in a raw cookie-jar probe, isolating the defect to browser persistence rather than credentials or role data.
- Route inspection showed `statefulApi()` globally plus explicit `web` middleware on auth, account, seller, and admin API groups.
- Removing explicit `web` middleware immediately made the previously failing seller refresh remain authenticated.
- Buyer, seller, and admin then all passed protected navigation and full-refresh checks in the real browser.

### 3. Files Causing the Conflict

- `backend/bootstrap/app.php` correctly enabled `statefulApi()`.
- `backend/routes/api.php` incorrectly added `web` to the same stateful API routes.
- `frontend/vite.config.ts` added unnecessary cookie domain/path rewriting that complicated diagnosis and cookie ownership.

### 4. Why Earlier Patches Were Incomplete

Earlier changes corrected the canonical IP, credentials, proxy paths, cookie name, and route guards, but they preserved the duplicate `web` middleware assumption. Cookie rewriting and frontend user snapshots were then added around that underlying conflict. Those changes could make an individual request work without establishing one clean, repeatable browser session lifecycle.

### 5. Final Architecture

```text
Browser: http://192.168.1.8:8443
  -> same-origin /sanctum and /api requests with credentials
Vite proxy
  -> http://192.168.1.8:8000
Laravel statefulApi()
  -> Sanctum stateful cookie/session/CSRF middleware once
auth:sanctum
  -> web session guard user
account.active / role / seller.approved
  -> protected API controller
MySQL sessions table
  -> persistent Laravel session
```

### 6. Files Changed for This Fix

- `backend/routes/api.php`: removed explicit `web` middleware from API route groups.
- `backend/app/Http/Controllers/Api/AuthController.php`: clears the resolved Sanctum guard user during logout in addition to invalidating the web session.
- `backend/tests/Feature/AuthSessionPersistenceTest.php`: adds buyer, seller, admin, status-code, session-continuity, and logout regression coverage.
- `frontend/vite.config.ts`: removed unnecessary cookie domain/path rewrites.
- `frontend/src/auth/AuthContext.tsx`: removed the unused stored-user snapshot and safely preserves the current in-memory user only during transport failure.
- `docs/auth-session-forensic-audit.md`: records the pre-fix audit, root cause, architecture, and verification evidence.

### 7. Workarounds Removed

- Explicit Laravel `web` middleware on API route groups.
- Vite `cookieDomainRewrite` and `cookiePathRewrite` settings.
- The `maketo.auth-user` `sessionStorage` snapshot.

The two-factor pending challenge remains in `sessionStorage` only as workflow UI state. It does not authorize any route.

### 8. Session Cookie Configuration

| Setting | Final development value |
| --- | --- |
| Driver | `database` |
| Cookie | `maketo_dev_session` |
| Domain | host-only |
| Path | `/` |
| Secure | `false` for local HTTP |
| HTTP-only | `true` |
| SameSite | `lax` |
| Lifetime | `120` minutes |
| Expire on close | `false` |

The session ID is regenerated after login, registration, successful email verification when restoring auth, and successful 2FA. Logout invalidates the session and regenerates the CSRF token.

### 9. Sanctum Configuration

- `statefulApi()` is the single SPA stateful middleware entry.
- Protected endpoints use `auth:sanctum`.
- `SANCTUM_STATEFUL_DOMAINS` contains the canonical frontend host and port.
- Account, seller approval, and role middleware resolve the same authenticated request user and return `403` for authorization failures.
- No broad wildcard stateful domain is used.

### 10. Proxy Configuration

- `/api` and `/sanctum` proxy to `http://192.168.1.8:8000`.
- `changeOrigin: true` and `secure: false` remain appropriate for local HTTP development.
- The proxy no longer rewrites cookie domain or path.
- Frontend development requests use relative same-origin URLs; no page bypasses the proxy with a hardcoded backend URL.

### 11. AuthContext Behavior

```text
startup -> /api/auth/me
200 -> authenticated with current backend user
401 -> clear user and confirm guest
network/5xx -> show verification error and do not falsely confirm guest
login/verification/2FA -> replace context user with backend response
logout -> invalidate backend session, then clear frontend user
```

Seller and admin guards wait for auth initialization. A backend outage presents a retry state instead of rendering a protected shell or redirecting to login.

### 12. Test Results

#### Required Commands

- `php artisan optimize:clear`: passed.
- `composer dump-autoload`: passed.
- `php artisan route:list -vv`: passed; API routes show one Sanctum stateful middleware entry and no explicit `web` route group.
- `php artisan test`: `31` tests passed with `198` assertions.
- `corepack pnpm build`: passed; `1951` modules transformed.

#### Repeated Raw HTTP Matrix

The complete browser-equivalent cookie-jar sequence passed twice for buyer, seller, and admin:

| Check | Expected and observed |
| --- | --- |
| CSRF cookie | `204` |
| Login | `200` |
| `/api/auth/me` | `200` |
| Role-appropriate endpoint | `200` |
| Wrong-role endpoint | `403` |
| `/api/auth/me` after `403` | `200` |
| Fresh logout CSRF | `204` |
| Logout | `200` |
| `/api/auth/me` after logout | `401` |

#### Real Browser Matrix

- Buyer: login redirected home; account orders navigation and full refresh remained authenticated.
- Seller: login, seller dashboard, analytics navigation, delayed full refresh, products in a second tab, and another delayed refresh remained authenticated.
- Admin: login, users navigation, delayed full refresh, closed/reopened tab, and settings access remained authenticated.
- Backend outage: protected URL showed `API request failed: 502` and `Try again`; it did not redirect to login. After Laravel restarted, retry restored the same admin session.
- Logout: seller, buyer, and admin returned to login. Browser Back and direct protected URLs remained blocked.
- Browser console: no auth-related errors were recorded during the passing flows.

#### Registration, Verification, and 2FA

Automated feature tests verify registration session behavior, six-digit email verification with session preservation, 2FA challenge isolation, successful 2FA session finalization, `/auth/me`, expiry, replay rejection, and resend behavior.

### 13. Remaining Risks

- The frontend currently has no dedicated component-test runner for AuthContext/guards. The production Vite build passes, and browser coverage exercises the real behavior, but component-level network-state tests would require adding a frontend test stack.
- A standalone `tsc --noEmit` run reports pre-existing type errors in unrelated product, inventory, cart, shell, and generated-part files. Vite's required production build passes; these errors were not changed or hidden during this auth-focused task.
- Historical rows have accumulated in the database-backed `sessions` table. Laravel's session lottery will prune expired rows, but a scheduled `session:prune`-style operational policy should be considered if session volume grows.
- Live registration email and 2FA delivery depend on the configured SMTP provider. Their session and challenge logic is covered by tests, but this audit did not send new external email to avoid unnecessary transactional delivery.
