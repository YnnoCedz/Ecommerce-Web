You are the senior full-stack engineer responsible for integrating my entire Maketo ecommerce system.

PROJECT:
Maketo — multi-seller ecommerce platform

CURRENT STACK:
- Frontend: existing frontend in this repository
- Backend: Laravel backend
- Database: MySQL
- Database name: maketo
- Authentication: Laravel authentication/API authentication
- 2FA: implement securely using email OTP or authenticator-based 2FA depending on what the existing project already supports
- Development environment: Windows + MySQL Workbench
- Existing backend path:
  C:\Users\Ynno\Ecommerce-WEB\backend

IMPORTANT CURRENT DATABASE STATE:
The MySQL database `maketo` currently contains NO application data.

Do NOT assume that users, admins, sellers, products, orders, carts, addresses, etc. already exist.

The database schema/migrations exist or are being prepared, but there are currently no real records.

IMPORTANT:
Do NOT just make the frontend look connected.
Actually integrate:
FRONTEND → BACKEND API → DATABASE → BACKEND RESPONSE → FRONTEND STATE/UI.

Do not use fake/mock/hardcoded authentication, users, products, orders, admin records, etc.

==================================================
MAIN OBJECTIVE
==================================================

Properly integrate the existing frontend, Laravel backend, and MySQL database into one working ecommerce application.

Start from:

1. Registration
2. Login
3. Logout
4. Authentication/session/token handling
5. 2FA
6. User profile
7. Address management
8. Role-based authorization
9. Admin authentication
10. Admin dashboard
11. Admin applicant/user management
12. Seller application/approval
13. Seller management
14. Product management
15. Categories
16. Cart
17. Checkout
18. Orders
19. Seller orders
20. Notifications
21. Reviews
22. Messaging
23. Other existing frontend functionality

Do not redesign the frontend unless necessary.

Use the existing UI and connect it to real backend functionality.

==================================================
PHASE 0 — INSPECT THE ENTIRE PROJECT FIRST
==================================================

Before changing code, inspect the repository thoroughly.

Identify:

- frontend framework
- frontend entry points
- routes
- components
- pages
- forms
- API services
- authentication UI
- admin UI
- seller UI
- customer UI
- existing Laravel routes
- controllers
- models
- middleware
- migrations
- seeders
- config files
- .env
- database connection
- existing authentication implementation
- CORS configuration
- storage configuration
- uploaded files
- existing API endpoints

Create a clear internal map:

FRONTEND
    ↓
API CLIENT
    ↓
LARAVEL ROUTES
    ↓
CONTROLLERS
    ↓
SERVICES
    ↓
MODELS
    ↓
MYSQL

Do not start blindly modifying files.

Look for duplicate implementations and conflicting authentication systems.

Preserve working code when possible.

==================================================
PHASE 1 — DATABASE VERIFICATION
==================================================

Inspect every existing migration.

Verify that the schema properly supports the ecommerce requirements.

At minimum verify support for:

USERS
- id
- first_name
- last_name
- email
- phone
- password
- role
- account status
- email verification
- 2FA settings
- timestamps

ROLES:
- customer
- seller
- admin

SELLER APPLICATIONS
- applicant
- business information
- categories
- documents
- application status
- admin review
- rejection reason
- timestamps

SELLERS
- user relationship
- seller information
- approval status

CATEGORIES
- hierarchical categories if already designed

PRODUCTS
- seller
- category
- name
- description
- price
- status
- images
- inventory

PRODUCT VARIANTS
- variant information
- SKU
- price
- inventory

CARTS
CART ITEMS

ORDERS
SELLER ORDERS
ORDER ITEMS

ADDRESSES

PAYMENTS
if already included in the architecture

REVIEWS
REVIEW REPLIES
REVIEW REPORTS

MESSAGES
MESSAGE PARTICIPANTS

NOTIFICATIONS

WISHLIST
if included in the frontend

COUPONS/PROMOTIONS
if included in the existing design

AUDIT LOGS
if included in the admin architecture

2FA / OTP TABLES
if required by the implementation

IMPORTANT:
Use proper foreign keys.
Use appropriate indexes.
Use unique constraints where necessary.
Use nullable fields only when logically appropriate.
Use cascading behavior carefully.

Do NOT delete existing migrations simply to make errors disappear.

If the existing migration structure is incorrect, fix it properly.

==================================================
PHASE 2 — EMPTY DATABASE STRATEGY
==================================================

The database has NO real application data.

Therefore:

Do NOT rely on existing users.

Do NOT assume an admin exists.

Create a development seeder strategy.

Create:

DatabaseSeeder

and appropriate seeders/factories if needed.

Create exactly one development admin account.

Do NOT hardcode a real production password in documentation.

Use environment variables for development admin credentials, for example:

ADMIN_EMAIL
ADMIN_PASSWORD

The seeder should create the admin only if it does not already exist.

Also optionally create realistic development data for:

- categories
- demo seller
- demo customer
- demo products
- demo orders

BUT clearly separate:

DEVELOPMENT SEED DATA

from:

PRODUCTION DATA.

Do not automatically create demo data in production.

==================================================
PHASE 3 — AUTHENTICATION
==================================================

Implement real authentication.

Registration flow:

Frontend registration form
        ↓
Laravel API
        ↓
Validation
        ↓
Password hashing
        ↓
User creation
        ↓
Email verification / 2FA
        ↓
Authenticated session/token
        ↓
Frontend authenticated state

Validate:

- first name
- last name
- email
- phone
- password
- confirm password
- address fields if registration requires them
- duplicate email
- duplicate phone where appropriate
- password strength

Never store plaintext passwords.

Use Laravel's secure password hashing.

Return proper validation errors.

Do not expose sensitive information.

==================================================
PHASE 4 — LOGIN
==================================================

Implement:

POST /login

Flow:

Frontend
    ↓
Laravel
    ↓
Validate credentials
    ↓
Check account status
    ↓
Check role
    ↓
Check 2FA requirement
    ↓
Issue authenticated session/token
    ↓
Return authenticated user information
    ↓
Frontend updates auth state
    ↓
Redirect according to role

Possible roles:

CUSTOMER
SELLER
ADMIN

Do NOT allow frontend-only role checking.

Authorization must also happen on the backend.

Example:

A user cannot become admin simply by changing:

localStorage
React state
URL
request payload
frontend role variable

==================================================
PHASE 5 — 2FA
==================================================

Implement secure 2FA.

Do not create fake 2FA.

Use a proper implementation compatible with Laravel.

The flow should be:

LOGIN
 ↓
Credentials valid
 ↓
2FA required?
 ↓
YES
 ↓
Generate OTP / authentication challenge
 ↓
Send through configured verification method
 ↓
User enters code
 ↓
Backend validates code
 ↓
Code expires
 ↓
Prevent reuse
 ↓
Rate limit attempts
 ↓
Authenticated session/token issued

Security requirements:

- OTP expiration
- hashed OTP storage where appropriate
- attempt limits
- resend cooldown
- rate limiting
- one-time use
- invalidate previous OTP when generating a new one
- prevent user enumeration
- never return OTP in API response
- never log OTP in production

For development, provide a safe development mechanism if email/SMS is not configured, but clearly mark it as development-only.

Do not weaken production security.

==================================================
PHASE 6 — FRONTEND AUTH STATE
==================================================

Connect the frontend authentication state to the actual Laravel backend.

Implement:

- login state
- logout
- current user
- session persistence
- token/session expiration handling
- unauthorized handling
- loading states
- API errors
- validation errors

Create/reuse a centralized API client.

Do not make every component independently call fetch/axios with duplicated authentication logic.

Use a consistent structure such as:

api/
services/
auth/
middleware/

depending on the existing frontend architecture.

==================================================
PHASE 7 — ROLE-BASED ACCESS CONTROL
==================================================

Implement backend authorization.

CUSTOMER:
- customer pages
- cart
- checkout
- orders
- profile
- addresses
- reviews
- messaging where permitted

SELLER:
- seller dashboard
- seller application
- products
- inventory
- seller orders
- shipping
- seller messages
- seller profile

ADMIN:
- admin dashboard
- users
- sellers
- seller applications
- categories
- products
- orders
- reports
- moderation
- notifications
- system management

IMPORTANT:

Never rely only on frontend route guards.

Every protected Laravel endpoint must enforce authorization.

==================================================
PHASE 8 — ADMIN SYSTEM
==================================================

Implement real admin logic.

Admin login:

/login
 ↓
credentials
 ↓
2FA if required
 ↓
role=admin
 ↓
admin session/token
 ↓
admin dashboard

Admin must be able to:

1. View users
2. Search users
3. Filter users
4. View user details
5. Approve/reject users if approval workflow exists
6. Suspend/deactivate users
7. Archive users where supported
8. View seller applications
9. Review seller documents
10. Approve seller
11. Reject seller
12. Provide rejection reason
13. Manage sellers
14. Manage categories
15. Manage products
16. Moderate reported content
17. View orders
18. View platform statistics
19. Manage notifications
20. Access audit logs if included

Every admin action must be authorized server-side.

==================================================
PHASE 9 — SELLER APPLICATION
==================================================

Implement:

Customer/User
 ↓
Seller Application
 ↓
Upload required documents
 ↓
Select one or more seller categories
 ↓
Submit application
 ↓
Pending
 ↓
Admin reviews
 ↓
Approved / Rejected
 ↓
If approved:
Seller account activated
 ↓
Seller dashboard becomes available

Do not allow users to access seller functionality merely because they changed a frontend role.

==================================================
PHASE 10 — PRODUCTS
==================================================

Connect product frontend to Laravel.

Implement:

- product listing
- product details
- category filtering
- search
- seller products
- product creation
- product editing
- product deletion/archiving
- image upload
- variants
- inventory

Seller can only modify their own products.

Admin can manage products according to admin permissions.

Customers can only read published/available products.

==================================================
PHASE 11 — CART
==================================================

Connect cart to database.

Support:

- multiple sellers
- multiple products
- quantities
- variants
- inventory validation
- remove item
- update quantity
- selected checkout items

IMPORTANT:

The frontend must NOT be the authority for price or inventory.

At checkout, Laravel must re-query:

- product
- variant
- seller
- price
- inventory
- product status

Never trust frontend-submitted prices.

==================================================
PHASE 12 — CHECKOUT
==================================================

Implement server-side checkout.

Flow:

Cart
 ↓
Selected items
 ↓
Laravel validates items
 ↓
Validate inventory
 ↓
Validate prices
 ↓
Validate address
 ↓
Calculate totals
 ↓
Create order
 ↓
Create seller_orders
 ↓
Create order_items
 ↓
Update inventory
 ↓
Clear purchased cart items
 ↓
Return order result

Use database transactions.

If anything fails:

ROLLBACK.

Do not create partial orders.

==================================================
PHASE 13 — ORDER ARCHITECTURE
==================================================

Maintain:

orders
seller_orders
order_items

One customer order can contain products from multiple sellers.

Example:

Order #1001
 ├── Seller A
 │    ├── Product 1
 │    └── Product 2
 │
 └── Seller B
      ├── Product 3
      └── Product 4

Seller A must only see their seller_order.

Seller B must only see their seller_order.

Customer sees the parent order and its seller-specific details.

Admin can see everything.

==================================================
PHASE 14 — API DESIGN
==================================================

Inspect existing routes first.

Do not create duplicate endpoints.

Use RESTful conventions where appropriate.

Examples:

POST   /api/register
POST   /api/login
POST   /api/logout
GET    /api/user
POST   /api/2fa/verify

GET    /api/products
GET    /api/products/{id}

POST   /api/seller/applications

GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/{id}
DELETE /api/cart/items/{id}

POST   /api/checkout

GET    /api/orders
GET    /api/orders/{id}

Admin:

GET    /api/admin/users
GET    /api/admin/seller-applications
PATCH  /api/admin/seller-applications/{id}
GET    /api/admin/products
GET    /api/admin/orders

Use the existing architecture where it already has equivalent routes.

==================================================
PHASE 15 — ERROR HANDLING
==================================================

Every API should return consistent responses.

Validation errors:

HTTP 422

Unauthenticated:

HTTP 401

Unauthorized:

HTTP 403

Not found:

HTTP 404

Server errors:

HTTP 500

Do not expose stack traces in production responses.

Frontend must display useful user-friendly errors.

==================================================
PHASE 16 — SECURITY
==================================================

Review the entire application for:

- SQL injection
- mass assignment
- broken authorization
- IDOR
- insecure file upload
- password exposure
- session issues
- CSRF where applicable
- CORS
- rate limiting
- brute force login
- 2FA bypass
- privilege escalation
- insecure direct object references
- trusting frontend prices
- trusting frontend roles
- trusting frontend inventory
- unauthorized seller access
- unauthorized admin access

Never use:

DB::raw()

or raw SQL

unless actually necessary and safely parameterized.

Use Laravel validation, policies, middleware, Form Requests, Eloquent relationships, and transactions appropriately.

==================================================
PHASE 17 — PHILIPPINE ADDRESS SYSTEM
==================================================

Integrate Philippine address selection.

Use a reliable PSGC source.

Address hierarchy:

Region
 ↓
Province
 ↓
City/Municipality
 ↓
Barangay
 ↓
Street / House Number
 ↓
Postal Code

Do not hardcode thousands of addresses into frontend JavaScript.

Prefer:

Frontend
 ↓
Laravel
 ↓
PSGC service/data
 ↓
MySQL/cache

If the address data is imported into MySQL, create appropriate tables and relationships.

==================================================
PHASE 18 — FRONTEND PAGE CONNECTION
==================================================

Go through EVERY existing frontend page.

For every button, form, link, modal, dropdown, table, search box and action:

Determine:

1. What should happen?
2. Which API endpoint handles it?
3. Which database records are affected?
4. What happens on success?
5. What happens on failure?
6. What loading state is required?
7. What authorization is required?

No dead buttons.

No fake success messages.

No placeholder API calls.

No hardcoded users.

No fake order data.

No fake admin statistics.

If a feature exists visually but backend support does not exist, implement the backend support.

==================================================
PHASE 19 — DATABASE SEEDING
==================================================

Because the database is empty, create safe development seeders.

At minimum:

ADMIN
CUSTOMER
SELLER

Use environment variables for passwords.

Example:

ADMIN_EMAIL=admin@maketo.local
ADMIN_PASSWORD=change-this-password

Do not commit real passwords.

Create sample:

- categories
- seller
- products
- inventory

Only create sample orders if necessary for dashboard testing.

==================================================
PHASE 20 — TESTING
==================================================

After implementation, test the complete flows.

AUTH TEST:

Register
 ↓
Verify
 ↓
Login
 ↓
2FA
 ↓
Dashboard
 ↓
Logout

ADMIN TEST:

Admin login
 ↓
2FA
 ↓
Admin dashboard
 ↓
View users
 ↓
View seller application
 ↓
Approve seller
 ↓
Manage product/category
 ↓
View orders

SELLER TEST:

Seller login
 ↓
Seller dashboard
 ↓
Create product
 ↓
Edit product
 ↓
Update inventory
 ↓
Receive seller order
 ↓
Update fulfillment status

CUSTOMER TEST:

Register
 ↓
Login
 ↓
2FA
 ↓
Browse products
 ↓
Add products from multiple sellers
 ↓
Cart
 ↓
Select products
 ↓
Checkout
 ↓
Order created
 ↓
Seller orders created
 ↓
Customer sees order

SECURITY TEST:

Try accessing admin endpoint as customer.

Try accessing seller endpoint as customer.

Try modifying another seller's product.

Try modifying another user's order.

Try changing frontend role.

Try submitting a fake price.

Try purchasing more inventory than available.

Try using expired 2FA code.

Try reusing a 2FA code.

All must fail appropriately.

==================================================
PHASE 21 — DO NOT DESTROY EXISTING WORK
==================================================

Before modifying anything:

- inspect existing implementation
- preserve working components
- reuse existing migrations where possible
- reuse existing UI
- reuse existing components
- avoid unnecessary rewrites

Do not delete files simply because they are inconvenient.

If something is architecturally wrong, explain the reason and fix it cleanly.

==================================================
PHASE 22 — ENVIRONMENT
==================================================

Verify .env configuration.

Database:

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=maketo
DB_USERNAME=...
DB_PASSWORD=...

Verify frontend API base URL.

Verify CORS.

Verify storage.

Verify mail/OTP configuration.

Do not expose secrets in frontend code.

==================================================
PHASE 23 — MIGRATION SAFETY
==================================================

Before running migrations:

Inspect all migrations.

Do not blindly use:

php artisan migrate:fresh

unless explicitly instructed.

Because the database is currently empty, it is acceptable to migrate from scratch during development, but preserve the migration history correctly.

After fixing migrations, run:

php artisan migrate

Then:

php artisan db:seed

Then:

php artisan migrate:status

Verify all migrations show:

Ran

==================================================
PHASE 24 — FINAL VERIFICATION
==================================================

Run:

php artisan optimize:clear

php artisan migrate:status

php artisan route:list

php artisan config:clear

php artisan cache:clear

Then run the backend.

Run the frontend.

Check browser console.

Check Laravel logs.

Check Network requests.

Check MySQL records.

Confirm:

FRONTEND
    ↓
API
    ↓
LARAVEL
    ↓
MYSQL

is actually working.

==================================================
CRITICAL RULE
==================================================

DO NOT STOP after making authentication work.

Continue through the entire existing application and integrate every existing frontend feature with the backend and database.

However, work in controlled phases.

After each phase:

1. Run relevant tests.
2. Fix errors.
3. Verify database changes.
4. Verify API response.
5. Verify frontend behavior.
6. Then continue.

At the end provide a concise report containing:

1. Files created
2. Files modified
3. Database migrations
4. Tables created/changed
5. API endpoints
6. Authentication flow
7. 2FA implementation
8. Admin authorization
9. Seller authorization
10. Customer authorization
11. Seeder credentials/configuration
12. Tests performed
13. Remaining issues
14. Exact commands needed to run the system

DO NOT claim something is implemented unless you actually inspected and implemented it.

DO NOT use fake data to make the UI appear functional.

DO NOT skip backend authorization.

DO NOT skip database integration.

DO NOT skip error handling.

DO NOT skip testing.