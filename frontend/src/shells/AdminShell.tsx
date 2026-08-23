import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../api/notifications";
import { fetchSellerApplications } from "../api/sellerApplications";
import { fetchAdminDisputes, fetchAdminReports } from "../api/adminModeration";
import ConfirmDialog from "../components/ConfirmDialog";
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
  badgeKey?: keyof BadgeCounts;
  badgeColor?: string;
};

type BadgeCounts = {
  sellers: number;
  reports: number;
  disputes: number;
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

  if (action.includes("seller-application") || action.includes("account")) {
    return "/admin/sellers";
  }

  if (action.includes("report") || action.includes("moderation")) {
    return "/admin/reports";
  }

  if (action.includes("dispute")) {
    return "/admin/disputes";
  }

  if (action.includes("analytics")) {
    return "/admin/analytics";
  }

  if (action.includes("user")) {
    return "/admin/users";
  }

  return null;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   label: "Dashboard",    icon: IconDashboard },
  { id: "users",       label: "Users",        icon: IconUsers },
  { id: "sellers",     label: "Sellers",      icon: IconSellers,    badgeKey: "sellers", badgeColor: "amber" },
  { id: "products",    label: "Products",     icon: IconProducts },
  { id: "orders",      label: "Orders",       icon: IconOrders },
  { id: "categories",  label: "Categories",   icon: IconCategories },
  { id: "reports",     label: "Reports",      icon: IconReports,    badgeKey: "reports", badgeColor: "red" },
  { id: "disputes",    label: "Disputes",     icon: IconModeration, badgeKey: "disputes", badgeColor: "red" },
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
  const { logout } = useAuth();
  const [activeItem, setActiveItem] = useState(activeNav);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsBusyId, setNotificationsBusyId] = useState<number | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    sellers: 0,
    reports: 0,
    disputes: 0,
    notifications: 0,
  });
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
    let active = true;

    void (async () => {
      try {
        setNotificationsLoading(true);
        const [applicationsResponse, notificationsResponse, reportsResponse, disputesResponse] = await Promise.all([
          fetchSellerApplications({ status: "pending", per_page: 1 }),
          fetchNotifications({ limit: 5 }),
          fetchAdminReports(),
          fetchAdminDisputes(),
        ]);
        if (!active) return;
        setBadgeCounts((current) => ({
          ...current,
          sellers: applicationsResponse.data.total ?? applicationsResponse.data.length,
          reports: reportsResponse.meta.pending_count + reportsResponse.meta.reviewing_count,
          disputes: disputesResponse.meta.open_count,
          notifications: notificationsResponse.meta.unread_count ?? 0,
        }));
        setNotifications(notificationsResponse.data.filter((notification) => !notification.dismissed_at));
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
        {badgeValue > 0 && (
          <span className={`text-[9px] font-[var(--font-mono)] text-white px-1.5 py-0.5 rounded-full shrink-0 ${badgeBg}`}>{badgeValue}</span>
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
        <button onClick={() => setLogoutConfirmOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-all cursor-pointer">
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
                aria-label={`Admin alerts — ${badgeCounts.notifications} unread`}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="relative w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-all">
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
                      <p className="text-sm font-[600] text-[var(--color-ink)]">Admin Alerts</p>
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
                            {unread ? <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] mt-1.5 shrink-0" /> : <span className="w-1.5 shrink-0" />}
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
                  <button onClick={() => { setNotifOpen(false); navigate("/admin/notifications"); }} className="w-full flex items-center justify-center px-4 py-2.5 text-xs text-[var(--color-navy)] font-[500] hover:bg-[var(--color-surface)] cursor-pointer">View all alerts</button>
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
                    <button key={l} onClick={() => { setAccountOpen(false); navigate(l === "Profile" ? "/account/profile" : "/admin/settings"); }} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] cursor-pointer">{l}</button>
                  ))}
                  <div className="border-t border-[var(--color-border)]">
                    <button onClick={() => setLogoutConfirmOpen(true)} className="w-full flex items-center px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] cursor-pointer">Log out</button>
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

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Log out of admin panel?"
        description="You will need to sign in again to continue managing the platform."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        danger
        loading={logoutLoading}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
