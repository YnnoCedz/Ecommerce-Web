import { useState } from "react";

type Tab = "general" | "marketplace" | "notifications" | "moderation" | "security" | "integrations";

const TABS: { id: Tab; label: string }[] = [
  { id: "general",       label: "General" },
  { id: "marketplace",   label: "Marketplace" },
  { id: "notifications", label: "Notifications" },
  { id: "moderation",    label: "Moderation" },
  { id: "security",      label: "Security" },
  { id: "integrations",  label: "Integrations" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${checked ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`} style={{ minWidth: 40, height: 22 }}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--color-border-subtle)]">
      <div>
        <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
        {sub && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{sub}</p>}
      </div>
      <div className="ml-6 shrink-0">{children}</div>
    </div>
  );
}

const INPUT = "px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)] w-64";

function GeneralTab() {
  const [platform, setPlatform] = useState("Marketplace OS");
  const [tagline, setTagline] = useState("Philippines' freshest marketplace.");
  const [email, setEmail] = useState("support@marketplace-os.ph");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [currency, setCurrency] = useState("PHP");
  const [locale, setLocale] = useState("en-PH");
  return (
    <div className="space-y-0">
      <Row label="Platform name" sub="Shown in emails, browser tab, and notifications">
        <input value={platform} onChange={e => setPlatform(e.target.value)} className={INPUT} />
      </Row>
      <Row label="Tagline" sub="Short descriptor shown on the public homepage">
        <input value={tagline} onChange={e => setTagline(e.target.value)} className={INPUT} />
      </Row>
      <Row label="Support email" sub="Displayed on receipts and help pages">
        <input value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />
      </Row>
      <Row label="Default timezone" sub="Used for reports and scheduled actions">
        <select value={timezone} onChange={e => setTimezone(e.target.value)} className={INPUT + " cursor-pointer"}>
          <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
          <option value="UTC">UTC</option>
        </select>
      </Row>
      <Row label="Default currency" sub="All prices shown in this currency">
        <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT + " cursor-pointer"}>
          <option value="PHP">PHP — Philippine Peso</option>
          <option value="USD">USD — US Dollar</option>
        </select>
      </Row>
      <Row label="Locale" sub="Affects number and date formatting">
        <select value={locale} onChange={e => setLocale(e.target.value)} className={INPUT + " cursor-pointer"}>
          <option value="en-PH">en-PH</option>
          <option value="en-US">en-US</option>
        </select>
      </Row>
      <div className="pt-5">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)]">Save general settings</button>
      </div>
    </div>
  );
}

function MarketplaceTab() {
  const [commissionRate, setCommissionRate] = useState("8");
  const [minOrder, setMinOrder] = useState("50");
  const [maxSkusPerSeller, setMaxSkusPerSeller] = useState("500");
  const [requireVerification, setRequireVerification] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [buyerReview, setBuyerReview] = useState(true);
  const [guestCheckout, setGuestCheckout] = useState(false);
  return (
    <div className="space-y-0">
      <Row label="Platform commission (%)" sub="Applied to each transaction as platform fee">
        <input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className={INPUT} min={0} max={50} />
      </Row>
      <Row label="Minimum order value (₱)" sub="Buyers cannot checkout below this amount">
        <input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className={INPUT} />
      </Row>
      <Row label="Max SKUs per seller" sub="Hard cap on active listings per seller account">
        <input type="number" value={maxSkusPerSeller} onChange={e => setMaxSkusPerSeller(e.target.value)} className={INPUT} />
      </Row>
      <Row label="Require seller verification" sub="New sellers must submit ID and business docs before listing">
        <Toggle checked={requireVerification} onChange={setRequireVerification} />
      </Row>
      <Row label="Auto-approve seller applications" sub="Skip manual review for sellers with a verified ID">
        <Toggle checked={autoApprove} onChange={setAutoApprove} />
      </Row>
      <Row label="Buyer reviews enabled" sub="Allow buyers to leave product and seller reviews">
        <Toggle checked={buyerReview} onChange={setBuyerReview} />
      </Row>
      <Row label="Guest checkout" sub="Allow purchases without an account (no order history)">
        <Toggle checked={guestCheckout} onChange={setGuestCheckout} />
      </Row>
      <Row label="Maintenance mode" sub="Takes the storefront offline for all non-admin users">
        <div className="flex items-center gap-3">
          {maintenanceMode && <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-red)] bg-[var(--color-red-light)] px-2 py-0.5 rounded">ACTIVE</span>}
          <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
        </div>
      </Row>
      <div className="pt-5">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)]">Save marketplace settings</button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const EVENTS = [
    { key: "seller_apply", label: "Seller application received", email: true, push: true },
    { key: "new_report",   label: "New user report filed",       email: true, push: true },
    { key: "critical_rep", label: "Critical severity report",    email: true, push: true },
    { key: "order_dispute",label: "Order dispute opened",        email: true, push: false },
    { key: "high_chargeback", label: "Chargeback rate threshold exceeded", email: true, push: true },
    { key: "low_stock_cat",label: "Category inventory alert",    email: false, push: false },
    { key: "new_admin",    label: "New admin account created",   email: true, push: true },
    { key: "payout_req",   label: "Payout request pending",      email: true, push: false },
  ];
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; push: boolean }>>(
    Object.fromEntries(EVENTS.map(e => [e.key, { email: e.email, push: e.push }]))
  );
  return (
    <div>
      <div className="mb-4 p-3 bg-[var(--color-navy-surface)] border border-[var(--color-navy)]/15 rounded-sm">
        <p className="text-xs text-[var(--color-navy)]">Admin notifications are sent to all users with the Admin role. Use role-based notification groups in Security settings to customize per-admin.</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] pb-3">Event</th>
            <th className="text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] pb-3 w-20">Email</th>
            <th className="text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] pb-3 w-20">Push</th>
          </tr>
        </thead>
        <tbody>
          {EVENTS.map(e => (
            <tr key={e.key} className="border-b border-[var(--color-border-subtle)]">
              <td className="py-3.5 text-sm text-[var(--color-ink)]">{e.label}</td>
              <td className="py-3.5 text-center"><Toggle checked={prefs[e.key].email} onChange={v => setPrefs(p => ({ ...p, [e.key]: { ...p[e.key], email: v } }))} /></td>
              <td className="py-3.5 text-center"><Toggle checked={prefs[e.key].push} onChange={v => setPrefs(p => ({ ...p, [e.key]: { ...p[e.key], push: v } }))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pt-5">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)]">Save notification settings</button>
      </div>
    </div>
  );
}

function ModerationTab() {
  const [autoFlagKeywords, setAutoFlagKeywords] = useState("scam, fake, counterfeit, copy, replica, knockoff");
  const [reviewThreshold, setReviewThreshold] = useState("3");
  const [autoSuspendAt, setAutoSuspendAt] = useState("5");
  const [requireEvidence, setRequireEvidence] = useState(false);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [appealWindow, setAppealWindow] = useState("14");
  return (
    <div className="space-y-0">
      <Row label="Auto-flag keywords" sub="Products containing these terms are flagged for review automatically">
        <textarea value={autoFlagKeywords} onChange={e => setAutoFlagKeywords(e.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)] w-64 h-16 resize-none" />
      </Row>
      <Row label="Reports before auto-review" sub="Number of reports on the same target that triggers auto-review">
        <input type="number" value={reviewThreshold} onChange={e => setReviewThreshold(e.target.value)} className={INPUT} min={1} />
      </Row>
      <Row label="Confirmed reports to auto-suspend seller" sub="Resolved fraud/counterfeit reports triggering an automatic suspension">
        <input type="number" value={autoSuspendAt} onChange={e => setAutoSuspendAt(e.target.value)} className={INPUT} min={1} />
      </Row>
      <Row label="Require evidence for reports" sub="Prevent report submission without at least one attached file">
        <Toggle checked={requireEvidence} onChange={setRequireEvidence} />
      </Row>
      <Row label="Auto-escalate critical reports" sub="Critical severity reports are immediately assigned to senior moderation">
        <Toggle checked={autoEscalate} onChange={setAutoEscalate} />
      </Row>
      <Row label="Seller appeal window (days)" sub="Time sellers have to appeal a moderation decision after it's made">
        <input type="number" value={appealWindow} onChange={e => setAppealWindow(e.target.value)} className={INPUT} min={1} max={90} />
      </Row>
      <div className="pt-5">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)]">Save moderation settings</button>
      </div>
    </div>
  );
}

const SESSIONS = [
  { id: "s1", device: "Chrome on macOS", location: "Manila, PH", lastActive: "Active now", current: true },
  { id: "s2", device: "Firefox on Windows", location: "Quezon City, PH", lastActive: "3h ago", current: false },
  { id: "s3", device: "Safari on iPhone", location: "Manila, PH", lastActive: "1d ago", current: false },
];

function SecurityTab() {
  const [twoFa, setTwoFa] = useState(true);
  const [ipRestrict, setIpRestrict] = useState(false);
  const [allowedIps, setAllowedIps] = useState("203.177.64.0/22");
  const [sessionTimeout, setSessionTimeout] = useState("480");
  const [sessions, setSessions] = useState(SESSIONS);
  return (
    <div className="space-y-0">
      <Row label="Two-factor authentication" sub="Required for all admin accounts">
        <Toggle checked={twoFa} onChange={setTwoFa} />
      </Row>
      <Row label="Session timeout (minutes)" sub="Admins are automatically logged out after inactivity">
        <input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} className={INPUT} min={15} max={1440} />
      </Row>
      <Row label="IP allowlist" sub="Restrict admin panel access to specific IP ranges">
        <Toggle checked={ipRestrict} onChange={setIpRestrict} />
      </Row>
      {ipRestrict && (
        <Row label="Allowed IP ranges" sub="Comma-separated CIDR notation">
          <textarea value={allowedIps} onChange={e => setAllowedIps(e.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)] w-64 h-16 resize-none font-[var(--font-mono)] text-xs" />
        </Row>
      )}

      <div className="pt-6 pb-2">
        <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Active admin sessions</p>
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-sm border border-[var(--color-border)]">
              <div>
                <p className="text-xs font-[500] text-[var(--color-ink)]">{s.device} {s.current && <span className="ml-2 font-[var(--font-mono)] text-[8px] text-[var(--color-green)] bg-[var(--color-green-light)] px-1.5 py-0.5 rounded">current</span>}</p>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{s.location} · {s.lastActive}</p>
              </div>
              {!s.current && (
                <button onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))} className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="pt-5">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)]">Save security settings</button>
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  { name: "Stripe Payments", desc: "Credit / debit card processing", status: "connected", icon: "💳" },
  { name: "GCash",           desc: "Philippine e-wallet gateway",  status: "connected", icon: "📱" },
  { name: "Maya",            desc: "Philippine e-wallet gateway",  status: "disconnected", icon: "💜" },
  { name: "J&T Express",     desc: "Logistics & delivery partner", status: "connected", icon: "🚚" },
  { name: "Grab Express",    desc: "Same-day delivery partner",    status: "connected", icon: "🟢" },
  { name: "LBC Express",     desc: "Nationwide courier partner",   status: "disconnected", icon: "🟥" },
  { name: "Sendgrid",        desc: "Transactional email delivery", status: "connected", icon: "✉️" },
  { name: "Firebase FCM",    desc: "Push notification delivery",   status: "connected", icon: "🔔" },
];

function IntegrationsTab() {
  const [items, setItems] = useState(INTEGRATIONS);
  return (
    <div className="space-y-2">
      {items.map(it => (
        <div key={it.name} className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-sm bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xl">{it.icon}</span>
            <div>
              <p className="text-sm font-[500] text-[var(--color-ink)]">{it.name}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{it.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-[var(--font-mono)] text-[9px] px-2 py-1 rounded ${it.status === "connected" ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-surface)] text-[var(--color-ink-muted)] border border-[var(--color-border)]"}`}>{it.status === "connected" ? "Connected" : "Disconnected"}</span>
            <button onClick={() => setItems(prev => prev.map(x => x.name === it.name ? { ...x, status: x.status === "connected" ? "disconnected" : "connected" } : x))} className={`px-3 py-1.5 text-xs rounded-sm cursor-pointer border ${it.status === "connected" ? "border-[var(--color-red)]/30 text-[var(--color-red)] hover:bg-[var(--color-red-light)]" : "border-[var(--color-navy)]/30 text-[var(--color-navy)] hover:bg-[var(--color-navy-surface)]"}`}>{it.status === "connected" ? "Disconnect" : "Connect"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Platform settings</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Configure global platform behavior, marketplace rules, and integrations</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)] pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm rounded-t-sm cursor-pointer border-b-2 transition-colors -mb-px ${tab === t.id ? "border-[var(--color-navy)] text-[var(--color-navy)] font-[500]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{t.label}</button>
        ))}
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm p-6">
        {tab === "general"       && <GeneralTab />}
        {tab === "marketplace"   && <MarketplaceTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "moderation"    && <ModerationTab />}
        {tab === "security"      && <SecurityTab />}
        {tab === "integrations"  && <IntegrationsTab />}
      </div>
    </div>
  );
}
