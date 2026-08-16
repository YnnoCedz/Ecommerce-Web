import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  IconDashboard, IconProducts, IconInventory, IconOrders, IconCustomers,
  IconPromotions, IconAnalytics, IconMessages, IconNotifications, IconStore,
  IconSettings, IconChevronLeft, IconChevronRight, IconBell, IconLogout,
  IconMenu, IconClose, IconChevronDown, IconEye, IconHelp,
} from "./icons";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  href?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",     label: "Dashboard",    icon: IconDashboard },
  { id: "products",      label: "Products",     icon: IconProducts },
  { id: "inventory",     label: "Inventory",    icon: IconInventory },
  { id: "orders",        label: "Orders",       icon: IconOrders,     badge: 4 },
  { id: "customers",     label: "Customers",    icon: IconCustomers },
  { id: "promotions",    label: "Promotions",   icon: IconPromotions },
  { id: "analytics",     label: "Analytics",    icon: IconAnalytics },
];

const BOTTOM_NAV: NavItem[] = [
  { id: "messages",      label: "Messages",     icon: IconMessages,      badge: 7 },
  { id: "notifications", label: "Notifications",icon: IconNotifications, badge: 12 },
  { id: "store",         label: "Store",        icon: IconStore },
  { id: "settings",      label: "Settings",     icon: IconSettings },
];

interface SellerShellProps {
  children: React.ReactNode;
  activeNav?: string;
  storeName?: string;
  storeCategory?: string;
  storeInitials?: string;
  onNavChange?: (id: string) => void;
}

export default function SellerShell({
  children,
  activeNav = "dashboard",
  storeName = "Artisan Goods Co.",
  storeCategory = "Home and Garden",
  storeInitials = "AG",
  onNavChange,
}: SellerShellProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(activeNav);
  const ACCOUNT_ROUTES: Record<string, string> = {
    "Account Settings": "/seller-center/settings",
    "Billing": "/seller-center/settings",
    "Switch to Buyer": "/",
  };
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setActiveItem(activeNav);
  }, [activeNav]);

  const SidebarLink = ({ item }: { item: NavItem }) => {
    const isActive = activeItem === item.id;
    const Icon = item.icon;
    return (
      <button
        onClick={() => { setActiveItem(item.id); onNavChange?.(item.id); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all cursor-pointer relative group ${
          isActive
            ? "bg-[var(--color-amber-light)] text-[var(--color-amber)]"
            : "text-white/60 hover:text-white hover:bg-white/8"
        }`}
        title={collapsed ? item.label : undefined}>
        <span className="shrink-0 relative">
          <Icon size={16} />
          {item.badge && !collapsed && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-red)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center">{item.badge}</span>
          )}
          {item.badge && collapsed && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-red)] rounded-full" />
          )}
        </span>
        {!collapsed && <span className="text-sm font-[500] truncate flex-1 text-left">{item.label}</span>}
        {!collapsed && item.badge && (
          <span className="text-[10px] font-[var(--font-mono)] bg-[var(--color-red)] text-white px-1.5 py-0.5 rounded-full shrink-0">{item.badge}</span>
        )}

        {/* Tooltip for collapsed */}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--color-ink)] text-white text-xs rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            {item.label}
            {item.badge && <span className="ml-1.5 bg-[var(--color-red)] text-white text-[9px] px-1 py-0.5 rounded-full">{item.badge}</span>}
          </div>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand + collapse toggle */}
      <div className={`flex items-center h-14 px-4 border-b border-white/10 shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-[var(--color-amber)] rounded flex items-center justify-center shrink-0">
              <span className="text-white font-[var(--font-display)] text-xs font-[400]">M</span>
            </div>
            <span className="font-[var(--font-mono)] text-[10px] text-white/50 tracking-widest uppercase truncate">Seller Center</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-6 h-6 items-center justify-center text-white/40 hover:text-white/80 cursor-pointer transition-colors shrink-0">
          {collapsed ? <IconChevronRight size={13} /> : <IconChevronLeft size={13} />}
        </button>
      </div>

      {/* Store identity */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-white/15 flex items-center justify-center shrink-0">
              <span className="font-[var(--font-display)] text-base text-white font-[400]">{storeInitials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-[600] text-white truncate">{storeName}</p>
              <p className="text-xs text-white/50 truncate">{storeCategory}</p>
            </div>
          </div>
          <div className="mt-3">
            <a href="#" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer">
              <IconEye size={11} />
              View your store
            </a>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="px-4 py-3 border-b border-white/10 shrink-0 flex justify-center">
          <div className="w-8 h-8 rounded bg-white/15 flex items-center justify-center" title={storeName}>
            <span className="font-[var(--font-display)] text-sm text-white font-[400]">{storeInitials}</span>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest uppercase px-3 mb-2">Management</p>
        )}
        {NAV_ITEMS.map(item => <SidebarLink key={item.id} item={item} />)}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 pb-3 pt-2 border-t border-white/10 space-y-0.5 shrink-0">
        {BOTTOM_NAV.map(item => <SidebarLink key={item.id} item={item} />)}
        <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-all cursor-pointer`}
          title={collapsed ? "Log out" : undefined}>
          <IconLogout size={16} className="shrink-0" />
          {!collapsed && <span className="text-sm">Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[var(--color-ground)] overflow-hidden">
      {/* Skip navigation */}
      <a
        href="#seller-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-navy)] focus:text-white focus:text-sm focus:font-[500] focus:rounded focus:shadow-lg">
        Skip to main content
      </a>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col bg-[var(--color-navy)] transition-[width] duration-200 ease-out shrink-0 ${collapsed ? "w-16" : "w-60"}`}>
        <SidebarContent />
      </aside>

      {/* ── MOBILE SIDEBAR DRAWER ────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[var(--color-ink)]/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-label="Seller navigation"
            aria-modal="true"
            className="absolute inset-y-0 left-0 w-64 bg-[var(--color-navy)] shadow-[4px_0_24px_rgba(0,0,0,0.3)] flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="h-14 bg-white border-b border-[var(--color-border)] flex items-center gap-3 px-4 shrink-0">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="seller-nav-drawer"
            className="lg:hidden text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer p-1">
            <IconMenu size={18} aria-hidden="true" />
          </button>

          {/* Breadcrumb area */}
          <div className="flex-1 min-w-0 hidden sm:block">
            <nav className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--color-ink-muted)] cursor-pointer hover:text-[var(--color-navy)]">Seller Center</span>
              <IconChevronRight size={10} className="text-[var(--color-ink-disabled)]" />
              <span className="text-[var(--color-ink)] font-[500] capitalize">{activeItem.replace("-", " ")}</span>
            </nav>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-1 ml-auto">

            {/* Help */}
            <button className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm transition-all cursor-pointer" aria-label="Help">
              <IconHelp size={16} aria-hidden="true" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setAccountOpen(false); }}
                aria-label={`Notifications — 12 unread`}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="relative w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm transition-all cursor-pointer">
                <IconBell size={16} aria-hidden="true" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-red)] rounded-full" aria-hidden="true" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-sm font-[600] text-[var(--color-ink)]">Notifications</p>
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-amber)] bg-[var(--color-amber-light)] px-2 py-0.5 rounded-full">12 new</span>
                  </div>
                  {[
                    { title: "New order received", body: "Order #ORD-0088 from Maria Santos", time: "2m ago", unread: true },
                    { title: "Low stock alert", body: "Handmade Rug (Red) — 2 units left", time: "1h ago", unread: true },
                    { title: "Review received", body: "★★★★★ on Ceramic Bowl Set", time: "3h ago", unread: false },
                  ].map((n, i) => (
                    <div key={i} className={`flex gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] cursor-pointer ${n.unread ? "bg-[var(--color-navy-surface)]" : ""}`}>
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-navy)] mt-1.5 shrink-0" />}
                      {!n.unread && <span className="w-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-[600] text-[var(--color-ink)] mb-0.5">{n.title}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] truncate">{n.body}</p>
                        <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-disabled)] mt-1">{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setNotifOpen(false); navigate("/seller-center/notifications"); }} className="w-full flex items-center justify-center px-4 py-2.5 text-xs text-[var(--color-navy)] font-[500] hover:bg-[var(--color-surface)] cursor-pointer">View all notifications</button>
                </div>
              )}
            </div>

            {/* Account */}
            <div className="relative">
              <button
                onClick={() => { setAccountOpen(!accountOpen); setNotifOpen(false); }}
                aria-label="Account menu"
                aria-expanded={accountOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 pl-1 pr-2 h-8 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm transition-colors cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-[var(--color-navy)] flex items-center justify-center">
                  <span className="text-white text-[10px] font-[500]">M</span>
                </div>
                <span className="text-xs font-[500] hidden sm:block">Maria</span>
                <IconChevronDown size={10} className="text-[var(--color-ink-muted)]" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-xs font-[600] text-[var(--color-ink)]">Maria Santos</p>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">Seller account</p>
                  </div>
                  {["Account Settings", "Billing", "Switch to Buyer"].map(l => (
                    <button key={l} onClick={() => { setAccountOpen(false); navigate(ACCOUNT_ROUTES[l]); }} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] cursor-pointer">{l}</button>
                  ))}
                  <div className="border-t border-[var(--color-border)]">
                    <button onClick={() => { setAccountOpen(false); navigate("/auth/login"); }} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] cursor-pointer">Log out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable content area — extra bottom padding on mobile for tab bar */}
        <main id="seller-main-content" className="flex-1 overflow-y-auto bg-[var(--color-ground)] pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-[var(--color-border)] flex items-stretch z-30 shadow-[0_-1px_8px_rgba(28,27,24,0.06)]">
        {[
          { id: "dashboard", label: "Home",     Icon: IconDashboard },
          { id: "products",  label: "Products", Icon: IconProducts,  badge: undefined },
          { id: "orders",    label: "Orders",   Icon: IconOrders,    badge: 4 },
          { id: "analytics", label: "Analytics",Icon: IconAnalytics },
          { id: "settings",  label: "More",     Icon: IconSettings },
        ].map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => { setActiveItem(id); onNavChange?.(id); setMobileOpen(false); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 relative cursor-pointer transition-colors ${activeItem === id ? "text-[var(--color-navy)]" : "text-[var(--color-ink-muted)]"}`}
          >
            <span className="relative">
              <Icon size={20} />
              {badge && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[var(--color-red)] text-white text-[8px] font-[var(--font-mono)] rounded-full flex items-center justify-center leading-none">{badge}</span>
              )}
            </span>
            <span className={`text-[9px] font-[var(--font-mono)] leading-none ${activeItem === id ? "font-[600]" : ""}`}>{label}</span>
            {activeItem === id && <span className="absolute top-0 inset-x-0 h-0.5 bg-[var(--color-navy)] rounded-b" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
