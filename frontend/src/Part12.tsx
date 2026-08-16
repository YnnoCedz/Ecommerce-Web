import { useState } from "react";

// Loading states
import {
  ProductGridSkeleton, ProductDetailSkeleton, SellerDashboardSkeleton,
  AdminTableSkeleton, MessagesSkeleton, SearchSkeleton,
  CheckoutSkeleton, OrderHistorySkeleton,
} from "./pages/states/LoadingStates";

// Empty states
import {
  EmptyCart, EmptyWishlist, NoOrders, NoSellerProducts, NoMessages,
  NoNotifications, NoSearchResults, NoAdminProducts, NoReports,
  NoCustomers, NoInventory,
} from "./pages/states/EmptyStates";

// Error states
import {
  NetworkError, ApiError, ValidationError, PermissionDenied,
  NotFound, CheckoutError, PaymentError, SessionExpired,
} from "./pages/states/ErrorStates";

// Seller states
import {
  ApplicationPending, ApplicationApproved, ApplicationRejected,
  StoreInactive, ProductPendingReview, ProductRejected, LowStockWarning,
} from "./pages/states/SellerStates";

// Order states
import { OrderStateGallery } from "./pages/states/OrderStates";

// Account states
import {
  UnverifiedAccount, PendingVerification, RestrictedAccount,
  SuspendedAccount, SessionExpiredAccount,
} from "./pages/states/AccountStates";

// ── Type definitions ──────────────────────────────────────────
type Category = "loading" | "empty" | "errors" | "seller" | "orders" | "account";

type Variant = {
  id: string;
  label: string;
  context: string;
  component: React.ReactNode;
};

const CATEGORIES: { id: Category; label: string; count: number }[] = [
  { id: "loading", label: "Loading",        count: 8 },
  { id: "empty",   label: "Empty",          count: 11 },
  { id: "errors",  label: "Errors",         count: 8 },
  { id: "seller",  label: "Seller states",  count: 7 },
  { id: "orders",  label: "Order states",   count: 12 },
  { id: "account", label: "Account",        count: 5 },
];

const VARIANTS: Record<Category, Variant[]> = {
  loading: [
    { id: "product-grid",      label: "Product grid",      context: "PublicShell",  component: <ProductGridSkeleton /> },
    { id: "product-detail",    label: "Product detail",    context: "PublicShell",  component: <ProductDetailSkeleton /> },
    { id: "seller-dashboard",  label: "Seller dashboard",  context: "SellerShell",  component: <SellerDashboardSkeleton /> },
    { id: "admin-table",       label: "Admin table",       context: "AdminShell",   component: <AdminTableSkeleton /> },
    { id: "messages",          label: "Messages",          context: "PublicShell",  component: <MessagesSkeleton /> },
    { id: "search-results",    label: "Search results",    context: "PublicShell",  component: <SearchSkeleton /> },
    { id: "checkout",          label: "Checkout",          context: "PublicShell",  component: <CheckoutSkeleton /> },
    { id: "order-history",     label: "Order history",     context: "PublicShell",  component: <OrderHistorySkeleton /> },
  ],
  empty: [
    { id: "empty-cart",        label: "Empty cart",           context: "PublicShell",  component: <EmptyCart /> },
    { id: "empty-wishlist",    label: "Empty wishlist",       context: "PublicShell",  component: <EmptyWishlist /> },
    { id: "no-orders",         label: "No orders",            context: "PublicShell",  component: <NoOrders /> },
    { id: "no-products",       label: "No products (seller)", context: "SellerShell",  component: <NoSellerProducts /> },
    { id: "no-messages",       label: "No messages",          context: "PublicShell",  component: <NoMessages /> },
    { id: "no-notifications",  label: "No notifications",     context: "PublicShell",  component: <NoNotifications /> },
    { id: "no-search",         label: "No search results",    context: "PublicShell",  component: <NoSearchResults /> },
    { id: "no-admin-products", label: "No flagged products",  context: "AdminShell",   component: <NoAdminProducts /> },
    { id: "no-reports",        label: "No reports",           context: "AdminShell",   component: <NoReports /> },
    { id: "no-customers",      label: "No customers",         context: "SellerShell",  component: <NoCustomers /> },
    { id: "no-inventory",      label: "No inventory",         context: "SellerShell",  component: <NoInventory /> },
  ],
  errors: [
    { id: "network-error",     label: "Network error",        context: "PublicShell",  component: <NetworkError /> },
    { id: "api-error",         label: "API error",            context: "AdminShell",   component: <ApiError /> },
    { id: "validation-error",  label: "Validation error",     context: "PublicShell",  component: <ValidationError /> },
    { id: "permission-denied", label: "Permission denied",    context: "PublicShell",  component: <PermissionDenied /> },
    { id: "not-found",         label: "404 Not found",        context: "PublicShell",  component: <NotFound /> },
    { id: "checkout-error",    label: "Checkout error",       context: "PublicShell",  component: <CheckoutError /> },
    { id: "payment-error",     label: "Payment error",        context: "PublicShell",  component: <PaymentError /> },
    { id: "session-expired",   label: "Session expired",      context: "Overlay",      component: <SessionExpired /> },
  ],
  seller: [
    { id: "app-pending",       label: "Application pending",  context: "Standalone",   component: <ApplicationPending /> },
    { id: "app-approved",      label: "Application approved", context: "Standalone",   component: <ApplicationApproved /> },
    { id: "app-rejected",      label: "Application rejected", context: "Standalone",   component: <ApplicationRejected /> },
    { id: "store-inactive",    label: "Store inactive",       context: "SellerShell",  component: <StoreInactive /> },
    { id: "product-pending",   label: "Product under review", context: "SellerShell",  component: <ProductPendingReview /> },
    { id: "product-rejected",  label: "Product rejected",     context: "SellerShell",  component: <ProductRejected /> },
    { id: "low-stock",         label: "Low stock warning",    context: "SellerShell",  component: <LowStockWarning /> },
  ],
  orders: [
    { id: "order-states",      label: "All 12 order states",  context: "PublicShell",  component: <OrderStateGallery /> },
  ],
  account: [
    { id: "unverified",        label: "Unverified email",     context: "PublicShell",  component: <UnverifiedAccount /> },
    { id: "pending-verify",    label: "Pending verification", context: "PublicShell",  component: <PendingVerification /> },
    { id: "restricted",        label: "Restricted account",   context: "PublicShell",  component: <RestrictedAccount /> },
    { id: "suspended",         label: "Suspended",            context: "Standalone",   component: <SuspendedAccount /> },
    { id: "session-expired",   label: "Session expired",      context: "Overlay",      component: <SessionExpiredAccount /> },
  ],
};

const CONTEXT_COLORS: Record<string, string> = {
  PublicShell:  "bg-[var(--color-green-light)] text-[var(--color-green)]",
  SellerShell:  "bg-[var(--color-violet-light)] text-[var(--color-violet)]",
  AdminShell:   "bg-[var(--color-navy-surface)] text-[var(--color-navy)]",
  Standalone:   "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
  Overlay:      "bg-[var(--color-amber-light)] text-[var(--color-amber)]",
};

export default function Part12() {
  const [category, setCategory] = useState<Category>("loading");
  const [variantId, setVariantId] = useState("product-grid");

  const variants = VARIANTS[category];
  const current = variants.find(v => v.id === variantId) ?? variants[0];

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setVariantId(VARIANTS[cat][0].id);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-ground)]">
      {/* Top control strip */}
      <div className="bg-[var(--color-navy)] text-white shrink-0">
        <div className="px-4 py-2 flex items-center gap-1 flex-wrap">
          <span className="font-[var(--font-mono)] text-[9px] text-white/40 mr-2 uppercase tracking-widest">Part 12 · States &amp; Edge Cases</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] cursor-pointer transition-colors ${category === cat.id ? "bg-white/20 text-white font-[500]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              {cat.label}
              <span className={`font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded-full ${category === cat.id ? "bg-white/20" : "bg-white/10"}`}>{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body: sidebar + preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 shrink-0 bg-white border-r border-[var(--color-border)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{CATEGORIES.find(c => c.id === category)?.label}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {variants.map(v => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${variantId === v.id ? "bg-[var(--color-surface)] border-l-2 border-l-[var(--color-navy)]" : "hover:bg-[var(--color-ground)]"}`}
              >
                <p className={`text-xs font-[500] leading-snug ${variantId === v.id ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{v.label}</p>
                <span className={`font-[var(--font-mono)] text-[8px] px-1.5 py-0.5 rounded mt-1 inline-block ${CONTEXT_COLORS[v.context] ?? ""}`}>{v.context}</span>
              </button>
            ))}
          </div>
          {/* State count footer */}
          <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">
              {Object.values(VARIANTS).flat().length} states total
            </p>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Context badge bar */}
          <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
            <p className="text-xs font-[500] text-[var(--color-ink)]">{current.label}</p>
            <span className={`font-[var(--font-mono)] text-[8px] px-2 py-0.5 rounded ${CONTEXT_COLORS[current.context] ?? ""}`}>{current.context}</span>
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] ml-auto">{variantId}</span>
          </div>
          {/* State content */}
          <div className="flex-1 overflow-y-auto" key={`${category}-${variantId}`}>
            {current.component}
          </div>
        </div>
      </div>
    </div>
  );
}
