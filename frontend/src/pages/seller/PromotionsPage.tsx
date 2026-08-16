import { useState } from "react";

type DiscountType = "percentage" | "fixed" | "free-shipping";
type PromoStatus = "active" | "scheduled" | "expired" | "draft";

type Discount = {
  id: string; code: string; type: DiscountType;
  value: number; minOrder?: number;
  usageCount: number; usageLimit?: number;
  startDate: string; endDate: string;
  status: PromoStatus; appliesTo: string;
};

type Campaign = {
  id: string; name: string; description: string;
  startDate: string; endDate: string; status: PromoStatus;
  productsAffected: number; discountPct: number; totalRedemptions: number;
};

const DISCOUNTS: Discount[] = [
  { id: "d01", code: "VERDE15", type: "percentage", value: 15, minOrder: 500, usageCount: 48, usageLimit: 200, startDate: "Aug 1, 2026", endDate: "Aug 31, 2026", status: "active", appliesTo: "All products" },
  { id: "d02", code: "WELCOME10", type: "percentage", value: 10, usageCount: 214, startDate: "Jan 1, 2026", endDate: "Dec 31, 2026", status: "active", appliesTo: "New customers only" },
  { id: "d03", code: "FREESHIP200", type: "free-shipping", value: 0, minOrder: 200, usageCount: 31, usageLimit: 100, startDate: "Aug 10, 2026", endDate: "Aug 20, 2026", status: "active", appliesTo: "All products" },
  { id: "d04", code: "FLASH50", type: "fixed", value: 50, usageCount: 0, usageLimit: 50, startDate: "Aug 20, 2026", endDate: "Aug 20, 2026", status: "scheduled", appliesTo: "Skincare category" },
  { id: "d05", code: "JULY10", type: "percentage", value: 10, usageCount: 87, usageLimit: 100, startDate: "Jul 1, 2026", endDate: "Jul 31, 2026", status: "expired", appliesTo: "All products" },
];

const CAMPAIGNS: Campaign[] = [
  { id: "c01", name: "Glow Up August Sale", description: "Summer skincare deals — up to 15% off all face serums and moisturizers.", startDate: "Aug 1, 2026", endDate: "Aug 31, 2026", status: "active", productsAffected: 8, discountPct: 15, totalRedemptions: 312 },
  { id: "c02", name: "National Wellness Week", description: "Celebrate National Wellness Week with exclusive deals on health and beauty.", startDate: "Sep 1, 2026", endDate: "Sep 7, 2026", status: "scheduled", productsAffected: 12, discountPct: 20, totalRedemptions: 0 },
  { id: "c03", name: "Payday Weekend Flash", description: "48-hour flash sale every last Friday of the month. Free shipping on orders over ₱300.", startDate: "Jul 26, 2026", endDate: "Jul 27, 2026", status: "expired", productsAffected: 5, discountPct: 10, totalRedemptions: 178 },
];

const STATUS_CFG: Record<PromoStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",     color: "var(--color-green)", bg: "var(--color-green-light)" },
  scheduled: { label: "Scheduled",  color: "var(--color-navy)",  bg: "var(--color-navy-surface)" },
  expired:   { label: "Expired",    color: "var(--color-ink-disabled)", bg: "var(--color-surface)" },
  draft:     { label: "Draft",      color: "var(--color-ink-muted)", bg: "var(--color-surface)" },
};

function CreateDiscountModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<DiscountType>("percentage");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <h3 className="font-[600] text-[var(--color-ink)]">Create discount code</h3>
          <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Discount code <span className="text-[var(--color-red)]">*</span></label>
            <div className="flex gap-2">
              <input type="text" placeholder="e.g. SUMMER20" className="flex-1 px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm uppercase text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-mono)]" />
              <button className="px-3 py-2 text-xs border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] cursor-pointer">Generate</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Discount type</label>
            <div className="flex gap-2">
              {([["percentage", "% Off"], ["fixed", "Fixed ₱"], ["free-shipping", "Free Shipping"]] as const).map(([t, l]) => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 text-xs font-[500] rounded-sm border cursor-pointer transition-colors ${type === t ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>{l}</button>
              ))}
            </div>
          </div>
          {type !== "free-shipping" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">{type === "percentage" ? "Discount %" : "Amount off (₱)"}</label>
                <input type="number" placeholder={type === "percentage" ? "e.g. 15" : "e.g. 50"} className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
              </div>
              <div>
                <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Min. order amount (₱)</label>
                <input type="number" placeholder="Optional" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Applies to</label>
            <select className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] cursor-pointer font-[var(--font-body)]">
              <option>All products</option>
              <option>Specific categories</option>
              <option>Specific products</option>
              <option>New customers only</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Start date</label>
              <input type="date" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
            </div>
            <div>
              <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">End date</label>
              <input type="date" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Usage limit</label>
            <div className="flex gap-3">
              <input type="number" placeholder="Total uses (leave blank = unlimited)" className="flex-1 px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" className="accent-[var(--color-navy)]" />
              <span className="text-xs text-[var(--color-ink-muted)]">Limit to one use per customer</span>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Create discount</button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const [tab, setTab] = useState<"discounts" | "campaigns">("discounts");
  const [filter, setFilter] = useState<PromoStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

  const filteredDiscounts = DISCOUNTS.filter(d => filter === "all" || d.status === filter);
  const filteredCampaigns = CAMPAIGNS.filter(c => filter === "all" || c.status === filter);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Promotions</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Discounts, campaigns, and promotional offers</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
          + Create discount
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active discounts", value: DISCOUNTS.filter(d => d.status === "active").length, color: "var(--color-green)" },
          { label: "Total redemptions", value: "293", sub: "this month" },
          { label: "Revenue from promos", value: "₱42,800", sub: "attributed" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{s.label}</p>
            <p className="font-[var(--font-display)] text-2xl font-[400]" style={{ color: s.color ?? "var(--color-ink)" }}>{s.value}</p>
            {s.sub && <p className="text-xs text-[var(--color-ink-disabled)]">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs + filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {(["discounts", "campaigns"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px capitalize cursor-pointer transition-colors ${tab === t ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "active", "scheduled", "expired"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded-sm border cursor-pointer capitalize transition-colors ${filter === f ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* DISCOUNTS TAB */}
      {tab === "discounts" && (
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                {["Code", "Type", "Value", "Min order", "Usage", "Period", "Applies to", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDiscounts.map(d => {
                const cfg = STATUS_CFG[d.status];
                return (
                  <tr key={d.id} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded">{d.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] capitalize">{d.type.replace("-", " ")}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-sm font-[500] text-[var(--color-green)]">
                        {d.type === "percentage" ? `${d.value}%` : d.type === "fixed" ? `₱${d.value}` : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)]">{d.minOrder ? `₱${d.minOrder}` : "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{d.usageCount}</span>
                      {d.usageLimit && (
                        <>
                          <span className="text-[var(--color-ink-disabled)] mx-1">/</span>
                          <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-disabled)]">{d.usageLimit}</span>
                          <div className="mt-0.5 h-1 w-16 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--color-navy)] rounded-full" style={{ width: `${(d.usageCount / d.usageLimit) * 100}%` }} />
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] whitespace-nowrap">{d.startDate} → {d.endDate}</td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] max-w-32 truncate">{d.appliesTo}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        <button className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors">
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9.5 2.5l2 2-7.5 7.5H2V9.5L9.5 2.5z" /></svg>
                        </button>
                        <button className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-light)] rounded-sm cursor-pointer transition-colors">
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h10M5 4V2h4v2M5 6v5M9 6v5" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CAMPAIGNS TAB */}
      {tab === "campaigns" && (
        <div className="space-y-3">
          {filteredCampaigns.map(c => {
            const cfg = STATUS_CFG[c.status];
            return (
              <div key={c.id} className="bg-white border border-[var(--color-border)] rounded-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-[600] text-[var(--color-ink)]">{c.name}</h3>
                      <span className="font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-[var(--color-ink-muted)] mb-3">{c.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-[var(--color-ink-muted)]">
                      <span>📅 {c.startDate} → {c.endDate}</span>
                      <span>📦 {c.productsAffected} products</span>
                      <span className="text-[var(--color-green)] font-[500]">✂️ {c.discountPct}% off</span>
                      <span>🛒 {c.totalRedemptions} redemptions</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="px-3 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Edit</button>
                    {c.status === "active" && (
                      <button className="px-3 py-1.5 border border-[var(--color-red-border)] text-xs text-[var(--color-red)] rounded-sm hover:bg-[var(--color-red-light)] cursor-pointer">End now</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <button className="w-full py-4 border-2 border-dashed border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
            + Create new campaign
          </button>
        </div>
      )}

      {showCreate && <CreateDiscountModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
