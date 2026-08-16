import { useState } from "react";
import { Field, PasswordStrength } from "../auth/AuthLayout";

const SESSIONS = [
  { id: "s1", device: "MacBook Pro", browser: "Chrome 127", location: "Quezon City, PH", lastActive: "Active now", current: true },
  { id: "s2", device: "iPhone 15 Pro", browser: "Safari Mobile", location: "Makati, PH", lastActive: "2 hours ago", current: false },
  { id: "s3", device: "Windows PC", browser: "Edge 126", location: "Cebu City, PH", lastActive: "3 days ago", current: false },
];

function SectionCard({ title, subtitle, children, danger }: { title: string; subtitle?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-white border rounded-sm overflow-hidden ${danger ? "border-[var(--color-red-border)]" : "border-[var(--color-border)]"}`}>
      <div className={`px-6 py-4 border-b ${danger ? "border-[var(--color-red-border)] bg-[var(--color-red-light)]" : "border-[var(--color-border)]"}`}>
        <h3 className={`text-sm font-[600] ${danger ? "text-[var(--color-red)]" : "text-[var(--color-ink)]"}`}>{title}</h3>
        {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SecurityPage() {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState(SESSIONS);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});

  const savePassword = () => {
    const e: Record<string, string> = {};
    if (!currentPwd) e.current = "Current password is required";
    if (!newPwd) e.new = "New password is required";
    else if (newPwd.length < 8) e.new = "Must be at least 8 characters";
    if (newPwd !== confirmPwd) e.confirm = "Passwords do not match";
    if (Object.keys(e).length) { setPwdErrors(e); return; }
    setPwdErrors({});
    setPwdLoading(true);
    setTimeout(() => { setPwdLoading(false); setPwdSuccess(true); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }, 1200);
  };

  const revokeSession = (id: string) => setSessions(s => s.filter(x => x.id !== id));

  return (
    <div className="space-y-4">

      {/* Change password */}
      <SectionCard title="Change Password" subtitle="Use a strong, unique password you don't use elsewhere">
        {pwdSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm px-3.5 py-3 text-sm text-[var(--color-green)]">
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="5" /><path d="M3.5 6l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Password updated successfully.
          </div>
        )}
        <div className="space-y-4 max-w-sm">
          <Field label="Current password" type="password" value={currentPwd} onChange={setCurrentPwd}
            placeholder="Enter current password" error={pwdErrors.current} required />
          <div className="space-y-2">
            <Field label="New password" type="password" value={newPwd} onChange={v => { setNewPwd(v); setPwdSuccess(false); }}
              placeholder="Create new password" error={pwdErrors.new} required />
            <PasswordStrength password={newPwd} />
          </div>
          <Field label="Confirm new password" type="password" value={confirmPwd} onChange={setConfirmPwd}
            placeholder="Repeat new password" error={pwdErrors.confirm} required />
          <button onClick={savePassword} disabled={pwdLoading}
            className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2">
            {pwdLoading ? (
              <><svg className="animate-spin" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5" strokeOpacity="0.3" /><path d="M7 2a5 5 0 015 5" strokeLinecap="round" /></svg> Saving…</>
            ) : "Update password"}
          </button>
        </div>
      </SectionCard>

      {/* Two-factor authentication */}
      <SectionCard title="Two-Factor Authentication" subtitle="Add an extra layer of security to your account">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-3">
              With 2FA enabled, you'll need to enter a code from your authenticator app when signing in from a new device.
            </p>
            {twoFactor && (
              <div className="bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm px-3.5 py-2.5 text-sm text-[var(--color-green)] flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="5" /><path d="M3.5 6l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Two-factor authentication is active
              </div>
            )}
            {!twoFactor && (
              <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-sm px-3.5 py-2.5 text-xs text-[var(--color-warning)]">
                Recommended: Enable 2FA to protect your account from unauthorized access
              </div>
            )}
          </div>
          <div className="shrink-0 pt-1">
            <button onClick={() => setTwoFactor(f => !f)}
              className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${twoFactor ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${twoFactor ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>
        {twoFactor && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">Recovery codes</p>
            <p className="text-xs text-[var(--color-ink-muted)] mb-2">Keep these safe — you can use them if you lose access to your authenticator app.</p>
            <button className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View recovery codes</button>
          </div>
        )}
      </SectionCard>

      {/* Active sessions */}
      <SectionCard title="Active Sessions" subtitle="Devices currently signed in to your account">
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="flex items-center gap-4 py-3 border-b border-[var(--color-border-subtle)] last:border-0">
              <div className="w-10 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded flex items-center justify-center shrink-0 text-[var(--color-ink-muted)]">
                {session.device.includes("iPhone") || session.device.includes("Android") ? (
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="5" y="1" width="8" height="16" rx="2" /><path d="M9 14h.01" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="3" width="14" height="10" rx="1" /><path d="M6 13v2M12 13v2M4 15h10" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-[600] text-[var(--color-ink)]">{session.device}</p>
                  {session.current && (
                    <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-green-light)] text-[var(--color-green)] border border-[var(--color-green-border)] rounded-full">Current</span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-ink-muted)]">{session.browser} · {session.location}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-0.5">{session.lastActive}</p>
              </div>
              {!session.current && (
                <button onClick={() => revokeSession(session.id)}
                  className="text-xs text-[var(--color-red)] font-[500] hover:underline cursor-pointer shrink-0">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        {sessions.length > 1 && (
          <button onClick={() => setSessions(s => s.filter(x => x.current))}
            className="mt-3 text-xs text-[var(--color-red)] font-[500] hover:underline cursor-pointer">
            Revoke all other sessions
          </button>
        )}
      </SectionCard>
    </div>
  );
}
