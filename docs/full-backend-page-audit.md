# Maketo Full Backend Page Audit

Date: 2026-08-22
Project: `C:\Users\Ynno\Ecommerce-WEB`

This audit checks the real application router, then traces each reachable page through:

Frontend page
-> frontend API function
-> Laravel route
-> controller/service
-> model/database/R2
-> response
-> rendered UI

Status legend:

- `LIVE`: page is materially backed by real Laravel + database flows for its core actions
- `PARTIAL`: page mixes real backend data with missing actions, local-only behavior, incomplete flows, or visible stubs
- `MOCK`: page primarily renders hardcoded/mock UI data
- `FRONTEND_ONLY`: page works only in local state or static frontend data, with no real persistence
- `SCAFFOLDED`: backend contract exists only as a shell or obvious placeholder
- `BROKEN`: intended backend flow exists but the routed page is currently failing or not safely usable
- `STATIC_BY_DESIGN`: informational/redirect shell, not expected to persist business data

## Route Inventory

### Public

- `/`
- `/search`
- `/c/:slug`
- `/p/:id`
- `/s/:id`
- `/cart`
- `/checkout`
- `/checkout/confirmation`
- `/403`
- `*` (404)

### Buyer / Account

- `/account/profile`
- `/account/orders`
- `/account/orders/:id`
- `/account/wishlist`
- `/account/messages`
- `/account/notifications`
- `/account/personal-info`
- `/account/security`
- `/account/addresses`
- `/account/preferences`
- `/account/reviews`
- `/account` -> redirect to `/account/profile`

### Seller

- `/seller-center/onboarding`
- `/seller-center/onboarding/status`
- `/seller-center`
- `/seller-center/products`
- `/seller-center/products/new`
- `/seller-center/products/:id/edit`
- `/seller-center/inventory`
- `/seller-center/orders`
- `/seller-center/returns`
- `/seller-center/reviews`
- `/seller-center/customers`
- `/seller-center/promotions`
- `/seller-center/analytics`
- `/seller-center/store`
- `/seller-center/messages`
- `/seller-center/notifications`
- `/seller-center/settings`

### Admin

- `/admin`
- `/admin/users`
- `/admin/sellers`
- `/admin/products`
- `/admin/orders`
- `/admin/categories`
- `/admin/reports`
- `/admin/moderation` -> redirect to `/admin/reports`
- `/admin/notifications`
- `/admin/analytics`
- `/admin/settings`

### Auth

- `/auth/login`
- `/auth/two-factor`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/verify-email`
- `/auth/email-verified`
- `/auth/reset-password`

## Executive Summary

- Public catalog, cart, checkout, buyer account, core seller operations, messaging, and notifications now have substantial real backend coverage.
- The biggest unsupported area is still `ADMIN`.
- The known disputes gap is real: buyer escalation persists, but there is still no routed admin dispute-management surface or full resolution lifecycle.
- Several seller pages are mixed: they load real data but still expose disabled controls, stub modal copy, or incomplete persistence.
- Multiple admin pages are still pure mock or frontend-only screens despite existing routes.

## Totals

| Status | Count |
| --- | ---: |
| `LIVE` | 27 |
| `PARTIAL` | 16 |
| `MOCK` | 6 |
| `FRONTEND_ONLY` | 2 |
| `SCAFFOLDED` | 0 |
| `BROKEN` | 0 |
| `STATIC_BY_DESIGN` | 6 |
| Total reachable routes audited | 57 |

## Page-by-Page Audit

### Public

| Route | Frontend file | Role | Main features/actions | Current data source | API endpoint(s) | Backend controller/service | Database tables | R2 usage | Status | Missing backend support | Recommended next step | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `frontend/src/pages/pub/HomePage.tsx` | Public | Featured products, categories, deals, banners, trust content | Mixed API + static sections | `GET /api/categories`, `GET /api/products`, `GET /api/search/suggestions` | `CatalogController`, `ProductSearchService` | `categories`, `products`, `product_images`, `sellers`, `reviews` | Product images from `product_images` on `r2` | `PARTIAL` | Live catalog blocks are mixed with static trust stats, countdowns, and newsletter-only UI | Convert the remaining “dynamic-looking” homepage metrics and promo blocks to real backend data or clearly mark them as editorial | High |
| `/search` | `frontend/src/pages/pub/SearchPage.tsx` | Public | Search, suggestions, sorting, filtering, pagination-like result loading | Real API | `GET /api/search`, `GET /api/search/suggestions` | `CatalogController::search`, `CatalogController::searchSuggestions`, `ProductSearchService` | `products`, `categories`, `sellers`, `product_images`, `reviews` | Product images from `r2` | `LIVE` | None found in core flow | Keep, then performance-tune queries and relevance rules | Medium |
| `/c/:slug` | `frontend/src/pages/pub/CategoryPage.tsx` | Public | Category listing, subcategory switching, category product browsing | Mixed API + local filtering | `GET /api/categories`, `GET /api/products` | `CatalogController::products` | `categories`, `products`, `product_images`, `sellers` | Product images from `r2` | `PARTIAL` | Category/subcategory filtering is still heavily client-side and not fully taxonomy-backed | Add backend category/subcategory filtering and true paginated category endpoints | High |
| `/p/:id` | `frontend/src/pages/pub/ProductPage.tsx` | Public / Buyer | Product details, reviews, add to cart, wishlist, buy now, message seller | Mostly real API | `GET /api/products/{slug}`, `GET /api/products/{slug}/reviews`, `POST /api/cart`, `POST /api/wishlists`, `POST /api/messages` | `CatalogController::show`, `CatalogController::reviews`, `CommerceController`, `MessagingController` | `products`, `product_images`, `reviews`, `wishlists`, `carts`, `cart_items`, `conversations`, `messages` | Product images and message attachments use `r2` | `PARTIAL` | Core commerce works, but the page still mixes real data with static delivery/trust presentation and not every visible interaction is persisted | Finish all visible product-detail affordances against backend contracts, especially review interaction extras and dynamic delivery copy | High |
| `/s/:id` | `frontend/src/pages/pub/SellerStorePage.tsx` | Public | Public seller storefront, seller products, message seller, store branding | Mixed API + local-only UI | `GET /api/sellers/{slug}`, `POST /api/messages` | `CatalogController::seller`, `MessagingController` | `sellers`, `products`, `product_images`, `categories`, `conversations`, `messages` | Seller logo/banner and product media from `r2` | `PARTIAL` | Seller follow action is local-only, review tab is still placeholder-heavy, review metrics are not fully real | Add seller follow/presence features or remove the affordance; finish public seller review data | High |
| `/cart` | `frontend/src/pages/buyer/CartPage.tsx` | Buyer | View cart, quantity updates, save for later, promo code, remove items | Real API | `GET /api/cart`, `PATCH /api/cart/items/{id}`, `DELETE /api/cart/items/{id}`, `PATCH /api/cart/promo` | `CommerceController` | `carts`, `cart_items`, `products`, `product_images`, `promotions` | Product images from `r2` | `LIVE` | None found in the main cart workflow | Keep and optimize | Medium |
| `/checkout` | `frontend/src/pages/orders/CheckoutPage.tsx` | Buyer | Address selection, payment selection, order placement | Real API | `GET /api/cart`, `GET /api/account/addresses`, `POST /api/checkout` | `CommerceController::checkout`, `CheckoutService`, `OrderLifecycleService` | `addresses`, `carts`, `cart_items`, `orders`, `seller_orders`, `order_items`, `payments`, `shipments` | Historical order image snapshots created from `r2` media | `LIVE` | Payment processing is simulated rather than gateway-backed, but persistence is real | Keep simulated payment provider explicit until a real gateway is introduced | High |
| `/checkout/confirmation` | `frontend/src/router.tsx` redirect | Buyer | Redirect after checkout | Redirect only | None | Router redirect only | None | None | `STATIC_BY_DESIGN` | Not a data page | None | Low |
| `/403` | `frontend/src/pages/Error403.tsx` | Any | Unauthorized notice | Static | None | None | None | None | `STATIC_BY_DESIGN` | Not intended to persist data | None | Low |
| `*` | `frontend/src/pages/NotFoundPage.tsx` | Any | 404 page | Static | None | None | None | None | `STATIC_BY_DESIGN` | Not intended to persist data | None | Low |

### Buyer / Account

| Route | Frontend file | Role | Main features/actions | Current data source | API endpoint(s) | Backend controller/service | Database tables | R2 usage | Status | Missing backend support | Recommended next step | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/account/profile` | `frontend/src/pages/account/ProfilePage.tsx` | Buyer | Profile summary, recent orders, security summary | Real API + auth session data | `GET /api/auth/me`, `GET /api/orders` | `AuthController::me`, `CommerceController::orders` | `users`, `orders`, `seller_orders`, `order_items` | Order item images may resolve from snapshot/R2 | `LIVE` | None in the main display flow | Keep | Medium |
| `/account/orders` | `frontend/src/pages/orders/OrderHistoryPage.tsx` | Buyer | Order history, filtering, seller filters, detail navigation | Real API | `GET /api/orders` | `CommerceController::orders` | `orders`, `seller_orders`, `order_items`, `products` | Snapshot/product images from `r2` | `LIVE` | None in the main history flow | Keep | Medium |
| `/account/orders/:id` | `frontend/src/pages/orders/OrderDetailPage.tsx` | Buyer | View order detail, message seller, mark received, retry payment, cancel, return, review, dispute escalation | Real API + incomplete dispute lifecycle | `GET /api/orders/{orderNumber}`, `POST /api/messages`, `POST /api/orders/{orderNumber}/seller-orders/{sellerOrder}/complete`, `POST /api/orders/{orderNumber}/payments/retry`, `POST /api/orders/{orderNumber}/seller-orders/{sellerOrder}/cancel`, `POST /api/orders/{orderNumber}/seller-orders/{sellerOrder}/returns`, `POST /api/orders/{orderNumber}/seller-orders/{sellerOrder}/returns/{returnRequest}/dispute`, review endpoints | `CommerceController`, `OrderResolutionController`, `MessagingController`, `OrderLifecycleService`, `OrderResolutionService` | `orders`, `seller_orders`, `order_items`, `payments`, `payment_transactions`, `return_requests`, `return_request_items`, `disputes`, `messages`, `reviews`, `notifications` | Snapshot images and dispute/return evidence use `r2` | `PARTIAL` | Buyer-side dispute escalation persists, but there is no full admin decision loop, no routed buyer dispute center, and historical image experience is still incomplete | Finish dispute lifecycle end-to-end and add routed buyer dispute/return tracking surfaces | Critical |
| `/account/wishlist` | `frontend/src/pages/buyer/WishlistPage.tsx` | Buyer | Load wishlist, remove item, move to cart | Real API | `GET /api/wishlists`, `DELETE /api/wishlists/{product}`, `POST /api/cart` | `CommerceController::wishlist`, `CommerceController::destroyWishlist`, `CommerceController::storeCartItem` | `wishlists`, `products`, `product_images`, `carts`, `cart_items` | Product images from `r2` | `LIVE` | None in core flow | Keep | Medium |
| `/account/messages` | `frontend/src/pages/messaging/MessagingPage.tsx` | Buyer | Conversation list, open thread, mark read, send message, upload attachments | Real API | `GET /api/messages`, `GET /api/messages/{conversation}`, `POST /api/messages/{conversation}`, `POST /api/messages/{conversation}/read`, `GET /api/messages/attachments/{attachment}` | `MessagingController` | `conversations`, `conversation_participants`, `messages`, `message_attachments` | Attachments stored privately on `r2` with temporary URLs | `LIVE` | None in the main thread flow | Keep | High |
| `/account/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` | Buyer | Notification feed, mark read, dismiss, mark all read | Real API | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`, `DELETE /api/notifications/{id}` | `ModerationController::notifications`, notification action endpoints in API layer | `notifications` | None | `LIVE` | None in the core feed actions | Keep and continue generating more domain events | High |
| `/account/personal-info` | `frontend/src/pages/account/PersonalInfoPage.tsx` | Buyer | Update name and phone | Real API | `PUT /api/account/profile` | `AccountController::updateProfile` | `users` | None | `LIVE` | None in the core form | Keep | Medium |
| `/account/security` | `frontend/src/pages/account/SecurityPage.tsx` | Buyer | Change password, show 2FA/email status | Mixed real + non-configurable security controls | `PUT /api/account/password`, `GET /api/auth/me` | `AccountController::updatePassword`, `AuthController::me` | `users`, `auth_challenges` | Email delivery external, not R2 | `PARTIAL` | Password change is real, but user-facing security settings such as 2FA toggles remain incomplete | Add dedicated security settings endpoints for 2FA/session management or simplify the UI | High |
| `/account/addresses` | `frontend/src/pages/account/AddressesPage.tsx` | Buyer | Create, edit, delete, default address | Real API | `GET /api/account/addresses`, `POST /api/account/addresses`, `PUT /api/account/addresses/{id}`, `DELETE /api/account/addresses/{id}` | `AccountController` | `addresses` | None | `LIVE` | None in persistence flow | Keep | Medium |
| `/account/preferences` | `frontend/src/pages/account/PreferencesPage.tsx` | Buyer | Save account preferences | Real API | `GET /api/account/preferences`, `PUT /api/account/preferences` | `AccountController::updatePreferences` | `users` or user preference columns | None | `LIVE` | None in persistence flow | Keep | Medium |
| `/account/reviews` | `frontend/src/pages/buyer/ReviewsPage.tsx` | Buyer | List eligible reviews, create/edit/delete review | Real API | `GET /api/reviews`, `POST /api/reviews`, `PUT /api/reviews/{review}`, `DELETE /api/reviews/{review}` | `CommerceController` | `reviews`, `orders`, `order_items`, `products`, `sellers` | Product images from `r2` | `LIVE` | None in core flow | Keep | High |
| `/account` | `frontend/src/router.tsx` redirect | Buyer | Redirect to profile | Redirect only | None | Router redirect only | None | None | `STATIC_BY_DESIGN` | Not a data page | None | Low |

Buyer route gaps:

- No reachable `/account/returns`
- No reachable `/account/refunds`
- No reachable `/account/disputes`

The backend already persists parts of returns and disputes, but page-level support is still incomplete because those flows are only partially represented through order detail.

### Seller

| Route | Frontend file | Role | Main features/actions | Current data source | API endpoint(s) | Backend controller/service | Database tables | R2 usage | Status | Missing backend support | Recommended next step | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/seller-center/onboarding` | `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx` | Public / seller applicant | Seller application submission | Real backend exists, page still needs full verification pass | `POST /api/seller/application` | `SellerApplicationController::store` | `seller_applications`, `seller_documents`, `users`, `categories` | Uploaded documents stored on `r2` | `PARTIAL` | Backend submission is real, but this public flow still needs full end-to-end polish validation | Re-verify every step and error path of the onboarding UI against the live API | High |
| `/seller-center/onboarding/status` | `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx` | Applicant | Application status view | Real backend exists, page still needs full verification pass | `GET /api/seller/applications` | `SellerApplicationController::index` | `seller_applications`, `seller_documents` | Seller document access via temporary `r2` URLs | `PARTIAL` | Status flow exists, but admin outcome integration and UX consistency still need validation | Finalize status-specific UI states and approved/rejected transitions | High |
| `/seller-center` | `frontend/src/pages/seller/SellerDashboard.tsx` | Seller | KPI dashboard, top products, recent orders | Real API | `GET /api/seller/dashboard` | `SellerController::dashboard` | `sellers`, `products`, `orders`, `seller_orders`, `order_items`, `reviews` | Product images from `r2` | `LIVE` | None in main dashboard feed | Keep | High |
| `/seller-center/products` | `frontend/src/pages/seller/ProductListPage.tsx` | Seller | List products, filters, bulk actions, delete, edit | Mixed real + stale UI hints | `GET /api/seller/products`, `DELETE /api/seller/products/{product}`, `PUT /api/seller/products/{product}` | `SellerController::products`, `SellerController::destroy`, `SellerController::update` | `products`, `product_images`, `product_variants`, `categories` | Product images on `r2` | `PARTIAL` | Core CRUD is real, but the page still contains stale “connect endpoint” copy and fake/simple pagination expectations | Remove stale stub copy and add real pagination metadata if the UI implies paging | High |
| `/seller-center/products/new` | `frontend/src/pages/seller/ProductCreationPage.tsx` | Seller | Create product, upload images, variants, inventory seed | Real API | `POST /api/seller/products` | `SellerController::store` | `products`, `product_images`, `product_variants`, `product_variant_options`, `categories` | Uploaded media stored on `r2` | `LIVE` | None in core create flow | Keep | High |
| `/seller-center/products/:id/edit` | `frontend/src/pages/seller/ProductCreationPage.tsx` | Seller | Edit product, manage media, variants, stock | Real API | `GET /api/seller/products`, `PUT /api/seller/products/{product}` | `SellerController::products`, `SellerController::update` | `products`, `product_images`, `product_variants`, `categories` | Uploaded media stored on `r2` | `LIVE` | None in core edit flow | Keep | High |
| `/seller-center/inventory` | `frontend/src/pages/seller/InventoryPage.tsx` | Seller | Inventory list, stock thresholds, stock adjustments | Real API | `GET /api/seller/products`, `PATCH /api/seller/products/{product}/inventory` | `SellerController::products`, `SellerController::updateInventory` | `products`, `product_variants`, `inventories or stock columns` | Product images from `r2` | `LIVE` | None in the core adjustment flow | Keep | High |
| `/seller-center/orders` | `frontend/src/pages/seller/SellerOrdersPage.tsx` | Seller | Fulfillment queue, status transitions, tracking, cancellation | Real API | `GET /api/seller/orders`, `PATCH /api/seller/orders/{sellerOrder}/status`, `POST /api/seller/orders/{sellerOrder}/cancel` | `SellerController::orders`, `SellerController::updateOrderStatus`, `SellerController::cancelOrder` | `seller_orders`, `orders`, `order_items`, `shipments`, `tracking_events`, `users` | Snapshot/product images from `r2` | `LIVE` | None in core fulfillment flow | Keep | Critical |
| `/seller-center/returns` | `frontend/src/pages/seller/SellerReturnsPage.tsx` | Seller | View return requests, seller responses, return status transitions | Real API + incomplete dispute completion | `GET /api/seller/returns`, `PATCH /api/seller/returns/{returnRequest}` | `SellerController::returns`, `OrderResolutionController::updateReturn`, `OrderResolutionService` | `return_requests`, `return_request_items`, `disputes`, `seller_orders`, `orders` | Evidence files use `r2` | `PARTIAL` | Seller return handling is real, but dispute outcome synchronization and admin resolution are still missing | Finish admin dispute/refund decisions and feed the final outcome back into seller/buyer return states | Critical |
| `/seller-center/reviews` | `frontend/src/pages/seller/SellerReviewsPage.tsx` | Seller | View reviews, add/update/delete seller reply | Real API with narrower feature set | `GET /api/seller/reviews`, `POST/PUT /api/seller/reviews/{review}/reply`, `DELETE /api/seller/reviews/{review}/reply` | `SellerController::reviews`, `SellerController::replyToReview`, delete reply action | `reviews`, `review_replies`, `products`, `orders` | Product images from `r2` | `PARTIAL` | Reply persistence is real, but the review-management surface is still minimal and not feature-complete versus the visible domain | Expand reply UX and moderation/history only if the product spec requires it; otherwise simplify the “partial” expectations | Medium |
| `/seller-center/customers` | `frontend/src/pages/seller/CustomersPage.tsx` | Seller | Customer list, customer order history | Real API | `GET /api/seller/customers`, `GET /api/seller/orders` | `SellerController::customers`, `SellerController::orders` | `users`, `orders`, `seller_orders`, `order_items` | None beyond order/product media | `LIVE` | None in core browsing flow | Keep | Medium |
| `/seller-center/promotions` | `frontend/src/pages/seller/PromotionsPage.tsx` | Seller | View seller promotions, promo metrics, create promo modal | Mixed real + explicit stub creation flow | `GET /api/seller/promotions` | `SellerController::promotions`, `CommerceController::promotions` | `promotions`, `promotion_redemptions`, `products`, `categories` | None | `PARTIAL` | Listing is real, but create/update/delete promo flows are still not wired | Implement full seller promotion CRUD and redemption guardrails | High |
| `/seller-center/analytics` | `frontend/src/pages/seller/AnalyticsPage.tsx` | Seller | Revenue, orders, category mix, top products | Real API | `GET /api/seller/dashboard` | `SellerController::dashboard` | `sellers`, `orders`, `seller_orders`, `order_items`, `products`, `reviews` | Product images from `r2` | `LIVE` | None in the current screen’s core flow | Keep | Medium |
| `/seller-center/store` | `frontend/src/pages/seller/StoreManagementPage.tsx` | Seller | Store profile, branding, policies, preview | Mixed real + disabled controls | `GET /api/seller/me`, `GET /api/seller/products`, `PUT /api/seller/me` | `SellerController::me`, `SellerController::updateMe` | `sellers`, `products`, `categories` | Seller logo/banner and branding media on `r2` | `PARTIAL` | Profile, branding, and policies save, but category management is disabled and preview is still presentation-heavy | Finish every visible store-management affordance or remove disabled controls that imply unsupported editing | High |
| `/seller-center/messages` | `frontend/src/pages/messaging/MessagingPage.tsx` | Seller | Conversation list, thread view, send attachments, mark read | Real API | `GET /api/messages`, `GET /api/messages/{conversation}`, `POST /api/messages/{conversation}`, `POST /api/messages/{conversation}/read`, `GET /api/messages/attachments/{attachment}` | `MessagingController` | `conversations`, `messages`, `message_attachments` | Attachments stored on `r2` | `LIVE` | None in core flow | Keep | High |
| `/seller-center/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` | Seller | Seller notification feed, mark read, dismiss, action routing | Real API | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`, `DELETE /api/notifications/{id}` | `ModerationController::notifications` and notification actions | `notifications` | None | `LIVE` | None in core feed actions | Keep and keep generating seller-specific events | High |
| `/seller-center/settings` | `frontend/src/pages/seller/SellerSettingsPage.tsx` | Seller | Account summary, payout methods, notification prefs, password, security | Mixed real + disabled settings | `GET /api/seller/me`, `PUT /api/seller/me`, `PUT /api/account/password` | `SellerController::me`, `SellerController::updateMe`, `AccountController::updatePassword` | `sellers`, `users` | None | `PARTIAL` | Payout persistence and password change are real, but account save is disabled, notification toggles are disabled, and 2FA/security management is not finished | Split this page into “real now” vs “not yet supported” sections or add the missing settings APIs | High |

### Admin

| Route | Frontend file | Role | Main features/actions | Current data source | API endpoint(s) | Backend controller/service | Database tables | R2 usage | Status | Missing backend support | Recommended next step | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin` | `frontend/src/pages/admin/AdminDashboard.tsx` | Admin | KPI cards, activity, alerts | Hardcoded frontend data | None used by page | Backend has `GET /api/admin/dashboard`, but page is not driven by it | Would need `users`, `seller_applications`, `orders`, `reports`, `notifications` | None | `MOCK` | Route exists but page does not consume the real admin dashboard API | Replace static dashboard sections with `GET /api/admin/dashboard` data | Critical |
| `/admin/users` | `frontend/src/pages/admin/UserManagementPage.tsx` | Admin | User list, search, filters, moderation actions | Hardcoded frontend array | None used by page | Backend has `GET /api/admin/users`, but page is still static | `users`, possibly `addresses`, `orders` | None | `MOCK` | UI does not use the real user-management endpoint | Bind the page to `GET /api/admin/users` and add real admin actions if required | Critical |
| `/admin/sellers` | `frontend/src/pages/admin/SellerManagementPage.tsx` | Admin | Seller applications, seller review/approval, seller list | Mixed real + static seller list | `GET /api/admin/seller-applications`, `GET /api/admin/seller-applications/{id}`, `POST /api/admin/seller-applications/{id}/approve`, `POST /api/admin/seller-applications/{id}/reject`, `GET /api/admin/seller-documents/{id}/view` | `SellerApplicationController` | `seller_applications`, `seller_documents`, `sellers`, `users`, `categories` | Seller documents use temporary `r2` URLs | `PARTIAL` | Applications tab is real, but the seller-list management tab is still hardcoded | Replace the static seller roster with a real admin sellers feed and actions | Critical |
| `/admin/products` | `frontend/src/pages/admin/AdminProductsPage.tsx` | Admin | Product table, moderation controls | Hardcoded frontend array | No admin products API wired | No current admin products controller route exposed | Would need `products`, `product_images`, `categories`, `sellers` | Product images would come from `r2` | `MOCK` | Entire page is mock; no routed admin product-management API is wired | Add admin products endpoints, then replace the static table | Critical |
| `/admin/orders` | `frontend/src/pages/admin/AdminOrdersPage.tsx` | Admin | Order table, status inspection, oversight | Hardcoded frontend array | No admin orders API wired | No current admin orders controller route exposed | Would need `orders`, `seller_orders`, `order_items`, `payments`, `shipments` | Snapshot/product images could come from `r2` | `MOCK` | Entire page is mock; no routed admin orders API is wired | Add admin orders listing/detail endpoints, then bind the page | Critical |
| `/admin/categories` | `frontend/src/pages/admin/CategoryManagementPage.tsx` | Admin | Category list, add/edit/delete category | Frontend local state only | No persistence route used | Public categories API exists, admin category CRUD does not | `categories` | None | `FRONTEND_ONLY` | Visible category management does not persist to Laravel/MySQL | Add admin category CRUD API and replace local-only state | High |
| `/admin/reports` | `frontend/src/pages/admin/ReportsModerationPage.tsx` | Admin | Report queue, moderation decisions | Hardcoded UI and stub backend report persistence | No real page binding; backend report creation is stubbed | `ModerationController::reports` returns empty data; `ModerationController::storeReport` returns success without persistence | Would need `reports`, `report_attachments`, `users`, `products`, `messages`, `conversations` | Could use `r2` for report attachments later | `MOCK` | Page is static and backend report persistence is currently stubbed | Implement real reports model/query/action flow first, then bind admin page | Critical |
| `/admin/moderation` | `frontend/src/router.tsx` redirect | Admin | Redirect to reports | Redirect only | None | Router redirect only | None | None | `STATIC_BY_DESIGN` | Not a data page | None | Low |
| `/admin/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` | Admin | Admin notification feed | Real notification feed, but actions may land on mock admin pages | `GET /api/notifications`, mark read/dismiss endpoints | `ModerationController::notifications` and notification actions | `notifications` | None | `PARTIAL` | Feed itself is real, but several admin destination pages behind notification actions are still mock | Keep feed, but complete the admin target pages it routes into | High |
| `/admin/analytics` | `frontend/src/pages/admin/AdminAnalyticsPage.tsx` | Admin | Charts, KPIs, reports | Hardcoded + generated frontend data | No admin analytics API wired | No current admin analytics controller route exposed | Would need `orders`, `users`, `sellers`, `products`, `reports` | None | `MOCK` | Entire page is still synthetic | Add admin analytics endpoints or simplify/remove the screen until real data exists | High |
| `/admin/settings` | `frontend/src/pages/admin/AdminSettingsPage.tsx` | Admin | Platform settings, toggles, preferences | Frontend local state only | No persistence route used | No admin settings API exposed | Would need platform settings tables/config layer | None | `FRONTEND_ONLY` | No backend persistence exists for the visible controls | Define a real admin settings contract before keeping editable controls | Medium |

Admin route gaps:

- No reachable `/admin/disputes`
- No reachable `/admin/returns`
- No reachable `/admin/refunds`
- No reachable payment-oversight page

This is the biggest current backend-support gap in the application.

### Auth

| Route | Frontend file | Role | Main features/actions | Current data source | API endpoint(s) | Backend controller/service | Database tables | R2 usage | Status | Missing backend support | Recommended next step | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/auth/login` | `frontend/src/pages/auth/LoginPage.tsx` | Public | Email/password login, remember me, 2FA redirect | Real API | `POST /sanctum/csrf-cookie`, `POST /api/auth/login`, `GET /api/auth/me` | `AuthController::login`, Sanctum/session stack | `users`, `auth_challenges`, session storage | Email delivery external, not R2 | `LIVE` | Social auth buttons are disabled by design and do not affect core auth | Keep | Critical |
| `/auth/two-factor` | `frontend/src/pages/auth/TwoFactorPage.tsx` | Public | OTP entry, resend, verification | Real API | `POST /api/auth/2fa/verify`, `POST /api/auth/2fa/resend` | `AuthController` | `auth_challenges`, `users` | None | `LIVE` | None in the main flow | Keep | Critical |
| `/auth/register` | `frontend/src/pages/auth/RegisterPage.tsx` | Public | Buyer registration with validation, email verification handoff | Real API | `POST /api/auth/register` | `AuthController::register` | `users` | None | `LIVE` | None in the main flow | Keep | Critical |
| `/auth/forgot-password` | `frontend/src/pages/auth/ForgotPasswordPage.tsx` | Public | Request reset link | Real API | `POST /api/auth/forgot-password` | `AuthController::forgotPassword` | `users`, `password_reset_tokens` | None | `LIVE` | None in the main flow | Keep | High |
| `/auth/verify-email` | `frontend/src/pages/auth/VerifyEmailPage.tsx` | Public / pending user | Enter email verification code, resend | Real API | `POST /api/auth/verify-email`, `POST /api/auth/resend-verification-email` | `AuthController` | `users`, verification code storage | None | `LIVE` | None in the core flow | Keep | Critical |
| `/auth/email-verified` | `frontend/src/pages/auth/EmailVerifiedPage.tsx` | Public / transitioning user | Session refresh and redirect after verification | Session check + redirect | `GET /api/auth/me` | `AuthController::me` | `users` | None | `STATIC_BY_DESIGN` | Transitional confirmation page only | None | Low |
| `/auth/reset-password` | `frontend/src/pages/auth/ResetPasswordPage.tsx` | Public | Reset password from token link | Real API | `POST /api/auth/reset-password` | `AuthController::resetPassword` | `users`, `password_reset_tokens` | None | `LIVE` | None in core flow | Keep | High |

## Stub / Placeholder Backend Findings

Confirmed repository hits that still represent backend support gaps:

| File | Finding | Impact |
| --- | --- | --- |
| `backend/app/Http/Controllers/Api/ModerationController.php` | `reports()` returns empty `data` | Admin reports page cannot become real until report query logic exists |
| `backend/app/Http/Controllers/Api/ModerationController.php` | `storeReport()` returns a success message without real persistence | Buyer/seller/admin reporting is currently not durable even if the UI says it succeeded |
| `backend/routes/console.php` | Mail/R2 test commands are diagnostic helpers only | Safe and intentional; not a product gap |
| `frontend/src/pages/seller/PromotionsPage.tsx` | “Connect the create endpoint before enabling this flow.” modal copy | Confirms promotion creation is not yet implemented |
| `frontend/src/pages/seller/ProductListPage.tsx` | Delete UI copy still implies endpoint is not connected | Backend endpoint exists, but the page still communicates like a stub |

Searches performed:

- `"scaffold"`
- `"stub"`
- `"TODO"`
- `"Not implemented"`
- `"return []"`
- `"Message sent"`
- `"Checkout endpoint scaffolded"`
- obvious success responses without persistence

Most direct high-risk stub behavior is concentrated in report/moderation and admin screens, not in buyer checkout or core seller operations.

## Mock / Hardcoded Frontend Findings

Confirmed pages/components still relying on hardcoded or frontend-only data:

| File | Current state |
| --- | --- |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Hardcoded KPI/activity/alerts |
| `frontend/src/pages/admin/UserManagementPage.tsx` | Hardcoded users array |
| `frontend/src/pages/admin/SellerManagementPage.tsx` | Real applications tab, static seller roster tab |
| `frontend/src/pages/admin/AdminProductsPage.tsx` | Hardcoded products |
| `frontend/src/pages/admin/AdminOrdersPage.tsx` | Hardcoded orders |
| `frontend/src/pages/admin/CategoryManagementPage.tsx` | Frontend-only category CRUD on local state |
| `frontend/src/pages/admin/ReportsModerationPage.tsx` | Hardcoded reports and local moderation state |
| `frontend/src/pages/admin/AdminAnalyticsPage.tsx` | Generated/mock analytics data |
| `frontend/src/pages/admin/AdminSettingsPage.tsx` | Frontend-only settings |
| `frontend/src/components/ReportDialog.tsx` | Still behaves like a fake success flow and needs real report persistence behind it |
| `frontend/src/pages/pub/HomePage.tsx` | Real catalog plus static promo/trust/stats sections |
| `frontend/src/pages/pub/CategoryPage.tsx` | Local category/subcategory filtering over broad product fetch |
| `frontend/src/pages/pub/SellerStorePage.tsx` | Real store data plus local-only follow action and placeholder review surface |
| `frontend/src/pages/seller/PromotionsPage.tsx` | Real listing + non-real create flow |
| `frontend/src/pages/seller/StoreManagementPage.tsx` | Real persistence mixed with disabled category-management affordances |
| `frontend/src/pages/seller/SellerSettingsPage.tsx` | Real payout/password mixed with disabled notification/security/account settings |

## Known Disputes Status

Current real dispute coverage:

- Buyer can escalate an eligible return from order detail
- Dispute record is stored
- Reason and buyer statement are stored
- Dispute links to return and order records
- Notifications are created

Still missing for full page-level support:

- No routed buyer disputes center
- No routed admin disputes page
- No admin disputes API for resolution workflow
- No final admin approve/reject/refund/resolve actions
- No full resolution notes/state machine exposed in UI
- No complete return/refund/dispute synchronization after admin decision

Current audit classification:

- Buyer disputes: `PARTIAL`
- Seller dispute participation: `PARTIAL`
- Admin dispute management: not reachable / not implemented

## Database / Storage Coverage Notes

Real persistence is already established for:

- authentication users and verification flows
- buyer addresses and preferences
- carts, cart items, wishlists
- checkout, orders, seller orders, order items, payments
- seller products, variants, inventory
- seller applications and seller documents
- messages and message attachments
- notifications
- reviews and seller replies
- returns and dispute creation

Real `r2` usage is already established for:

- product images
- seller logo/banner branding media
- message attachments
- seller application documents
- return/dispute evidence
- historical order image snapshots

## Recommended Implementation Order

### 1. Admin real-data conversion

Convert the routed admin area from mock to real in this order:

1. `Reports` plus real report persistence
2. `Admin dashboard`
3. `Users`
4. `Sellers` seller-list tab
5. `Products`
6. `Orders`
7. `Categories`
8. `Analytics`
9. `Settings`

Reason:

- This is the largest remaining false-backend surface in the repo.
- It also blocks dispute and moderation completion.

### 2. Disputes and returns completion

Build the missing end-to-end dispute lifecycle:

1. admin disputes API
2. admin disputes page
3. resolution actions and notes
4. final state transitions
5. buyer/seller synced post-decision updates

Reason:

- This is the most important cross-role business flow still incomplete.

### 3. Seller partial-page cleanup

Finish mixed seller screens:

1. promotions CRUD
2. seller settings missing real controls
3. store-management disabled category/presentation gaps
4. onboarding/status final polish
5. product list pagination and stale stub copy removal

### 4. Public catalog polish

Remove “dynamic-looking but static” content:

1. homepage fake metrics/trust counters where necessary
2. category backend filtering
3. seller-store follow and reviews completion
4. product-detail remaining static/supportive data

### 5. Buyer dispute/return visibility

Add routed pages for:

1. returns center
2. refunds/disputes center
3. timeline/history around admin decisions

## Practical Conclusion

Maketo is no longer a frontend-only scaffold.

The current state is:

- Buyer core commerce: mostly real
- Seller core operations: mostly real
- Public catalog: mixed but usable
- Admin area: still the main concentration of mock and frontend-only behavior
- Disputes: real creation, incomplete lifecycle

If the next implementation phase starts immediately, the highest-value target is:

1. admin real-data conversion
2. disputes completion
3. seller partial-page cleanup

