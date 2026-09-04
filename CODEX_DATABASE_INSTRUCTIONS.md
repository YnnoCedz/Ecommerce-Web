# Marketo — Codex Database Schema Implementation Instructions

## 1. Purpose

You are working on the **Marketo** project.

The existing Marketo project contains the **frontend**, but the backend/database architecture is not yet finalized.

Your task in this phase is to:

1. Inspect the existing Marketo frontend.
2. Identify all persistent data requirements.
3. Design the correct relational MySQL database schema.
4. Implement the schema using Laravel migrations.
5. Create Eloquent models and relationships.
6. Create development seeders/factories.
7. Validate the database against the actual frontend.
8. Do **NOT** implement the complete Laravel API yet.

The frontend is the primary functional specification.

Do not invent a generic ecommerce database.

---

# 2. Required Implementation Order

Follow this order exactly:

```text
EXISTING MAKETO FRONTEND
        ↓
FRONTEND INSPECTION
        ↓
FEATURE / DATA INVENTORY
        ↓
ENTITY IDENTIFICATION
        ↓
RELATIONSHIP ANALYSIS
        ↓
MYSQL DATABASE DESIGN
        ↓
SCHEMA REVIEW
        ↓
LARAVEL MIGRATIONS
        ↓
ELOQUENT MODELS
        ↓
FACTORIES / SEEDERS
        ↓
DATABASE TESTS
        ↓
SCHEMA VALIDATION
        ↓
BACKEND/API IMPLEMENTATION
```

Do not skip directly from frontend inspection to controllers.

---

# 3. First Task: Inspect the Existing Project

Before creating or modifying any database table, inspect the entire Marketo project.

Do not assume the project structure.

First determine the actual structure of the repository.

Inspect, when present:

```text
package.json
composer.json
src/
app/
pages/
routes/
components/
layouts/
hooks/
services/
api/
types/
interfaces/
models/
stores/
contexts/
utils/
constants/
mock/
mocks/
data/
resources/
database/
```

Also inspect:

* Every frontend route
* Every page
* Every dashboard
* Every form
* Every modal
* Every table
* Every product component
* Every seller component
* Every buyer/customer component
* Every admin component
* Authentication
* Registration
* Checkout
* Cart
* Orders
* Messaging
* Reviews
* Reports
* Notifications
* Search
* Filtering
* Sorting
* Pagination
* Mock data
* TypeScript interfaces
* TypeScript types
* Enums
* Status values
* Existing API/service placeholders

Use the actual repository structure instead of assuming directories exist.

---

# 4. Do Not Guess the Database

The database must be derived from the existing Marketo frontend.

Do NOT blindly create a generic marketplace schema.

Do NOT add tables merely because they are common in ecommerce applications.

For example, do not automatically create:

```text
coupons
gift_cards
subscriptions
loyalty_points
auctions
warehouses
delivery_locations
gps_tracking
```

unless:

1. The frontend actually requires them, or
2. An explicit Marketo requirement requires them.

The design principle is:

```text
Frontend functionality
        ↓
Required data
        ↓
Required relationships
        ↓
Database entities
        ↓
MySQL tables
```

NOT:

```text
Generic ecommerce template
        ↓
Hundreds of unnecessary tables
```

---

# 5. Create a Frontend Data Inventory

Before implementing migrations, identify all persistent entities used by the frontend.

Create a temporary documentation file if useful:

```text
docs/database/frontend-data-inventory.md
```

For every major frontend feature, document:

| Feature             | Entity          | Required Fields                | Relationships       |
| ------------------- | --------------- | ------------------------------ | ------------------- |
| Login               | User            | email, password, status        | roles               |
| Seller Registration | Seller          | business information           | user, categories    |
| Product Management  | Product         | name, description, price, etc. | seller, category    |
| Product Variations  | Product Variant | SKU, price, options            | product             |
| Cart                | Cart            | owner, status                  | user                |
| Checkout            | Order           | totals, status                 | user, seller orders |
| Messaging           | Conversation    | participants                   | users               |
| Messages            | Message         | body, status                   | conversation, user  |

This table is only an example.

The final inventory must come from the actual Marketo frontend.

---

# 6. Analyze Every Frontend Form

For every form, determine:

```text
Field
Data type
Required / Optional
Validation rules
Default value
Relationship
Persistent / Temporary
```

For example, if the frontend contains:

```text
Seller Registration

Business Name
Business Description
Business Email
Business Phone
Category
```

determine whether the correct database structure is:

```text
users
sellers
categories
seller_categories
```

instead of placing all information into one oversized table.

Do not normalize blindly.

Normalize according to the actual business relationships represented by the frontend.

---

# 7. Analyze TypeScript Types and Interfaces

Search the project for:

```text
interface
type
enum
```

Pay particular attention to objects such as:

```text
User
Buyer
Seller
Courier
Admin
Product
Category
ProductVariant
ProductImage
Inventory
Cart
CartItem
Order
OrderItem
SellerOrder
Payment
Conversation
Message
Review
Report
Notification
Shipment
```

These names are examples of entities to investigate.

Do not assume that every one exists.

Do not directly convert TypeScript interfaces into database tables.

Instead determine:

```text
Frontend Object
      ↓
Business Entity
      ↓
Normalized Database Entity
      ↓
Relationships
```

---

# 8. Analyze Mock Data

The frontend may currently use mock data because the backend does not exist.

Search for:

```text
mockProducts
mockUsers
mockOrders
mockSellers
mockMessages
mockNotifications
mockCategories
```

and any equivalent structures.

Determine which fields represent persistent business data.

For example:

```json
{
    "id": 1,
    "seller": "ABC Store",
    "category": "Electronics",
    "price": 5999,
    "stock": 10
}
```

may indicate relationships between:

```text
products
sellers
categories
inventory
```

Do not store entire mock JSON objects inside one database column.

Break them into proper relational entities when the data represents separate entities.

---

# 9. Identify Database Relationships

For every entity, determine whether the relationship is:

```text
One-to-One
One-to-Many
Many-to-Many
```

Examples that should be investigated:

```text
User → Seller

Seller → Products

Category → Products

Seller ↔ Categories

Product → Product Images

Product → Product Variants

Product Variant → Inventory

User → Orders

Order → Order Items

Order → Seller Orders

User ↔ Conversations

Conversation → Messages
```

Do not create relationships simply because they are listed here.

Verify them against the frontend.

Use junction/pivot tables for genuine many-to-many relationships.

---

# 10. Seller Categories

Marketo is a marketplace where a seller may be able to apply for multiple categories or lines of business.

Verify this behavior from the frontend.

If sellers can select multiple categories, do NOT use only:

```text
sellers.category_id
```

Instead use:

```text
sellers
categories
seller_categories
```

Example:

```text
seller_categories

id
seller_id
category_id
status
created_at
updated_at
```

Add:

```text
UNIQUE(seller_id, category_id)
```

if duplicate seller/category relationships are not allowed.

The final implementation must follow the actual frontend workflow.

---

# 11. Database Design Standards

Use:

```text
MySQL
InnoDB
utf8mb4
```

Use consistent primary/foreign-key types.

Preferred default:

```text
BIGINT UNSIGNED AUTO_INCREMENT
```

unless the existing project has a strong reason to use UUID or ULID.

Every table must be evaluated for:

```text
Primary key
Columns
Data types
Nullable values
Defaults
Unique constraints
Foreign keys
Indexes
Delete behavior
Update behavior
Timestamps
Soft deletion where appropriate
```

---

# 12. Database Normalization

Target at least:

```text
Third Normal Form (3NF)
```

Avoid duplicated relational data.

Do not use:

```text
products.category_names
```

or:

```text
categories = "Electronics,Phones,Accessories"
```

when those values represent relational entities.

Do not store relational order items as:

```text
order.items = JSON
```

when the frontend requires individual order items.

Use proper relational tables.

Example:

```text
products
categories
product_categories
```

or:

```text
products
categories
```

depending on the actual relationship.

---

# 13. Monetary Values

All monetary values must use an exact decimal type.

Preferred:

```text
DECIMAL(12,2)
```

or a larger precision when required.

Never use:

```text
FLOAT
DOUBLE
```

for:

```text
price
subtotal
discount
shipping_fee
tax
total
payment_amount
refund_amount
```

Only create monetary fields that are actually required.

---

# 14. Historical Order Data

If the frontend displays historical order information, the database must preserve the information necessary to display the historical transaction correctly.

An order item may require:

```text
product_id
product_name
SKU
unit_price
quantity
subtotal
```

Do not depend entirely on the current product record.

If a seller later changes:

```text
Product Name
Price
SKU
```

the historical order must still display the correct historical transaction information.

---

# 15. Multi-Vendor Orders

Determine whether the frontend allows one checkout to contain products from multiple sellers.

If yes, use a structure similar to:

```text
orders
    ↓
seller_orders
    ↓
order_items
```

Example:

```text
Order #10001

Seller A
 ├── Product 1
 └── Product 2

Seller B
 ├── Product 3
 └── Product 4
```

Do not assume:

```text
one order = one seller
```

unless the frontend explicitly implements that restriction.

---

# 16. Product Variations and Inventory

Inspect whether products support:

```text
variants
SKU
options
stock
inventory
quantity
out-of-stock status
low-stock status
```

If variants exist, inventory should normally be associated with the appropriate variant.

Potential structure:

```text
products
product_variants
inventories
```

Do not create these tables unless the frontend requires them.

---

# 17. Cart

If the frontend has a persistent shopping cart, determine:

```text
Cart owner
Cart status
Cart items
Product / Variant
Quantity
Price behavior
```

Likely structure:

```text
carts
cart_items
```

Do not store the complete cart as one JSON column if the frontend requires relational cart items.

---

# 18. Authentication and Users

Inspect the existing authentication UI and workflow.

Determine whether the frontend requires:

```text
Registration
Login
Logout
Roles
Account status
Seller onboarding
Password reset
Email verification
```

Design the user database around the actual requirements.

Possible architecture:

```text
users
roles
user_roles
```

or another appropriate structure based on the existing frontend.

Do not assume the role architecture before inspecting the project.

---

# 19. Known Roles

Investigate these possible Marketo roles:

```text
Buyer
Seller
Admin
Courier
```

Only implement roles actually required by the application.

Role and authorization data must support secure Laravel backend authorization later.

Do not create unnecessary permissions simply because they are common in ecommerce systems.

---

# 20. Messaging

If the frontend contains messaging, inspect:

```text
Conversation list
Participants
Messages
Message status
Read state
Attachments
Report functionality
```

A relational structure may require:

```text
conversations
conversation_participants
messages
```

Do not store an entire conversation inside one database field.

---

# 21. Reports

Inspect whether users can report:

```text
User
Seller
Courier
Product
Message
Conversation
```

Only implement report targets that exist in the frontend.

A possible structure is:

```text
reports
```

with the appropriate relationships.

Do not add an unsupported reporting system.

---

# 22. Reviews

If product reviews exist, inspect:

```text
Rating
Review title
Review body
Reviewer
Product
Order
Status
```

Determine the actual frontend review rules.

For example, determine whether:

```text
Only buyers can review
Only purchasers can review
One review per order item
Reviews can be edited
Reviews require approval
```

Do not assume every user can review every product.

---

# 23. Courier Requirements

Courier functionality must be implemented only to the extent required by the frontend.

Possible entities may include:

```text
couriers
shipments
courier_assignments
```

However, verify them against the frontend.

## Explicit restriction

There is **NO GPS tracking requirement**.

Do NOT create:

```text
gps_tracking
delivery_locations
gps_locations
courier_coordinates
latitude
longitude
heading
speed
```

unless a future specification explicitly requires them.

The system may support courier/order/shipping workflows without implementing GPS tracking.

---

# 24. Database Constraints

Use database-level integrity.

Examples:

```text
users.email UNIQUE

products.slug UNIQUE

product_variants.sku UNIQUE

seller_categories:
UNIQUE(seller_id, category_id)

cart_items:
UNIQUE(cart_id, product_variant_id)
```

Only add constraints that correctly represent the business rules.

Every important foreign-key relationship should use an actual database foreign key.

Do not rely entirely on Laravel validation.

---

# 25. Indexes

Indexes must be based on actual application queries.

Inspect frontend functionality involving:

```text
Search
Filtering
Sorting
Pagination
Joins
Seller dashboards
Admin dashboards
Order lookup
Product lookup
```

Create indexes for frequently queried fields and relationships.

Do NOT automatically index every column.

Avoid unnecessary indexes that increase write cost.

---

# 26. Delete Behavior

For every foreign key, intentionally determine whether the correct behavior is:

```text
CASCADE
RESTRICT
SET NULL
```

Do not blindly use:

```text
ON DELETE CASCADE
```

Especially protect historical records such as:

```text
orders
order_items
payments
payment_transactions
audit_logs
```

Historical business records should not disappear simply because a related user/product/seller is deleted.

---

# 27. Soft Deletes

Use soft deletes only where appropriate.

Possible candidates:

```text
users
sellers
products
categories
addresses
```

Verify each case.

Do not automatically add soft deletes to every table.

Financial and audit records generally require stronger historical preservation.

---

# 28. Laravel Migrations

After the schema has been reviewed against the frontend, implement Laravel migrations.

Migration order must respect dependencies.

A possible dependency order is:

```text
users
roles
user_roles

categories

sellers
seller_categories

products
product_images
product_variants
inventories

carts
cart_items

orders
seller_orders
order_items

payments

couriers
shipments
courier_assignments

conversations
conversation_participants
messages

reviews
reports
notifications
audit_logs
```

This is only an example.

The actual migration list must be generated from the frontend analysis.

Do not create empty or unnecessary migrations just to match this example.

---

# 29. Eloquent Models

After migrations, create Eloquent models corresponding to the final schema.

Every model must contain accurate relationships.

For example:

```php
User
    -> roles()
    -> seller()
    -> orders()

Seller
    -> user()
    -> categories()
    -> products()

Product
    -> seller()
    -> categories()
    -> variants()
    -> images()
```

Only create relationships that actually exist in the database.

Use appropriate:

```text
hasOne
hasMany
belongsTo
belongsToMany
hasManyThrough
```

relationships based on the actual schema.

---

# 30. Seeders and Factories

Create development seeders/factories for data required to demonstrate the frontend.

Potential seed data:

```text
Roles
Categories
Demo Users
Demo Sellers
Demo Products
Demo Variants
Demo Inventory
```

Only seed entities required by the actual frontend.

Use Laravel factories for realistic test data.

Never commit:

```text
real passwords
production credentials
real API keys
real payment credentials
```

---

# 31. Database Testing

Create database tests that verify:

```text
Migrations work
Foreign keys work
Unique constraints work
Indexes exist where required
Relationships work
Seeders work
Factories work
Ownership rules are representable
Orphan records cannot be created
Historical order records remain valid
```

Run the database against a clean development/test MySQL database.

Use:

```bash
php artisan migrate:fresh --seed
```

only against a development/test database.

Never run destructive migration commands against production.

---

# 32. Frontend-to-Database Validation

After implementing the schema, inspect the frontend again.

For every major feature ask:

```text
Can the database represent this feature?

Can every required frontend field be stored?

Are all relationships correct?

Can frontend statuses be represented?

Can search/filter functionality be supported?

Can pagination queries be supported?

Can ownership be enforced?

Can historical information be preserved?

Can multiple sellers be supported if required?

Can every form be persisted?

Can dashboards retrieve the required data?
```

If the answer is NO for any major feature:

```text
STOP
↓
Identify the missing requirement
↓
Update the schema
↓
Update migrations/models/tests
↓
Validate again
```

Do not proceed to full API implementation until the schema passes this review.

---

# 33. Database Phase Acceptance Criteria

The database implementation is complete only when ALL of the following are true:

* [ ] Entire Marketo frontend inspected
* [ ] Actual project structure identified
* [ ] All frontend routes inspected
* [ ] All major pages inspected
* [ ] All forms inspected
* [ ] TypeScript interfaces/types inspected
* [ ] Enums/status values inspected
* [ ] Mock data inspected
* [ ] Persistent entities identified
* [ ] Persistent fields identified
* [ ] Relationships identified
* [ ] Many-to-many relationships use junction tables
* [ ] Schema is normalized to approximately 3NF
* [ ] Every table has a justified purpose
* [ ] Primary keys are consistent
* [ ] Foreign keys are implemented
* [ ] Unique constraints are implemented where required
* [ ] Appropriate indexes exist
* [ ] Monetary values use DECIMAL
* [ ] Delete behavior is intentional
* [ ] Soft deletes are used only where appropriate
* [ ] Historical order information is preserved
* [ ] Multi-vendor ordering is supported if required
* [ ] Product variants/inventory are modeled if required
* [ ] Cart is relational if required
* [ ] Authentication requirements are represented
* [ ] Messaging is relational if required
* [ ] Reviews are relational if required
* [ ] Reports are represented if required
* [ ] Courier workflow is represented if required
* [ ] GPS tracking has NOT been added
* [ ] Unsupported ecommerce features have NOT been added
* [ ] Laravel migrations run successfully
* [ ] Database can be created from a clean state
* [ ] Seeders run successfully
* [ ] Eloquent relationships work
* [ ] Database tests pass
* [ ] No direct frontend-to-MySQL connection exists

---

# 34. Required Deliverables

At the end of this database phase, provide:

```text
1. Frontend Data Inventory
2. Database Entity/Relationship Analysis
3. Final MySQL Schema
4. Laravel Migration Files
5. Eloquent Models
6. Model Relationships
7. Factories
8. Development Seeders
9. Database Tests
10. Schema Validation Report
```

If appropriate, also create:

```text
docs/database/frontend-data-inventory.md
docs/database/schema.md
docs/database/schema-review.md
```

---

# 35. What NOT To Do

Do NOT:

```text
- Build a generic ecommerce database
- Guess requirements
- Copy TypeScript interfaces directly into tables
- Store relational entities as JSON unnecessarily
- Store categories as comma-separated strings
- Store order items as one JSON field
- Use FLOAT/DOUBLE for money
- Add unsupported features
- Add GPS tracking
- Add GPS coordinates
- Add unnecessary warehouse systems
- Add unnecessary loyalty systems
- Add unnecessary subscription systems
- Add unnecessary coupon systems
- Add unnecessary auction systems
- Delete historical orders through careless cascades
- Connect the frontend directly to MySQL
- Build every API endpoint before validating the schema
- Assume one order can only contain one seller
- Assume every seller belongs to only one category
```

The actual frontend must determine the final architecture.

---

# 36. Final Architecture

The target architecture is:

```text
┌─────────────────────────────┐
│       MAKETO FRONTEND       │
│                             │
│ React / TypeScript / UI     │
└──────────────┬──────────────┘
               │
               │ HTTP / JSON
               ▼
┌─────────────────────────────┐
│        LARAVEL API          │
│                             │
│ Authentication              │
│ Authorization               │
│ Validation                  │
│ Business Logic              │
│ Services                    │
│ Controllers                 │
│ API Resources               │
└──────────────┬──────────────┘
               │
               │ Eloquent ORM
               ▼
┌─────────────────────────────┐
│           MYSQL             │
│                             │
│ Normalized relational data  │
│ Foreign keys                │
│ Constraints                 │
│ Indexes                     │
│ Transactions                │
└─────────────────────────────┘
```

The frontend must NEVER connect directly to MySQL.

---

# 37. Final Codex Instruction

Before modifying the database:

```text
READ THE ENTIRE MAKETO FRONTEND.
```

Then:

```text
UNDERSTAND WHAT THE FRONTEND ACTUALLY DOES.
```

Then:

```text
IDENTIFY THE DATA REQUIRED BY THOSE FEATURES.
```

Then:

```text
IDENTIFY THE RELATIONSHIPS BETWEEN THOSE DATA ENTITIES.
```

Then:

```text
DESIGN A NORMALIZED MYSQL DATABASE.
```

Then:

```text
IMPLEMENT LARAVEL MIGRATIONS.
```

Then:

```text
IMPLEMENT ELOQUENT MODELS AND RELATIONSHIPS.
```

Then:

```text
CREATE FACTORIES, SEEDERS AND DATABASE TESTS.
```

Then:

```text
VALIDATE THE SCHEMA AGAINST THE ENTIRE FRONTEND.
```

Only after all of the above passes should you begin implementing the Laravel API/backend.

## Most Important Rule

> **Do not guess the Marketo database.**
>
> **Read the frontend, derive the requirements, design the relational schema, validate it, and only then build the backend around it.**

The final system must be:

```text
Actual Marketo Frontend
        ↓
Validated Database Requirements
        ↓
Normalized MySQL Schema
        ↓
Laravel Migrations
        ↓
Eloquent Models
        ↓
Laravel Backend/API
        ↓
Frontend Integration
```

**Do not invent unsupported functionality.**

**Do not add GPS tracking.**

**Do not build a generic ecommerce schema.**

**Build the database that the actual Marketo frontend requires.**
