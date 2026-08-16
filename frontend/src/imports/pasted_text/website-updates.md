Update the existing e-commerce website design and functionality according to the following requirements. **Do not rebuild unrelated sections or remove existing features unless specifically required below.** Preserve the current visual quality, responsive behavior, and overall e-commerce structure while making the following changes.

## 1. Update Product Categories

Replace the existing product categories with exactly these 12 categories:

1. Pet Supplies
2. Electronics and Gadgets
3. Women's Apparel
4. Men's Apparel
5. Kids and Baby
6. Home and Garden
7. Sports and Outdoors
8. Books and Media
9. Food and Gourmet
10. Jewelry and Watches
11. Furniture and Office Equipment
12. Health and Beauty

Apply these categories consistently throughout the entire platform, including:

* Homepage category section
* Category navigation
* Product listing/filter pages
* Product creation/edit forms
* Seller product management
* Search/filter interfaces
* Admin product management
* Any category dropdowns
* Breadcrumbs
* Category-based product URLs/routes
* Empty-state pages
* Any sample/demo products

Remove outdated categories so there are no conflicting category names.

## 2. Fix Orders Page Layout

The Orders pages must **NOT have their own separate header/navigation bar or sidebar**.

The following order-related pages should use the application's existing global layout:

* My Orders
* Order Details
* Seller Orders
* Shipping/Order Management
* Any other order-related page

Use the same main header/navigation structure already used throughout the platform.

Do NOT create a second:

* Header
* Top navigation
* Sidebar
* Dashboard navigation

for the Orders pages.

The page content should simply appear inside the existing application layout.

For example:

Global Header
→ Main Content Area
→ Orders Page Content

not:

Global Header
→ Orders Header
→ Orders Sidebar
→ Orders Content

## 3. Make Every Link and Navigation Element Functional

Audit the **entire website** and make sure every clickable element works as intended.

Every:

* Navigation link
* Button
* Category
* Product card
* Product image
* "View Product"
* "View All"
* "Shop Now"
* "Add to Cart"
* "Buy Now"
* "Checkout"
* "View Orders"
* "Order Details"
* "Track Order"
* "Continue Shopping"
* "Become a Seller"
* "Seller Dashboard"
* "Manage Products"
* "Profile"
* "Settings"
* "Logout"
* Admin navigation item
* Seller navigation item
* Breadcrumb
* Pagination control
* Search result
* Category filter
* Footer link

must either:

1. Redirect to the correct existing page, or
2. Perform the appropriate action.

Do not leave dead links, placeholder links, `#` links, or buttons that appear functional but do nothing.

Use the correct destination page for each action.

### Navigation consistency

Ensure links respect the user's role:

* Guest → public pages
* Customer → customer pages
* Seller → seller pages
* Admin → admin pages

Do not expose seller/admin pages as if they were normal customer pages.

## 4. Add Seller Registration / Seller Application

There must be a clear way for a normal customer to register as a seller if they have not already registered as one.

Add a visible **"Become a Seller"** entry point.

Recommended locations:

* User account/profile menu
* Main navigation or user menu
* Footer
* Seller-related section

The user should be able to follow:

**Account → Become a Seller → Seller Application**

If the user is already an approved seller, redirect them to their Seller Dashboard instead of showing the application form again.

If the user has already submitted an application but it is still pending, show their application status instead of allowing duplicate applications.

## 5. Seller Application Form

Create or update the Seller Registration/Application page.

The form should collect the required seller information and include these **two new required inputs**:

### Owner ID

Input:

* Label: `Owner ID`
* Required: Yes
* Type: text or appropriate ID input
* Clear validation message
* Store securely with the seller application

### Seller Certificate

Input:

* Label: `Seller Certificate`
* Type: file upload
* Required: Yes
* Accept appropriate document/image formats
* Display the selected filename
* Validate file type and file size
* Provide a clear upload error message when invalid

Do not use a plain text field for the Seller Certificate. It must be a proper file-upload input.

## 6. Seller Application Form Structure

Organize the seller application professionally.

Suggested structure:

### Seller Information

* Seller/Store Name
* Owner ID
* Email
* Phone Number
* Business Address

### Verification Documents

* Seller Certificate
* Any existing required seller verification information

### Application Agreement

* Terms/conditions checkbox
* Privacy/consent checkbox if already required by the platform

### Submission

Primary button:

**Submit Seller Application**

After submission:

**Application Submitted → Pending Review**

Show a clear confirmation message.

Prevent duplicate applications.

## 7. Seller Application Status

Create appropriate application states:

### Not Applied

Show:

**Become a Seller**

### Pending

Show:

**Application Pending**

Include:

* Submission date
* Current status
* Information that the application is awaiting admin review

### Approved

Show:

**Seller Dashboard**

### Rejected

Show:

**Application Rejected**

Provide an appropriate message and, if supported by the existing system, allow the seller to submit a corrected application.

## 8. Admin Seller Application Management

Make sure the Admin interface can review seller applications.

The admin should be able to see:

* Applicant name
* Store/seller name
* Owner ID
* Seller Certificate
* Contact information
* Application date
* Application status

Provide appropriate actions:

* View Application
* Approve
* Reject

When approved, the user's seller status should be updated appropriately so they can access seller functionality.

## 9. Seller Certificate File Handling

The Seller Certificate should behave as a real uploaded document.

The interface should support:

* Upload
* File validation
* Preview where appropriate
* View/download by authorized administrators
* Secure storage/reference
* Error handling

Do not expose uploaded certificates publicly.

Only the applicant and authorized administrators should be able to access verification documents.

## 10. User Experience

Keep the design consistent with the existing e-commerce website.

Use:

* Clear page hierarchy
* Consistent spacing
* Consistent buttons
* Consistent form components
* Responsive layouts
* Proper loading states
* Empty states
* Error states
* Success states
* Confirmation dialogs where appropriate

Do not introduce unnecessary redesigns.

## 11. Responsive Design

Verify all affected pages on:

* Desktop
* Tablet
* Mobile

The seller application, orders, product pages, category pages, and navigation should remain usable at all screen sizes.

## 12. Final Navigation Audit

Before considering the update complete, perform a full navigation audit.

Verify that:

**Customer flow**

Home → Category → Product → Cart → Checkout → Order Confirmation → My Orders → Order Details

**Seller flow**

Account → Become a Seller → Seller Application → Pending → Approved → Seller Dashboard → Products → Orders

**Admin flow**

Admin Dashboard → Seller Applications → View Application → Approve/Reject

Also verify:

* Login
* Registration
* Profile
* Settings
* Cart
* Checkout
* Orders
* Product details
* Categories
* Search
* Seller pages
* Admin pages
* Logout

Every flow should lead to a real page or perform the intended action.

## 13. Important Implementation Rules

* Do not create duplicate headers.
* Do not create duplicate sidebars.
* Orders pages must use the existing global layout.
* Do not leave placeholder links.
* Do not use `href="#"` for functional navigation.
* Do not create fake navigation that only looks functional.
* Do not remove existing working features.
* Do not create courier-facing UI. Courier functionality may exist in the system, but there should be **no courier dashboard, courier navigation, courier UI, or courier management screens** unless explicitly requested.
* Seller functionality should be separate from courier functionality.
* Keep admin, seller, and customer permissions separated.
* Keep uploaded seller documents private.
* Use the exact 12 product categories specified above.
* Make the interface production-ready rather than a static mockup.
* If a required page does not currently exist, create it and connect it to the appropriate navigation.
* If a route/page already exists, reuse it instead of creating a duplicate version.

## 14. Final Goal

The finished website should feel like one connected e-commerce platform rather than a collection of separate mockup screens.

A user should be able to navigate naturally from:

**Homepage → Categories → Products → Cart → Checkout → Orders**

and, when appropriate:

**Account → Become a Seller → Seller Application → Seller Approval → Seller Dashboard**

while administrators can manage seller applications and users can access the correct pages based on their role.

Prioritize **functional navigation, consistent global layout, correct role-based routing, seller registration, and complete page connectivity** over adding unnecessary new visual elements.
