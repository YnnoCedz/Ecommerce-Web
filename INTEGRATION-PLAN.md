# MAKETO — FRONTEND / BACKEND / DATABASE INTEGRATION MASTER PLAN

## IMPORTANT PROJECT RULES

This is a real multi-seller marketplace application.

The current frontend contains mock/demo data and simulated flows.
The Laravel backend is partially scaffolded.
The MySQL database exists but currently contains NO application data.

The goal is to turn the existing project into a fully connected application without unnecessarily redesigning the existing UI.

### Technology

Frontend:
- React
- TypeScript
- Vite
- Existing frontend UI/design must be preserved unless a change is required for functionality.

Backend:
- Laravel
- PHP
- Laravel Sanctum
- MySQL

Database:
- MySQL
- Database name: maketo

Project:
C:\Users\Ynno\Ecommerce-WEB

Frontend:
C:\Users\Ynno\Ecommerce-WEB\frontend

Backend:
C:\Users\Ynno\Ecommerce-WEB\backend

## CRITICAL RULES FOR CODEX

1. READ THE ENTIRE PROJECT BEFORE MAKING MAJOR CHANGES.

2. READ:
   - MAKETO-SYSTEM-SPEC.md
   - docs/database/schema.md
   - docs/database/schema-review.md
   - docs/database/frontend-data-inventory.md
   - this file

3. Inspect the existing:
   - React routes
   - pages
   - API client
   - Laravel routes
   - controllers
   - models
   - services
   - middleware
   - migrations
   - seeders
   - .env files

4. DO NOT replace the existing frontend design with a new design.

5. DO NOT delete existing functionality simply because it is currently mocked.

6. Replace mock/demo behavior with real API behavior progressively.

7. The MySQL database is currently EMPTY.
   Therefore migrations and seeders must be designed so the project can be installed from a clean database.

8. NEVER rely on existing database records being present.

9. Do not hardcode user IDs, seller IDs, product IDs, order IDs, etc.

10. All important business rules must be enforced by the Laravel backend.
    Frontend validation is only for user experience.

11. Never trust:
    - user_id
    - seller_id
    - role
    - price
    - stock
    - order ownership
    - permissions
    when they come from the frontend.

12. Use Laravel authorization/policies/middleware for protected operations.

13. Use database transactions for:
    - registration where appropriate
    - checkout
    - order creation
    - inventory deduction
    - seller order creation
    - payment-related state changes

14. Do not create duplicate tables or duplicate migrations if the functionality already exists.

15. Prefer additive migrations when modifying the existing schema.

16. Do not modify the existing broad migration unless there is a strong reason.
    Create additional migrations for schema corrections when appropriate.

17. Do not implement fake API responses just to make the frontend appear connected.

18. Every frontend API request must correspond to a real Laravel endpoint.

19. Every API endpoint must have proper validation and error handling.

20. Keep API response structures consistent.

21. Do not expose sensitive information such as:
    - password hashes
    - OTP secrets
    - internal security tokens
    - sensitive seller documents
    - admin-only information

22. Do not commit real secrets into source code.

23. APP_KEY must be generated/configured correctly for local development.

24. CORS and Sanctum configuration must work with the actual frontend URL.

25. If something is ambiguous, inspect the specification and existing code first.
    Do not arbitrarily invent a new architecture.

---

# PHASE 0 — PROJECT AUDIT

Before modifying code:

1. Inspect the complete frontend structure.
2. Inspect the complete Laravel structure.
3. Inspect migrations.
4. Inspect models.
5. Inspect API routes.
6. Inspect controllers/services.
7. Inspect frontend API client.
8. Inspect authentication pages.
9. Inspect seller pages.
10. Inspect admin pages.
11. Inspect cart/checkout/order pages.

Create:

docs/integration-audit.md

Document:

- existing functionality
- missing functionality
- duplicate functionality
- schema mismatches
- frontend/API mismatches
- security problems
- routes that are currently fake
- pages using mock data
- required API endpoints

DO NOT begin large implementation changes until this audit is complete.

---

# PHASE 1 — DATABASE FOUNDATION

The database is currently EMPTY.

Make sure:

php artisan migrate:fresh

can create the database structure successfully.

Then implement:

php artisan db:seed

with clean development seed data.

Required:

- users
- roles/authorization structure
- seller structure
- seller applications
- seller documents
- categories
- products
- product images
- variants
- inventory
- carts
- cart items
- orders
- seller orders
- order items
- addresses
- reviews
- reports
- messages
- notifications
- OTP/2FA structures
- any other tables required by MAKETO-SYSTEM-SPEC.md

Do not seed random fake production-like data unnecessarily.

Create a small predictable development dataset.

Create an environment-controlled development admin account.

Do not hardcode a production administrator.

Verify:

php artisan migrate:status

---

# PHASE 2 — AUTHENTICATION

Implement real authentication FIRST before connecting the rest of the application.

Required:

### Registration

Frontend:

RegisterPage.tsx

Backend:

AuthController
routes/api.php
validation
User model

Registration must:

- validate first name
- validate last name
- validate email
- validate phone
- validate password
- confirm password
- prevent duplicate email
- prevent duplicate phone where required
- securely hash password
- create the correct account status
- handle email verification if required

### Login

Implement:

POST /api/auth/login

Return a consistent response.

Handle:

- invalid credentials
- unverified account
- suspended account
- pending approval where applicable
- 2FA required
- successful authentication

### Logout

Implement real logout.

### Current User

Implement:

GET /api/auth/me

Frontend must use this to restore authentication state.

### Authentication Persistence

Refreshing the browser must NOT automatically log the user out if the authentication system is configured to persist the session/token.

---

# PHASE 3 — 2FA

Implement real 2FA.

Required:

- generate OTP/challenge
- expiration
- one-time use
- resend cooldown
- maximum attempts
- invalid OTP handling
- successful verification
- expired OTP handling
- rate limiting
- cleanup of expired challenges

Do NOT store plain OTP values unnecessarily.

Use secure storage/hashing where appropriate.

The frontend must have:

- OTP screen
- loading state
- invalid OTP state
- expired OTP state
- resend countdown
- resend action
- successful verification state

2FA must be integrated into the login process rather than being an isolated demo page.

---

# PHASE 4 — AUTHORIZATION / ADMIN LOGIC

Implement real roles.

At minimum:

- customer/buyer
- seller
- admin

Use the terminology defined by the project specification.

Do not rely only on frontend route hiding.

Implement backend authorization.

Admin must be able to:

- manage users
- approve/reject sellers
- manage categories
- manage products where applicable
- manage orders
- manage reports
- manage moderation
- view platform information
- manage relevant platform settings

Seller must NOT be able to access admin APIs.

Customer must NOT be able to access seller/admin APIs.

Users must not be able to access another user's private resources.

Sellers must not access another seller's private resources.

---

# PHASE 5 — FRONTEND AUTH INTEGRATION

Connect:

frontend/src/pages/auth/LoginPage.tsx

frontend/src/pages/auth/RegisterPage.tsx

and related authentication screens to the real Laravel API.

Remove simulated authentication.

Use:

frontend/src/api/client.ts

as the centralized API layer.

Create appropriate:

- auth API functions
- auth state/context/store
- request handling
- error handling
- loading handling
- logout handling
- current-user restoration

Protected frontend routes must use actual authentication state.

---

# PHASE 6 — PRODUCT / CATALOG

Replace:

frontend/src/pages/pub/data.ts

mock catalog behavior with API data.

Implement:

- categories
- category tree
- products
- product details
- product images
- variants
- inventory availability
- search
- filtering
- pagination

Frontend should request real data from Laravel.

Backend must control:

- product visibility
- stock
- seller ownership
- prices
- active/inactive status

---

# PHASE 7 — CART

Connect the real cart.

Required:

- add product
- update quantity
- remove item
- select items
- calculate totals
- validate inventory
- validate product availability

Cart state must be persisted server-side for authenticated users.

Do not trust frontend totals.

The backend must calculate:

- subtotal
- discounts
- shipping
- applicable fees
- total

---

# PHASE 8 — CHECKOUT

Implement real checkout.

The backend must:

1. Validate authenticated customer.
2. Validate selected cart items.
3. Validate product status.
4. Validate variants.
5. Validate inventory.
6. Calculate authoritative prices.
7. Calculate totals.
8. Create the main order.
9. Split order by seller.
10. Create order items.
11. Save historical price/product information.
12. Deduct/reserve inventory appropriately.
13. Use database transactions.
14. Return the created order.

Checkout must not depend on frontend-calculated prices.

---

# PHASE 9 — ORDERS

Connect:

- customer orders
- order details
- seller orders
- seller fulfillment
- admin order management

Customer can only see their own orders.

Seller can only see seller orders belonging to that seller.

Admin can see platform orders according to authorization.

Implement valid order state transitions.

Do not allow arbitrary status changes from the frontend.

---

# PHASE 10 — SELLER SYSTEM

Connect seller pages to the backend.

Implement:

- seller application
- seller approval
- seller documents
- seller profile
- seller dashboard
- products
- inventory
- orders
- shipping/fulfillment
- seller statistics

Seller application status must be controlled by backend.

Admin approval/rejection must be persisted in database.

---

# PHASE 11 — ADMIN SYSTEM

Connect admin dashboard to real data.

Implement:

- dashboard statistics
- users
- sellers
- seller applications
- categories
- products
- orders
- reports
- moderation
- notifications where required

All admin endpoints must have backend authorization.

Never rely on hiding the admin UI.

---

# PHASE 12 — ADDRESS SYSTEM

Implement Philippine address hierarchy according to the project specification.

The frontend should not simply submit arbitrary text for every locality field if the specification requires structured PSGC data.

Backend must validate the selected hierarchy.

---

# PHASE 13 — REVIEWS / REPORTS / MESSAGES / NOTIFICATIONS

Connect the remaining systems.

Implement real database-backed:

- reviews
- replies
- reports
- messages
- notifications

Enforce ownership and permissions.

---

# PHASE 14 — REMOVE MOCK DATA

Search the entire frontend for:

- mock
- demo
- fake
- sample
- hardcoded products
- hardcoded users
- fake orders
- simulated login
- simulated checkout
- setTimeout-based fake API behavior
- static dashboard numbers

Replace these with real API calls where they represent application data.

Do NOT remove legitimate static UI configuration.

---

# PHASE 15 — ENVIRONMENT

Verify:

backend/.env

Must contain a valid APP_KEY.

Verify:

- DB_HOST
- DB_PORT
- DB_DATABASE
- DB_USERNAME
- DB_PASSWORD
- APP_URL
- Sanctum configuration
- CORS
- mail configuration if required
- OTP configuration

Frontend must have:

VITE_API_BASE_URL

configured for the Laravel backend.

Do not hardcode environment-specific URLs inside React components.

---

# PHASE 16 — TESTING

Perform a clean installation test.

Use:

php artisan migrate:fresh --seed

Then verify:

php artisan migrate:status

Run:

php artisan route:list

Run:

php artisan optimize:clear

Verify Composer:

composer dump-autoload

Frontend:

npm install
npm run build

Backend:

php artisan test

Fix all errors.

---

# END-TO-END TEST

Test this exact flow:

1. Open website.
2. Register customer.
3. Verify registration.
4. Login.
5. Trigger 2FA.
6. Enter OTP.
7. Reach customer dashboard.
8. Browse products from database.
9. Open product.
10. Add product to cart.
11. Update quantity.
12. Checkout.
13. Create order.
14. Verify order in database.
15. Login as seller.
16. Seller sees appropriate seller order.
17. Seller updates fulfillment status.
18. Customer sees updated order status.
19. Login as admin.
20. Admin sees platform data.
21. Admin approves/rejects seller.
22. Verify authorization by attempting unauthorized endpoints.

---

# FINAL REQUIREMENT

Do not stop after creating endpoints.

The task is NOT complete until:

DATABASE
      ↓
LARAVEL API
      ↓
FRONTEND API CLIENT
      ↓
REACT STATE
      ↓
UI

is actually connected for the implemented features.

Every important action must persist to MySQL and be retrievable from the backend.

At the end, provide:

1. Files changed
2. Migrations added
3. API endpoints added
4. Frontend pages connected
5. Authentication flow
6. 2FA flow
7. Authorization implementation
8. Admin implementation
9. Seller implementation
10. Database setup commands
11. Environment variables required
12. Tests performed
13. Remaining issues, if any

Do not claim something is implemented unless it was actually tested.