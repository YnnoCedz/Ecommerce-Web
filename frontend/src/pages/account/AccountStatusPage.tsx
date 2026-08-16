import { AccountStatus } from "./AccountLayout";

type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  dotClass: string;
  icon: React.ReactNode;
  headline: string;
  description: string;
  features: { label: string; available: boolean }[];
  action: string | null;
  actionColor?: string;
};

const STATUSES: Record<AccountStatus, StatusConfig> = {
  verified: {
    label: "Verified",
    color: "var(--color-green)", bg: "var(--color-green-light)", border: "var(--color-green-border)", dotClass: "bg-[var(--color-green)]",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>,
    headline: "Your account is fully verified",
    description: "All features are available. You can browse, purchase, and interact with sellers and reviews without any limitations.",
    features: [
      { label: "Browse and purchase products", available: true },
      { label: "Write product reviews", available: true },
      { label: "Message sellers", available: true },
      { label: "Access order history", available: true },
      { label: "Save wishlist items", available: true },
      { label: "Receive buyer protection", available: true },
    ],
    action: null,
  },
  unverified: {
    label: "Unverified",
    color: "var(--color-warning)", bg: "var(--color-warning-light)", border: "var(--color-warning-border)", dotClass: "bg-[var(--color-warning)]",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.3L2 21h20L13.7 3.3a2 2 0 00-3.4 0z" /><path d="M12 9v5M12 17v.01" /></svg>,
    headline: "Email verification required",
    description: "Verify your email address to unlock all features. Some actions are limited until your account is verified.",
    features: [
      { label: "Browse products", available: true },
      { label: "Add to cart", available: true },
      { label: "Complete purchase", available: false },
      { label: "Write reviews", available: false },
      { label: "Message sellers", available: false },
      { label: "Receive buyer protection", available: false },
    ],
    action: "Verify email now",
    actionColor: "var(--color-warning)",
  },
  pending: {
    label: "Verification Pending",
    color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)", dotClass: "bg-[var(--color-amber)]",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    headline: "Verification in progress",
    description: "We sent a verification link to your email. Click the link to complete verification. It may take a few minutes to arrive.",
    features: [
      { label: "Browse products", available: true },
      { label: "Add to cart", available: true },
      { label: "Complete purchase", available: false },
      { label: "Write reviews", available: false },
      { label: "Message sellers", available: false },
      { label: "Receive buyer protection", available: false },
    ],
    action: "Resend verification email",
  },
  suspended: {
    label: "Suspended",
    color: "var(--color-red)", bg: "var(--color-red-light)", border: "var(--color-red-border)", dotClass: "bg-[var(--color-red)]",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>,
    headline: "Account suspended",
    description: "Your account has been suspended due to a violation of Marketo's Terms of Service or Community Guidelines. Access is restricted until reviewed.",
    features: [
      { label: "Browse products", available: true },
      { label: "Add to cart", available: false },
      { label: "Complete purchase", available: false },
      { label: "Write reviews", available: false },
      { label: "Message sellers", available: false },
      { label: "Receive buyer protection", available: false },
    ],
    action: "Contact support",
    actionColor: "var(--color-red)",
  },
  restricted: {
    label: "Restricted",
    color: "var(--color-warning)", bg: "var(--color-warning-light)", border: "var(--color-warning-border)", dotClass: "bg-[var(--color-warning)]",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H4v16h16v-5M9 4l5 5-5 5M12 4h8v8" /></svg>,
    headline: "Account restrictions active",
    description: "Some features are temporarily restricted on your account. This may be due to an ongoing review or unusual activity detected.",
    features: [
      { label: "Browse and purchase products", available: true },
      { label: "View order history", available: true },
      { label: "Write reviews", available: false },
      { label: "Message sellers", available: true },
      { label: "New seller applications", available: false },
      { label: "Receive buyer protection", available: true },
    ],
    action: "Learn more",
  },
};

export default function AccountStatusPage({ currentStatus }: { currentStatus: AccountStatus }) {
  const cfg = STATUSES[currentStatus];

  return (
    <div className="space-y-4">
      {/* All status states overview */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-[600] text-[var(--color-ink)]">Account Status</h3>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">All possible account states and their access levels</p>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {(Object.entries(STATUSES) as [AccountStatus, StatusConfig][]).map(([key, s]) => (
            <div key={key} className={`flex items-center gap-4 px-6 py-3.5 ${key === currentStatus ? "bg-[var(--color-surface)]" : ""}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.dotClass}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{s.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)] truncate">{s.description.split(".")[0]}.</p>
              </div>
              {key === currentStatus && (
                <span className="font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-navy)] text-white shrink-0">CURRENT</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current status detail */}
      <div className="border rounded-sm overflow-hidden" style={{ borderColor: cfg.border }}>
        <div className="px-6 py-5 flex items-start gap-4" style={{ background: cfg.bg }}>
          <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center shrink-0">
            {cfg.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-[var(--font-mono)] text-[10px] font-[500] uppercase tracking-widest" style={{ color: cfg.color }}>Current Status</span>
            </div>
            <h3 className="font-[var(--font-display)] text-xl font-[400] mb-1" style={{ color: cfg.color }}>{cfg.headline}</h3>
            <p className="text-sm leading-relaxed" style={{ color: cfg.color, opacity: 0.8 }}>{cfg.description}</p>
          </div>
        </div>

        {/* Feature access */}
        <div className="bg-white px-6 py-5">
          <p className="text-xs font-[600] text-[var(--color-ink)] mb-4">Feature access</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {cfg.features.map(({ label, available }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${available ? "bg-[var(--color-green-light)]" : "bg-[var(--color-red-light)]"}`}>
                  {available ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5l2.5 2.5 3.5-4" /></svg>
                  ) : (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l6 6M7 1L1 7" /></svg>
                  )}
                </div>
                <span className={`text-sm ${available ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}>{label}</span>
              </div>
            ))}
          </div>

          {cfg.action && (
            <button className="mt-5 px-5 py-2.5 text-sm font-[500] text-white rounded-sm cursor-pointer transition-colors hover:opacity-90"
              style={{ background: cfg.actionColor ?? cfg.color }}>
              {cfg.action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
