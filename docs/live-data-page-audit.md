# Maketo Live Data Page Audit

Scope:
- User / buyer / customer pages
- Seller pages
- Admin pages are intentionally excluded unless a user or seller route depends on them

Status values:
- `LIVE`
- `PARTIAL`
- `MOCK`
- `HARDCODED`
- `NOT IMPLEMENTED`

## Public Storefront

| Page | Route | Frontend file | Role | Current data source | Backend endpoint | Database source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | `frontend/src/pages/pub/HomePage.tsx` | Public | `fetchCatalogCategories`, `fetchCatalogProducts`, `fetchCatalogSellers` | `GET /api/categories`, `GET /api/products`, `GET /api/sellers` | `categories`, `products`, `product_images`, `sellers`, `seller_categories`, `inventories` | LIVE |
| Category browse | `/c/:slug` | `frontend/src/pages/pub/CategoryPage.tsx` | Public | Catalog API plus local filters/sort config | `GET /api/categories`, `GET /api/products` | `categories`, `products`, `seller_categories`, `product_images`, `inventories` | LIVE |
| Search results | `/search` | `frontend/src/pages/pub/SearchPage.tsx` | Public | Catalog API plus local suggested terms | `GET /api/products`, `GET /api/categories`, `GET /api/sellers` | `products`, `categories`, `sellers` | LIVE |
| Product details | `/p/:id` | `frontend/src/pages/pub/ProductPage.tsx` | Public | `fetchCatalogProduct`, `addCartItem`; reviews/sizes/colors still local | `GET /api/products/{slug}`, `POST /api/cart/items` | `products`, `product_images`, `product_variants`, `inventories`, `carts`, `cart_items` | PARTIAL |
| Seller store | `/s/:id` | `frontend/src/pages/pub/SellerStorePage.tsx` | Public | `fetchCatalogSeller`; follow/message actions are local | `GET /api/sellers/{slug}` | `sellers`, `seller_categories`, `products`, `product_images`, `inventories` | PARTIAL |

## Authentication

| Page | Route | Frontend file | Role | Current data source | Backend endpoint | Database source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login | `/auth/login` | `frontend/src/pages/auth/LoginPage.tsx` | Buyer / Seller / Admin | `useAuth().login` | `POST /api/auth/login` | `users`, `auth_challenges`, `sessions` | LIVE |
| Register | `/auth/register` | `frontend/src/pages/auth/RegisterPage.tsx` | Buyer / Seller | `useAuth().register` | `POST /api/auth/register` | `users`, `email_verification_codes`, `auth_challenges` | LIVE |
| Forgot password | `/auth/forgot-password` | `frontend/src/pages/auth/ForgotPasswordPage.tsx` | Buyer / Seller | `requestPasswordResetLink` | `POST /api/auth/password/forgot` | `users`, `password_reset_tokens` | LIVE |
| Verify email | `/auth/verify-email` | `frontend/src/pages/auth/VerifyEmailPage.tsx` | Buyer / Seller | `verifyEmailVerificationRequest`, `resendEmailVerificationRequest` | `POST /api/auth/email/verify`, `POST /api/auth/email/resend` | `users`, `email_verification_codes` | LIVE |
| Email verified | `/auth/email-verified` | `frontend/src/pages/auth/EmailVerifiedPage.tsx` | Buyer / Seller | Static success screen | None | None | LIVE |
| Reset password | `/auth/reset-password` | `frontend/src/pages/auth/ResetPasswordPage.tsx` | Buyer / Seller | `resetPasswordRequest` | `POST /api/auth/password/reset` | `users`, `password_reset_tokens` | LIVE |
| Two-factor | `/auth/two-factor` | `frontend/src/pages/auth/TwoFactorPage.tsx` | Buyer / Seller | `verifyTwoFactorRequest`, `resendTwoFactorRequest` | `POST /api/auth/2fa/verify`, `POST /api/auth/2fa/resend` | `users`, `two_factor_challenges` | LIVE |

## Buyer / Customer

| Page | Route | Frontend file | Role | Current data source | Backend endpoint | Database source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Buyer dashboard | `/account/dashboard` | `frontend/src/pages/buyer/BuyerDashboardPage.tsx` | Buyer | Local fixture arrays for orders, notifications, wishlist, recommendations | None yet | `orders`, `seller_orders`, `order_items`, `wishlists`, `notifications` | HARDCODED |
| Cart | `/cart` | `frontend/src/pages/buyer/CartPage.tsx` | Buyer | `fetchCart`, `updateCartItem`, `removeCartItem`, `updateCartPromo` | `GET /api/cart`, `PATCH /api/cart/items/{id}`, `DELETE /api/cart/items/{id}`, `PATCH /api/cart/promo` | `carts`, `cart_items`, `products`, `product_variants`, `inventories` | LIVE |
| Wishlist | `/account/wishlist` | `frontend/src/pages/buyer/WishlistPage.tsx` | Buyer | Local wishlist array and local add/remove state | None yet | `wishlists`, `wishlist_items`, `products` | HARDCODED |
| Checkout | `/checkout` | `frontend/src/pages/checkout/CheckoutFlow.tsx` | Buyer | Hardcoded cart sellers, hardcoded saved addresses, `Math.random`, `setTimeout` | None yet | `orders`, `seller_orders`, `order_items`, `addresses`, `payments`, `shipments` | HARDCODED |
| Checkout confirmation | `/checkout/confirmation` | `frontend/src/pages/checkout/CheckoutFlow.tsx` | Buyer | Simulated payment success screen | None yet | `orders`, `seller_orders`, `order_items`, `payments` | HARDCODED |
| Order history | `/account/orders` | `frontend/src/pages/orders/OrderHistoryPage.tsx` | Buyer | Local order array | None yet | `orders`, `seller_orders`, `order_items`, `payments`, `shipments` | HARDCODED |
| Order details | `/account/orders/:id` | `frontend/src/pages/orders/OrderDetailPage.tsx` | Buyer | Local delivery-state props and static order content | None yet | `orders`, `seller_orders`, `order_items`, `payments`, `shipments`, `conversation` | HARDCODED |
| Messages | `/account/messages` | `frontend/src/pages/messaging/MessagingPage.tsx` | Buyer | Local `CONVOS` demo data | None yet | `conversations`, `conversation_participants`, `messages`, `message_attachments` | HARDCODED |
| Notifications | `/account/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` | Buyer | Local `NOTIFICATIONS` demo data and local preference toggles | None yet | `notifications`, `notification_preferences` | HARDCODED |
| Profile | `/account/profile` | `frontend/src/pages/account/ProfilePage.tsx` | Buyer | Authenticated user from session plus hardcoded recent orders | `GET /api/auth/me` | `users`, `orders`, `wishlists` | PARTIAL |
| Security | `/account/security` | `frontend/src/pages/account/SecurityPage.tsx` | Buyer | Local password/session demo state | None yet | `users`, `sessions`, `two_factor_challenges` | HARDCODED |
| Addresses | `/account/addresses` | `frontend/src/pages/account/AddressesPage.tsx` | Buyer | Local address array and local Philippine location lists | None yet | `addresses`, `users` | HARDCODED |
| Preferences | `/account/preferences` | `frontend/src/pages/account/PreferencesPage.tsx` | Buyer | Local notification preference state | None yet | `notification_preferences`, `users` | HARDCODED |

## Seller

| Page | Route | Frontend file | Role | Current data source | Backend endpoint | Database source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Seller dashboard | `/seller-center` | `frontend/src/pages/seller/SellerDashboard.tsx` | Seller | `fetchSellerDashboard` | `GET /api/seller/dashboard` | `sellers`, `products`, `product_variants`, `inventories`, `seller_orders`, `order_items`, `promotions` | LIVE |
| Seller products | `/seller-center/products` | `frontend/src/pages/seller/ProductListPage.tsx` | Seller | `fetchSellerProducts`; bulk actions are local only | `GET /api/seller/products` | `products`, `product_images`, `product_variants`, `inventories`, `categories` | PARTIAL |
| Add / edit product | `/seller-center/products/new`, `/seller-center/products/:id/edit` | `frontend/src/pages/seller/ProductCreationPage.tsx` | Seller | Local form state, local images, local variants, local publish flow | None yet | `products`, `product_images`, `product_variants`, `inventories` | HARDCODED |
| Inventory | `/seller-center/inventory` | `frontend/src/pages/seller/InventoryPage.tsx` | Seller | `fetchSellerProducts`; stock adjustments are local only | `GET /api/seller/products` | `inventories`, `product_variants`, `products` | PARTIAL |
| Seller orders | `/seller-center/orders` | `frontend/src/pages/seller/SellerOrdersPage.tsx` | Seller | `fetchSellerOrders` | `GET /api/seller/orders` | `orders`, `seller_orders`, `order_items`, `shipments`, `payments` | LIVE |
| Customers | `/seller-center/customers` | `frontend/src/pages/seller/CustomersPage.tsx` | Seller | `fetchSellerCustomers` + `fetchSellerOrders` | `GET /api/seller/customers`, `GET /api/seller/orders` | `orders`, `seller_orders`, `order_items`, `users` | LIVE |
| Promotions | `/seller-center/promotions` | `frontend/src/pages/seller/PromotionsPage.tsx` | Seller | `fetchSellerPromotions`; create modal is local only | `GET /api/seller/promotions` | `promotions`, `promotion_redemptions`, `categories`, `products` | PARTIAL |
| Analytics | `/seller-center/analytics` | `frontend/src/pages/seller/AnalyticsPage.tsx` | Seller | `fetchSellerDashboard` | `GET /api/seller/dashboard` | `seller_orders`, `order_items`, `products`, `promotions` | LIVE |
| Store management | `/seller-center/store` | `frontend/src/pages/seller/StoreManagementPage.tsx` | Seller | `fetchSellerProfile`; brand/policy tabs are still local | `GET /api/seller/me` | `sellers`, `seller_categories`, `users` | PARTIAL |
| Seller settings | `/seller-center/settings` | `frontend/src/pages/seller/SellerSettingsPage.tsx` | Seller | `fetchSellerProfile` + authenticated user session; save buttons local | `GET /api/seller/me`, `GET /api/auth/me` | `users`, `sellers` | PARTIAL |
| Seller onboarding | `/seller-center/onboarding` | `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx` | Seller applicant | `fetchCurrentSellerApplication`, `submitSellerApplication`, `fetchCatalogCategories` | `GET /api/seller/application`, `POST /api/seller/applications`, `GET /api/categories` | `seller_applications`, `seller_application_documents`, `seller_application_categories`, `categories` | LIVE |
| Seller onboarding status | `/seller-center/onboarding/status` | `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx` | Seller applicant | Same backend application data, status view only | `GET /api/seller/application` | `seller_applications`, `seller_application_documents` | LIVE |
| Seller messages | `/seller-center/messages` | `frontend/src/pages/messaging/MessagingPage.tsx` | Seller | Local `CONVOS` demo data with seller perspective | None yet | `conversations`, `conversation_participants`, `messages` | HARDCODED |
| Seller notifications | `/seller-center/notifications` | `frontend/src/pages/notifications/NotificationCenter.tsx` | Seller | Local `NOTIFICATIONS` demo data | None yet | `notifications`, `notification_preferences` | HARDCODED |

## Notes

- `frontend/src/pages/pub/data.ts` still contains the canonical mock catalog dataset used by multiple public pages. Those values should be replaced with real backend data where the corresponding routes are expected to be live.
- Several pages use backend-backed reads but still keep local UI-only behavior for mutation actions. Those pages are marked `PARTIAL` instead of `LIVE`.
- This audit is intentionally limited to user and seller surfaces. Admin clean-up is a separate phase.
