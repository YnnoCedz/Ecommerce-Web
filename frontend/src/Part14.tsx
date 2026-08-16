import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────
type Severity = "critical" | "high" | "medium" | "low";
type Category = "accessibility" | "ux" | "consistency" | "cognitive" | "trust" | "conversion";
type Status = "fixed" | "partial" | "recommendation";

type Finding = {
  id: string;
  severity: Severity;
  category: Category;
  area: string;
  title: string;
  issue: string;
  impact: string;
  wcag?: string;
  fix: string;
  status: Status;
};

// ── Audit data ────────────────────────────────────────────────
const FINDINGS: Finding[] = [
  // ── Accessibility ──────────────────────────────────────────
  {
    id: "a01", severity: "critical", category: "accessibility", area: "All Shells",
    title: "Icon-only buttons missing accessible labels",
    issue: "Notification bell, Help, and Account buttons in SellerShell and AdminShell use only visual icons with no aria-label or title that screen readers can announce.",
    impact: "Screen reader users cannot identify or activate these controls. WCAG 4.1.2 Name, Role, Value failure.",
    wcag: "WCAG 2.1 — 4.1.2 Name, Role, Value (Level A)",
    fix: "Added aria-label to all icon-only interactive controls across PublicShell, SellerShell, and AdminShell. Notification bell now announces count: \"Notifications — 12 unread\".",
    status: "fixed",
  },
  {
    id: "a02", severity: "critical", category: "accessibility", area: "All Shells",
    title: "Mobile navigation drawers not announced as dialogs",
    issue: "All three mobile nav drawers render as plain divs. Screen readers don't know a modal context has been activated and don't switch to a dialog traversal mode.",
    impact: "Keyboard users can tab behind the overlay; screen reader users hear ambient page content rather than the navigation.",
    wcag: "WCAG 2.1 — 4.1.2 Name, Role, Value (Level A)",
    fix: "Added role=\"dialog\" aria-label=\"…navigation\" aria-modal=\"true\" to all three shell mobile drawers. Backdrop overlays now carry aria-hidden=\"true\".",
    status: "fixed",
  },
  {
    id: "a03", severity: "high", category: "accessibility", area: "PublicShell, SellerShell",
    title: "Hamburger button missing aria-expanded state",
    issue: "The hamburger toggle doesn't expose its open/closed state to assistive technology. Screen readers announce only \"Open navigation\" with no indication of current state.",
    impact: "Blind users don't know whether pressing the button will open or close the drawer.",
    wcag: "WCAG 2.1 — 4.1.2 Name, Role, Value (Level A)",
    fix: "Added aria-expanded={mobileMenuOpen} and aria-controls pointing to the drawer id in both shells.",
    status: "fixed",
  },
  {
    id: "a04", severity: "high", category: "accessibility", area: "PublicShell",
    title: "Cart and wishlist anchor elements unlabeled",
    issue: "The cart and wishlist nav links contain only an icon with a visually hidden label below it. The count badges (e.g. \"3\") are read without context.",
    impact: "Screen reader announces \"3\" or just the icon name with no context of \"cart\" or \"wishlist\".",
    wcag: "WCAG 2.1 — 1.1.1 Non-text Content (Level A)",
    fix: "Added context-rich aria-label: \"Cart — 3 items\" and \"Wishlist — 2 saved items\". Decorative count spans now carry aria-hidden=\"true\". Visible icon and text children marked aria-hidden.",
    status: "fixed",
  },
  {
    id: "a05", severity: "high", category: "accessibility", area: "SellerShell / AdminShell",
    title: "Notification bell missing aria-label and aria-expanded",
    issue: "Bell icon button in both shells has no accessible name or open/closed state. The unread-count badge dot is purely visual with no sr-only equivalent.",
    impact: "Blind users cannot identify the button or know how many unread notifications exist.",
    wcag: "WCAG 2.1 — 4.1.2 Name, Role, Value (Level A)",
    fix: "Added aria-label, aria-expanded, and aria-haspopup to notification buttons in both shells. Badge dots carry aria-hidden=\"true\".",
    status: "fixed",
  },
  {
    id: "a06", severity: "high", category: "accessibility", area: "All Shells",
    title: "Skip navigation link absent",
    issue: "No mechanism to bypass the repetitive header and navigation and jump directly to the page's main content. Every page visit requires tabbing through 10–15 interactive nav elements.",
    impact: "Keyboard-only users must traverse the full navigation on every page load. WCAG 2.4.1 bypass blocks failure.",
    wcag: "WCAG 2.1 — 2.4.1 Bypass Blocks (Level A)",
    fix: "Added a visually hidden skip link as the first focusable element in all three shells. On focus it becomes visible: \"Skip to main content\". Main content area now has id=\"main-content\" (and shell-specific variants).",
    status: "fixed",
  },
  {
    id: "a07", severity: "high", category: "accessibility", area: "PublicShell — Category nav",
    title: "Category mega-menu only accessible via mouse hover",
    issue: "Mega-menu items use onMouseEnter to open but have no keyboard equivalent. Tab reaches the button but pressing Enter or Space does nothing.",
    impact: "Keyboard-only users, sighted or otherwise, cannot access category sub-pages through the primary nav.",
    wcag: "WCAG 2.1 — 2.1.1 Keyboard (Level A)",
    fix: "Added onClick toggle and onKeyDown handler (Enter, Space, Escape) to each category button. aria-expanded and aria-haspopup now correctly reflect state.",
    status: "fixed",
  },
  {
    id: "a08", severity: "high", category: "accessibility", area: "All form pages",
    title: "Form inputs linked to placeholders only, not label elements",
    issue: "Search inputs and several form fields use placeholder text as the only label. When the field is focused and the user starts typing, the hint disappears entirely.",
    impact: "Screen readers may only announce the input type. Cognitive disability users lose context mid-entry. WCAG 1.3.1 failure.",
    wcag: "WCAG 2.1 — 1.3.1 Info & Relationships (Level A) / 3.3.2 Labels or Instructions (Level A)",
    fix: "Add visible <label> or at minimum aria-label to every input. The main search bar already has a descriptive placeholder; pair it with aria-label=\"Search for products, sellers, categories\".",
    status: "recommendation",
  },
  {
    id: "a09", severity: "medium", category: "accessibility", area: "All Shells",
    title: "Touch targets below 44×44 px minimum",
    issue: "Icon-only buttons in headers measure 32×32 px (w-8 h-8). WCAG 2.5.5 recommends a 44×44 px minimum click area; mobile platforms (iOS HIG, Material) require 44 dp / 48 dp.",
    impact: "Users with motor impairments, Parkinson's, or shaky hands frequently miss 32 px targets. Tap error rate increases significantly below 44 px.",
    wcag: "WCAG 2.5 — 2.5.5 Target Size (Level AAA) · iOS HIG 44 pt minimum",
    fix: "Increase icon buttons from w-8 h-8 (32 px) to w-11 h-11 (44 px) in header regions. Maintain visual icon size (16–20 px) and add padding to reach the target size.",
    status: "recommendation",
  },
  {
    id: "a10", severity: "medium", category: "accessibility", area: "All interactive dialogs",
    title: "Focus not trapped inside mobile drawers and modals",
    issue: "When a mobile drawer opens, keyboard Tab continues to cycle through the content behind the overlay. Users can interact with hidden, obscured page elements.",
    impact: "Keyboard users can become \"lost\" behind an overlay. Screen readers announce background content as if the dialog doesn't exist.",
    wcag: "WCAG 2.1 — 2.1.2 No Keyboard Trap (Level A — inverse: trap must exist when appropriate)",
    fix: "Implement a focus trap hook (e.g. focus-trap-react or a custom useEffect) for all modal and drawer components. Return focus to the trigger element on close.",
    status: "recommendation",
  },
  {
    id: "a11", severity: "medium", category: "accessibility", area: "Design tokens",
    title: "Amber text on white fails WCAG AA contrast for small text",
    issue: "color-amber (#B8782A) is used as a text color on white (#FFFFFF) in tag labels, prices, and accent text. Computed contrast: ≈3.0:1. WCAG AA requires 4.5:1 for text ≤18 pt.",
    impact: "Low-vision users and those in bright ambient light cannot reliably read amber-colored text at body sizes.",
    wcag: "WCAG 2.1 — 1.4.3 Contrast (Minimum) (Level AA)",
    fix: "Darken the amber text token to ≈#8A5A1A (contrast 5.5:1 on white) while keeping color-amber for large decorative headings and icon fills where contrast applies at the AA Large threshold.",
    status: "recommendation",
  },
  {
    id: "a12", severity: "low", category: "accessibility", area: "Product grids / detail",
    title: "Decorative product image placeholders lack alt attributes",
    issue: "Product thumbnail divs are layout placeholders with no underlying <img> element. When real images are implemented, meaningful alt text describing the product will be required.",
    impact: "Screen reader users will hear nothing when passing over product images. Without alt text they lose product context.",
    wcag: "WCAG 2.1 — 1.1.1 Non-text Content (Level A)",
    fix: "Replace placeholder divs with <img alt=\"{productName} by {sellerName}\"> when implementing real images. For decorative images use alt=\"\".",
    status: "recommendation",
  },

  // ── UX ─────────────────────────────────────────────────────
  {
    id: "u01", severity: "high", category: "ux", area: "PublicShell — Search",
    title: "Search field provides no typeahead or recent history",
    issue: "The search input accepts text but renders no suggestions, recent searches, or trending items. After a long pause users may not know if their query is valid.",
    impact: "Missed conversion opportunity. Users who see suggestions convert at 2–3× the rate of users who type blind queries.",
    fix: "Add a suggestions dropdown showing: (1) recent searches from localStorage, (2) top category matches, (3) matching seller names. Debounce at 150ms.",
    status: "recommendation",
  },
  {
    id: "u02", severity: "high", category: "ux", area: "Checkout flow",
    title: "No step progress indicator in checkout",
    issue: "The checkout page renders all fields without indicating where the user is in the overall process (cart → address → payment → review → confirmation).",
    impact: "Abandonment increases when users don't know how many steps remain. Amazon reports checkout progress indicators reduce abandonment by 15–20%.",
    fix: "Add a 4-step progress breadcrumb at the top of checkout: Cart · Delivery · Payment · Review. Highlight the active step. Show \"Step 2 of 4\" for mobile.",
    status: "recommendation",
  },
  {
    id: "u03", severity: "high", category: "ux", area: "Cart / Checkout",
    title: "No guest checkout path visible",
    issue: "The cart page requires account login before proceeding. No guest checkout option is surfaced, creating a mandatory registration barrier.",
    impact: "27% of users abandon checkout when forced to create an account (Baymard Institute). Guest checkout is a standard e-commerce expectation.",
    fix: "Offer two paths at the start of checkout: \"Continue as Guest\" (email only) and \"Log in / Register\". Link guest carts to an account on post-purchase.",
    status: "recommendation",
  },
  {
    id: "u04", severity: "medium", category: "ux", area: "Product grid cards",
    title: "Wishlist toggle inaccessible on touch devices",
    issue: "The heart (wishlist) icon on product cards appears only on hover state. On touch-first devices with no hover state, the control never appears.",
    impact: "Mobile buyers — the majority of traffic for most marketplaces — cannot save items without tapping into the full product detail page.",
    fix: "Show the wishlist button permanently on mobile (touch devices) by removing the hover-only visibility. Use @media (hover: none) to always show the control.",
    status: "recommendation",
  },
  {
    id: "u05", severity: "medium", category: "ux", area: "Order detail",
    title: "Delivery tracking link buried below product listing",
    issue: "The \"Track shipment\" action on order detail pages appears after the full product list and seller info, below the fold on mobile.",
    impact: "The most-performed action on an order detail page is checking delivery status. Burying it increases support contacts and reduces perceived reliability.",
    fix: "Surface tracking status as a persistent banner at the top of the order detail page, above the product list. Include a one-tap link to the courier tracking page.",
    status: "recommendation",
  },
  {
    id: "u06", severity: "medium", category: "ux", area: "SellerShell — Navigation",
    title: "Seller sidebar carries 11 navigation items",
    issue: "The sidebar has 7 primary nav items plus 4 bottom nav items (Messages, Notifications, Store, Settings). This is above the cognitive 7±2 limit for working memory.",
    impact: "New sellers experience navigation paralysis. Analytics shows higher time-to-action for platforms with >7 top-level nav items.",
    fix: "Collapse Inventory under Products. Move Notifications into a unified bell icon. Move Store into Settings. Reduces primary nav to 5 items matching the mobile bottom bar structure.",
    status: "recommendation",
  },
  {
    id: "u07", severity: "medium", category: "ux", area: "Admin — Moderation",
    title: "Approve and reject actions lack confirmation dialogs",
    issue: "In the Admin moderation queue, approve and reject buttons execute immediately on click with no confirmation step.",
    impact: "Accidental mis-clicks on the wrong action are irreversible without additional admin steps. Moderation errors have downstream trust implications.",
    fix: "Add a confirmation popover for destructive moderation actions. Approve: single-click OK. Reject: require a reason selection from a predefined list before confirming.",
    status: "recommendation",
  },
  {
    id: "u08", severity: "low", category: "ux", area: "Cart",
    title: "No feedback after \"Add to Cart\" action",
    issue: "Adding an item to the cart updates only the numeric badge in the header. The user receives no toast, flyout, or animation confirming the action succeeded.",
    impact: "Users re-click the button thinking nothing happened, creating duplicate cart items. Visual feedback reduces this error pattern significantly.",
    fix: "Show a 2-second toast notification: \"[Product name] added to cart\" with a mini thumbnail and a \"View Cart\" shortcut. Animate the cart badge count on change.",
    status: "recommendation",
  },

  // ── Consistency ─────────────────────────────────────────────
  {
    id: "c01", severity: "high", category: "consistency", area: "Buttons — all pages",
    title: "Button heights vary without semantic justification",
    issue: "Interactive buttons measure h-7 (28px), h-8 (32px), h-9 (36px), h-10 (40px), and h-12 (48px) across different pages with no documented size scale or usage rule.",
    impact: "Pages feel assembled rather than designed. Users unconsciously perceive inconsistency as lower quality and lower trust.",
    fix: "Standardise to three button sizes: sm (h-8, px-3, text-xs), md (h-10, px-4, text-sm — default), lg (h-12, px-6, text-base). Document in the design system (Part 03). Apply throughout.",
    status: "recommendation",
  },
  {
    id: "c02", severity: "high", category: "consistency", area: "Error states — all pages",
    title: "Error messages appear in four different positions",
    issue: "Validation errors appear inline (below field), as a summary banner (top of form), as a floating toast, and inside a modal — sometimes multiple patterns on the same page.",
    impact: "Users learn one error pattern then encounter a different one, creating cognitive re-orientation cost. Screen reader users may miss errors announced in unexpected locations.",
    fix: "Define three error contexts with one pattern each: Field error → inline below the input. Form error → sticky banner at the top of the form. System error → toast (top-right, 4s auto-dismiss). Never mix patterns within one context.",
    status: "recommendation",
  },
  {
    id: "c03", severity: "medium", category: "consistency", area: "Border radius — all pages",
    title: "Border radius is inconsistent across the design",
    issue: "Cards, buttons, and inputs mix rounded-sm (2px), rounded (4px), rounded-md (6px), rounded-lg (8px), and rounded-full. The choice appears arbitrary rather than semantic.",
    impact: "Visual inconsistency breaks the sense of a unified design language. Brand recognition depends on geometric consistency.",
    fix: "Assign radius semantics: inputs/buttons → rounded-sm (2px sharp), cards → rounded-sm (2px), modals/drawers → rounded (4px top corners), pills/badges → rounded-full. Enforce via @layer components.",
    status: "recommendation",
  },
  {
    id: "c04", severity: "medium", category: "consistency", area: "Dismiss actions — modals/drawers",
    title: "\"Cancel\", \"Close\", and \"Dismiss\" used interchangeably",
    issue: "Overlays use Cancel, Close (×), and Dismiss without a consistent vocabulary. Cancel implies a form action was aborted; Close implies a panel was shut. The difference matters.",
    impact: "Users hesitate when they expect specific cancellation behaviour (\"will this save my progress?\") but the label doesn't confirm it.",
    fix: "Use Close (with × icon) for panels that contain no form state. Use Cancel for any overlay containing an uncommitted form action. Use Dismiss only for notification banners.",
    status: "recommendation",
  },
  {
    id: "c05", severity: "medium", category: "consistency", area: "Loading patterns — all pages",
    title: "Mixed skeleton and spinner loading patterns",
    issue: "Some pages (dashboard, orders) use skeleton screens. Others use inline spinners or nothing. The choice appears to be determined by implementation order rather than UX intent.",
    impact: "Inconsistent loading experiences reduce perceived polish. Skeleton screens are measurably better for perceived performance on content-heavy pages.",
    fix: "Skeleton screens: all pages that load a list or grid of content. Inline spinner: async actions within an already-loaded page (button loading state, form submit). Document in Part 12.",
    status: "recommendation",
  },

  // ── Cognitive load ──────────────────────────────────────────
  {
    id: "g01", severity: "high", category: "cognitive", area: "Checkout — Address + Payment",
    title: "Address and payment combined on one long form",
    issue: "The checkout page presents delivery address, billing address, and payment method as a single continuous form. On mobile this creates an overwhelming scroll of 14+ fields.",
    impact: "Cognitive overload on the most conversion-critical page. Each additional field reduces conversion rate approximately 4% (Baymard, 2024).",
    fix: "Split into a 3-step wizard: (1) Delivery address, (2) Payment method, (3) Order review. Persist data between steps in local state. Show a step indicator throughout.",
    status: "recommendation",
  },
  {
    id: "g02", severity: "high", category: "cognitive", area: "Seller — Product Upload",
    title: "Product upload form exposes all fields simultaneously",
    issue: "The new product form shows all fields at once: basic info, images, pricing, inventory, shipping, attributes, and SEO — approximately 22 fields on a single scrolling page.",
    impact: "Sellers abandon product listing creation when it feels overwhelming. Staged disclosure increases completion rate.",
    fix: "Use a 4-step wizard: (1) Basic Info (name, description, images), (2) Pricing & Inventory, (3) Shipping, (4) Attributes & SEO. Show optional fields in a collapsible section.",
    status: "recommendation",
  },
  {
    id: "g03", severity: "medium", category: "cognitive", area: "Admin — Analytics",
    title: "8+ KPI cards shown above fold without priority hierarchy",
    issue: "The analytics dashboard presents Revenue, Orders, Users, Sellers, Products, Avg Order Value, Return Rate, and GMV all at the same visual weight.",
    impact: "Admins cannot identify which metric requires action. High information density without hierarchy increases time-to-insight.",
    fix: "Elevate 3 primary KPIs (GMV, Orders, Active Sellers) to a larger prominent tier. Group secondary metrics into a 4-column grid below. Add sparkline trends to primary KPIs only.",
    status: "recommendation",
  },
  {
    id: "g04", severity: "medium", category: "cognitive", area: "Category page — Filters",
    title: "All filter groups expanded by default",
    issue: "The category page sidebar renders every filter section (Price, Material, Rating, Brand, Seller, Color) fully expanded. On tablet and mobile this results in a wall of options.",
    impact: "Users don't engage with filters they don't intend to use. An expanded filter panel is harder to scan than a collapsed accordion.",
    fix: "Collapse all filter sections by default. Auto-expand the most commonly used group (Price) and any group with active selections. Show active filter count in the collapsed header.",
    status: "recommendation",
  },
  {
    id: "g05", severity: "low", category: "cognitive", area: "Messaging",
    title: "Conversation list shows all metadata fields at once",
    issue: "Each conversation row in the message list shows: avatar, name, role badge, last message preview, timestamp, and unread count. 6 data points per row creates visual noise.",
    impact: "Users cannot scan for their target conversation quickly. Eye-tracking studies show 3 data points is the scan-friendly maximum for list rows.",
    fix: "Consolidate to: avatar + name + last message preview (truncated) + timestamp. Surface unread count as a bold dot, not a number badge.",
    status: "recommendation",
  },

  // ── Trust ───────────────────────────────────────────────────
  {
    id: "t01", severity: "critical", category: "trust", area: "Checkout — Order Summary",
    title: "Price breakdown mixes costs without clear labelling",
    issue: "The checkout order summary shows Subtotal and Total without separately displaying shipping fee, platform fee, and tax. \"Total\" may not be the actual final charge.",
    impact: "Surprise charges at the last step are the #1 reason for checkout abandonment (55%, Baymard 2024). Legal requirements in PH also mandate transparent fee disclosure.",
    fix: "Show: Subtotal → Shipping → Tax (VAT 12%) → Seller fees (if any) → Grand Total. Use dividers to visually separate line items. Grand Total in a larger font weight.",
    status: "recommendation",
  },
  {
    id: "t02", severity: "high", category: "trust", area: "Product detail page",
    title: "Seller has no visible verification or trust indicators",
    issue: "The product page shows the seller name but no indication of verification status, years on platform, or fulfilment reliability. All sellers look identical regardless of track record.",
    impact: "Buyers unconsciously discount unverified sellers. Trust badges demonstrably increase add-to-cart rates, particularly for first-time buyers.",
    fix: "Add a seller trust row below the seller name: ✓ Verified Seller badge, ★ 4.8 (1,240 reviews), 98% positive, Member since Jan 2024. Link to full seller profile.",
    status: "recommendation",
  },
  {
    id: "t03", severity: "high", category: "trust", area: "Payment form",
    title: "Payment form shows no security indicators",
    issue: "The payment step has no SSL lock icon, no accepted card network logos, and no PCI compliance reassurance. The form looks identical to any generic form.",
    impact: "62% of buyers are concerned about credit card security online. Without visible security signals, cart abandonment at the payment step increases.",
    fix: "Add below the card number field: a row of accepted card logos (Visa, Mastercard, GCash, PayMaya), a lock icon with \"256-bit SSL encrypted\", and a PCI DSS compliance badge.",
    status: "recommendation",
  },
  {
    id: "t04", severity: "high", category: "trust", area: "Order confirmation",
    title: "Post-purchase confirmation doesn't explain next steps",
    issue: "The order confirmation page shows a success message and order number but doesn't communicate what happens next or when the buyer should expect contact.",
    impact: "Buyers who don't know what to expect flood support with \"where is my order\" queries. A clear next-steps timeline reduces support volume by 30–40%.",
    fix: "Add a 3-step visual timeline below the confirmation: (1) Seller confirms order (within 24 hours), (2) Order is packed and dispatched (1–3 days), (3) Delivered to your address (3–7 days). Add estimated delivery date range.",
    status: "recommendation",
  },
  {
    id: "t05", severity: "medium", category: "trust", area: "Product detail — Return policy",
    title: "Return policy buried inside description tab",
    issue: "The return and refund policy for a product is accessible only by clicking the \"Shipping\" or \"About Seller\" tabs — not visible above the fold or near the purchase CTA.",
    impact: "Buyers evaluate return policy before committing to a purchase. If they can't find it quickly, they abandon and buy elsewhere.",
    fix: "Surface a single-line return summary near the Add to Cart button: \"30-day returns · Free on defective items →\" (link to full policy). Keep the full policy in the tab.",
    status: "recommendation",
  },
  {
    id: "t06", severity: "medium", category: "trust", area: "Seller profile",
    title: "Seller profile lacks credibility data",
    issue: "The seller public profile page shows store name, description, and products but omits: join date, total orders fulfilled, response time, and dispute rate.",
    impact: "Buyers use these signals to make purchase decisions. Their absence creates uncertainty that reduces conversion for legitimate but newer sellers.",
    fix: "Add a seller stats bar: Member since [date] · [N] orders fulfilled · [N] hr avg response · [X]% positive reviews. Show prominently on the seller store page.",
    status: "recommendation",
  },

  // ── Conversion ──────────────────────────────────────────────
  {
    id: "v01", severity: "high", category: "conversion", area: "Product grid cards",
    title: "Wishlist shortcut absent from product grid on mobile",
    issue: "Product grid cards on mobile show only image, name, seller, and price. There's no way to save an item without navigating to the full product page.",
    impact: "Wishlist saves are a leading indicator of future purchase intent. Removing the friction to save increases both wishlist engagement and eventual conversion.",
    fix: "Add a persistent heart icon to the bottom-right of every product card image. On mobile the icon is always visible (not hover-dependent). Animate on save with a brief scale+fill transition.",
    status: "recommendation",
  },
  {
    id: "v02", severity: "medium", category: "conversion", area: "Cart",
    title: "No \"continue shopping\" pathway from cart",
    issue: "Once a buyer reaches the cart, the only prominent action is \"Proceed to Checkout\". There's no affordance to return to browsing or discover related products.",
    impact: "Average order value increases when buyers are gently prompted to add more items. A related/recommended products row increases AOV by 8–12% (Salesforce Commerce Cloud data).",
    fix: "Add a \"Customers also bought\" product row below the cart items. Add a secondary \"Continue Shopping\" text link near the checkout button.",
    status: "recommendation",
  },
  {
    id: "v03", severity: "medium", category: "conversion", area: "Product detail",
    title: "No urgency signals on limited-stock products",
    issue: "Products with low inventory show the stock count only in the inventory section. There's no prominent urgency signal near the primary CTA.",
    impact: "Scarcity signals increase add-to-cart rate by 10–20% when shown near the purchase action. \"Only 3 left\" is ineffective at the bottom of the page.",
    fix: "When stock ≤ 10 units, show \"Only {n} left\" in amber directly below the quantity selector and above the Add to Cart button. When stock ≤ 3, use a red variant.",
    status: "recommendation",
  },
  {
    id: "v04", severity: "low", category: "conversion", area: "Seller onboarding",
    title: "Seller onboarding has no social proof or urgency",
    issue: "The seller application page is purely functional: form fields, submit. There's no data on earnings potential, current seller count, or recent success stories.",
    impact: "Potential sellers who are on the fence need motivation. Showing \"Join 4,200 sellers earning an average of ₱28,000/month\" significantly increases application completion.",
    fix: "Add a sidebar or banner on the application form with: active seller count, average monthly revenue, most recent success quote, and a headline stat about buyer traffic.",
    status: "recommendation",
  },
];

// ── Derived stats ─────────────────────────────────────────────
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "accessibility", label: "Accessibility", emoji: "♿" },
  { id: "ux",           label: "UX",             emoji: "🧭" },
  { id: "consistency",  label: "Consistency",    emoji: "🔧" },
  { id: "cognitive",    label: "Cognitive Load", emoji: "🧠" },
  { id: "trust",        label: "Trust",          emoji: "🔒" },
  { id: "conversion",   label: "Conversion",     emoji: "📈" },
];

const SEV_COLORS: Record<Severity, { bg: string; text: string; ring: string }> = {
  critical: { bg: "bg-[var(--color-red-light)]",    text: "text-[var(--color-red)]",    ring: "border-l-[var(--color-red)]" },
  high:     { bg: "bg-[var(--color-amber-light)]",  text: "text-[var(--color-amber)]",  ring: "border-l-[var(--color-amber)]" },
  medium:   { bg: "bg-[var(--color-navy-surface)]", text: "text-[var(--color-navy)]",   ring: "border-l-[var(--color-navy)]" },
  low:      { bg: "bg-[var(--color-surface)]",      text: "text-[var(--color-ink-muted)]", ring: "border-l-[var(--color-border-strong)]" },
};

const STATUS_COLORS: Record<Status, { bg: string; text: string; label: string }> = {
  fixed:          { bg: "bg-[var(--color-green-light)]",  text: "text-[var(--color-green)]",    label: "✓ Fixed" },
  partial:        { bg: "bg-[var(--color-amber-light)]",  text: "text-[var(--color-amber)]",    label: "◐ Partial" },
  recommendation: { bg: "bg-[var(--color-surface)]",      text: "text-[var(--color-ink-muted)]", label: "→ Recommendation" },
};

// ── Finding card ──────────────────────────────────────────────
function FindingCard({ f, expanded, onToggle }: { f: Finding; expanded: boolean; onToggle: () => void }) {
  const sev = SEV_COLORS[f.severity];
  const stat = STATUS_COLORS[f.status];
  return (
    <div
      className={`border-l-4 bg-white border border-[var(--color-border)] rounded-sm overflow-hidden cursor-pointer hover:shadow-[0_2px_8px_rgba(28,27,24,0.06)] transition-shadow ${sev.ring}`}
      onClick={onToggle}>
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
          <span className={`font-[var(--font-mono)] text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
            {f.severity}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-[600] text-[var(--color-ink)] leading-snug">{f.title}</p>
            <span className={`font-[var(--font-mono)] text-[8px] px-2 py-0.5 rounded shrink-0 ${stat.bg} ${stat.text}`}>{stat.label}</span>
          </div>
          <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)] mt-0.5">{f.area}</p>
          {!expanded && (
            <p className="text-xs text-[var(--color-ink-muted)] mt-1.5 line-clamp-2 leading-snug">{f.issue}</p>
          )}
        </div>
        <span className="text-[var(--color-ink-muted)] text-sm shrink-0 mt-0.5">{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--color-border-subtle)] px-4 py-4 space-y-3 bg-[var(--color-ground)]">
          <div>
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-1">Issue</p>
            <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">{f.issue}</p>
          </div>
          <div>
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-1">Impact</p>
            <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">{f.impact}</p>
          </div>
          {f.wcag && (
            <div className="flex items-center gap-2">
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Criterion</p>
              <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-navy-surface)] text-[var(--color-navy)] px-2 py-0.5 rounded">{f.wcag}</span>
            </div>
          )}
          <div className={`border-l-2 pl-3 ${f.status === "fixed" ? "border-[var(--color-green)]" : "border-[var(--color-navy)]"}`}>
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-1">{f.status === "fixed" ? "Applied fix" : "Recommended fix"}</p>
            <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">{f.fix}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary strip ─────────────────────────────────────────────
function SummaryStrip() {
  const fixed = FINDINGS.filter(f => f.status === "fixed").length;
  const total = FINDINGS.length;
  const bySev = SEVERITIES.map(s => ({ sev: s, count: FINDINGS.filter(f => f.severity === s).length }));

  return (
    <div className="bg-white border-b border-[var(--color-border)] px-6 py-3 flex flex-wrap items-center gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-[var(--font-display)] text-2xl text-[var(--color-ink)] font-[400]">{total}</span>
        <span className="text-xs text-[var(--color-ink-muted)]">total findings</span>
      </div>
      <div className="w-px h-6 bg-[var(--color-border)]" />
      {bySev.map(({ sev, count }) => (
        <div key={sev} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${SEV_COLORS[sev].bg} border border-current ${SEV_COLORS[sev].text}`} />
          <span className={`font-[var(--font-mono)] text-xs ${SEV_COLORS[sev].text}`}>{count}</span>
          <span className="text-[10px] text-[var(--color-ink-muted)] capitalize">{sev}</span>
        </div>
      ))}
      <div className="w-px h-6 bg-[var(--color-border)]" />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-green)]" />
          <span className="font-[var(--font-mono)] text-xs text-[var(--color-green)]">{fixed} fixed</span>
        </div>
        <div className="w-24 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-green)] rounded-full" style={{ width: `${(fixed / total) * 100}%` }} />
        </div>
        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{Math.round((fixed / total) * 100)}% resolved</span>
      </div>
    </div>
  );
}

// ── Part14 ─────────────────────────────────────────────────────
export default function Part14() {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [activeSeverity, setActiveSeverity] = useState<Severity | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const filtered = FINDINGS.filter(f => {
    if (activeCategory !== "all" && f.category !== activeCategory) return false;
    if (activeSeverity !== "all" && f.severity !== activeSeverity) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-[var(--color-ground)] overflow-hidden">

      {/* ── Top bar ──────────────────────────────────── */}
      <div className="bg-[var(--color-navy)] text-white shrink-0 px-6 py-3 flex items-center gap-4">
        <span className="font-[var(--font-mono)] text-[9px] text-white/40 uppercase tracking-widest">Part 14</span>
        <span className="text-white/20">·</span>
        <span className="font-[var(--font-display)] text-base font-[400] text-white">Accessibility & UX Audit</span>
        <span className="text-white/20">·</span>
        <span className="text-xs text-white/50">Multi-Vendor Marketplace · Marketo</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-[var(--font-mono)] text-[9px] text-white/30">WCAG 2.1 AA baseline</span>
        </div>
      </div>

      {/* ── Summary ──────────────────────────────────── */}
      <SummaryStrip />

      {/* ── Body ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar */}
        <div className="w-52 shrink-0 bg-white border-r border-[var(--color-border)] flex flex-col overflow-hidden">
          {/* Category filters */}
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Category</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveCategory("all")}
                className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors cursor-pointer ${activeCategory === "all" ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}>
                All categories <span className="float-right font-[var(--font-mono)] text-[9px]">{FINDINGS.length}</span>
              </button>
              {CATEGORIES.map(cat => {
                const count = FINDINGS.filter(f => f.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors cursor-pointer ${activeCategory === cat.id ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}>
                    <span className="mr-1">{cat.emoji}</span>{cat.label} <span className="float-right font-[var(--font-mono)] text-[9px]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity filter */}
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Severity</p>
            <div className="space-y-0.5">
              <button onClick={() => setActiveSeverity("all")} className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors cursor-pointer ${activeSeverity === "all" ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}>All</button>
              {SEVERITIES.map(s => (
                <button key={s} onClick={() => setActiveSeverity(s)} className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors cursor-pointer capitalize ${activeSeverity === s ? `${SEV_COLORS[s].bg} ${SEV_COLORS[s].text} font-[500]` : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}>
                  {s} <span className="float-right font-[var(--font-mono)] text-[9px]">{FINDINGS.filter(f => f.severity === s).length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="px-4 py-3">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Status</p>
            <div className="space-y-0.5">
              {([["all","All"], ["fixed","Fixed"], ["recommendation","Recommendations"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setStatusFilter(id)} className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors cursor-pointer ${statusFilter === id ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}>
                  {label} {id !== "all" && <span className="float-right font-[var(--font-mono)] text-[9px]">{FINDINGS.filter(f => f.status === id).length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-auto px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] text-[var(--color-ink-muted)] space-y-1">
            <p className="font-[var(--font-mono)] text-[9px] uppercase tracking-widest mb-1.5">Files modified</p>
            {["PublicShell.tsx","SellerShell.tsx","AdminShell.tsx"].map(f => (
              <p key={f} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] shrink-0" />
                {f}
              </p>
            ))}
          </div>
        </div>

        {/* Findings list */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Filter state label */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--color-ink-muted)]">
              Showing <strong className="text-[var(--color-ink)]">{filtered.length}</strong> of {FINDINGS.length} findings
              {activeCategory !== "all" && ` in ${CATEGORIES.find(c => c.id === activeCategory)?.label}`}
              {activeSeverity !== "all" && ` — ${activeSeverity} severity`}
            </p>
            {(activeCategory !== "all" || activeSeverity !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => { setActiveCategory("all"); setActiveSeverity("all"); setStatusFilter("all"); }}
                className="text-xs text-[var(--color-navy)] font-[500] cursor-pointer hover:underline">
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-[var(--color-ink-muted)]">No findings match the current filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(f => (
                <FindingCard
                  key={f.id}
                  f={f}
                  expanded={expandedId === f.id}
                  onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                />
              ))}
            </div>
          )}

          {/* Implementation notes footer */}
          <div className="mt-8 bg-white border border-[var(--color-border)] rounded-sm p-5">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Implementation notes</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--color-ink-secondary)]">
              <div>
                <p className="font-[600] text-[var(--color-ink)] mb-1">Immediate (WCAG A/AA)</p>
                <p className="leading-relaxed">All 7 \"fixed\" findings in shells have been applied. Run axe-core or WAVE browser extension to verify the rendered output. Re-test after adding real images and live form pages.</p>
              </div>
              <div>
                <p className="font-[600] text-[var(--color-ink)] mb-1">Short-term (UX & Trust)</p>
                <p className="leading-relaxed">Prioritise the checkout price breakdown (t01), payment security signals (t03), and order confirmation timeline (t04). These have the highest abandonment risk and are low implementation cost.</p>
              </div>
              <div>
                <p className="font-[600] text-[var(--color-ink)] mb-1">Longer-term (Cognitive & Conversion)</p>
                <p className="leading-relaxed">Checkout wizard (g01) and product upload wizard (g02) require state-management work but have the highest completion-rate impact. Wishlist-on-mobile (v01) is one-line CSS and should ship immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
