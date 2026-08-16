import { useState } from "react";
import { Tag, SectionHeader, Card } from "./shared";

const SECTIONS = [
  { id: "sitemap", label: "01 — Sitemap" },
  { id: "routes", label: "02 — Route Hierarchy" },
  { id: "navigation", label: "03 — Navigation Hierarchy" },
  { id: "buyer-flow", label: "04 — Buyer Flow" },
  { id: "seller-flow", label: "05 — Seller Flow" },
  { id: "admin-flow", label: "06 — Admin Flow" },
  { id: "multi-seller", label: "07 — Multi-Seller Flow" },
  { id: "permissions", label: "08 — Permission Boundaries" },
];

// ── Sitemap tree ────────────────────────────────────────────────────────────

type TreeNode = { label: string; route?: string; badge?: string; children?: TreeNode[] };

function TreeItem({ node, depth = 0, last = false }: { node: TreeNode; depth?: number; last?: boolean }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth > 0 ? `${depth * 20}px` : "0" }}>
        {depth > 0 && (
          <span className="absolute text-[var(--color-border)]" style={{ left: `${(depth - 1) * 20 + 8}px`, top: "50%" }}>
            {last ? "└" : "├"}
          </span>
        )}
        <span className={`font-[var(--font-mono)] text-[11px] ${node.route ? "text-[var(--color-navy)]" : "text-[var(--color-ink-muted)]"}`}>
          {node.route || ""}
        </span>
        <span className="text-xs text-[var(--color-ink)]">{node.label}</span>
        {node.badge && <Tag color={node.badge as "navy" | "amber" | "violet" | "green" | "red" | "muted"}>{node.badge}</Tag>}
      </div>
      {hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <TreeItem key={i} node={child} depth={depth + 1} last={i === node.children!.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const SITEMAP: TreeNode[] = [
  {
    label: "Public", children: [
      { label: "Home", route: "/" },
      { label: "Search results", route: "/search" },
      { label: "Categories", route: "/categories", children: [{ label: "Category listing", route: "/categories/:slug" }] },
      { label: "Products", route: "/products", children: [{ label: "Product detail", route: "/products/:slug" }] },
      { label: "Store / Seller page", route: "/stores/:slug" },
    ]
  },
  {
    label: "Authentication", children: [
      { label: "Login", route: "/login" },
      { label: "Register", route: "/register", children: [{ label: "Email verification", route: "/register/verify" }, { label: "Profile completion", route: "/register/complete" }] },
      { label: "Forgot password", route: "/forgot-password" },
      { label: "Reset password", route: "/reset-password" },
    ]
  },
  {
    label: "Buyer (authenticated)", badge: "navy", children: [
      { label: "Cart", route: "/cart" },
      {
        label: "Checkout", route: "/checkout", children: [
          { label: "Address selection", route: "/checkout/address" },
          { label: "Delivery options", route: "/checkout/delivery" },
          { label: "Payment", route: "/checkout/payment" },
          { label: "Order review", route: "/checkout/review" },
          { label: "Confirmation", route: "/checkout/confirmation" },
        ]
      },
      {
        label: "Account", route: "/account", children: [
          { label: "Orders", route: "/account/orders", children: [{ label: "Order detail", route: "/account/orders/:id" }, { label: "Order tracking", route: "/account/orders/:id/tracking" }] },
          { label: "Wishlist", route: "/account/wishlist" },
          { label: "Addresses", route: "/account/addresses" },
          { label: "Reviews", route: "/account/reviews" },
          { label: "Messages", route: "/account/messages", children: [{ label: "Conversation", route: "/account/messages/:id" }] },
          { label: "Notifications", route: "/account/notifications" },
          { label: "Settings", route: "/account/settings" },
        ]
      },
    ]
  },
  {
    label: "Seller (authenticated + approved)", badge: "amber", children: [
      {
        label: "Seller onboarding", route: "/seller/onboarding", children: [
          { label: "Apply", route: "/seller/onboarding/apply" },
          { label: "Category selection", route: "/seller/onboarding/category" },
          { label: "Store setup", route: "/seller/onboarding/store" },
          { label: "Document verification", route: "/seller/onboarding/verify" },
          { label: "Pending review", route: "/seller/onboarding/pending" },
        ]
      },
      { label: "Dashboard", route: "/seller/dashboard" },
      { label: "Products", route: "/seller/products", children: [{ label: "Add product", route: "/seller/products/new" }, { label: "Edit product", route: "/seller/products/:id/edit" }, { label: "Product variants", route: "/seller/products/:id/variants" }] },
      { label: "Inventory", route: "/seller/inventory" },
      { label: "Orders", route: "/seller/orders", children: [{ label: "Order detail", route: "/seller/orders/:id" }] },
      { label: "Customers", route: "/seller/customers", children: [{ label: "Customer detail", route: "/seller/customers/:id" }] },
      { label: "Promotions", route: "/seller/promotions", children: [{ label: "Create promotion", route: "/seller/promotions/new" }] },
      { label: "Analytics", route: "/seller/analytics" },
      { label: "Store management", route: "/seller/store" },
      { label: "Messages", route: "/seller/messages", children: [{ label: "Conversation", route: "/seller/messages/:id" }] },
      { label: "Notifications", route: "/seller/notifications" },
      { label: "Settings", route: "/seller/settings" },
    ]
  },
  {
    label: "Admin (authenticated + admin role)", badge: "violet", children: [
      { label: "Dashboard", route: "/admin/dashboard" },
      { label: "Users", route: "/admin/users", children: [{ label: "User detail", route: "/admin/users/:id" }] },
      { label: "Sellers", route: "/admin/sellers", children: [{ label: "Seller applications", route: "/admin/sellers/applications" }, { label: "Application review", route: "/admin/sellers/applications/:id" }, { label: "Seller detail", route: "/admin/sellers/:id" }] },
      { label: "Products", route: "/admin/products", children: [{ label: "Product detail", route: "/admin/products/:id" }] },
      { label: "Orders", route: "/admin/orders", children: [{ label: "Order detail", route: "/admin/orders/:id" }] },
      { label: "Categories", route: "/admin/categories", children: [{ label: "Edit category", route: "/admin/categories/:id" }] },
      { label: "Reports", route: "/admin/reports", children: [{ label: "Report detail", route: "/admin/reports/:id" }] },
      { label: "Moderation", route: "/admin/moderation" },
      { label: "Analytics", route: "/admin/analytics" },
      { label: "Settings", route: "/admin/settings" },
    ]
  },
  {
    label: "System", children: [
      { label: "Not found", route: "/404" },
      { label: "Unauthorized", route: "/403" },
      { label: "Server error", route: "/500" },
      { label: "Network error", route: "/error/network" },
    ]
  },
];

// ── Route table ──────────────────────────────────────────────────────────────

const ROUTES: { route: string; name: string; access: string; protected: boolean }[] = [
  { route: "/", name: "Home / Marketplace", access: "Public", protected: false },
  { route: "/search", name: "Search Results", access: "Public", protected: false },
  { route: "/categories", name: "All Categories", access: "Public", protected: false },
  { route: "/categories/:slug", name: "Category Listing", access: "Public", protected: false },
  { route: "/products/:slug", name: "Product Detail", access: "Public", protected: false },
  { route: "/stores/:slug", name: "Seller Storefront", access: "Public", protected: false },
  { route: "/login", name: "Login", access: "Guest only", protected: false },
  { route: "/register", name: "Register", access: "Guest only", protected: false },
  { route: "/register/verify", name: "Email Verification", access: "Guest only", protected: false },
  { route: "/register/complete", name: "Profile Completion", access: "Guest only", protected: false },
  { route: "/forgot-password", name: "Forgot Password", access: "Guest only", protected: false },
  { route: "/reset-password", name: "Reset Password", access: "Guest only", protected: false },
  { route: "/cart", name: "Shopping Cart", access: "Public (persists on login)", protected: false },
  { route: "/checkout/*", name: "Checkout Flow", access: "Buyer", protected: true },
  { route: "/account", name: "Buyer Account", access: "Buyer", protected: true },
  { route: "/account/orders", name: "Order History", access: "Buyer", protected: true },
  { route: "/account/orders/:id", name: "Order Detail", access: "Buyer (own orders)", protected: true },
  { route: "/account/orders/:id/tracking", name: "Order Tracking", access: "Buyer (own orders)", protected: true },
  { route: "/account/wishlist", name: "Wishlist", access: "Buyer", protected: true },
  { route: "/account/addresses", name: "Saved Addresses", access: "Buyer", protected: true },
  { route: "/account/reviews", name: "My Reviews", access: "Buyer", protected: true },
  { route: "/account/messages/:id?", name: "Buyer Messages", access: "Buyer", protected: true },
  { route: "/account/notifications", name: "Notifications", access: "Buyer", protected: true },
  { route: "/account/settings", name: "Account Settings", access: "Buyer", protected: true },
  { route: "/seller/onboarding/*", name: "Seller Onboarding", access: "Authenticated (non-seller)", protected: true },
  { route: "/seller/dashboard", name: "Seller Dashboard", access: "Seller (approved)", protected: true },
  { route: "/seller/products", name: "Product List", access: "Seller (approved)", protected: true },
  { route: "/seller/products/new", name: "Add Product", access: "Seller (approved)", protected: true },
  { route: "/seller/products/:id/edit", name: "Edit Product", access: "Seller (own products)", protected: true },
  { route: "/seller/products/:id/variants", name: "Product Variants", access: "Seller (own products)", protected: true },
  { route: "/seller/inventory", name: "Inventory", access: "Seller (approved)", protected: true },
  { route: "/seller/orders", name: "Seller Orders", access: "Seller (approved)", protected: true },
  { route: "/seller/orders/:id", name: "Order Detail", access: "Seller (own orders)", protected: true },
  { route: "/seller/customers", name: "Customers", access: "Seller (approved)", protected: true },
  { route: "/seller/promotions", name: "Promotions", access: "Seller (approved)", protected: true },
  { route: "/seller/analytics", name: "Analytics", access: "Seller (approved)", protected: true },
  { route: "/seller/store", name: "Store Management", access: "Seller (approved)", protected: true },
  { route: "/seller/messages/:id?", name: "Seller Messages", access: "Seller (approved)", protected: true },
  { route: "/seller/notifications", name: "Notifications", access: "Seller (approved)", protected: true },
  { route: "/seller/settings", name: "Seller Settings", access: "Seller (approved)", protected: true },
  { route: "/admin/dashboard", name: "Admin Dashboard", access: "Admin", protected: true },
  { route: "/admin/users", name: "User Management", access: "Admin", protected: true },
  { route: "/admin/users/:id", name: "User Detail", access: "Admin", protected: true },
  { route: "/admin/sellers", name: "Seller Management", access: "Admin", protected: true },
  { route: "/admin/sellers/applications", name: "Seller Applications", access: "Admin", protected: true },
  { route: "/admin/sellers/applications/:id", name: "Application Review", access: "Admin", protected: true },
  { route: "/admin/sellers/:id", name: "Seller Detail", access: "Admin", protected: true },
  { route: "/admin/products", name: "Product Oversight", access: "Admin", protected: true },
  { route: "/admin/products/:id", name: "Product Detail", access: "Admin", protected: true },
  { route: "/admin/orders", name: "Order Oversight", access: "Admin", protected: true },
  { route: "/admin/orders/:id", name: "Order Detail", access: "Admin", protected: true },
  { route: "/admin/categories", name: "Category Management", access: "Admin", protected: true },
  { route: "/admin/categories/:id", name: "Edit Category", access: "Admin", protected: true },
  { route: "/admin/reports", name: "Reports Queue", access: "Admin", protected: true },
  { route: "/admin/reports/:id", name: "Report Detail", access: "Admin", protected: true },
  { route: "/admin/moderation", name: "Moderation", access: "Admin", protected: true },
  { route: "/admin/analytics", name: "Platform Analytics", access: "Admin", protected: true },
  { route: "/admin/settings", name: "Platform Settings", access: "Admin", protected: true },
  { route: "/404", name: "Not Found", access: "Public", protected: false },
  { route: "/403", name: "Unauthorized", access: "Public", protected: false },
  { route: "/500", name: "Server Error", access: "Public", protected: false },
];

// ── Flow diagram ─────────────────────────────────────────────────────────────

type FlowStep = {
  id: string;
  label: string;
  sublabel?: string;
  type?: "step" | "decision" | "terminal" | "system";
  branches?: { label: string; to: string; outcome?: "success" | "fail" }[];
};

function FlowNode({ step, color }: { step: FlowStep; color: string }) {
  const base = "relative flex flex-col items-center justify-center text-center rounded-sm border px-3 py-2.5 min-w-[108px] max-w-[128px]";
  const styles: Record<string, string> = {
    navy: `bg-[#E0EAF4] border-[#1A3550] text-[#1A3550]`,
    amber: `bg-[#F5E8D0] border-[#B8782A] text-[#7A4E14]`,
    violet: `bg-[#E8E0F4] border-[#4A3272] text-[#4A3272]`,
    green: `bg-[#D8EDD6] border-[#2D6A4F] text-[#1E5238]`,
    red: `bg-[#F5DADA] border-[#8B2C2C] text-[#6B1E1E]`,
    muted: `bg-[#EFEDE7] border-[#DDD9CE] text-[#6B6860]`,
    decision: `bg-[#FFF8EC] border-[#B8782A] text-[#7A4E14] rotate-0`,
    system: `bg-white border-dashed border-[#DDD9CE] text-[#6B6860]`,
  };
  const typeStyle = step.type === "decision" ? styles.decision : step.type === "system" ? styles.system : step.type === "terminal" ? styles.green : styles[color];
  return (
    <div className={`${base} ${typeStyle}`}>
      {step.type === "decision" && <span className="font-[var(--font-mono)] text-[8px] tracking-widest mb-0.5 opacity-60">DECISION</span>}
      <span className="font-[var(--font-body)] text-[11px] font-[600] leading-snug">{step.label}</span>
      {step.sublabel && <span className="font-[var(--font-mono)] text-[9px] opacity-60 mt-0.5 leading-tight">{step.sublabel}</span>}
    </div>
  );
}

function Arrow({ label, outcome }: { label?: string; outcome?: "success" | "fail" }) {
  return (
    <div className="flex flex-col items-center justify-center shrink-0 mx-1">
      {label && <span className={`font-[var(--font-mono)] text-[9px] tracking-wide mb-0.5 ${outcome === "fail" ? "text-[var(--color-red)]" : outcome === "success" ? "text-[var(--color-green)]" : "text-[var(--color-ink-muted)]"}`}>{label}</span>}
      <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
        <line x1="0" y1="6" x2="22" y2="6" stroke={outcome === "fail" ? "#8B2C2C" : outcome === "success" ? "#2D6A4F" : "#6B6860"} strokeWidth="1.2" />
        <polygon points="22,3 28,6 22,9" fill={outcome === "fail" ? "#8B2C2C" : outcome === "success" ? "#2D6A4F" : "#6B6860"} />
      </svg>
    </div>
  );
}

function FlowRow({ steps, color, wrap = false }: { steps: Array<{ label: string; sublabel?: string; type?: "step" | "decision" | "terminal" | "system"; arrow?: string; outcome?: "success" | "fail" }>; color: string; wrap?: boolean }) {
  return (
    <div className={`flex items-center gap-0 ${wrap ? "flex-wrap gap-y-3" : "overflow-x-auto pb-2"}`}>
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-0 shrink-0">
          <FlowNode step={{ id: String(i), label: s.label, sublabel: s.sublabel, type: s.type }} color={color} />
          {i < steps.length - 1 && <Arrow label={s.arrow} outcome={s.outcome} />}
        </div>
      ))}
    </div>
  );
}

// ── Permission matrix ────────────────────────────────────────────────────────

type Permission = "full" | "own" | "read" | "none";
const P_ICON: Record<Permission, React.ReactNode> = {
  full: <span className="inline-flex items-center justify-center w-5 h-5 bg-[var(--color-navy)] rounded text-white text-[9px] font-[var(--font-mono)]">ALL</span>,
  own: <span className="inline-flex items-center justify-center w-5 h-5 bg-[var(--color-amber-light)] border border-[var(--color-amber)] rounded text-[var(--color-amber)] text-[9px] font-[var(--font-mono)]">OWN</span>,
  read: <span className="inline-flex items-center justify-center w-5 h-5 bg-[var(--color-green-light)] border border-[var(--color-green)] rounded text-[var(--color-green)] text-[9px] font-[var(--font-mono)]">R</span>,
  none: <span className="inline-block w-3 h-px bg-[var(--color-border)]" />,
};

export default function Part02() {
  const [activeSection, setActiveSection] = useState("sitemap");
  const [sitemapGroup, setSitemapGroup] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(`p2-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const accessColor = (access: string) => {
    if (access.startsWith("Admin")) return "violet";
    if (access.startsWith("Seller")) return "amber";
    if (access.startsWith("Buyer") || access.startsWith("Authenticated")) return "navy";
    if (access.startsWith("Guest")) return "muted";
    return "green";
  };

  return (
    <div className="flex">
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] py-6">
        <div className="px-5 mb-4">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase">Sections</p>
        </div>
        <nav>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              className={`w-full text-left px-5 py-2 text-xs font-[var(--font-mono)] transition-colors ${activeSection === s.id ? "text-[var(--color-navy)] bg-white border-r-2 border-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 px-6 md:px-10 xl:px-16 py-10 max-w-5xl">

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-2"><Tag color="muted">IA & USER FLOWS</Tag></div>
          <h1 className="font-[var(--font-display)] text-5xl md:text-6xl font-[300] text-[var(--color-ink)] leading-[1.05] mb-4">
            Information<br /><em className="font-[300] italic text-[var(--color-navy)]">Architecture</em>
          </h1>
          <p className="text-base text-[var(--color-ink-muted)] font-[300] max-w-xl leading-relaxed">
            Sitemap, route hierarchy, navigation structure, user flows for all three roles, multi-seller transaction flow, and permission boundaries for the marketplace web platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Tag color="navy">60 Routes</Tag>
            <Tag color="amber">4 User Flows</Tag>
            <Tag color="violet">3 Role Scopes</Tag>
            <Tag color="green">Full Permission Matrix</Tag>
          </div>
        </div>

        {/* 01 SITEMAP */}
        <section id="p2-sitemap" className="mb-14 scroll-mt-24">
          <SectionHeader num="01" title="Sitemap" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">Complete page hierarchy organized by access zone. Click a section header to expand or collapse.</p>
          <div className="space-y-3">
            {SITEMAP.map((group, gi) => (
              <div key={gi} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                <button
                  onClick={() => setSitemapGroup(sitemapGroup === gi ? null : gi)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-surface)] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] w-5">{String(gi + 1).padStart(2, "0")}</span>
                    <span className="text-sm font-[600] text-[var(--color-ink)]">{group.label}</span>
                    {group.badge && <Tag color={group.badge as "navy" | "amber" | "violet" | "green" | "red" | "muted"}>{group.badge}</Tag>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{group.children?.length} sections</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" className={`text-[var(--color-ink-muted)] transition-transform ${sitemapGroup === gi ? "rotate-180" : ""}`}>
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>
                {sitemapGroup === gi && (
                  <div className="border-t border-[var(--color-border)] px-5 py-4 bg-[var(--color-ground)]">
                    <div className="font-[var(--font-mono)] text-[11px]">
                      {group.children?.map((child, ci) => (
                        <div key={ci}>
                          <div className="flex items-center gap-3 py-1">
                            <span className="text-[var(--color-ink-muted)]">├─</span>
                            <span className="text-[var(--color-navy)] min-w-[220px]">{child.route}</span>
                            <span className="text-[var(--color-ink)]">{child.label}</span>
                          </div>
                          {child.children?.map((sub, si) => (
                            <div key={si}>
                              <div className="flex items-center gap-3 py-0.5 pl-5">
                                <span className="text-[var(--color-border)]">├─</span>
                                <span className="text-[var(--color-navy-light)] min-w-[215px]">{sub.route}</span>
                                <span className="text-[var(--color-ink-muted)]">{sub.label}</span>
                              </div>
                              {sub.children?.map((deep, di) => (
                                <div key={di} className="flex items-center gap-3 py-0.5 pl-10">
                                  <span className="text-[var(--color-border)]">└─</span>
                                  <span className="text-[var(--color-navy-light)] opacity-70 min-w-[210px]">{deep.route}</span>
                                  <span className="text-[var(--color-ink-muted)] opacity-70">{deep.label}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 02 ROUTES */}
        <section id="p2-routes" className="mb-14 scroll-mt-24">
          <SectionHeader num="02" title="Route Hierarchy" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">
            Complete route table with access requirements. Protected routes require valid authentication token and matching role claim.
          </p>
          <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                    <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4 w-8">#</th>
                    <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4">Route</th>
                    <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4 hidden md:table-cell">Page Name</th>
                    <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4">Access</th>
                    <th className="text-center font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4 hidden sm:table-cell">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {ROUTES.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-ground)] transition-colors">
                      <td className="py-2 px-4 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-2 px-4 font-[var(--font-mono)] text-[10px] text-[var(--color-navy)]">{r.route}</td>
                      <td className="py-2 px-4 text-[var(--color-ink)] hidden md:table-cell">{r.name}</td>
                      <td className="py-2 px-4"><Tag color={accessColor(r.access) as "navy" | "amber" | "violet" | "green" | "red" | "muted"}>{r.access}</Tag></td>
                      <td className="py-2 px-4 text-center hidden sm:table-cell">
                        {r.protected
                          ? <span className="inline-block w-2 h-2 bg-[var(--color-amber)] rounded-full" title="Protected" />
                          : <span className="inline-block w-2 h-2 bg-[var(--color-green)] rounded-full" title="Public" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]"><span className="inline-block w-2 h-2 bg-[var(--color-green)] rounded-full" />Public</div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]"><span className="inline-block w-2 h-2 bg-[var(--color-amber)] rounded-full" />Protected (auth + role required)</div>
          </div>
        </section>

        {/* 03 NAVIGATION HIERARCHY */}
        <section id="p2-navigation" className="mb-14 scroll-mt-24">
          <SectionHeader num="03" title="Navigation Hierarchy" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">Each role sees a distinct navigation structure. The global header adapts to the authenticated user's role context.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            {/* Public nav */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <Tag color="green">PUBLIC / GUEST</Tag>
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Global header</span>
              </div>
              <div className="space-y-2">
                {[
                  { zone: "Primary", items: ["Logo / Home", "Categories (mega menu)", "Search bar"] },
                  { zone: "Secondary", items: ["Cart icon", "Log In", "Register"] },
                  { zone: "Mobile", items: ["Hamburger → Categories", "Search", "Cart"] },
                ].map(({ zone, items }) => (
                  <div key={zone} className="flex gap-3">
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] w-16 shrink-0 pt-0.5 tracking-wide uppercase">{zone}</span>
                    <div className="flex flex-wrap gap-1">
                      {items.map(i => <span key={i} className="text-xs bg-[var(--color-surface)] text-[var(--color-ink)] px-2 py-0.5 rounded border border-[var(--color-border)]">{i}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Buyer nav */}
            <Card className="border-l-2 border-l-[var(--color-navy)]">
              <div className="mb-3 flex items-center justify-between">
                <Tag color="navy">BUYER</Tag>
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Global header</span>
              </div>
              <div className="space-y-2">
                {[
                  { zone: "Primary", items: ["Logo / Home", "Categories (mega menu)", "Search bar"] },
                  { zone: "Secondary", items: ["Wishlist icon", "Cart (badge count)", "Avatar → Account menu"] },
                  { zone: "Account menu", items: ["My Orders", "Wishlist", "Addresses", "Reviews", "Messages", "Notifications", "Settings", "Log out"] },
                  { zone: "Mobile", items: ["Bottom nav: Home, Search, Cart, Account"] },
                ].map(({ zone, items }) => (
                  <div key={zone} className="flex gap-3">
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] w-20 shrink-0 pt-0.5 tracking-wide uppercase leading-tight">{zone}</span>
                    <div className="flex flex-wrap gap-1">
                      {items.map(i => <span key={i} className="text-xs bg-[var(--color-surface)] text-[var(--color-ink)] px-2 py-0.5 rounded border border-[var(--color-border)]">{i}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Seller nav */}
            <Card className="border-l-2 border-l-[var(--color-amber)]">
              <div className="mb-3 flex items-center justify-between">
                <Tag color="amber">SELLER</Tag>
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Seller Center sidebar</span>
              </div>
              <div className="space-y-2">
                {[
                  { zone: "Top bar", items: ["Logo + Seller Center", "Store name", "Notifications", "Avatar menu"] },
                  { zone: "Sidebar", items: ["Dashboard", "Products", "Inventory", "Orders", "Customers", "Promotions", "Analytics", "Store"] },
                  { zone: "Sidebar footer", items: ["Messages", "Notifications", "Settings", "Log out"] },
                  { zone: "Mobile", items: ["Collapsible sidebar drawer"] },
                ].map(({ zone, items }) => (
                  <div key={zone} className="flex gap-3">
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] w-20 shrink-0 pt-0.5 tracking-wide uppercase leading-tight">{zone}</span>
                    <div className="flex flex-wrap gap-1">
                      {items.map(i => <span key={i} className="text-xs bg-[var(--color-surface)] text-[var(--color-ink)] px-2 py-0.5 rounded border border-[var(--color-border)]">{i}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Admin nav */}
            <Card className="border-l-2 border-l-[var(--color-violet)]">
              <div className="mb-3 flex items-center justify-between">
                <Tag color="violet">ADMIN</Tag>
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Admin panel sidebar</span>
              </div>
              <div className="space-y-2">
                {[
                  { zone: "Top bar", items: ["Logo + Admin Panel", "Quick search", "Notifications", "Avatar menu"] },
                  { zone: "Sidebar", items: ["Dashboard", "Users", "Sellers", "Products", "Orders", "Categories", "Reports", "Moderation"] },
                  { zone: "Sidebar footer", items: ["Analytics", "Settings", "Log out"] },
                  { zone: "Mobile", items: ["Collapsible sidebar drawer"] },
                ].map(({ zone, items }) => (
                  <div key={zone} className="flex gap-3">
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] w-20 shrink-0 pt-0.5 tracking-wide uppercase leading-tight">{zone}</span>
                    <div className="flex flex-wrap gap-1">
                      {items.map(i => <span key={i} className="text-xs bg-[var(--color-surface)] text-[var(--color-ink)] px-2 py-0.5 rounded border border-[var(--color-border)]">{i}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="bg-[var(--color-ground)] border-dashed">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-2">Navigation rule</p>
            <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
              A user authenticated as both a buyer and a seller (same account, seller application approved) sees a role-context switcher in the top bar. The global header renders the public marketplace nav when browsing as buyer; the Seller Center has its own separate layout shell accessed via the role switcher. The admin panel is always a separate layout, never mixed with buyer or seller nav.
            </p>
          </Card>
        </section>

        {/* 04 BUYER FLOW */}
        <section id="p2-buyer-flow" className="mb-14 scroll-mt-24">
          <SectionHeader num="04" title="Buyer User Flow" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">Primary path from discovery to post-purchase review. Alternate entry points (direct product link, saved wishlist) skip the browse steps.</p>

          <div className="space-y-5">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Entry — Authentication</p>
              <div className="overflow-x-auto">
                <FlowRow color="navy" steps={[
                  { label: "Land on Marketplace", sublabel: "/", type: "step" },
                  { label: "Register or Log In", sublabel: "/register · /login" },
                  { label: "Email Verification", sublabel: "/register/verify" },
                  { label: "Profile Complete", sublabel: "/register/complete", type: "terminal" },
                ]} />
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Discovery — Product Selection</p>
              <div className="overflow-x-auto">
                <FlowRow color="navy" steps={[
                  { label: "Browse Home", sublabel: "/" },
                  { label: "Browse Category", sublabel: "/categories/:slug" },
                  { label: "Search / Filter", sublabel: "/search" },
                  { label: "Product Detail", sublabel: "/products/:slug" },
                  { label: "View Store", sublabel: "/stores/:slug" },
                  { label: "Add to Cart", sublabel: "Cart state update", type: "terminal" },
                ]} />
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Checkout Flow</p>
              <div className="overflow-x-auto">
                <FlowRow color="navy" steps={[
                  { label: "Cart Review", sublabel: "/cart" },
                  { label: "Address", sublabel: "/checkout/address" },
                  { label: "Delivery", sublabel: "/checkout/delivery" },
                  { label: "Payment", sublabel: "/checkout/payment" },
                  { label: "Review & Confirm", sublabel: "/checkout/review" },
                  { label: "Order Created", sublabel: "Backend splits by seller" },
                  { label: "Confirmation", sublabel: "/checkout/confirmation", type: "terminal" },
                ]} />
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Post-Purchase</p>
              <div className="overflow-x-auto">
                <FlowRow color="navy" steps={[
                  { label: "Order List", sublabel: "/account/orders" },
                  { label: "Order Detail", sublabel: "/account/orders/:id" },
                  { label: "Tracking", sublabel: "/account/orders/:id/tracking" },
                  { label: "Item Delivered", sublabel: "Status: Completed", type: "terminal" },
                  { label: "Leave Review", sublabel: "/account/reviews" },
                  { label: "Review Published", sublabel: "With moderation queue", type: "terminal" },
                ]} />
              </div>
            </div>
          </div>
        </section>

        {/* 05 SELLER FLOW */}
        <section id="p2-seller-flow" className="mb-14 scroll-mt-24">
          <SectionHeader num="05" title="Seller User Flow" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">Two distinct phases: onboarding (one-time, gated by admin approval) and ongoing operations (post-approval).</p>

          <div className="space-y-5">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Onboarding — Registration to Approval</p>
              <div className="overflow-x-auto">
                <FlowRow color="amber" steps={[
                  { label: "Register Account", sublabel: "/register" },
                  { label: "Apply as Seller", sublabel: "/seller/onboarding/apply" },
                  { label: "Select Category", sublabel: "/seller/onboarding/category" },
                  { label: "Set Up Store", sublabel: "/seller/onboarding/store" },
                  { label: "Upload Documents", sublabel: "/seller/onboarding/verify" },
                  { label: "Pending Review", sublabel: "/seller/onboarding/pending", type: "system" },
                ]} />
              </div>
              <div className="mt-4 ml-0 flex items-start gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Arrow label="Approved" outcome="success" />
                  <div className="bg-[#D8EDD6] border border-[var(--color-green)] rounded-sm px-3 py-2 text-[11px] font-[600] text-[var(--color-green)]">Access Granted → Seller Dashboard</div>
                </div>
                <div className="flex items-center gap-2">
                  <Arrow label="Rejected" outcome="fail" />
                  <div className="bg-[#F5DADA] border border-[var(--color-red)] rounded-sm px-3 py-2 text-[11px] font-[600] text-[var(--color-red)]">Rejection notice + reason → Re-apply option</div>
                </div>
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Ongoing Operations</p>
              <div className="overflow-x-auto">
                <FlowRow color="amber" steps={[
                  { label: "Seller Dashboard", sublabel: "/seller/dashboard" },
                  { label: "Create Product", sublabel: "/seller/products/new" },
                  { label: "Set Variants", sublabel: "/seller/products/:id/variants" },
                  { label: "Set Inventory", sublabel: "/seller/inventory" },
                  { label: "Product Live", sublabel: "Visible on marketplace", type: "terminal" },
                ]} />
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Order Fulfillment</p>
              <div className="overflow-x-auto">
                <FlowRow color="amber" steps={[
                  { label: "New Order Alert", sublabel: "Notification" },
                  { label: "Order Detail", sublabel: "/seller/orders/:id" },
                  { label: "Confirm & Pack", sublabel: "Status: Processing" },
                  { label: "Courier Pickup", sublabel: "Courier assigned (backend)" },
                  { label: "Mark Shipped", sublabel: "Status: Shipped" },
                  { label: "Delivered", sublabel: "Status: Completed", type: "terminal" },
                ]} />
              </div>
            </div>
          </div>
        </section>

        {/* 06 ADMIN FLOW */}
        <section id="p2-admin-flow" className="mb-14 scroll-mt-24">
          <SectionHeader num="06" title="Admin Flow" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">Admin operations span ongoing platform monitoring, discrete moderation actions, and configuration tasks.</p>

          <div className="space-y-5">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Daily Platform Operations</p>
              <div className="overflow-x-auto">
                <FlowRow color="violet" steps={[
                  { label: "Admin Login", sublabel: "/login" },
                  { label: "Dashboard", sublabel: "/admin/dashboard" },
                  { label: "Review Metrics", sublabel: "KPIs, alerts" },
                  { label: "Check Reports", sublabel: "/admin/reports" },
                  { label: "Moderation Queue", sublabel: "/admin/moderation" },
                  { label: "Resolve Issues", sublabel: "Actions taken", type: "terminal" },
                ]} />
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Seller Application Review</p>
              <div className="overflow-x-auto">
                <FlowRow color="violet" steps={[
                  { label: "Applications List", sublabel: "/admin/sellers/applications" },
                  { label: "Application Detail", sublabel: "/admin/sellers/applications/:id" },
                  { label: "Review Docs", sublabel: "ID, store info, category" },
                  { label: "Decision", type: "decision", sublabel: "Approve / Reject" },
                ]} />
              </div>
              <div className="mt-4 flex gap-6 flex-wrap ml-0">
                <div className="flex items-center gap-2">
                  <Arrow label="Approve" outcome="success" />
                  <div className="bg-[#D8EDD6] border border-[var(--color-green)] rounded-sm px-3 py-2 text-[11px] font-[600] text-[var(--color-green)]">Seller activated · Notification sent</div>
                </div>
                <div className="flex items-center gap-2">
                  <Arrow label="Reject" outcome="fail" />
                  <div className="bg-[#F5DADA] border border-[var(--color-red)] rounded-sm px-3 py-2 text-[11px] font-[600] text-[var(--color-red)]">Rejection with reason · Seller notified</div>
                </div>
              </div>
            </div>

            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Platform Configuration</p>
              <div className="overflow-x-auto">
                <FlowRow color="violet" steps={[
                  { label: "Categories", sublabel: "/admin/categories" },
                  { label: "Add / Edit / Remove", sublabel: "CRUD on categories" },
                  { label: "Changes Propagate", sublabel: "Marketplace + seller onboarding", type: "terminal" },
                ]} />
              </div>
            </div>
          </div>
        </section>

        {/* 07 MULTI-SELLER FLOW */}
        <section id="p2-multi-seller" className="mb-14 scroll-mt-24">
          <SectionHeader num="07" title="Multi-Seller Transaction Flow" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">A single buyer checkout spanning products from multiple sellers. Seller identity is surfaced at every stage of the buyer journey.</p>

          {/* Cart grouping diagram */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-5">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-4">Step 1 — Cart: Items grouped by seller</p>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-[var(--color-ground)] border border-[var(--color-border)] rounded-sm p-4 min-w-[180px]">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-2 tracking-widest">UNIFIED CART</p>
                {[
                  { seller: "Artisan Goods Co.", items: ["Handmade Rug ×1", "Ceramic Bowl ×2"], color: "amber" },
                  { seller: "TechSource PH", items: ["USB-C Hub ×1"], color: "navy" },
                  { seller: "Artisan Goods Co.", items: ["Wall Print ×1"], color: "amber" },
                ].map((group, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className={`text-[10px] font-[var(--font-mono)] font-[500] mb-1 ${group.color === "amber" ? "text-[var(--color-amber)]" : "text-[var(--color-navy)]"}`}>{group.seller}</div>
                    {group.items.map(item => <div key={item} className="text-xs text-[var(--color-ink-muted)] pl-2">· {item}</div>)}
                  </div>
                ))}
              </div>
              <div className="flex items-center self-center">
                <Arrow label="Grouped by seller" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="bg-[#F5E8D0] border border-[var(--color-amber)] rounded-sm p-3 min-w-[160px]">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-amber)] tracking-widest mb-1">SELLER GROUP A</p>
                  <p className="text-xs font-[600] text-[var(--color-ink)]">Artisan Goods Co.</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">Handmade Rug ×1</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">Ceramic Bowl ×2</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">Wall Print ×1</p>
                  <p className="text-xs font-[500] text-[var(--color-ink)] mt-1.5">Subtotal: ₱4,200</p>
                </div>
                <div className="bg-[#E0EAF4] border border-[var(--color-navy)] rounded-sm p-3 min-w-[160px]">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-navy)] tracking-widest mb-1">SELLER GROUP B</p>
                  <p className="text-xs font-[600] text-[var(--color-ink)]">TechSource PH</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">USB-C Hub ×1</p>
                  <p className="text-xs font-[500] text-[var(--color-ink)] mt-1.5">Subtotal: ₱1,850</p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout → Orders split */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-5">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-4">Step 2 — Checkout: Shared payment, per-seller delivery</p>
            <div className="overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
                <FlowNode step={{ id: "a", label: "Single Address", sublabel: "Buyer's address" }} color="muted" />
                <Arrow />
                <FlowNode step={{ id: "b", label: "Per-Seller Delivery", sublabel: "Each seller may have different courier" }} color="muted" />
                <Arrow />
                <FlowNode step={{ id: "c", label: "Single Payment", sublabel: "Full order total" }} color="muted" />
                <Arrow />
                <FlowNode step={{ id: "d", label: "Order Created", sublabel: "Backend splits", type: "decision" }} color="muted" />
              </div>
            </div>
          </div>

          {/* Order split */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-5">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-4">Step 3 — Order split: Independent sub-orders, unified buyer view</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--color-ground)] border border-[var(--color-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] tracking-widest mb-2">BUYER VIEW</p>
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-1">Order #ORD-2024-0081</p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-2">Overall status shown</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>Artisan Goods Co.</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-green)] text-[10px]">Processing</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>TechSource PH</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-amber)] text-[10px]">Pending</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#F5E8D0] border border-[var(--color-amber)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-amber)] tracking-widest mb-2">SELLER A VIEW</p>
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-1">Sub-order #ORD-0081-A</p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-1">Artisan Goods Co.</p>
                <p className="text-xs text-[var(--color-ink-muted)]">Manages independently</p>
                <p className="text-xs text-[var(--color-ink-muted)]">Own courier assigned</p>
              </div>
              <div className="bg-[#E0EAF4] border border-[var(--color-navy)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-navy)] tracking-widest mb-2">SELLER B VIEW</p>
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-1">Sub-order #ORD-0081-B</p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-1">TechSource PH</p>
                <p className="text-xs text-[var(--color-ink-muted)]">Manages independently</p>
                <p className="text-xs text-[var(--color-ink-muted)]">Own courier assigned</p>
              </div>
            </div>
          </div>

          <Card className="bg-[var(--color-ground)] border-dashed">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-2">Seller identity rule</p>
            <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
              Seller name, store logo, and store rating are displayed alongside every product in cart, checkout, and order views. The buyer always knows which seller fulfilled each item. This is non-negotiable for trust and accountability in a multi-vendor model.
            </p>
          </Card>
        </section>

        {/* 08 PERMISSION BOUNDARIES */}
        <section id="p2-permissions" className="mb-14 scroll-mt-24">
          <SectionHeader num="08" title="Permission Boundaries" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">
            Access is enforced server-side. The frontend renders role-appropriate UI; the API validates every request independently.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs border-collapse bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              <thead>
                <tr className="bg-[var(--color-surface)] border-b-2 border-[var(--color-border)]">
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4 min-w-[180px]">Resource / Action</th>
                  <th className="text-center font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4 w-20">Public</th>
                  <th className="text-center font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] tracking-widest uppercase py-3 px-4 w-20">Buyer</th>
                  <th className="text-center font-[var(--font-mono)] text-[10px] text-[var(--color-amber)] tracking-widest uppercase py-3 px-4 w-20">Seller</th>
                  <th className="text-center font-[var(--font-mono)] text-[10px] text-[var(--color-violet)] tracking-widest uppercase py-3 px-4 w-20">Admin</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["PRODUCTS", null, null, null, null],
                  ["View listed products", "full", "full", "full", "full"],
                  ["View own products (seller)", "none", "none", "own", "full"],
                  ["Create product", "none", "none", "own", "full"],
                  ["Edit product", "none", "none", "own", "full"],
                  ["Delete / Delist product", "none", "none", "own", "full"],
                  ["ORDERS", null, null, null, null],
                  ["Create order", "none", "full", "none", "none"],
                  ["View own order (buyer)", "none", "own", "none", "full"],
                  ["View orders received (seller)", "none", "none", "own", "full"],
                  ["Update order status (seller)", "none", "none", "own", "full"],
                  ["View all orders", "none", "none", "none", "full"],
                  ["USERS", null, null, null, null],
                  ["View own profile", "none", "own", "own", "full"],
                  ["Edit own profile", "none", "own", "own", "full"],
                  ["View any user", "none", "none", "none", "full"],
                  ["Suspend / ban user", "none", "none", "none", "full"],
                  ["SELLER MANAGEMENT", null, null, null, null],
                  ["Apply as seller", "none", "full", "none", "none"],
                  ["View own store data", "none", "none", "own", "full"],
                  ["Edit own store", "none", "none", "own", "full"],
                  ["Approve seller application", "none", "none", "none", "full"],
                  ["Suspend seller", "none", "none", "none", "full"],
                  ["CATEGORIES", null, null, null, null],
                  ["Browse categories", "full", "full", "full", "full"],
                  ["Create / edit / delete category", "none", "none", "none", "full"],
                  ["REVIEWS", null, null, null, null],
                  ["Read reviews", "full", "full", "full", "full"],
                  ["Submit review (purchased only)", "none", "full", "none", "none"],
                  ["Remove review", "none", "none", "none", "full"],
                  ["REPORTS & MODERATION", null, null, null, null],
                  ["Submit report", "none", "full", "full", "none"],
                  ["View reports", "none", "none", "none", "full"],
                  ["Resolve report / take action", "none", "none", "none", "full"],
                ] as [string, Permission | null, Permission | null, Permission | null, Permission | null][]).map(([resource, pub, buyer, seller, admin], i) => {
                  const isGroup = pub === null;
                  return (
                    <tr key={i} className={`border-b border-[var(--color-border)] ${isGroup ? "bg-[var(--color-surface)]" : "hover:bg-[var(--color-ground)] transition-colors"}`}>
                      <td className={`py-2 px-4 ${isGroup ? "font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase font-[600]" : "text-[var(--color-ink)]"}`}>{resource}</td>
                      {isGroup ? <td colSpan={4} /> : [pub, buyer, seller, admin].map((p, pi) => (
                        <td key={pi} className="py-2 px-4 text-center">{P_ICON[p ?? "none"]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            {[
              { icon: P_ICON.full, label: "Full access — all records" },
              { icon: P_ICON.own, label: "Own records only" },
              { icon: P_ICON.read, label: "Read-only" },
              { icon: P_ICON.none, label: "No access" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">{icon}<span>{label}</span></div>
            ))}
          </div>

          <Card className="bg-[var(--color-ground)] border-dashed">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-2">Enforcement model</p>
            <div className="space-y-1.5 text-sm text-[var(--color-ink-muted)] leading-relaxed">
              <p>All permission checks are enforced by the Laravel API. The React frontend conditionally renders UI elements based on the decoded JWT role claim, but this is for UX only — not security.</p>
              <p>Protected routes redirect unauthenticated users to <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-navy)]">/login?redirect=&lt;intended&gt;</span>. Role mismatches render the <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-navy)]">/403</span> page.</p>
              <p>Seller routes under <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-navy)]">/seller/*</span> require role=seller AND seller_status=approved. Pending sellers are redirected to <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-navy)]">/seller/onboarding/pending</span>.</p>
            </div>
          </Card>
        </section>

        <div className="border-t border-[var(--color-border)] pt-8 pb-4">
          <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-wide">MARKETPLACE·OS — PART 02 of N — IA & USER FLOWS — 2026-08-15</p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">Route architecture, sitemap, navigation hierarchy, user flows, and permission model. Part 03 will address the design system and component library.</p>
        </div>

      </main>
    </div>
  );
}
