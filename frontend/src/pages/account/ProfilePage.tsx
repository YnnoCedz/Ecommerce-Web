import { AccountUser, StatusBannerAccount } from "./AccountLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

const RECENT_ORDERS = [
  { id: "ORD-2849", product: "Minimalist Chronograph Watch", status: "Delivered", date: "Aug 5, 2026", amount: 4200 },
  { id: "ORD-2831", product: "Natural Botanical Skincare Set", status: "In transit", date: "Aug 10, 2026", amount: 1200 },
  { id: "ORD-2814", product: "Genuine Leather Tote Bag", status: "Processing", date: "Aug 13, 2026", amount: 2800 },
];

const statusColors: Record<string, string> = {
  Delivered: "text-[var(--color-green)] bg-[var(--color-green-light)]",
  "In transit": "text-[var(--color-amber)] bg-[var(--color-amber-light)]",
  Processing: "text-[var(--color-navy)] bg-[var(--color-navy-surface)]",
  Cancelled: "text-[var(--color-red)] bg-[var(--color-red-light)]",
};

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function ProfilePage({ user, onNavigate, onPageChange }: {
  user: AccountUser;
  onNavigate: NavFn;
  onPageChange: (page: string) => void;
}) {
  return (
    <div className="space-y-4">

      {/* Account status banner */}
      <StatusBannerAccount status={user.status} />

      {/* Profile summary */}
      <SectionCard
        title="Profile"
        action={
          <button onClick={() => onPageChange("personal-info")}
            className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Edit profile
          </button>
        }>
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-[var(--color-navy)] rounded flex items-center justify-center">
              <span className="font-[var(--font-display)] text-3xl text-white font-[400]">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-[var(--color-border)] rounded-full flex items-center justify-center shadow-sm hover:border-[var(--color-navy)] cursor-pointer transition-colors">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M10 2.5L11.5 4 4.5 11H3v-1.5L10 2.5z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-0.5">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-[var(--color-ink-muted)] mb-3">{user.email}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Phone", value: user.phone },
                { label: "Member since", value: user.joinedDate },
                { label: "Orders placed", value: user.orderCount.toString() },
                { label: "Wishlist items", value: user.wishlistCount.toString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-[500] text-[var(--color-ink)] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Recent orders */}
      <SectionCard
        title="Recent Orders"
        action={
          <button className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            View all orders
          </button>
        }>
        <div className="space-y-3">
          {RECENT_ORDERS.map(order => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-[var(--color-border-subtle)] last:border-0">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.id}</span>
                  <span className={`font-[var(--font-mono)] text-[9px] font-[500] px-1.5 py-0.5 rounded-full ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{order.product}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{order.date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-[600] text-[var(--color-ink)]">₱{order.amount.toLocaleString()}</p>
                <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer mt-0.5">Track</button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Account security quick view */}
      <SectionCard
        title="Security"
        action={
          <button onClick={() => onPageChange("security")}
            className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Manage
          </button>
        }>
        <div className="space-y-3">
          {[
            { label: "Password", value: "Last changed 30 days ago", icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2L3 5v5c0 3.5 2.6 6.8 6 7.5C13.4 16.8 16 13.5 16 10V5L9 2z" /></svg>, ok: true },
            { label: "Two-factor auth", value: "Not enabled — we recommend setting this up", icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="5" y="8" width="8" height="8" rx="1" /><path d="M7 8V6a2 2 0 014 0v2" /></svg>, ok: false },
            { label: "Active sessions", value: "2 active sessions", icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="4" width="14" height="10" rx="1" /><path d="M6 14v2M12 14v2M4 16h10" /></svg>, ok: true },
          ].map(({ label, value, icon, ok }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`text-sm ${ok ? "text-[var(--color-ink-muted)]" : "text-[var(--color-warning)]"}`}>{icon}</div>
              <div className="flex-1">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
                <p className={`text-xs ${ok ? "text-[var(--color-ink-muted)]" : "text-[var(--color-warning)]"}`}>{value}</p>
              </div>
              {!ok && (
                <button onClick={() => onPageChange("security")}
                  className="text-xs px-2.5 py-1 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] text-[var(--color-warning)] font-[500] rounded-sm hover:bg-[var(--color-amber-light)] cursor-pointer transition-colors">
                  Enable
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
