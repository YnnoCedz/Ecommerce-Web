import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { RotateCcw, Star } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../api/notifications";
import { fetchSellerDashboard, fetchSellerProfile, type SellerProfile } from "../api/seller";
import { fetchConversations } from "../api/account";
import ConfirmDialog from "../components/ConfirmDialog";
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
  badgeKey?: keyof BadgeCounts;
  href?: string;
};

type BadgeCounts = {
  orders: number;
  messages: number;
  notifications: number;
};

function formatRelativeTime(value: string | null) {
  if (!value) return "Just now";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(value).toLocaleDateString();
}

function resolveNotificationRoute(notification: NotificationRecord) {
  const action = notification.action_type?.toLowerCase() ?? "";

  if (action.includes("order") || notification.order_id) {
    return "/seller-center/orders";
  }

  if (action.includes("product") || action.includes("inventory") || notification.product_id) {
    return "/seller-center/inventory";
  }

  if (action.includes("message") || notification.conversation_id) {
    return "/seller-center/messages";
  }

  if (action.includes("account") || action.includes("seller-application")) {
    return "/seller-center/settings";
  }

  if (action.includes("analytics") || action.includes("report")) {
    return "/seller-center/analytics";
  }

  return null;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",     label: "Dashboard",    icon: IconDashboard },
  { id: "products",      label: "Products",     icon: IconProducts },
  { id: "inventory",     label: "Inventory",    icon: IconInventory },
  { id: "orders",        label: "Orders",       icon: IconOrders,     badgeKey: "orders" },
  { id: "returns",       label: "Returns",      icon: RotateCcw },
  { id: "reviews",       label: "Reviews",      icon: Star },
  { id: "customers",     label: "Customers",    icon: IconCustomers },
  { id: "promotions",    label: "Promotions",   icon: IconPromotions },
  { id: "analytics",     label: "Analytics",    icon: IconAnalytics },
];

const BOTTOM_NAV: NavItem[] = [
  { id: "messages",      label: "Messages",     icon: IconMessages,      badgeKey: "messages" },
  { id: "notifications", label: "Notifications",icon: IconNotifications, badgeKey: "notifications" },
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
  storeName,
  storeCategory,
  storeInitials,
  onNavChange,
}: SellerShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(activeNav);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsBusyId, setNotificationsBusyId] = useState<number | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    orders: 0,
    messages: 0,
    notifications: 0,
  });
  const ACCOUNT_ROUTES: Record<string, string> = {
    "Profile": "/account/profile",
    "Account Settings": "/seller-center/settings",
    "Billing": "/seller-center/settings?tab=payouts",
    "Switch to Buyer": "/",
  };
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
      setAccountOpen(false);
      navigate("/auth/login");
    }
  };

  useEffect(() => {
    setActiveItem(activeNav);
  }, [activeNav]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const profile = (event as CustomEvent<SellerProfile>).detail;
      if (profile && typeof profile === "object") {
        setSellerProfile(profile);
      }
    };

    window.addEventListener("seller-profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("seller-profile-updated", handleProfileUpdated);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setNotificationsLoading(true);
        const [dashboardResponse, notificationsResponse, conversationsResponse, profileResponse] = await Promise.all([
          fetchSellerDashboard(),
          fetchNotifications({ limit: 5 }),
          fetchConversations(),
          fetchSellerProfile(),
        ]);
        if (!active) return;
        setBadgeCounts((current) => ({
          ...current,
          orders: dashboardResponse.data.summary.pending_orders ?? 0,
          messages: conversationsResponse.data.reduce((total, conversation) => total + conversation.unread_count, 0),
          notifications: notificationsResponse.meta.unread_count ?? 0,
        }));
        setNotifications(notificationsResponse.data.filter((notification) => !notification.dismissed_at));
        setSellerProfile(profileResponse.data);
      } catch {
        if (!active) return;
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length;
  const resolvedStoreName = sellerProfile?.trade_name?.trim() || sellerProfile?.business_name?.trim() || storeName || "Your Store";
  const resolvedStoreCategory = sellerProfile?.categories?.[0]?.name || storeCategory || "Marketplace Seller";
  const resolvedStoreInitials = storeInitials || resolvedStoreName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";
  const accountName = user?.display_name?.trim() || "Seller";
  const accountFirstName = user?.first_name?.trim() || accountName.split(/\s+/)[0] || "Seller";
  const accountInitials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.trim()
    || accountName[0]
    || "S";

  const handleNotificationOpen = async (notification: NotificationRecord) => {
    try {
      setNotificationsBusyId(notification.id);
      const updated = notification.read_at ? notification : (await markNotificationRead(notification.id)).data;
      setNotifications((current) => current.map((item) => item.id === notification.id ? updated : item));
      setBadgeCounts((current) => ({
        ...current,
        notifications: Math.max(0, current.notifications - (notification.read_at ? 0 : 1)),
      }));

      const route = resolveNotificationRoute(notification);
      if (route) {
        setNotifOpen(false);
        navigate(route);
      }
    } finally {
      setNotificationsBusyId(null);
    }
  };

  const handleNotificationDismiss = async (notification: NotificationRecord) => {
    try {
      setNotificationsBusyId(notification.id);
      await dismissNotification(notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setBadgeCounts((current) => ({
        ...current,
        notifications: Math.max(0, current.notifications - (notification.read_at ? 0 : 1)),
      }));
    } finally {
      setNotificationsBusyId(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (unreadNotificationCount === 0) return;

    try {
      setNotificationsLoading(true);
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? new Date().toISOString() })));
      setBadgeCounts((current) => ({ ...current, notifications: 0 }));
    } finally {
      setNotificationsLoading(false);
    }
  };

  const SidebarLink = ({ item }: { item: NavItem }) => {
    const isActive = activeItem === item.id;
    const Icon = item.icon;
    const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
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
          {badgeValue > 0 && collapsed && (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-[var(--color-red)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center leading-none">
              {badgeValue}
            </span>
          )}
        </span>
        {!collapsed && <span className="text-sm font-[500] truncate flex-1 text-left">{item.label}</span>}

        {/* Tooltip for collapsed */}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--color-ink)] text-white text-xs rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            {item.label}
            {badgeValue > 0 && <span className="ml-1.5 bg-[var(--color-red)] text-white text-[9px] px-1 py-0.5 rounded-full">{badgeValue}</span>}
          </div>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Store identity */}
      {!collapsed && (
        <div className="order-1 px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
              {sellerProfile?.logo_url ? (
                <img src={sellerProfile.logo_url} alt={`${resolvedStoreName} logo`} className="h-full w-full object-cover" />
              ) : (
                <span className="font-[var(--font-display)] text-base text-white font-[400]">{resolvedStoreInitials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-[600] text-white truncate">{resolvedStoreName}</p>
              <p className="text-xs text-white/50 truncate">{resolvedStoreCategory}</p>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Collapse seller sidebar"
              className="hidden lg:flex ml-auto w-6 h-6 items-center justify-center text-white/40 hover:text-white/80 cursor-pointer transition-colors shrink-0">
              <IconChevronLeft size={13} />
            </button>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="order-1 px-2 py-3 border-b border-white/10 shrink-0 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded bg-white/15 flex items-center justify-center overflow-hidden" title={resolvedStoreName}>
            {sellerProfile?.logo_url ? (
              <img src={sellerProfile.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-[var(--font-display)] text-sm text-white font-[400]">{resolvedStoreInitials}</span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Expand seller sidebar"
            className="hidden lg:flex w-6 h-6 items-center justify-center text-white/40 hover:text-white/80 cursor-pointer transition-colors shrink-0">
            <IconChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Main nav */}
      <nav className="order-2 flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest uppercase px-3 mb-2">Management</p>
        )}
        {NAV_ITEMS.map(item => <SidebarLink key={item.id} item={item} />)}
      </nav>

      {/* Bottom nav */}
      <div className="order-3 px-2 pb-3 pt-2 border-t border-white/10 space-y-0.5 shrink-0">
        {BOTTOM_NAV.map(item => <SidebarLink key={item.id} item={item} />)}
        <button onClick={() => setLogoutConfirmOpen(true)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-all cursor-pointer`}
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
                aria-label={`Notifications — ${badgeCounts.notifications} unread`}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="relative w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm transition-all cursor-pointer">
                <IconBell size={16} aria-hidden="true" />
                {badgeCounts.notifications > 0 && (
                  <span className="absolute top-1 right-1 min-w-2.5 h-2.5 px-0.5 bg-[var(--color-red)] text-white text-[8px] font-[var(--font-mono)] rounded-full flex items-center justify-center leading-none" aria-hidden="true">
                    {badgeCounts.notifications > 9 ? "9+" : badgeCounts.notifications}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                    <div>
                      <p className="text-sm font-[600] text-[var(--color-ink)]">Notifications</p>
                      <p className="text-[10px] text-[var(--color-ink-muted)]">
                        {notificationsLoading ? "Refreshing from the backend..." : `${badgeCounts.notifications} unread`}
                      </p>
                    </div>
                    {badgeCounts.notifications > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] font-[500] text-[var(--color-navy)] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-[var(--color-ink-muted)]">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const unread = !notification.read_at;
                      return (
                        <div
                          key={notification.id}
                          className={`flex gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] ${unread ? "bg-[var(--color-navy-surface)]" : ""}`}
                        >
                          <button
                            onClick={() => void handleNotificationOpen(notification)}
                            disabled={notificationsBusyId === notification.id}
                            className="flex gap-3 flex-1 min-w-0 text-left cursor-pointer disabled:opacity-60"
                          >
                            {unread ? <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-navy)] mt-1.5 shrink-0" /> : <span className="w-1.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-[600] text-[var(--color-ink)] mb-0.5">{notification.title}</p>
                              <p className="text-xs text-[var(--color-ink-muted)] truncate">{notification.body}</p>
                              <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-disabled)] mt-1">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => void handleNotificationDismiss(notification)}
                            disabled={notificationsBusyId === notification.id}
                            className="shrink-0 self-start text-[10px] text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer disabled:opacity-60"
                          >
                            Dismiss
                          </button>
                        </div>
                      );
                    })
                  )}
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
                <div className="w-6 h-6 rounded-full bg-[var(--color-navy)] flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white text-[10px] font-[500]">{accountInitials.toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs font-[500] hidden sm:block">{accountFirstName}</span>
                <IconChevronDown size={10} className="text-[var(--color-ink-muted)]" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-xs font-[600] text-[var(--color-ink)]">{accountName}</p>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">{user?.email ?? "Seller account"}</p>
                  </div>
                  {["Profile", "Account Settings", "Billing", "Switch to Buyer"].map(l => (
                    <button key={l} onClick={() => { setAccountOpen(false); navigate(ACCOUNT_ROUTES[l]); }} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] cursor-pointer">{l}</button>
                  ))}
                  <div className="border-t border-[var(--color-border)]">
                    <button onClick={() => setLogoutConfirmOpen(true)} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] cursor-pointer">Log out</button>
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
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Log out of seller center?"
        description="You will need to sign in again to access your seller tools."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        danger
        loading={logoutLoading}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
      />

      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-[var(--color-border)] flex items-stretch z-30 shadow-[0_-1px_8px_rgba(28,27,24,0.06)]">
        {[
          { id: "dashboard", label: "Home",     Icon: IconDashboard },
          { id: "products",  label: "Products", Icon: IconProducts,  badge: undefined },
          { id: "orders",    label: "Orders",   Icon: IconOrders,    badge: badgeCounts.orders || undefined },
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
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[var(--color-red)] text-white text-[8px] font-[var(--font-mono)] rounded-full flex items-center justify-center leading-none">{badge}</span>
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
