import { useState } from "react";

type SettingsTab = "account" | "payouts" | "notifications" | "security";

const INPUT = "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm mb-5">
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5 shrink-0 ${checked ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`}>
      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
    </div>
  );
}

function AccountTab() {
  return (
    <div>
      <SectionCard title="Personal information">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>First name</label>
            <input type="text" defaultValue="Maria" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Last name</label>
            <input type="text" defaultValue="Santos" className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Email address</label>
            <input type="email" defaultValue="maria@verdebotanics.com" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Mobile number</label>
            <input type="tel" defaultValue="+63 917 000 0000" className={INPUT} />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save</button>
        </div>
      </SectionCard>

      <SectionCard title="Change password">
        <div className="space-y-4 max-w-md">
          <div>
            <label className={LABEL}>Current password</label>
            <input type="password" placeholder="Enter current password" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>New password</label>
            <input type="password" placeholder="At least 8 characters" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Confirm new password</label>
            <input type="password" placeholder="Repeat new password" className={INPUT} />
          </div>
          <button className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Update password</button>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone" subtitle="These actions are irreversible.">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3.5 border border-[var(--color-border)] rounded-sm">
            <div>
              <p className="text-sm font-[500] text-[var(--color-ink)]">Deactivate store</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Your store and listings will be hidden from buyers. You can reactivate at any time.</p>
            </div>
            <button className="px-3 py-2 border border-[var(--color-amber-border)] text-xs text-[var(--color-amber)] rounded-sm hover:bg-[var(--color-amber-light)] cursor-pointer whitespace-nowrap ml-4">Deactivate</button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border border-[var(--color-red-border)] rounded-sm bg-[var(--color-red-light)]">
            <div>
              <p className="text-sm font-[500] text-[var(--color-red)]">Delete seller account</p>
              <p className="text-xs text-[var(--color-red)]/70">Permanently delete your store, products, and transaction history. This cannot be undone.</p>
            </div>
            <button className="px-3 py-2 bg-[var(--color-red)] text-white text-xs font-[500] rounded-sm hover:opacity-90 cursor-pointer whitespace-nowrap ml-4">Delete account</button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PayoutsTab() {
  const [method, setMethod] = useState("bank");
  const [schedule, setSchedule] = useState("weekly");
  return (
    <div>
      <SectionCard title="Payout method" subtitle="Where Marketo sends your earnings.">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { id: "bank", label: "Bank transfer", icon: "🏦" },
            { id: "gcash", label: "GCash", icon: "📱" },
            { id: "maya", label: "Maya", icon: "💳" },
          ].map(m => (
            <label key={m.id} className={`flex gap-2.5 p-3.5 rounded-sm border cursor-pointer transition-all ${method === m.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
              <input type="radio" name="payout-method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-[var(--color-navy)] mt-0.5" />
              <div>
                <span className="text-xl">{m.icon}</span>
                <p className={`text-sm font-[500] mt-1 ${method === m.id ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{m.label}</p>
              </div>
            </label>
          ))}
        </div>

        {method === "bank" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Bank name</label>
              <select className={INPUT + " cursor-pointer"}>
                <option>BDO Unibank</option>
                <option>BPI (Bank of the Philippine Islands)</option>
                <option>Metrobank</option>
                <option>UnionBank</option>
                <option>Land Bank</option>
                <option>Security Bank</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Account type</label>
              <select className={INPUT + " cursor-pointer"}>
                <option>Savings</option>
                <option>Checking</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Account number</label>
              <input type="text" placeholder="••••••••••••" className={INPUT + " font-[var(--font-mono)]"} />
            </div>
            <div>
              <label className={LABEL}>Account name</label>
              <input type="text" defaultValue="MARIA SANTOS" className={INPUT} />
            </div>
          </div>
        )}

        {(method === "gcash" || method === "maya") && (
          <div className="max-w-xs">
            <label className={LABEL}>Mobile number linked to {method === "gcash" ? "GCash" : "Maya"}</label>
            <input type="tel" placeholder="+63 917 000 0000" className={INPUT} />
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save payout method</button>
        </div>
      </SectionCard>

      <SectionCard title="Payout schedule">
        <div className="space-y-3 mb-5">
          {[
            { id: "daily", label: "Daily payouts", desc: "Settled on the next business day after order completion." },
            { id: "weekly", label: "Weekly payouts", desc: "Settled every Monday for the prior week's completed orders." },
          ].map(s => (
            <label key={s.id} className="flex gap-3 p-3.5 border border-[var(--color-border)] rounded-sm cursor-pointer hover:border-[var(--color-navy)]/40 transition-colors">
              <input type="radio" name="schedule" value={s.id} checked={schedule === s.id} onChange={() => setSchedule(s.id)} className="mt-0.5 accent-[var(--color-navy)]" />
              <div>
                <p className="text-sm font-[500] text-[var(--color-ink)]">{s.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
          <div className="flex-1">
            <p className="text-xs text-[var(--color-ink-muted)]">Pending payout</p>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-green)]">₱24,180</p>
            <p className="text-xs text-[var(--color-ink-disabled)]">Scheduled: Aug 18, 2026</p>
          </div>
          <button className="px-4 py-2 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-white cursor-pointer">Request now</button>
        </div>
      </SectionCard>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    "new-order-email": true, "new-order-sms": false, "new-order-push": true,
    "low-stock-email": true, "low-stock-sms": false, "low-stock-push": true,
    "review-email": true, "review-sms": false, "review-push": true,
    "payout-email": true, "payout-sms": true, "payout-push": false,
    "promo-email": false, "promo-sms": false, "promo-push": false,
    "security-email": true, "security-sms": true, "security-push": true,
  });

  const toggle = (key: string) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const rows = [
    { key: "new-order", label: "New order received",   desc: "When a buyer places an order in your store" },
    { key: "low-stock", label: "Low stock alert",       desc: "When a product drops below its threshold" },
    { key: "review",    label: "New review",             desc: "When a buyer leaves a review on your product" },
    { key: "payout",    label: "Payout confirmation",   desc: "When a payout is processed to your account" },
    { key: "promo",     label: "Promotional tips",      desc: "Suggestions to improve your store visibility" },
    { key: "security",  label: "Security alerts",        desc: "Login from new device, password changes" },
  ];

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <th className="px-5 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Notification</th>
            <th className="px-5 py-3 text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Email</th>
            <th className="px-5 py-3 text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">SMS</th>
            <th className="px-5 py-3 text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Push</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
              <td className="px-5 py-4">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{r.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{r.desc}</p>
              </td>
              {(["email", "sms", "push"] as const).map(ch => (
                <td key={ch} className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={prefs[`${r.key}-${ch}`] ?? false} onChange={() => toggle(`${r.key}-${ch}`)} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecurityTab() {
  const [twofa, setTwofa] = useState(false);

  return (
    <div>
      <SectionCard title="Two-factor authentication" subtitle="Add an extra layer of security to your account.">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-[var(--color-ink-muted)] mb-2">Two-factor authentication requires a verification code each time you log in, in addition to your password.</p>
            <span className={`font-[var(--font-mono)] text-[10px] px-2 py-1 rounded ${twofa ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-surface)] text-[var(--color-ink-disabled)]"}`}>{twofa ? "Enabled" : "Disabled"}</span>
          </div>
          <button onClick={() => setTwofa(!twofa)} className={`px-4 py-2 text-sm font-[500] rounded-sm cursor-pointer transition-colors ${twofa ? "border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]" : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"}`}>
            {twofa ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Active sessions" subtitle="Devices currently signed into your seller account.">
        <div className="space-y-3">
          {[
            { device: "Chrome on macOS", location: "Makati, Metro Manila", time: "Now — current session", current: true },
            { device: "Safari on iPhone 15", location: "Makati, Metro Manila", time: "Aug 14 at 9:30 PM" },
            { device: "Chrome on Windows", location: "Pasig, Metro Manila", time: "Aug 12 at 3:14 PM" },
          ].map((s, i) => (
            <div key={i} className={`flex items-center justify-between px-4 py-3.5 rounded-sm border ${s.current ? "border-[var(--color-navy)]/30 bg-[var(--color-navy-surface)]" : "border-[var(--color-border)]"}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.3" strokeLinecap="round"><rect x="1" y="2" width="14" height="10" rx="1.5" /><path d="M5 14h6M8 12v2" /></svg>
                </div>
                <div>
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{s.device} {s.current && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-navy)] text-white px-1.5 py-0.5 rounded ml-1">You</span>}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{s.location} · {s.time}</p>
                </div>
              </div>
              {!s.current && (
                <button className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Revoke</button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button className="text-sm text-[var(--color-red)] hover:underline cursor-pointer">Sign out of all other sessions</button>
        </div>
      </SectionCard>

      <SectionCard title="Login activity" subtitle="Recent account access events.">
        <div className="space-y-2">
          {[
            { event: "Sign in", device: "Chrome on macOS", location: "Makati", time: "Aug 15, 2:30 PM", ok: true },
            { event: "Password changed", device: "Mobile", location: "Makati", time: "Aug 10, 9:00 AM", ok: true },
            { event: "Sign in", device: "Safari on iPhone", location: "Makati", time: "Aug 8, 7:45 PM", ok: true },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--color-border-subtle)] last:border-0">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.ok ? "bg-[var(--color-green)]" : "bg-[var(--color-red)]"}`} />
              <span className="text-sm text-[var(--color-ink)] flex-1">{e.event} · {e.device} · {e.location}</span>
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{e.time}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default function SellerSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("account");

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "account",       label: "Account" },
    { id: "payouts",       label: "Payouts" },
    { id: "notifications", label: "Notifications" },
    { id: "security",      label: "Security" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Settings</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Manage your account, payouts, and security preferences</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px cursor-pointer transition-colors ${tab === t.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account"       && <AccountTab />}
      {tab === "payouts"       && <PayoutsTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "security"      && <SecurityTab />}
    </div>
  );
}
