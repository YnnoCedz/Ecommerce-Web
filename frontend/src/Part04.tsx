import { useState } from "react";
import { Tag } from "./shared";
import PublicShell from "./shells/PublicShell";
import SellerShell from "./shells/SellerShell";
import AdminShell from "./shells/AdminShell";
import { StatsCard, ProductCard, StatusBadge } from "./Part03";

// ── Placeholder content blocks ───────────────────────────────────────────────

function PublicContent() {
  return (
    <div>
      {/* Hero banner */}
      <div className="relative h-64 md:h-80 overflow-hidden bg-[var(--color-navy)] flex items-center">
        <img
          src="https://images.unsplash.com/photo-1780798464793-be53ffd37b79?w=1200&h=400&fit=crop&auto=format"
          alt="Marketplace"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative px-8 md:px-16 max-w-2xl">
          <p className="font-[var(--font-mono)] text-[11px] text-white/60 tracking-widest uppercase mb-3">Independent Sellers · Authentic Products</p>
          <h2 className="font-[var(--font-display)] text-4xl md:text-5xl font-[300] text-white leading-[1.05] mb-4">
            Discover something<br /><em>genuinely original.</em>
          </h2>
          <div className="flex gap-3">
            <a href="#" className="inline-flex items-center px-5 py-2.5 bg-white text-[var(--color-navy)] font-[500] text-sm rounded-sm hover:bg-[var(--color-amber-light)] transition-colors cursor-pointer">Shop Now</a>
            <a href="#" className="inline-flex items-center px-5 py-2.5 border border-white/30 text-white font-[500] text-sm rounded-sm hover:bg-white/10 transition-colors cursor-pointer">Become a Seller</a>
          </div>
        </div>
      </div>

      {/* Category strip */}
      <div className="border-b border-[var(--color-border)] bg-white px-6 md:px-10 py-4">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {["Electronics", "Fashion", "Home & Living", "Beauty", "Sports", "Handmade", "Books", "Toys"].map((cat, i) => (
            <button key={cat} className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-sm border text-xs font-[500] whitespace-nowrap transition-all cursor-pointer shrink-0 ${i === 0 ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="px-6 md:px-10 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Featured Products</h3>
          <a href="#" className="text-sm text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View all →</a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <ProductCard image="https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d" name="Minimalist Chronograph Watch" seller="Artisan Goods Co." price={4200} originalPrice={5800} rating={4.7} ratingCount={218} badge="SALE" />
          <ProductCard image="https://images.unsplash.com/photo-1544441893-675973e31985" name="Low-Top Canvas Sneakers" seller="SoleSource PH" price={2350} rating={4.4} ratingCount={89} />
          <ProductCard image="https://images.unsplash.com/photo-1616529484745-85f885b9889a" name="Genuine Leather Tote Bag" seller="StyleHouse PH" price={2800} originalPrice={3400} rating={4.9} ratingCount={341} badge="NEW" />
          <ProductCard image="https://images.unsplash.com/photo-1607556672044-6110fc499247" name="Handmade Ceramic Bowl" seller="Artisan Goods Co." price={850} rating={4.6} ratingCount={54} />
          <ProductCard image="https://images.unsplash.com/photo-1556905055-8f358a7a47b2" name="Knitted Wool Beanie" seller="Craftworks PH" price={480} originalPrice={650} rating={4.8} ratingCount={112} badge="SALE" />
        </div>
      </div>
    </div>
  );
}

function SellerContent() {
  return (
    <div className="p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">Welcome back</p>
        <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Artisan Goods Co.</h2>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard label="Revenue (Month)" value="₱84,200" delta={12.4} deltaLabel="vs last month" accent />
        <StatsCard label="Orders" value="142" delta={8.1} deltaLabel="vs last month" />
        <StatsCard label="Products Listed" value="38" delta={5} deltaLabel="vs last month" />
        <StatsCard label="Avg Rating" value="4.8★" delta={2.1} deltaLabel="vs last month" />
      </div>

      {/* Pending orders */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <p className="text-sm font-[600] text-[var(--color-ink)]">Pending Orders</p>
            <p className="text-xs text-[var(--color-ink-muted)]">4 orders need your attention</p>
          </div>
          <a href="#" className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View all orders →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                {["Order ID", "Customer", "Items", "Total", "Date", "Status"].map(h => (
                  <th key={h} className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: "#ORD-0088", customer: "Maria Santos", items: 3, total: 7980, date: "Aug 15", status: "pending" as const },
                { id: "#ORD-0087", customer: "Jose Reyes", items: 1, total: 1850, date: "Aug 14", status: "processing" as const },
                { id: "#ORD-0086", customer: "Ana Lim", items: 2, total: 3400, date: "Aug 14", status: "pending" as const },
                { id: "#ORD-0085", customer: "Pedro Cruz", items: 1, total: 850, date: "Aug 13", status: "processing" as const },
              ].map(row => (
                <tr key={row.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-ground)] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-[var(--font-mono)] text-xs text-[var(--color-navy)]">{row.id}</td>
                  <td className="py-3 px-4 text-[var(--color-ink)]">{row.customer}</td>
                  <td className="py-3 px-4 text-[var(--color-ink-muted)]">{row.items} item{row.items > 1 ? "s" : ""}</td>
                  <td className="py-3 px-4 font-[600] text-[var(--color-ink)]">₱{row.total.toLocaleString()}</td>
                  <td className="py-3 px-4 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{row.date}</td>
                  <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminContent() {
  return (
    <div className="p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">Aug 15, 2026</p>
          <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Platform Overview</h2>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-[500] border border-[var(--color-border)] bg-white text-[var(--color-ink)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Export Report</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard label="Total Revenue" value="₱2.84M" delta={12.4} deltaLabel="vs last month" accent />
        <StatsCard label="Active Users" value="18,420" delta={8.1} deltaLabel="vs last month" />
        <StatsCard label="Active Sellers" value="342" delta={-2.3} deltaLabel="vs last month" />
        <StatsCard label="Orders Today" value="1,842" delta={5.7} deltaLabel="vs yesterday" />
      </div>

      {/* Pending actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { title: "Seller Applications", value: 8, label: "Awaiting review", color: "amber", action: "Review All" },
          { title: "User Reports", value: 14, label: "Need moderation", color: "red", action: "View Queue" },
          { title: "Pending Products", value: 23, label: "In review queue", color: "navy", action: "Review" },
        ].map(({ title, value, label, color, action }) => {
          const bg: Record<string, string> = { amber: "bg-[var(--color-amber-light)] border-[var(--color-amber-border)]", red: "bg-[var(--color-red-light)] border-[var(--color-red-border)]", navy: "bg-[var(--color-navy-surface)] border-[var(--color-navy-border)]" };
          const text: Record<string, string> = { amber: "text-[var(--color-amber)]", red: "text-[var(--color-red)]", navy: "text-[var(--color-navy)]" };
          return (
            <div key={title} className={`border rounded-sm p-4 ${bg[color]}`}>
              <p className={`font-[var(--font-mono)] text-[10px] tracking-widest uppercase mb-1 ${text[color]}`}>{title}</p>
              <p className={`font-[var(--font-display)] text-3xl font-[400] ${text[color]} mb-0.5`}>{value}</p>
              <p className="text-xs text-[var(--color-ink-muted)] mb-3">{label}</p>
              <button className={`text-xs font-[600] cursor-pointer hover:underline ${text[color]}`}>{action} →</button>
            </div>
          );
        })}
      </div>

      {/* Recent activity table */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <p className="text-sm font-[600] text-[var(--color-ink)]">Recent Platform Activity</p>
          <a href="#" className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Full audit log →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                {["Event", "Entity", "User", "Time", "Status"].map(h => (
                  <th key={h} className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-2.5 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { event: "Seller Approved", entity: "Craftworks PH", user: "admin", time: "2m ago", status: "approved" as const },
                { event: "Product Delisted", entity: "Counterfeit Watch", user: "admin", time: "15m ago", status: "rejected" as const },
                { event: "Report Resolved", entity: "Report #R-0041", user: "admin", time: "1h ago", status: "active" as const },
                { event: "New Seller App", entity: "FreshProduce PH", user: "system", time: "2h ago", status: "review" as const },
                { event: "User Suspended", entity: "user_09841", user: "admin", time: "3h ago", status: "inactive" as const },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-ground)] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-[500] text-[var(--color-ink)]">{row.event}</td>
                  <td className="py-3 px-4 text-[var(--color-ink-muted)]">{row.entity}</td>
                  <td className="py-3 px-4 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{row.user}</td>
                  <td className="py-3 px-4 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{row.time}</td>
                  <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Part 04 main ─────────────────────────────────────────────────────────────

type ShellType = "public" | "seller" | "admin";

const SHELL_META: Record<ShellType, { label: string; tagColor: "green" | "amber" | "violet"; description: string; zones: string[] }> = {
  public: {
    label: "Public / Customer Shell",
    tagColor: "green",
    description: "Used for the public marketplace, product browsing, and the authenticated buyer experience. Includes category mega menu, global search, cart, wishlist, and account dropdown.",
    zones: ["Announcement bar", "Logo + search + icons", "Category nav bar (desktop)", "Mega menu (hover)", "Page content slot", "4-column footer", "Mobile: left drawer + bottom cart FAB"],
  },
  seller: {
    label: "Seller Center Shell",
    tagColor: "amber",
    description: "Used exclusively for the seller dashboard experience. Fixed sidebar with collapsible behavior. Distinct from the public marketplace — accessed via role switcher.",
    zones: ["Collapsible sidebar (navy)", "Store identity card", "Primary nav + badge counts", "Notification panel", "Account menu", "Breadcrumb in header", "Scrollable content area", "Mobile: overlay drawer"],
  },
  admin: {
    label: "Admin Panel Shell",
    tagColor: "violet",
    description: "Separate administrative interface. Deeper navy sidebar. Global platform search. System status indicator. Alert-first notification model for action-oriented tasks.",
    zones: ["Dark sidebar (ink)", "Platform branding", "Global search with shortcut hint", "System status pill", "Alert notifications", "Breadcrumb trail", "Scrollable content area", "Mobile: overlay drawer"],
  },
};

export default function Part04() {
  const [activeShell, setActiveShell] = useState<ShellType>("public");
  const [loggedIn, setLoggedIn] = useState(true);
  const meta = SHELL_META[activeShell];

  return (
    <div className="flex flex-col h-full">

      {/* ── Control strip ──────────────────────────────── */}
      <div className="shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag color="muted">PART 04</Tag>
              <Tag color="muted">GLOBAL SHELLS</Tag>
            </div>
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Application Shells — Interactive Preview</h1>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Switch between shells below. All interactions are live: sidebar collapse, menus, drawers, notifications.</p>
          </div>
          <div className="flex gap-1.5 shrink-0 flex-wrap">
            {(["public", "seller", "admin"] as ShellType[]).map(shell => (
              <button
                key={shell}
                onClick={() => setActiveShell(shell)}
                className={`px-3 py-1.5 text-xs font-[500] rounded-sm border transition-all cursor-pointer ${activeShell === shell ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                {SHELL_META[shell].label}
              </button>
            ))}
            {activeShell === "public" && (
              <button
                onClick={() => setLoggedIn(!loggedIn)}
                className="px-3 py-1.5 text-xs font-[500] rounded-sm border border-[var(--color-border)] bg-white text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] cursor-pointer transition-all">
                {loggedIn ? "→ Guest view" : "→ Logged-in view"}
              </button>
            )}
          </div>
        </div>

        {/* Zone annotations */}
        <div className="mt-3 flex items-start gap-3 flex-wrap">
          <Tag color={meta.tagColor}>{meta.label}</Tag>
          {meta.zones.map(z => (
            <span key={z} className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)] bg-white border border-[var(--color-border)] px-2 py-0.5 rounded">{z}</span>
          ))}
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] mt-2 leading-relaxed max-w-2xl">{meta.description}</p>
      </div>

      {/* ── Shell preview ──────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeShell === "public" && (
          <PublicShell cartCount={3} wishlistCount={5} isLoggedIn={loggedIn}>
            <PublicContent />
          </PublicShell>
        )}
        {activeShell === "seller" && (
          <SellerShell storeName="Artisan Goods Co." storeCategory="Home & Lifestyle" storeInitials="AG">
            <SellerContent />
          </SellerShell>
        )}
        {activeShell === "admin" && (
          <AdminShell>
            <AdminContent />
          </AdminShell>
        )}
      </div>
    </div>
  );
}
