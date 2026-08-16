import { useState } from "react";
import AdminShell from "./shells/AdminShell";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import SellerManagementPage from "./pages/admin/SellerManagementPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import CategoryManagementPage from "./pages/admin/CategoryManagementPage";
import ReportsModerationPage from "./pages/admin/ReportsModerationPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

type Section =
  | "dashboard"
  | "users"
  | "sellers"
  | "products"
  | "orders"
  | "categories"
  | "reports"
  | "analytics"
  | "settings";

const NAV_MAP: Record<Section, string> = {
  dashboard: "dashboard",
  users:     "users",
  sellers:   "sellers",
  products:  "products",
  orders:    "orders",
  categories:"categories",
  reports:   "reports",
  analytics: "analytics",
  settings:  "settings",
};

const SECTIONS: { id: Section; label: string }[] = [
  { id: "dashboard",  label: "Dashboard" },
  { id: "users",      label: "Users" },
  { id: "sellers",    label: "Sellers" },
  { id: "products",   label: "Products" },
  { id: "orders",     label: "Orders" },
  { id: "categories", label: "Categories" },
  { id: "reports",    label: "Reports & Mod." },
  { id: "analytics",  label: "Analytics" },
  { id: "settings",   label: "Settings" },
];

// AdminOrdersPage wraps itself in AdminShell — extract just its inner content
// by rendering it in a shell-less context using a proxy component
function AdminOrdersContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Minimal inline orders view for Part11 embedding (reuses patterns from AdminOrdersPage)
  const orders = [
    { id: "ORD-5501", buyer: "Maria Santos",     seller: "GlowLab PH",        total: 1248, status: "in-transit",   date: "Aug 15, 2026", exception: "none" },
    { id: "ORD-5498", buyer: "Ramon Dela Cruz",  seller: "TechMart Official",  total: 8500, status: "dispute",      date: "Aug 14, 2026", exception: "dispute" },
    { id: "ORD-5491", buyer: "Josie Cruz",        seller: "NaturalGlow Store", total: 560,  status: "delivered",    date: "Aug 14, 2026", exception: "none" },
    { id: "ORD-5487", buyer: "Ana Reyes",         seller: "StyleHaven PH",    total: 2100, status: "refund-req",   date: "Aug 13, 2026", exception: "refund-request" },
    { id: "ORD-5480", buyer: "John Bautista",     seller: "FashionHub PH",    total: 890,  status: "completed",    date: "Aug 13, 2026", exception: "none" },
    { id: "ORD-5472", buyer: "Len Garcia",        seller: "GlowLab PH",       total: 340,  status: "processing",   date: "Aug 12, 2026", exception: "none" },
    { id: "ORD-5461", buyer: "Mike Tan",          seller: "BudgetFinds PH",   total: 1200, status: "fraud-flag",   date: "Aug 12, 2026", exception: "fraud-flag" },
    { id: "ORD-5455", buyer: "Patricia Lim",      seller: "NaturalGlow Store",total: 680,  status: "cancelled",    date: "Aug 11, 2026", exception: "none" },
    { id: "ORD-5440", buyer: "Chris Santos",      seller: "TechMart Official",total: 12400,status: "completed",    date: "Aug 10, 2026", exception: "none" },
    { id: "ORD-5431", buyer: "Diane Ramos",       seller: "StyleHaven PH",    total: 450,  status: "returned",     date: "Aug 09, 2026", exception: "none" },
  ];

  const STATUS_COLORS: Record<string, { label: string; bg: string; text: string }> = {
    processing:    { label: "Processing",     bg: "bg-[var(--color-navy-surface)]", text: "text-[var(--color-navy)]" },
    "in-transit":  { label: "In transit",     bg: "bg-yellow-50",                  text: "text-yellow-700" },
    delivered:     { label: "Delivered",      bg: "bg-[var(--color-green-light)]", text: "text-[var(--color-green)]" },
    completed:     { label: "Completed",      bg: "bg-[var(--color-green-light)]", text: "text-[var(--color-green)]" },
    cancelled:     { label: "Cancelled",      bg: "bg-[var(--color-surface)]",     text: "text-[var(--color-ink-muted)]" },
    returned:      { label: "Returned",       bg: "bg-[var(--color-red-light)]",   text: "text-[var(--color-red)]" },
    dispute:       { label: "Dispute",        bg: "bg-[var(--color-red-light)]",   text: "text-[var(--color-red)]" },
    "refund-req":  { label: "Refund req.",    bg: "bg-[var(--color-amber-light)]", text: "text-[var(--color-amber)]" },
    "fraud-flag":  { label: "Fraud flagged",  bg: "bg-[var(--color-red-light)]",   text: "text-[var(--color-red)]" },
  };

  const EXCEPTION_COLORS: Record<string, { bg: string; text: string }> = {
    dispute:       { bg: "bg-[var(--color-red-light)]",   text: "text-[var(--color-red)]" },
    "refund-request": { bg: "bg-[var(--color-amber-light)]", text: "text-[var(--color-amber)]" },
    "fraud-flag":  { bg: "bg-[var(--color-red-light)]",   text: "text-[var(--color-red)]" },
  };

  const filtered = orders.filter(o => {
    if (search && !o.id.toLowerCase().includes(search.toLowerCase()) && !o.buyer.toLowerCase().includes(search.toLowerCase()) && !o.seller.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "exceptions" && o.exception === "none") return false;
      if (statusFilter !== "exceptions" && o.status !== statusFilter) return false;
    }
    return true;
  });

  const exceptions = orders.filter(o => o.exception !== "none").length;

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Order management</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{orders.length} orders · {exceptions} with exceptions</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4" /><path d="M11 11l-2-2" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Order ID, buyer, seller..." className="pl-8 pr-3 py-1.5 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] w-52 font-[var(--font-body)]" />
        </div>
        {[["all","All"],["processing","Processing"],["in-transit","In transit"],["completed","Completed"],["exceptions","Exceptions ⚠"]].map(([v,l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} className={`px-3 py-1.5 rounded-sm text-xs cursor-pointer transition-colors ${statusFilter === v ? "bg-[var(--color-navy)] text-white" : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{l}</button>
        ))}
        <span className="ml-auto font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{filtered.length} orders</span>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {["Order","Date","Buyer","Seller","Total","Status","Exception",""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const sc = STATUS_COLORS[o.status] ?? STATUS_COLORS.processing;
              const ec = o.exception !== "none" ? EXCEPTION_COLORS[o.exception] : null;
              return (
                <tr key={o.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-navy)] font-[600]">{o.id}</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{o.date}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-ink)]">{o.buyer}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-ink-muted)]">{o.seller}</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink)]">₱{o.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`font-[var(--font-mono)] text-[9px] px-2 py-1 rounded ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {ec && <span className={`font-[var(--font-mono)] text-[9px] px-2 py-1 rounded ${ec.bg} ${ec.text}`}>{o.exception.replace(/-/g, " ")}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Part11() {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <div className="flex flex-col h-screen bg-[var(--color-ground)]">
      {/* Control strip */}
      <div className="bg-[var(--color-navy)] text-white px-4 py-2 flex items-center gap-1 flex-wrap shrink-0 z-10">
        <span className="font-[var(--font-mono)] text-[9px] text-white/40 mr-2 uppercase tracking-widest">Part 11 · Admin</span>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded text-[11px] cursor-pointer transition-colors ${section === s.id ? "bg-white/20 text-white font-[500]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AdminShell activeNav={NAV_MAP[section]}>
          <div className="h-full overflow-y-auto">
            {section === "dashboard"  && <AdminDashboard />}
            {section === "users"      && <UserManagementPage />}
            {section === "sellers"    && <SellerManagementPage />}
            {section === "products"   && <AdminProductsPage />}
            {section === "orders"     && <AdminOrdersContent />}
            {section === "categories" && <CategoryManagementPage />}
            {section === "reports"    && <div className="h-full flex flex-col overflow-hidden"><ReportsModerationPage /></div>}
            {section === "analytics"  && <AdminAnalyticsPage />}
            {section === "settings"   && <AdminSettingsPage />}
          </div>
        </AdminShell>
      </div>
    </div>
  );
}
