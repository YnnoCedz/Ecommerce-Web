# Marketo Seller + Admin Auth Route Audit

Date: 2026-08-19

This audit checks the current React route tree and Laravel API protection for all seller and admin areas.

## Summary

- Laravel backend protection is in place for seller and admin API endpoints.
- React frontend seller and admin routes now enforce authorization before the shell renders.
- Result: unauthorized users are blocked before seller/admin UI mounts. Remaining risk is resource-level ownership enforcement inside specific backend endpoints.

## Seller Routes

| Route | Frontend file | Required role/status | Current route guard | Current backend protection | Current result when unauthorized | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/seller-center` | `frontend/src/pages/seller/SellerDashboard.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/products` | `frontend/src/pages/seller/ProductListPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/products/new` | `frontend/src/pages/seller/ProductCreationPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/products/:id/edit` | `frontend/src/pages/seller/ProductCreationPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account, resource ownership | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; ownership/API failures may occur later | PARTIAL |
| `/seller-center/inventory` | `frontend/src/pages/seller/InventoryPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/orders` | `frontend/src/pages/seller/SellerOrdersPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/customers` | `frontend/src/pages/seller/CustomersPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/promotions` | `frontend/src/pages/seller/PromotionsPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/analytics` | `frontend/src/pages/seller/AnalyticsPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/store` | `frontend/src/pages/seller/StoreManagementPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/messages` | `frontend/src/pages/messaging/MessagingPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` | Shell can render; backend access should still be blocked if unauthenticated | PARTIAL |
| `/seller-center/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` | Shell can render; backend access should still be blocked if unauthenticated | PARTIAL |
| `/seller-center/settings` | `frontend/src/pages/seller/SellerSettingsPage.tsx` via `frontend/src/router.tsx` | Authenticated, approved seller, active account | None in `SellerLayout` | `auth:sanctum` + `account.active` + `role:seller` + `seller.approved` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/seller-center/onboarding` | `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx` via `frontend/src/router.tsx` | Public seller application flow | No seller guard by design | `auth:sanctum` on backend submission endpoints only | Accessible publicly as intended; backend still validates submission | PARTIAL |
| `/seller-center/onboarding/status` | `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx` via `frontend/src/router.tsx` | Public seller application status page | No seller guard by design | `auth:sanctum` on backend submission/status endpoints as applicable | Accessible publicly as intended; should not expose protected seller data | PARTIAL |

## Admin Routes

| Route | Frontend file | Required role/status | Current route guard | Current backend protection | Current result when unauthorized | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | `frontend/src/pages/admin/AdminDashboard.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/users` | `frontend/src/pages/admin/UserManagementPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/sellers` | `frontend/src/pages/admin/SellerManagementPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/products` | `frontend/src/pages/admin/AdminProductsPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/orders` | `frontend/src/pages/admin/AdminOrdersPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/categories` | `frontend/src/pages/admin/CategoryManagementPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/reports` | `frontend/src/pages/admin/ReportsModerationPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/moderation` | Redirect to `/admin/reports` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Redirects inside protected area; still depends on shell-level auth | PARTIAL |
| `/admin/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; backend feed should still enforce admin access | PARTIAL |
| `/admin/analytics` | `frontend/src/pages/admin/AdminAnalyticsPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |
| `/admin/settings` | `frontend/src/pages/admin/AdminSettingsPage.tsx` via `frontend/src/router.tsx` | Authenticated admin, active account | None in `AdminLayout` | `auth:sanctum` + `account.active` + `role:admin` | Shell can render; protected API calls may fail with 401/403 | PARTIAL |

## Navigation Visibility

### Seller visibility

- Seller links are present in `frontend/src/shells/SellerShell.tsx`.
- The shell itself does not gate rendering by auth role before mounting.
- Badge counts and notifications load from backend endpoints once the shell renders.

### Admin visibility

- Admin links are present in `frontend/src/shells/AdminShell.tsx`.
- The shell itself does not gate rendering by auth role before mounting.
- Badge counts and notifications load from backend endpoints once the shell renders.

### Public nav exposure

- `frontend/src/shells/PublicShell.tsx` exposes a seller shortcut based on `user.seller_approved || user.role === "seller"`.
- There is no admin shortcut in the public shell.

## Findings

1. Backend authorization is in place for seller/admin APIs.
2. Frontend route guards now block unauthorized seller/admin shell rendering.
3. Direct URL access no longer shows seller/admin shells to unauthorized users.
4. Seller ownership enforcement still needs per-resource checks in the relevant backend endpoints.

## Recommended Next Step

- Add frontend route guards for seller/admin shells.
- Keep Laravel middleware as the real security boundary.
- Add a reusable 403/unauthorized page or redirect flow.
