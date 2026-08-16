import { useState } from "react";
import PublicShell from "../../shells/PublicShell";
import AdminShell from "../../shells/AdminShell";

// ── Shared error layout ───────────────────────────────────────
function ErrorPage({
  code, icon, severity = "error", heading, body, actions, detail, shell,
}: {
  code?: string;
  icon: React.ReactNode;
  severity?: "error" | "warning" | "info";
  heading: string;
  body: string;
  actions?: Array<{ label: string; primary?: boolean }>;
  detail?: string;
  shell?: "public" | "admin" | "none";
}) {
  const colors = {
    error:   { badge: "bg-[var(--color-red-light)] text-[var(--color-red)]",  border: "border-[var(--color-red)]/20" },
    warning: { badge: "bg-[var(--color-amber-light)] text-[var(--color-amber)]", border: "border-[var(--color-amber)]/20" },
    info:    { badge: "bg-[var(--color-navy-surface)] text-[var(--color-navy)]", border: "border-[var(--color-navy)]/15" },
  };
  const c = colors[severity];

  const content = (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-16 bg-[var(--color-ground)]">
      <div className={`max-w-md w-full bg-white border ${c.border} rounded-sm shadow-sm p-10 flex flex-col items-center text-center`}>
        <div className="mb-5">{icon}</div>
        {code && (
          <span className={`font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded mb-4 ${c.badge}`}>{code}</span>
        )}
        <h1 className="font-[var(--font-display)] text-[1.5rem] font-[400] text-[var(--color-ink)] mb-3 leading-tight">{heading}</h1>
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">{body}</p>
        {detail && (
          <div className="w-full mb-6 p-3 bg-[var(--color-surface)] rounded-sm text-left">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{detail}</p>
          </div>
        )}
        {actions && (
          <div className="flex flex-col gap-2.5 w-full">
            {actions.map(a => (
              <button key={a.label} className={`w-full py-2.5 text-sm font-[500] rounded-sm cursor-pointer ${a.primary ? "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]" : "border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (shell === "public") return <PublicShell isLoggedIn>{content}</PublicShell>;
  if (shell === "admin") return <AdminShell>{content}</AdminShell>;
  return content;
}

// ── Network error ─────────────────────────────────────────────
const WifiIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <path d="M8 24c13-13 35-13 48 0" stroke="var(--color-ink-disabled)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 32c9-9 23-9 32 0" stroke="var(--color-ink-disabled)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 40c5-5 11-5 16 0" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="32" cy="50" r="3" fill="var(--color-red)"/>
    <path d="M24 14l16 16M40 14L24 30" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function NetworkError() {
  const [retrying, setRetrying] = useState(false);
  return (
    <PublicShell isLoggedIn>
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-md w-full bg-white border border-[var(--color-red)]/20 rounded-sm shadow-sm p-10 flex flex-col items-center text-center">
          <WifiIcon />
          <span className="font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded mb-4 mt-5 bg-[var(--color-red-light)] text-[var(--color-red)]">ERR_NETWORK</span>
          <h1 className="font-[var(--font-display)] text-[1.5rem] font-[400] text-[var(--color-ink)] mb-3">No internet connection</h1>
          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">Check your Wi-Fi or mobile data. Your cart and session are saved — everything will reload once you're back online.</p>
          <button
            onClick={() => { setRetrying(true); setTimeout(() => setRetrying(false), 2000); }}
            className="w-full py-2.5 text-sm font-[500] rounded-sm cursor-pointer bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)] mb-2.5"
          >
            {retrying ? "Retrying…" : "Try again"}
          </button>
          <button className="w-full py-2.5 text-sm rounded-sm cursor-pointer border border-[var(--color-border)] text-[var(--color-ink-muted)]">View cached content</button>
        </div>
      </div>
    </PublicShell>
  );
}

// ── API error ─────────────────────────────────────────────────
const ServerIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="8" y="10" width="48" height="14" rx="2" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <rect x="8" y="28" width="48" height="14" rx="2" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <rect x="8" y="46" width="48" height="10" rx="2" stroke="var(--color-red)" strokeWidth="1.5"/>
    <circle cx="50" cy="17" r="3" fill="var(--color-green)"/>
    <circle cx="50" cy="35" r="3" fill="var(--color-amber)"/>
    <circle cx="50" cy="51" r="3" fill="var(--color-red)"/>
    <path d="M16 17h24M16 35h18" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 51h16" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

export function ApiError() {
  return (
    <AdminShell activeNav="dashboard">
      <div className="p-6 max-w-screen-xl mx-auto">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">Dashboard</h1>
        {/* Inline API error banner */}
        <div className="bg-[var(--color-red-light)] border border-[var(--color-red)]/25 rounded-sm p-4 mb-6 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5"><circle cx="9" cy="9" r="8" stroke="var(--color-red)" strokeWidth="1.5"/><path d="M9 5v5M9 12.5v.5" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <div className="flex-1">
            <p className="text-sm font-[500] text-[var(--color-red)]">Failed to load dashboard data</p>
            <p className="text-xs text-[var(--color-red)]/80 mt-0.5">The analytics service returned an error (503 Service Unavailable). Displaying last cached data from 2h ago.</p>
          </div>
          <button className="text-xs text-[var(--color-red)] hover:underline cursor-pointer shrink-0">Retry</button>
        </div>
        {/* Stale data notice on KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[["GMV","₱8.4M","30d"],["Orders","24,810","30d"],["Users","1,840","30d"],["Sessions","91,200","30d"]].map(([label, val, sub]) => (
            <div key={label} className="bg-white border border-[var(--color-border)] rounded-sm p-4 relative opacity-70">
              <div className="absolute top-2 right-2">
                <span className="font-[var(--font-mono)] text-[8px] text-[var(--color-amber)] bg-[var(--color-amber-light)] px-1.5 py-0.5 rounded">CACHED</span>
              </div>
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">{label}</p>
              <p className="font-[var(--font-display)] text-2xl font-[600] text-[var(--color-ink)]">{val}</p>
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{sub} · stale 2h</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-10 flex flex-col items-center text-center">
          <ServerIcon />
          <p className="text-sm text-[var(--color-ink-muted)] mt-4">Chart data unavailable. The analytics service is recovering.</p>
          <button className="mt-4 px-4 py-2 text-xs text-[var(--color-navy)] border border-[var(--color-navy)]/30 rounded-sm cursor-pointer">Retry now</button>
        </div>
      </div>
    </AdminShell>
  );
}

// ── Validation error ──────────────────────────────────────────
export function ValidationError() {
  const [submitted, setSubmitted] = useState(false);
  const fields = [
    { label: "Full name", value: "", error: "Name is required" },
    { label: "Email address", value: "not-an-email", error: "Enter a valid email address" },
    { label: "Phone number", value: "123", error: "Phone number must be 11 digits (e.g. 09xxxxxxxxx)" },
    { label: "Password", value: "abc", error: "Password must be at least 8 characters with one number" },
    { label: "Confirm password", value: "xyz", error: "Passwords do not match" },
  ];
  return (
    <PublicShell>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-10">
        <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-sm shadow-sm p-8">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-1">Create account</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mb-6">Fix the errors below to continue.</p>
          {/* Form error summary */}
          <div className="bg-[var(--color-red-light)] border border-[var(--color-red)]/25 rounded-sm p-3 mb-5 flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="var(--color-red)" strokeWidth="1.5"/><path d="M7 4v3.5M7 9.5v.5" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <p className="text-xs text-[var(--color-red)]">5 fields need your attention before you can continue.</p>
          </div>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); setSubmitted(true); }}>
            {fields.map(f => (
              <div key={f.label}>
                <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">{f.label}</label>
                <input
                  defaultValue={f.value}
                  className="w-full px-3 py-2.5 border border-[var(--color-red)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none bg-[var(--color-red-light)]/30"
                  placeholder={f.label}
                />
                <p className="text-xs text-[var(--color-red)] mt-1 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" stroke="var(--color-red)"/><path d="M5 3v2.5" stroke="var(--color-red)" strokeLinecap="round"/><circle cx="5" cy="7" r=".5" fill="var(--color-red)"/></svg>
                  {f.error}
                </p>
              </div>
            ))}
            <button type="submit" className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer mt-2">
              {submitted ? "Checking…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Permission denied ─────────────────────────────────────────
const LockIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="14" y="28" width="36" height="28" rx="3" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <path d="M22 28V20a10 10 0 0120 0v8" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <circle cx="32" cy="42" r="4" stroke="var(--color-red)" strokeWidth="1.5"/>
    <path d="M32 46v4" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export function PermissionDenied() {
  return (
    <ErrorPage
      code="403 FORBIDDEN"
      icon={<LockIcon />}
      severity="error"
      heading="You don't have access to this page"
      body="This area is restricted to administrators. If you believe this is an error, contact your account manager or request elevated permissions."
      detail="Required role: Admin / path: /admin/settings/security"
      actions={[
        { label: "Go to my dashboard", primary: true },
        { label: "Request admin access" },
        { label: "Contact support" },
      ]}
      shell="public"
    />
  );
}

// ── 404 not found ─────────────────────────────────────────────
const NotFoundIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="10" y="8" width="44" height="52" rx="3" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <path d="M18 20h28M18 28h20M18 36h14" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="42" cy="44" r="12" fill="var(--color-ground)" stroke="var(--color-amber)" strokeWidth="1.5"/>
    <path d="M38 40l8 8M46 40l-8 8" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export function NotFound() {
  return (
    <ErrorPage
      code="404 NOT FOUND"
      icon={<NotFoundIcon />}
      severity="warning"
      heading="This page doesn't exist"
      body="The link may have expired or the product was removed. Try searching for what you need, or browse our categories."
      actions={[
        { label: "Go to homepage", primary: true },
        { label: "Search the marketplace" },
      ]}
      shell="public"
    />
  );
}

// ── Checkout error ────────────────────────────────────────────
const CartXIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <path d="M8 8h8l8 32h28l6-20H24" stroke="var(--color-ink-disabled)" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="30" cy="52" r="3" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <circle cx="46" cy="52" r="3" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <path d="M36 16l8 8m0-8l-8 8" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function CheckoutError() {
  return (
    <PublicShell isLoggedIn cartCount={3}>
      <div className="max-w-screen-lg mx-auto px-6 py-8">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">Checkout</h1>
        {/* Error banner */}
        <div className="bg-[var(--color-red-light)] border border-[var(--color-red)]/25 rounded-sm p-4 mb-6 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5"><circle cx="9" cy="9" r="8" stroke="var(--color-red)" strokeWidth="1.5"/><path d="M9 5v5M9 12.5v.5" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <div>
            <p className="text-sm font-[500] text-[var(--color-red)]">We couldn't complete your checkout</p>
            <p className="text-xs text-[var(--color-red)]/80 mt-0.5">1 item in your cart is no longer available. Please remove it to continue.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Cart items with error state */}
          <div className="lg:col-span-3 space-y-4">
            {/* Problem item */}
            <div className="bg-white border border-[var(--color-red)]/30 rounded-sm p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0 relative">
                <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=64&h=64&fit=crop&auto=format" alt="product" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-[var(--font-mono)] text-[var(--color-red)]">×</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-[500] text-[var(--color-ink)] line-through opacity-50">Premium Vitamin C Serum 50ml</p>
                <p className="text-xs text-[var(--color-red)] mt-0.5">This item is no longer available</p>
              </div>
              <button className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Remove</button>
            </div>
            {/* Normal items */}
            {[
              { name: "Hydrating Face Toner 150ml", price: "₱485", img: "photo-1596462502278-27bfdc403348" },
              { name: "Nourishing Night Cream 30g", price: "₱920", img: "photo-1570194065650-d99fb4bedf0a" },
            ].map(item => (
              <div key={item.name} className="bg-white border border-[var(--color-border)] rounded-sm p-4 flex items-center gap-4">
                <img src={`https://images.unsplash.com/${item.img}?w=64&h=64&fit=crop&auto=format`} alt={item.name} className="w-16 h-16 object-cover rounded-sm shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{item.name}</p>
                  <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="font-[600] text-[var(--color-ink)] text-sm mb-4">Order summary</p>
              <div className="space-y-2 text-sm border-b border-[var(--color-border-subtle)] pb-4 mb-4">
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Subtotal</span><span className="text-[var(--color-ink-muted)] line-through">₱2,155</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Available items</span><span>₱1,405</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Delivery</span><span>₱80</span></div>
              </div>
              <div className="flex justify-between font-[600] text-base mb-5">
                <span>Total</span><span>₱1,485</span>
              </div>
              <button className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">Remove item & continue</button>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Payment error ─────────────────────────────────────────────
const CardXIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="8" y="16" width="48" height="32" rx="4" stroke="var(--color-ink-disabled)" strokeWidth="1.5"/>
    <line x1="8" y1="26" x2="56" y2="26" stroke="var(--color-border)" strokeWidth="2"/>
    <rect x="14" y="32" width="12" height="8" rx="1" stroke="var(--color-border)" strokeWidth="1.2"/>
    <path d="M38 30l8 8m0-8l-8 8" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function PaymentError() {
  const [method, setMethod] = useState<"retry" | "change">("retry");
  return (
    <PublicShell isLoggedIn cartCount={3}>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-10">
        <div className="max-w-md w-full">
          <div className="bg-white border border-[var(--color-red)]/25 rounded-sm shadow-sm p-8 flex flex-col items-center text-center mb-4">
            <CardXIcon />
            <span className="font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded mb-4 mt-5 bg-[var(--color-red-light)] text-[var(--color-red)]">PAYMENT_DECLINED</span>
            <h1 className="font-[var(--font-display)] text-[1.4rem] font-[400] text-[var(--color-ink)] mb-3">Payment was declined</h1>
            <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-2">Your card ending in 4242 was declined by the issuing bank. Your order has not been placed and no charge was made.</p>
            <p className="text-xs text-[var(--color-ink-disabled)] mb-6">Common reasons: insufficient funds, card limit reached, or card blocked for online transactions.</p>
            <div className="flex gap-2 w-full mb-4">
              <button onClick={() => setMethod("retry")} className={`flex-1 py-2 text-sm rounded-sm border cursor-pointer ${method === "retry" ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "border-[var(--color-border)] text-[var(--color-ink-muted)]"}`}>Retry same card</button>
              <button onClick={() => setMethod("change")} className={`flex-1 py-2 text-sm rounded-sm border cursor-pointer ${method === "change" ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "border-[var(--color-border)] text-[var(--color-ink-muted)]"}`}>Use different method</button>
            </div>
            {method === "change" && (
              <div className="w-full space-y-2 mb-4">
                {["GCash","Maya","Cash on Delivery"].map(m => (
                  <button key={m} className="w-full py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] hover:border-[var(--color-navy)] cursor-pointer text-left px-3">{m}</button>
                ))}
              </div>
            )}
            <button className="w-full py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">
              {method === "retry" ? "Retry payment" : "Continue with selected method"}
            </button>
          </div>
          <p className="text-center text-xs text-[var(--color-ink-muted)]">Your cart is saved. Contact your bank if the issue persists.</p>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Session expired ───────────────────────────────────────────
export function SessionExpired() {
  const [pwd, setPwd] = useState("");
  return (
    <div className="h-screen flex flex-col">
      {/* Blurred background - simulates the page behind */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--color-ground)] filter blur-sm opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Page content blurred behind */}
          <div className="w-full max-w-screen-xl px-6 py-8 opacity-30 pointer-events-none">
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="bg-white border border-[var(--color-border)] rounded-sm h-32" />)}
            </div>
          </div>
        </div>
        {/* Modal overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-6">
          <div className="bg-white rounded-sm shadow-2xl max-w-sm w-full p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[var(--color-amber-light)] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="var(--color-amber)" strokeWidth="1.5"/><path d="M10 5v6" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="14.5" r=".75" fill="var(--color-amber)"/></svg>
              </div>
              <div>
                <p className="text-sm font-[600] text-[var(--color-ink)]">Your session has expired</p>
                <p className="text-xs text-[var(--color-ink-muted)]">For your security, please sign in again.</p>
              </div>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-4">You were inactive for 30 minutes. All your progress is saved.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Password</label>
                <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Enter your password" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm focus:outline-none focus:border-[var(--color-navy)]" />
              </div>
            </div>
            <button className="w-full py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer mb-2">Sign in and continue</button>
            <button className="w-full py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">Sign in as different user</button>
          </div>
        </div>
      </div>
    </div>
  );
}
