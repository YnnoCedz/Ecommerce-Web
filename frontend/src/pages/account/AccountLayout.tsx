import type { ReactNode } from "react";

export type AccountPage = "profile" | "personal-info" | "addresses" | "security" | "notifications" | "preferences" | "account-status";
export type AccountStatus = "verified" | "unverified" | "pending" | "suspended" | "restricted";

export type AccountUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  status: AccountStatus;
  joinedDate: string;
  orderCount: number;
  wishlistCount: number;
};

export const DEMO_USER: AccountUser = {
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana.reyes@example.com",
  phone: "+63 917 555 0182",
  avatar: null,
  status: "verified",
  joinedDate: "March 2024",
  orderCount: 18,
  wishlistCount: 34,
};

type NavFn = (page: string, params?: Record<string, string>) => void;

const NAV_ITEMS: { id: AccountPage; label: string; icon: ReactNode; description: string }[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Overview and account status",
    icon: <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="9" cy="6" r="3.5" /><path d="M2 17a7 7 0 0114 0" /></svg>,
  },
  {
    id: "personal-info",
    label: "Personal Information",
    description: "Name, birthday, gender, phone",
    icon: <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 4h12M3 8h8M3 12h6" /></svg>,
  },
  {
    id: "addresses",
    label: "Addresses",
    description: "Shipping and billing addresses",
    icon: <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2C6.2 2 4 4.2 4 7c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z" /><circle cx="9" cy="7" r="1.5" /></svg>,
  },
  {
    id: "security",
    label: "Security",
    description: "Password, 2FA, active sessions",
    icon: <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2L3 5v5c0 3.5 2.6 6.8 6 7.5C13.4 16.8 16 13.5 16 10V5L9 2z" /></svg>,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Email, SMS, and push settings",
    icon: <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2a5 5 0 015 5v3l2 3H2l2-3V7a5 5 0 015-5zM7 14a2 2 0 004 0" /></svg>,
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Language, currency, display",
    icon: <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="9" cy="9" r="2.5" /><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" /></svg>,
  },
];

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  verified:   { label: "Verified",            color: "var(--color-green)",   bg: "var(--color-green-light)",   border: "var(--color-green-border)",   dot: "bg-[var(--color-green)]" },
  unverified: { label: "Unverified",          color: "var(--color-warning)", bg: "var(--color-warning-light)", border: "var(--color-warning-border)", dot: "bg-[var(--color-warning)]" },
  pending:    { label: "Verification Pending",color: "var(--color-amber)",   bg: "var(--color-amber-light)",   border: "var(--color-amber-border)",   dot: "bg-[var(--color-amber)]" },
  suspended:  { label: "Suspended",           color: "var(--color-red)",     bg: "var(--color-red-light)",     border: "var(--color-red-border)",     dot: "bg-[var(--color-red)]" },
  restricted: { label: "Restricted",          color: "var(--color-warning)", bg: "var(--color-warning-light)", border: "var(--color-warning-border)", dot: "bg-[var(--color-warning)]" },
};

export function StatusBannerAccount({ status }: { status: AccountStatus }) {
  const cfg = STATUS_CONFIG[status];
  const messages: Record<AccountStatus, string> = {
    verified:   "Your account is verified. All features are available.",
    unverified: "Please verify your email address to access all features.",
    pending:    "Email verification in progress. Check your inbox for a confirmation link.",
    suspended:  "Your account has been suspended. Contact support for assistance.",
    restricted: "Some features are temporarily restricted on your account. View details.",
  };
  const actions: Record<AccountStatus, string | null> = {
    verified: null,
    unverified: "Verify now",
    pending: "Resend email",
    suspended: "Contact support",
    restricted: "Learn more",
  };
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cfg.dot} ${status === "pending" ? "animate-pulse" : ""}`} />
      <div className="flex-1">
        <span className="font-[600]">{cfg.label} — </span>
        <span style={{ opacity: 0.85 }}>{messages[status]}</span>
      </div>
      {actions[status] && (
        <button className="text-xs font-[600] shrink-0 hover:underline cursor-pointer" style={{ color: cfg.color }}>
          {actions[status]}
        </button>
      )}
    </div>
  );
}

interface AccountLayoutProps {
  children: ReactNode;
  activePage: AccountPage;
  user: AccountUser;
  onNavigate: NavFn;
  onPageChange: (page: AccountPage) => void;
}

export default function AccountLayout({ children, activePage, user, onNavigate, onPageChange }: AccountLayoutProps) {
  const statusCfg = STATUS_CONFIG[user.status];

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">

        {/* Page title */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">My Account</span>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── SIDEBAR ────────────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-3">
            {/* User card */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[var(--color-navy)] rounded shrink-0 flex items-center justify-center">
                  <span className="font-[var(--font-display)] text-lg text-white font-[400]">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-[600] text-[var(--color-ink)] truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm" style={{ background: statusCfg.bg }}>
                <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${user.status === "pending" ? "animate-pulse" : ""}`} />
                <span className="text-xs font-[500]" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              {NAV_ITEMS.map((item, i) => {
                const isActive = activePage === item.id;
                return (
                  <button key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${i > 0 ? "border-t border-[var(--color-border-subtle)]" : ""} ${isActive ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"}`}>
                    <span className="shrink-0">{item.icon}</span>
                    <span className="text-sm font-[500]">{item.label}</span>
                    {isActive && <div className="ml-auto w-1 h-4 bg-[var(--color-navy)] rounded-full" />}
                  </button>
                );
              })}
              <div className="border-t border-[var(--color-border)] px-4 py-3">
                <button className="flex items-center gap-2.5 text-sm text-[var(--color-red)] hover:text-[var(--color-red-hover)] cursor-pointer transition-colors">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M11 9H2M5 6l-3 3 3 3M11 2h5v14h-5" /></svg>
                  Sign out
                </button>
              </div>
            </nav>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              {[{ label: "Orders", value: user.orderCount }, { label: "Wishlist", value: user.wishlistCount }].map(({ label, value }) => (
                <div key={label} className="bg-white border border-[var(--color-border)] rounded-sm p-3 text-center">
                  <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-navy)]">{value}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* ── CONTENT ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
