# Maketo Seller Input / Form Persistence Audit

Date: 2026-08-19

Scope:
- Seller dashboard
- Seller product list
- Add / edit product
- Inventory
- Orders
- Customers
- Promotions
- Analytics
- Store management
- Seller settings
- Seller onboarding
- Seller notifications
- Seller messages

Status legend:
- `LIVE` = the control persists to the backend and maps to real database data
- `PARTIAL` = some controls persist, but the page still contains local-only or read-only controls
- `FRONTEND_ONLY` = the control only affects local UI state
- `DISPLAY_ONLY` = the control renders stored data but does not write it
- `BROKEN` = the control is present but currently fails

## Summary

- The seller product, store profile, payout, password, inventory, onboarding, and notification flows now have real backend persistence.
- Several seller pages still contain local-only UI helpers such as filters, category add buttons, branding/policy editors, and notification preference toggles.
- Seller messages remain the main seller-area surface that is still demo-data driven.

## Page-by-page audit

### Seller dashboard

- Route: `/seller-center`
- File: `frontend/src/pages/seller/SellerDashboard.tsx`
- Backend: `GET /api/seller/dashboard`
- Database: `sellers`, `products`, `product_variants`, `inventories`, `seller_orders`, `order_items`, `promotions`
- Status: `LIVE`

Controls and data:
- Summary cards: live data from the seller dashboard payload.
- Sales / orders charts: live data, rendered client-side from backend values.
- Recent orders list: live data.
- Top products table: live data.
- Time range controls: frontend-only chart filters, no persistence needed.

### Seller product list

- Route: `/seller-center/products`
- File: `frontend/src/pages/seller/ProductListPage.tsx`
- Backend: `GET /api/seller/products`, `PATCH /api/seller/products/{product}`, `DELETE /api/seller/products/{product}`
- Database: `products`, `product_images`, `product_variants`, `inventories`, `categories`
- Status: `PARTIAL`

Controls and data:
- Search box: frontend-only filtering.
- Status filter: frontend-only filtering.
- Select all / row checkboxes: frontend-only selection state.
- Bulk publish: persists through the backend update endpoint.
- Bulk archive: persists through the backend update endpoint.
- Bulk delete: persists through the backend delete endpoint.
- Row edit action: navigates to the live edit form.
- Row delete action: persists through the backend delete endpoint.

### Add / edit product

- Route: `/seller-center/products/new` and `/seller-center/products/:id/edit`
- File: `frontend/src/pages/seller/ProductCreationPage.tsx`
- Backend: `GET /api/seller/products/{product}`, `POST /api/seller/products`, `PATCH /api/seller/products/{product}`
- Database: `products`, `product_images`, `product_variants`, `variant_options`, `inventories`, `categories`
- Status: `LIVE`

Controls and data:
- Category select: persisted to `products.category_id`.
- Product name: persisted to `products.name`.
- Description: persisted to `products.description`.
- Tags: persisted to `products.tags` as JSON.
- SKU: persisted to `products.sku`.
- Barcode: persisted to `products.barcode`.
- Price / sale price / cost price: persisted to `products.price`, `products.sale_price`, `products.cost_price`.
- Stock quantity / low stock threshold / track inventory: persisted to `products.stock_quantity`, `products.low_stock_threshold`, `products.track_inventory`.
- Free shipping and delivery type: persisted to `products.free_shipping`, `products.delivery_type`.
- Status selector: persisted to `products.status`.
- Weight and dimensions: persisted to `products.weight_grams`, `products.length_cm`, `products.width_cm`, `products.height_cm`.
- Images upload / reorder / primary image: persisted to `product_images`.
- Variant builder: persisted to `product_variants` and `variant_options`.
- Draft / publish actions: persisted through the same backend product save flow.

### Inventory

- Route: `/seller-center/inventory`
- File: `frontend/src/pages/seller/InventoryPage.tsx`
- Backend: `GET /api/seller/products`, `PATCH /api/seller/products/{product}/inventory`
- Database: `products`, `product_variants`, `inventories`
- Status: `LIVE`

Controls and data:
- Search box: frontend-only filtering.
- Stock status filter: frontend-only filtering.
- Adjust stock modal: persists to the backend inventory endpoint.
- Quantity preview: frontend-only preview state.

### Seller orders

- Route: `/seller-center/orders`
- File: `frontend/src/pages/seller/SellerOrdersPage.tsx`
- Backend: `GET /api/seller/orders`
- Database: `orders`, `seller_orders`, `order_items`, `payments`, `shipments`
- Status: `LIVE`

Controls and data:
- Search, filter, and sort controls: frontend-only query helpers.
- Order cards and order status badges: live backend data.
- No seller-side write form is present yet.

### Customers

- Route: `/seller-center/customers`
- File: `frontend/src/pages/seller/CustomersPage.tsx`
- Backend: `GET /api/seller/customers`, `GET /api/seller/orders`
- Database: `orders`, `seller_orders`, `order_items`, `users`
- Status: `LIVE`

Controls and data:
- Customer list and order history: live backend data.
- Search / selection helpers: frontend-only UI state.
- No seller-side write form is present yet.

### Promotions

- Route: `/seller-center/promotions`
- File: `frontend/src/pages/seller/PromotionsPage.tsx`
- Backend: `GET /api/seller/promotions`
- Database: `promotions`, `promotion_redemptions`, `categories`, `products`
- Status: `PARTIAL`

Controls and data:
- Filter chips and search helpers: frontend-only UI state.
- Promotion cards: live backend data.
- Create promotion modal: currently local-only and not persisted.
- Promotion action buttons: some actions are still mock or placeholder behavior.

### Analytics

- Route: `/seller-center/analytics`
- File: `frontend/src/pages/seller/AnalyticsPage.tsx`
- Backend: `GET /api/seller/dashboard`
- Database: `seller_orders`, `order_items`, `products`, `promotions`
- Status: `LIVE`

Controls and data:
- Time range selector: frontend-only chart filter.
- Charts and KPI cards: live backend data, rendered client-side.
- Product performance tables: live backend data.

### Store management

- Route: `/seller-center/store`
- File: `frontend/src/pages/seller/StoreManagementPage.tsx`
- Backend: `GET /api/seller/me`, `PATCH /api/seller/me`
- Database: `sellers`, `seller_categories`, `users`
- Status: `PARTIAL`

Controls and data:
- Store name: persisted.
- Store slug: display-only.
- Tagline: persisted.
- Store description: persisted.
- Public email: persisted.
- Public phone / Viber: persisted.
- Business address: persisted.
- Operating hours rows: persisted to the seller profile JSON field.
- Category chips: display-only backend data.
- Add category button: frontend-only and not wired to a persistence endpoint yet.
- Branding tab: display-only.
- Policies tab: frontend-only textareas, not persisted yet.

### Seller settings

- Route: `/seller-center/settings`
- File: `frontend/src/pages/seller/SellerSettingsPage.tsx`
- Backend: `GET /api/seller/me`, `PATCH /api/seller/me`, `PATCH /api/account/password`
- Database: `users`, `sellers`
- Status: `PARTIAL`

Controls and data:
- Personal info fields: display-only values from the authenticated session.
- Change password fields: persisted through the account password endpoint.
- Payout method: persisted through the seller profile endpoint.
- Bank name: persisted.
- Account type: frontend-only helper state.
- Account number: persisted and formatted for display.
- Account name: persisted.
- Payout schedule: persisted.
- Notifications tab: frontend-only toggle matrix, not yet saved to the backend.
- Danger zone buttons: disabled / display-only.

### Seller onboarding

- Route: `/seller-center/onboarding` and `/seller-center/onboarding/status`
- File: `frontend/src/pages/seller/onboarding/SellerOnboarding.tsx`
- Backend: `GET /api/seller/application`, `POST /api/seller/applications`, supporting document upload endpoints
- Database: `seller_applications`, `seller_application_documents`, `seller_application_categories`, `categories`
- Status: `LIVE`

Controls and data:
- Seller application form: persisted.
- Document uploads: persisted.
- Category selection: persisted.
- Status view: display-only backend data.

### Seller notifications

- Route: `/seller-center/notifications`
- File: `frontend/src/pages/notifications/NotificationCenter.tsx`
- Backend: backend notification feed, mark-read, dismiss, and unread count endpoints
- Database: `notifications`
- Status: `LIVE`

Controls and data:
- Notification list: live backend data.
- Mark as read: persisted.
- Dismiss single / dismiss all: persisted.
- Category tabs and filters: frontend-only UI state.

### Seller messages

- Route: `/seller-center/messages`
- File: `frontend/src/pages/messaging/MessagingPage.tsx`
- Backend: no seller message persistence endpoint is wired yet in the current seller surface
- Database: `conversations`, `conversation_participants`, `messages`
- Status: `FRONTEND_ONLY`

Controls and data:
- Conversation list: still demo data.
- Message composer: still local behavior.
- Read state and message persistence: not yet wired on the seller surface.

## Field-level persistence notes

- `SellerController@store` and `SellerController@update` now persist seller products, images, variants, and inventory data.
- `SellerController@updateMe` now persists seller store profile and payout details.
- `AccountController@updatePassword` now persists password changes with the same complexity rules as registration.
- Seller onboarding already persists documents and category selections.
- Notification persistence is backend-driven; seller notification counters should reflect database rows rather than mock counts.

## Still not persisted

- Seller message demo data
- Store branding upload/editor tab
- Store policy textareas
- Seller notification preference toggles
- Add category shortcut in store management
- Danger-zone actions in seller settings

## Verification

- Frontend build completed successfully after the seller persistence wiring.
- Laravel syntax checks passed for the updated seller and account controllers.

