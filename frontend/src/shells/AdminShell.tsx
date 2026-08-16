import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  IconDashboard, IconUsers, IconSellers, IconProducts, IconOrders,
  IconCategories, IconReports, IconModeration, IconAnalytics, IconSettings,
  IconSearch, IconBell, IconChevronRight, IconChevronDown,
  IconMenu, IconLogout, IconHelp,
} from "./icons";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  badgeColor?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   label: "Dashboard",    icon: IconDashboard },
  { id: "users",       label: "Users",        icon: IconUsers },
  { id: "sellers",     label: "Sellers",      icon: IconSellers,    badge: 8, badgeColor: "amber" },
  { id: "products",    label: "Products",     icon: IconProducts },
  { id: "orders",      label: "Orders",       icon: IconOrders },
  { id: "categories",  label: "Categories",   icon: IconCategories },
  { id: "reports",     label: "Reports",      icon: IconReports,    badge: 14, badgeColor: "red" },
  { id: "moderation",  label: "Moderation",   icon: IconModeration, badge: 5, badgeColor: "red" },
  { id: "analytics",   label: "Analytics",    icon: IconAnalytics },
  { id: "settings",    label: "Settings",     icon: IconSettings },
];

interface AdminShellProps {
  children: React.ReactNode;
  activeNav?: string;
  onNavChange?: (id: string) => void;
}

export default function AdminShell({ children, activeNav = "dashboard", onNavChange }: AdminShellProps) {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(activeNav);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    setActiveItem(activeNav);
  }, [activeNav]);

  const SidebarLink = ({ item }: { item: NavItem }) => {
    const isActive = activeItem === item.id;
    const Icon = item.icon;
    const badgeBg = item.badgeColor === "red" ? "bg-[var(--color-red)]" : "bg-[var(--color-amber)]";
    return (
      <button
        onClick={() => { setActiveItem(item.id); onNavChange?.(item.id); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all cursor-pointer text-left ${
          isActive
            ? "bg-white/12 text-white"
            : "text-white/50 hover:text-white hover:bg-white/8"
        }`}>
        <Icon size={15} className="shrink-0" />
        <span className="text-sm font-[500] truncate flex-1">{item.label}</span>
        {item.badge && (
          <span className={`text-[9px] font-[var(--font-mono)] text-white px-1.5 py-0.5 rounded-full shrink-0 ${badgeBg}`}>{item.badge}</span>
        )}
        {isActive && <span className="w-1 h-4 bg-[var(--color-amber)] rounded-full shrink-0" />}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-14 px-5 border-b border-white/10 shrink-0">
        <div className="w-6 h-6 bg-[var(--color-amber)] rounded flex items-center justify-center shrink-0">
          <span className="text-white font-[var(--font-display)] text-xs font-[400]">M</span>
        </div>
        <div>
          <p className="font-[var(--font-display)] text-sm font-[400] text-white leading-tight">Marketo</p>
          <p className="font-[var(--font-mono)] text-[9px] text-white/40 tracking-widest uppercase leading-tight">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest uppercase px-3 mb-2">Platform</p>
        {NAV_ITEMS.slice(0, 8).map(item => <SidebarLink key={item.id} item={item} />)}

        <div className="pt-3 pb-1">
          <p className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest uppercase px-3 mb-2">Reports & Config</p>
        </div>
        {NAV_ITEMS.slice(8).map(item => <SidebarLink key={item.id} item={item} />)}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10 space-y-0.5 shrink-0">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-all cursor-pointer">
          <IconHelp size={15} className="shrink-0" />
          <span className="text-sm">Help</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-all cursor-pointer">
          <IconLogout size={15} className="shrink-0" />
          <span className="text-sm">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--color-ground)" }}>
      {/* Skip navigation */}
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-navy)] focus:text-white focus:text-sm focus:font-[500] focus:rounded focus:shadow-lg">
        Skip to main content
      </a>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0" style={{ background: "#0F2030" }}>
        <SidebarContent />
      </aside>

      {/* ── MOBILE DRAWER ────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-label="Admin navigation"
            aria-modal="true"
            className="absolute inset-y-0 left-0 w-56 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.4)]"
            style={{ background: "#0F2030" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Admin top header */}
        <header className="h-14 bg-white border-b border-[var(--color-border)] flex items-center gap-3 px-4 md:px-6 shrink-0">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="lg:hidden text-[var(--color-ink-muted)] cursor-pointer p-1">
            <IconMenu size={18} aria-hidden="true" />
          </button>

          {/* Global search */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all max-w-xs w-full hidden sm:flex ${searchFocused ? "border-[var(--color-navy)] bg-white ring-2 ring-[var(--color-navy)]/10" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
            <IconSearch size={13} className="text-[var(--color-ink-muted)] shrink-0" />
            <input
              type="text"
              placeholder="Search users, orders, sellers…"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none"
            />
            <kbd className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] bg-[var(--color-border)] px-1.5 py-0.5 rounded">/</kbd>
          </div>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-1">

            {/* System status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-green-light)] rounded-sm mr-2">
              <span className="w-1.5 h-1.5 bg-[var(--color-green)] rounded-full animate-pulse" />
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-green)] tracking-wide">All systems operational</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setAccountOpen(false); }}
                aria-label="Admin alerts — 5 urgent"
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="relative w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-all">
                <IconBell size={16} aria-hidden="true" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-red)] rounded-full" aria-hidden="true" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-sm font-[600] text-[var(--color-ink)]">Admin Alerts</p>
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-red)] bg-[var(--color-red-light)] px-2 py-0.5 rounded-full">5 urgent</span>
                  </div>
                  {[
                    { title: "Seller application pending", body: "8 applications awaiting review", time: "Just now", color: "amber" },
                    { title: "New user report", body: "5 reports need moderation action", time: "15m ago", color: "red" },
                    { title: "Platform analytics ready", body: "Weekly report is available", time: "2h ago", color: "navy" },
                  ].map((n, i) => {
                    const dot: Record<string, string> = { amber: "bg-[var(--color-amber)]", red: "bg-[var(--color-red)]", navy: "bg-[var(--color-navy)]" };
                    return (
                      <div key={i} className="flex gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] cursor-pointer">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot[n.color]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-[600] text-[var(--color-ink)] mb-0.5">{n.title}</p>
                          <p className="text-xs text-[var(--color-ink-muted)]">{n.body}</p>
                          <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-disabled)] mt-1">{n.time}</p>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => { setNotifOpen(false); navigate("/admin/moderation"); }} className="w-full flex items-center justify-center px-4 py-2.5 text-xs text-[var(--color-navy)] font-[500] hover:bg-[var(--color-surface)] cursor-pointer">View all alerts</button>
                </div>
              )}
            </div>

            {/* Breadcrumb on desktop */}
            <div className="hidden md:flex items-center gap-1.5 text-xs px-2 mx-1 text-[var(--color-ink-muted)]">
              <span className="hover:text-[var(--color-navy)] cursor-pointer">Admin</span>
              <IconChevronRight size={10} className="text-[var(--color-ink-disabled)]" />
              <span className="text-[var(--color-ink)] font-[500] capitalize">{activeItem}</span>
            </div>

            {/* Account */}
            <div className="relative">
              <button
                onClick={() => { setAccountOpen(!accountOpen); setNotifOpen(false); }}
                aria-label="Admin account menu"
                aria-expanded={accountOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 pl-2 pr-2 h-8 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors">
                <div className="w-6 h-6 rounded-full bg-[var(--color-violet)] flex items-center justify-center">
                  <span className="text-white text-[10px] font-[500]">A</span>
                </div>
                <span className="text-xs font-[500] hidden sm:block">Admin</span>
                <IconChevronDown size={10} className="text-[var(--color-ink-muted)]" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-xs font-[600] text-[var(--color-ink)]">Administrator</p>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">admin@marketo.ph</p>
                  </div>
                  {["Profile", "Admin Settings"].map(l => (
                    <button key={l} onClick={() => { setAccountOpen(false); navigate("/admin/settings"); }} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] cursor-pointer">{l}</button>
                  ))}
                  <div className="border-t border-[var(--color-border)]">
                    <button onClick={() => { setAccountOpen(false); navigate("/auth/login"); }} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] cursor-pointer">Log out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main id="admin-main-content" className="flex-1 overflow-y-auto bg-[var(--color-ground)]">
          {children}
        </main>
      </div>
    </div>
  );
}
