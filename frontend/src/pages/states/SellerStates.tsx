import { useNavigate } from "react-router";
import SellerShell from "../../shells/SellerShell";

// ── Application pending ───────────────────────────────────────
export function ApplicationPending() {
  const navigate = useNavigate();
  const steps = [
    { label: "Application submitted", done: true, date: "Aug 10, 2026" },
    { label: "Document verification", done: true, date: "Aug 11, 2026" },
    { label: "Background review", done: false, date: "In progress" },
    { label: "Account activation", done: false, date: "—" },
  ];
  return (
    <div className="min-h-screen bg-[var(--color-ground)] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--color-amber-light)] flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="var(--color-amber)" strokeWidth="1.5"/><path d="M14 8v7l4 2" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">Application under review</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Reference: <span className="font-[var(--font-mono)] text-[var(--color-ink)]">APP-20260810-4821</span></p>
        </div>

        {/* Status timeline */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-4">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-5">Application progress</p>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step.done ? "bg-[var(--color-green)] border-[var(--color-green)]" : i === steps.findIndex(s => !s.done) ? "border-[var(--color-amber)] bg-[var(--color-amber-light)]" : "border-[var(--color-border)] bg-white"}`}>
                    {step.done
                      ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : i === steps.findIndex(s => !s.done)
                        ? <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-amber)] animate-pulse" />
                        : <div className="w-2 h-2 rounded-full bg-[var(--color-border)]" />
                    }
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-8 mt-0.5 ${step.done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />
                  )}
                </div>
                <div className="pb-8 flex-1">
                  <p className={`text-sm font-[500] ${step.done ? "text-[var(--color-ink)]" : i === steps.findIndex(s => !s.done) ? "text-[var(--color-amber)]" : "text-[var(--color-ink-disabled)]"}`}>{step.label}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] rounded-sm p-3 mt-2">
            <p className="text-xs text-[var(--color-amber)]"><strong>Typical review time:</strong> 3–5 business days. We'll email you at mariasantos@email.com when your account is activated.</p>
          </div>
        </div>
        <div className="text-center">
          <button onClick={() => navigate("/seller-center/onboarding")} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline cursor-pointer">Update submitted information</button>
        </div>
      </div>
    </div>
  );
}

// ── Application approved ──────────────────────────────────────
export function ApplicationApproved() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--color-ground)] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--color-green-light)] flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="16" stroke="var(--color-green)" strokeWidth="1.5"/><path d="M10 18l6 6 10-10" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 className="font-[var(--font-display)] text-3xl font-[400] text-[var(--color-ink)] mb-3">Welcome to the marketplace!</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mb-8">Your seller account for <strong>GlowLab PH</strong> has been approved. You can now list products and start selling.</p>

        {/* Quickstart */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-6 text-left">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Next steps</p>
          <div className="space-y-3">
            {[
              { num: 1, label: "Complete your store profile", sub: "Add logo, banner, and description", done: false },
              { num: 2, label: "Add your first product", sub: "Photos, pricing, and inventory", done: false },
              { num: 3, label: "Set up payouts", sub: "Bank account or e-wallet", done: false },
              { num: 4, label: "Review shipping settings", sub: "Couriers and delivery zones", done: false },
            ].map(s => (
              <div key={s.num} className="flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-sm hover:border-[var(--color-navy)]/30 transition-colors cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-[var(--color-navy)] text-white text-xs flex items-center justify-center font-[500] shrink-0">{s.num}</div>
                <div className="flex-1">
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{s.label}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{s.sub}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5"><path d="M5 3l4 4-4 4"/></svg>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => navigate("/seller-center")} className="px-8 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)]">Go to my seller dashboard</button>
      </div>
    </div>
  );
}

// ── Application rejected ──────────────────────────────────────
export function ApplicationRejected() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--color-ground)] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--color-red-light)] flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="var(--color-red)" strokeWidth="1.5"/><path d="M9 9l10 10M19 9L9 19" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">Application not approved</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Reference: <span className="font-[var(--font-mono)] text-[var(--color-ink)]">APP-20260808-3190</span></p>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-4">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Reason for rejection</p>
          <div className="space-y-3">
            {[
              { reason: "Incomplete documentation", detail: "The government-issued ID provided was expired. Please resubmit with a valid, unexpired ID (passport, driver's license, or national ID)." },
              { reason: "Business registration mismatch", detail: "The business name on the DTI/SEC certificate does not match the store name submitted. Ensure all documents reference the same legal entity." },
            ].map(r => (
              <div key={r.reason} className="p-3 bg-[var(--color-red-light)]/50 border border-[var(--color-red)]/15 rounded-sm">
                <p className="text-xs font-[600] text-[var(--color-red)] mb-1">{r.reason}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{r.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-sm">
            <p className="text-xs text-[var(--color-navy)]">You may reapply after correcting the issues above. Reapplication is available from <strong>Aug 22, 2026</strong> (14-day waiting period).</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate("/seller-center/onboarding")} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">Prepare reapplication</button>
          <button onClick={() => window.location.href = "mailto:seller-support@marketo.ph?subject=Seller%20application%20support"} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Contact support</button>
        </div>
      </div>
    </div>
  );
}

// ── Store inactive ────────────────────────────────────────────
export function StoreInactive() {
  const navigate = useNavigate();
  return (
    <SellerShell activeNav="dashboard" storeName="GlowLab PH" storeInitials="GL" storeCategory="Beauty">
      <div>
        {/* Prominent banner */}
        <div className="bg-[var(--color-amber)] text-white px-6 py-3 flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="white" strokeWidth="1.5"/><path d="M9 5v5M9 12.5v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <p className="text-sm font-[500]">Your store is currently inactive — customers cannot see your listings.</p>
          <button onClick={() => navigate("/seller-center/settings")} className="ml-auto px-3 py-1 bg-white text-[var(--color-amber)] text-xs font-[600] rounded cursor-pointer shrink-0">Activate store</button>
        </div>
        <div className="p-6 max-w-screen-xl mx-auto">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">Dashboard</h1>
          {/* Inactive state notice */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-amber-light)] flex items-center justify-center shrink-0">
                <span className="text-lg">🏪</span>
              </div>
              <div>
                <p className="text-sm font-[600] text-[var(--color-ink)] mb-1">Store is inactive</p>
                <p className="text-sm text-[var(--color-ink-muted)] mb-3">Your store was deactivated on Aug 12, 2026. Existing orders are still being processed, but new orders cannot be placed. Your listings are hidden from search and category pages.</p>
                <div className="flex gap-2">
                  <button onClick={() => navigate("/seller-center/settings")} className="px-4 py-2 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm cursor-pointer">Reactivate store</button>
                  <button onClick={() => navigate("/seller-center/orders")} className="px-4 py-2 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Check active orders</button>
                </div>
              </div>
            </div>
          </div>
          {/* Dimmed KPI strip */}
          <div className="grid grid-cols-4 gap-4 opacity-40 pointer-events-none select-none">
            {[["Revenue","₱0","This month"],["Orders","0","Active"],["Products","0 visible","12 total"],["Rating","4.8","All time"]].map(([l,v,s]) => (
              <div key={l} className="bg-white border border-[var(--color-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">{l}</p>
                <p className="font-[var(--font-display)] text-2xl font-[600] text-[var(--color-ink)]">{v}</p>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SellerShell>
  );
}

// ── Product pending review ─────────────────────────────────────
export function ProductPendingReview() {
  const navigate = useNavigate();
  return (
    <SellerShell activeNav="products" storeName="GlowLab PH" storeInitials="GL" storeCategory="Beauty">
      <div className="p-6 max-w-screen-xl mx-auto">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">Products</h1>
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          {/* Product row */}
          <div className="px-5 py-4 flex items-center gap-4 border-b border-[var(--color-border)]">
            <input type="checkbox" className="rounded" readOnly />
            <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=56&h=56&fit=crop&auto=format" alt="product" className="w-14 h-14 object-cover rounded-sm border border-[var(--color-border)]" />
            <div className="flex-1">
              <p className="text-sm font-[500] text-[var(--color-ink)]">Premium Whitening Serum with Niacinamide 50ml</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">SKU: GLB-WS-001 · Beauty / Skincare</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-[500] text-[var(--color-ink)]">₱580</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Stock: 240</p>
            </div>
            <span className="font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded-full bg-[var(--color-amber-light)] text-[var(--color-amber)]">Under review</span>
          </div>

          {/* Review status panel */}
          <div className="px-5 py-5 bg-[var(--color-amber-light)]/30 border-b border-[var(--color-amber-border)]">
            <div className="flex items-start gap-3 max-w-2xl">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5"><circle cx="9" cy="9" r="8" stroke="var(--color-amber)" strokeWidth="1.5"/><path d="M9 5v5M9 12.5v.5" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div>
                <p className="text-sm font-[600] text-[var(--color-amber)]">Product is under moderation review</p>
                <p className="text-sm text-[var(--color-ink-muted)] mt-1">This listing was submitted for review on Aug 14, 2026. Our team checks new products for compliance with marketplace guidelines. This typically takes 12–24 hours.</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-2"><strong>While under review:</strong> The product is not visible to buyers and cannot receive orders. You may edit the draft but changes will require a new review cycle.</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate("/seller-center/products/pending-review/edit")} className="px-3 py-1.5 border border-[var(--color-amber)]/30 text-xs text-[var(--color-amber)] rounded-sm cursor-pointer">Edit draft</button>
                  <button onClick={() => window.location.href = "mailto:seller-support@marketo.ph?subject=Product%20review%20support"} className="px-3 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Contact support</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerShell>
  );
}

// ── Product rejected ──────────────────────────────────────────
export function ProductRejected() {
  const navigate = useNavigate();
  return (
    <SellerShell activeNav="products" storeName="GlowLab PH" storeInitials="GL" storeCategory="Beauty">
      <div className="p-6 max-w-screen-xl mx-auto">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">Products</h1>
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-4 border-b border-[var(--color-border)]">
            <input type="checkbox" className="rounded" readOnly />
            <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=56&h=56&fit=crop&auto=format" alt="product" className="w-14 h-14 object-cover rounded-sm border border-[var(--color-red)]/30 opacity-70" />
            <div className="flex-1">
              <p className="text-sm font-[500] text-[var(--color-ink)]">Whitening Capsules — 30-day Supply</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">SKU: GLB-WC-004 · Beauty / Health</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-[500] text-[var(--color-ink)]">₱1,200</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Stock: 80</p>
            </div>
            <span className="font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded-full bg-[var(--color-red-light)] text-[var(--color-red)]">Rejected</span>
          </div>

          {/* Rejection panel */}
          <div className="px-5 py-5 bg-[var(--color-red-light)]/30 border-b border-[var(--color-red-border)]">
            <div className="flex items-start gap-3 max-w-2xl">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5"><circle cx="9" cy="9" r="8" stroke="var(--color-red)" strokeWidth="1.5"/><path d="M6 6l6 6M12 6l-6 6" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div className="flex-1">
                <p className="text-sm font-[600] text-[var(--color-red)]">Listing rejected — policy violation</p>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-white border border-[var(--color-red-border)] rounded-sm">
                    <p className="text-xs font-[600] text-[var(--color-ink)] mb-1">Health claims not permitted</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">The listing description contains medical-grade health claims ("clinically proven to whiten skin", "FDA-approved formula") that are prohibited without certified documentation. Remove or rephrase these claims.</p>
                  </div>
                  <div className="p-3 bg-white border border-[var(--color-red-border)] rounded-sm">
                    <p className="text-xs font-[600] text-[var(--color-ink)] mb-1">Missing required certifications</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">Health supplements require FDA Certificate of Product Registration (CPR). Upload the CPR document in the listing's compliance section.</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => navigate("/seller-center/products/rejected/edit")} className="px-4 py-2 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm cursor-pointer">Edit and resubmit</button>
                  <button onClick={() => window.location.href = "mailto:seller-support@marketo.ph?subject=Product%20appeal%20request"} className="px-3 py-2 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Appeal decision</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerShell>
  );
}

// ── Low stock warning ─────────────────────────────────────────
export function LowStockWarning() {
  const navigate = useNavigate();
  const lowStockItems = [
    { name: "Hydrating Toner 150ml", sku: "GLB-HT-002", stock: 3, threshold: 10, img: "photo-1596462502278-27bfdc403348" },
    { name: "Vitamin C Serum 30ml", sku: "GLB-VC-001", stock: 1, threshold: 5, img: "photo-1570194065650-d99fb4bedf0a" },
    { name: "Night Repair Cream 20g", sku: "GLB-NR-003", stock: 7, threshold: 10, img: "photo-1556228578-8c89e6adf883" },
  ];
  return (
    <SellerShell activeNav="inventory" storeName="GlowLab PH" storeInitials="GL" storeCategory="Beauty">
      <div>
        {/* Alert strip */}
        <div className="bg-[var(--color-red-light)] border-b border-[var(--color-red-border)] px-6 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 12H2L8 2z" stroke="var(--color-red)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 7v3" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="12.5" r=".75" fill="var(--color-red)"/></svg>
          <p className="text-sm text-[var(--color-red)] font-[500]">3 products are running low on stock — restock soon to avoid missed sales.</p>
        </div>

        <div className="p-6 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Inventory</h1>
            <div className="flex gap-2">
              <button onClick={() => navigate("/seller-center/inventory")} className="px-3 py-2 bg-[var(--color-red-light)] border border-[var(--color-red-border)] text-[var(--color-red)] text-xs font-[500] rounded-sm cursor-pointer">3 low stock</button>
              <button onClick={() => navigate("/seller-center/inventory")} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">+ Adjust stock</button>
            </div>
          </div>

          {/* Low stock items */}
          <div className="bg-white border border-[var(--color-red-border)] rounded-sm overflow-hidden mb-6">
            <div className="px-5 py-3 bg-[var(--color-red-light)]/40 border-b border-[var(--color-red-border)]">
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-red)] uppercase tracking-widest">Low stock items</p>
            </div>
            {lowStockItems.map(item => (
              <div key={item.sku} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-0">
                <img src={`https://images.unsplash.com/${item.img}?w=48&h=48&fit=crop&auto=format`} alt={item.name} className="w-12 h-12 object-cover rounded-sm border border-[var(--color-border)]" />
                <div className="flex-1">
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{item.name}</p>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{item.sku}</p>
                </div>
                <div className="text-right min-w-32">
                  <p className={`text-sm font-[600] ${item.stock <= 2 ? "text-[var(--color-red)]" : "text-[var(--color-amber)]"}`}>{item.stock} left</p>
                  <div className="w-32 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full ${item.stock <= 2 ? "bg-[var(--color-red)]" : "bg-[var(--color-amber)]"}`}
                      style={{ width: `${Math.min((item.stock / item.threshold) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] mt-0.5">threshold: {item.threshold}</p>
                </div>
                <button onClick={() => navigate("/seller-center/inventory")} className="px-3 py-1.5 border border-[var(--color-navy)]/30 text-[var(--color-navy)] text-xs rounded-sm cursor-pointer hover:bg-[var(--color-navy-surface)] shrink-0">Restock</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SellerShell>
  );
}
