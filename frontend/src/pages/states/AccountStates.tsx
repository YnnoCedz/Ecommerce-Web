import { useState } from "react";
import PublicShell from "../../shells/PublicShell";

// ── Shared banner component ───────────────────────────────────
function AccountBanner({
  severity, icon, heading, body, actions,
}: {
  severity: "warning" | "error" | "info";
  icon: React.ReactNode;
  heading: string;
  body: string;
  actions?: Array<{ label: string; primary?: boolean }>;
}) {
  const styles = {
    warning: { wrap: "bg-[var(--color-amber-light)] border-[var(--color-amber-border)]", text: "text-[var(--color-amber)]" },
    error:   { wrap: "bg-[var(--color-red-light)] border-[var(--color-red-border)]", text: "text-[var(--color-red)]" },
    info:    { wrap: "bg-[var(--color-navy-surface)] border-[var(--color-navy-border)]", text: "text-[var(--color-navy)]" },
  }[severity];

  return (
    <div className={`border ${styles.wrap} px-6 py-4 flex items-start gap-3`}>
      <div className={`shrink-0 ${styles.text}`}>{icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-[600] ${styles.text}`}>{heading}</p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{body}</p>
      </div>
      {actions && (
        <div className="flex gap-2 shrink-0">
          {actions.map(a => (
            <button key={a.label} className={`px-3 py-1.5 text-xs rounded-sm cursor-pointer ${a.primary ? `${styles.wrap} ${styles.text} border font-[500]` : "border border-[var(--color-border)] text-[var(--color-ink-muted)]"}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fake account page content
function AccountPageContent({ children }: { children?: React.ReactNode }) {
  return (
    <div className="max-w-screen-md mx-auto px-6 py-8">
      {children}
      {/* Account overview */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mt-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-navy)] text-white flex items-center justify-center text-xl font-[300]">M</div>
          <div>
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">Maria Santos</p>
            <p className="text-sm text-[var(--color-ink-muted)]">mariasantos@email.com</p>
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] mt-1">Member since August 2025</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[["Orders", "12"],["Wishlist", "34"],["Reviews left", "8"]].map(([l, v]) => (
            <div key={l} className="text-center p-3 bg-[var(--color-surface)] rounded-sm">
              <p className="font-[var(--font-display)] text-xl font-[600] text-[var(--color-ink)]">{v}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Unverified email ──────────────────────────────────────────
export function UnverifiedAccount() {
  const [sent, setSent] = useState(false);
  return (
    <PublicShell isLoggedIn>
      <AccountBanner
        severity="warning"
        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M9 5v5M9 12.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        heading="Please verify your email address"
        body="We sent a verification link to mariasantos@email.com. Some features are limited until your email is confirmed."
        actions={[
          { label: sent ? "Email sent!" : "Resend email", primary: true },
          { label: "Change email" },
        ]}
      />
      <AccountPageContent>
        {/* Feature limitation notice */}
        <div className="bg-[var(--color-amber-light)]/30 border border-[var(--color-amber-border)] rounded-sm p-4">
          <p className="text-sm font-[500] text-[var(--color-amber)] mb-2">Account limitations while unverified:</p>
          <ul className="text-xs text-[var(--color-ink-muted)] space-y-1 list-disc list-inside">
            <li>Cannot leave product reviews</li>
            <li>Cannot message sellers directly</li>
            <li>Purchase limit of ₱5,000 per transaction</li>
            <li>Cannot apply as a seller</li>
          </ul>
        </div>
      </AccountPageContent>
    </PublicShell>
  );
}

// ── Pending identity verification ─────────────────────────────
export function PendingVerification() {
  return (
    <PublicShell isLoggedIn>
      <AccountBanner
        severity="info"
        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M9 8v5M9 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        heading="Identity verification in progress"
        body="Your ID documents are being reviewed. This typically takes 1–2 business days. Submitted Aug 13, 2026."
      />
      <AccountPageContent>
        {/* Verification status */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mt-6">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Verification documents</p>
          {[
            { doc: "Government-issued ID (Front)", status: "Submitted", icon: "✓" },
            { doc: "Government-issued ID (Back)", status: "Submitted", icon: "✓" },
            { doc: "Selfie with ID", status: "Reviewing", icon: "⏳" },
          ].map(d => (
            <div key={d.doc} className="flex items-center justify-between py-3 border-b border-[var(--color-border-subtle)] last:border-0">
              <p className="text-sm text-[var(--color-ink)]">{d.doc}</p>
              <span className={`font-[var(--font-mono)] text-[9px] px-2 py-1 rounded ${d.status === "Reviewing" ? "bg-[var(--color-amber-light)] text-[var(--color-amber)]" : "bg-[var(--color-green-light)] text-[var(--color-green)]"}`}>
                {d.icon} {d.status}
              </span>
            </div>
          ))}
          <p className="text-xs text-[var(--color-ink-muted)] mt-3">You'll receive an email notification once your verification is complete.</p>
        </div>

        {/* Benefits unlocked after verification */}
        <div className="bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-sm p-4 mt-4">
          <p className="text-xs font-[600] text-[var(--color-navy)] mb-2">After verification, you'll unlock:</p>
          <ul className="text-xs text-[var(--color-navy)]/80 space-y-1 list-disc list-inside">
            <li>Seller account eligibility</li>
            <li>Higher purchase limits</li>
            <li>Priority buyer support</li>
          </ul>
        </div>
      </AccountPageContent>
    </PublicShell>
  );
}

// ── Restricted account ────────────────────────────────────────
export function RestrictedAccount() {
  return (
    <PublicShell isLoggedIn>
      <AccountBanner
        severity="error"
        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        heading="Your account has been restricted"
        body="Unusual activity was detected on Aug 14, 2026. Some features are disabled pending a security review."
        actions={[
          { label: "Verify my identity", primary: true },
          { label: "Contact support" },
        ]}
      />
      <AccountPageContent>
        {/* Restriction details */}
        <div className="bg-white border border-[var(--color-red)]/20 rounded-sm p-5 mt-6">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Disabled features</p>
          <div className="space-y-2.5">
            {[
              { f: "Placing new orders", reason: "Payment method under review" },
              { f: "Messaging sellers", reason: "Spam pattern detected" },
              { f: "Leaving reviews", reason: "Account under review" },
              { f: "Withdrawing funds (if seller)", reason: "Security hold" },
            ].map(item => (
              <div key={item.f} className="flex items-start gap-3 p-3 bg-[var(--color-red-light)]/30 border border-[var(--color-red)]/10 rounded-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="var(--color-red)" strokeWidth="1.2"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="var(--color-red)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <div>
                  <p className="text-xs font-[500] text-[var(--color-ink)]">{item.f}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-4 mt-4">
          <p className="text-xs text-[var(--color-ink-muted)]">To restore full access, complete identity verification or contact support. Your existing orders will continue to process normally.</p>
        </div>
      </AccountPageContent>
    </PublicShell>
  );
}

// ── Suspended account ─────────────────────────────────────────
export function SuspendedAccount() {
  return (
    <div className="min-h-screen bg-[var(--color-ground)] flex flex-col">
      {/* Minimal header */}
      <header className="bg-[var(--color-navy)] px-6 py-3 flex items-center justify-between">
        <span className="font-[var(--font-mono)] text-sm text-white tracking-widest">MARKETPLACE·OS</span>
        <button className="text-xs text-white/60 hover:text-white cursor-pointer">Sign out</button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-[var(--color-red-light)] flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="15" stroke="var(--color-red)" strokeWidth="1.5"/><path d="M10 10l16 16M26 10L10 26" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>

          <div className="text-center mb-6">
            <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-red-light)] text-[var(--color-red)] px-3 py-1 rounded inline-block mb-3">ACCOUNT SUSPENDED</span>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">Your account has been suspended</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">Access to Marketplace OS has been temporarily suspended pending an investigation into reported policy violations.</p>
          </div>

          {/* Suspension details */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Suspension date</span>
                <span className="text-[var(--color-ink)]">Aug 14, 2026</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Review date</span>
                <span className="text-[var(--color-ink)]">Aug 28, 2026</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Case reference</span>
                <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">CASE-20260814-8821</span>
              </div>
              <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                <p className="text-xs text-[var(--color-ink-muted)]">Reason: Multiple confirmed reports of counterfeit product listings. Our moderation team is reviewing your account.</p>
              </div>
            </div>
          </div>

          {/* What you can still do */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 mb-5">
            <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">During suspension:</p>
            <ul className="text-xs text-[var(--color-ink-muted)] space-y-1 list-disc list-inside">
              <li>You can still receive and view existing orders</li>
              <li>Pending payouts are held until the review completes</li>
              <li>You may submit an appeal within 14 days</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <button className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">Submit an appeal</button>
            <button className="w-full py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Contact support</button>
          </div>

          <p className="text-center text-xs text-[var(--color-ink-disabled)] mt-4">Case ID: CASE-20260814-8821 · support@marketplace-os.ph</p>
        </div>
      </div>
    </div>
  );
}

// ── Session expired ───────────────────────────────────────────
export function SessionExpiredAccount() {
  const [pwd, setPwd] = useState("");
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Dimmed page behind */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-20">
        <div className="bg-[var(--color-navy)] h-14" />
        <div className="p-6 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="bg-white border border-[var(--color-border)] rounded-sm h-28" />)}
          </div>
          <div className="bg-white border border-[var(--color-border)] rounded-sm h-64" />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-6 z-10">
        <div className="bg-white rounded-sm shadow-2xl max-w-sm w-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-[var(--color-amber-light)] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="var(--color-amber)" strokeWidth="1.2"/><path d="M8 4v5" stroke="var(--color-amber)" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="11.5" r=".75" fill="var(--color-amber)"/></svg>
              </div>
              <div>
                <p className="text-sm font-[600] text-[var(--color-ink)]">Session expired</p>
                <p className="text-xs text-[var(--color-ink-muted)]">Inactive for 30 min — please sign in again</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs text-[var(--color-ink-muted)] mb-4">You're signed in as <strong>mariasantos@email.com</strong>. Enter your password to continue where you left off.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Password</label>
                <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm focus:outline-none focus:border-[var(--color-navy)]" />
              </div>
            </div>
            <button className="w-full py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer mb-2 hover:bg-[var(--color-navy-hover)]">
              Continue as Maria
            </button>
            <button className="w-full py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
              Sign in as a different user
            </button>
          </div>

          <div className="px-6 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <p className="text-[10px] text-[var(--color-ink-muted)]">Sessions expire after 30 minutes of inactivity to protect your account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
