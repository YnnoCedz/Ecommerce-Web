import { useState } from "react";
import SellerShell from "./shells/SellerShell";
import SellerOnboarding from "./pages/seller/onboarding/SellerOnboarding";
import SellerDashboard from "./pages/seller/SellerDashboard";
import ProductListPage from "./pages/seller/ProductListPage";
import ProductCreationPage from "./pages/seller/ProductCreationPage";
import InventoryPage from "./pages/seller/InventoryPage";
import SellerOrdersPage from "./pages/seller/SellerOrdersPage";
import CustomersPage from "./pages/seller/CustomersPage";
import PromotionsPage from "./pages/seller/PromotionsPage";
import AnalyticsPage from "./pages/seller/AnalyticsPage";
import StoreManagementPage from "./pages/seller/StoreManagementPage";
import SellerSettingsPage from "./pages/seller/SellerSettingsPage";

type Section =
  | "onboarding" | "onboarding-status"
  | "dashboard"
  | "products" | "product-create"
  | "inventory"
  | "orders"
  | "customers"
  | "promotions"
  | "analytics"
  | "store"
  | "settings";

const SECTIONS: { id: Section; label: string; sublabel: string; group: string }[] = [
  { id: "onboarding",        label: "Onboarding",       sublabel: "Application wizard",  group: "Onboarding" },
  { id: "onboarding-status", label: "App. Status",      sublabel: "Pending review",      group: "Onboarding" },
  { id: "dashboard",         label: "Dashboard",        sublabel: "Overview",            group: "Main" },
  { id: "products",          label: "Products",         sublabel: "List · CRUD",         group: "Main" },
  { id: "product-create",    label: "Add Product",      sublabel: "Creation form",       group: "Main" },
  { id: "inventory",         label: "Inventory",        sublabel: "Stock · Alerts",      group: "Main" },
  { id: "orders",            label: "Orders",           sublabel: "Fulfillment",         group: "Main" },
  { id: "customers",         label: "Customers",        sublabel: "List · Detail",       group: "Main" },
  { id: "promotions",        label: "Promotions",       sublabel: "Discounts · Campaigns", group: "Main" },
  { id: "analytics",         label: "Analytics",        sublabel: "Revenue · Products",  group: "Main" },
  { id: "store",             label: "Store",            sublabel: "Profile · Branding",  group: "Main" },
  { id: "settings",          label: "Settings",         sublabel: "Account · Security",  group: "Main" },
];

const NAV_MAP: Record<Section, string> = {
  "onboarding":        "dashboard",
  "onboarding-status": "dashboard",
  "dashboard":         "dashboard",
  "products":          "products",
  "product-create":    "products",
  "inventory":         "inventory",
  "orders":            "orders",
  "customers":         "customers",
  "promotions":        "promotions",
  "analytics":         "analytics",
  "store":             "store",
  "settings":          "settings",
};

const STANDALONE = new Set(["onboarding", "onboarding-status"]);

export default function Part10() {
  const [section, setSection] = useState<Section>("dashboard");

  const renderContent = () => {
    switch (section) {
      case "onboarding":        return <SellerOnboarding view="form" />;
      case "onboarding-status": return <SellerOnboarding view="status" />;
      case "dashboard":         return <SellerDashboard />;
      case "products":          return <ProductListPage />;
      case "product-create":    return <ProductCreationPage />;
      case "inventory":         return <InventoryPage />;
      case "orders":            return <SellerOrdersPage />;
      case "customers":         return <CustomersPage />;
      case "promotions":        return <PromotionsPage />;
      case "analytics":         return <AnalyticsPage />;
      case "store":             return <StoreManagementPage />;
      case "settings":          return <SellerSettingsPage />;
    }
  };

  const isStandalone = STANDALONE.has(section);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-ground)]">

      {/* ── CONTROL STRIP ──────────────────────────────────── */}
      <div className="shrink-0 bg-[#0F2030] border-b border-white/10 flex items-center gap-2 px-4 py-2 overflow-x-auto">
        <span className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest shrink-0">PART 10 — SELLER PLATFORM</span>

        {/* Group: Onboarding */}
        <div className="w-px h-3 bg-white/20 shrink-0" />
        <span className="font-[var(--font-mono)] text-[8px] text-white/20 shrink-0 uppercase tracking-widest">Onboarding</span>
        {SECTIONS.filter(s => s.group === "Onboarding").map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`shrink-0 font-[var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${section === s.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
            {s.label}
          </button>
        ))}

        {/* Group: Main */}
        <div className="w-px h-3 bg-white/20 shrink-0" />
        <span className="font-[var(--font-mono)] text-[8px] text-white/20 shrink-0 uppercase tracking-widest">Seller App</span>
        {SECTIONS.filter(s => s.group === "Main").map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`shrink-0 font-[var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${section === s.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isStandalone ? (
          renderContent()
        ) : (
          <SellerShell activeNav={NAV_MAP[section]}>
            {renderContent()}
          </SellerShell>
        )}
      </div>
    </div>
  );
}
