import { useEffect, useMemo, useState } from "react";
import { createSellerPromotion, fetchSellerProducts, fetchSellerPromotions, cancelSellerPromotion, updateSellerPromotion, type SellerProduct, type SellerPromotion } from "../../api/seller";
import { useUrlTab } from "../../hooks/useUrlTab";

type PromoStatus = "active" | "scheduled" | "expired" | "cancelled" | "draft";
type PromotionTab = "discounts" | "campaigns";
type PromotionStatusTab = Exclude<PromoStatus, "draft"> | "all";

const PROMOTION_TABS: readonly PromotionTab[] = ["discounts", "campaigns"];
const PROMOTION_STATUS_TABS: readonly PromotionStatusTab[] = ["all", "active", "scheduled", "expired", "cancelled"];

const STATUS_CFG: Record<PromoStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "var(--color-green)", bg: "var(--color-green-light)" },
  scheduled: { label: "Scheduled", color: "var(--color-navy)", bg: "var(--color-navy-surface)" },
  expired: { label: "Expired", color: "var(--color-ink-disabled)", bg: "var(--color-surface)" },
  cancelled: { label: "Cancelled", color: "var(--color-red)", bg: "var(--color-red-light)" },
  draft: { label: "Draft", color: "var(--color-ink-muted)", bg: "var(--color-surface)" },
};

function mapStatus(status: string): PromoStatus {
  return (status in STATUS_CFG ? status : "draft") as PromoStatus;
}

function remainingLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatValue(promotion: SellerPromotion) {
  if (promotion.type === "free-shipping") {
    return "Free shipping";
  }

  if (promotion.type === "percentage") {
    return `${promotion.value}%`;
  }

  return `PHP ${promotion.value.toLocaleString()}`;
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function CreateDiscountModal({ onClose, onSaved, promotion }: { onClose: () => void; onSaved: (promotion: SellerPromotion) => void; promotion?: SellerPromotion | null }) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [form, setForm] = useState({
    product_id: promotion?.product?.id ? String(promotion.product.id) : "",
    name: promotion?.name ?? "",
    type: (promotion?.type === "percentage" ? "percentage" : "fixed-price") as "fixed-price" | "percentage",
    value: promotion ? String(promotion.value) : "",
    starts_at: toLocalInput(promotion?.starts_at),
    ends_at: toLocalInput(promotion?.ends_at),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void fetchSellerProducts().then(response => setProducts(response.data.filter(product => product.status === "active"))).catch(() => setError("Unable to load products.")); }, []);
  const selected = products.find(product => product.id === Number(form.product_id));
  const normalPrice = selected ? selected.sale_price ?? selected.price : 0;
  const hasVariants = Boolean(selected?.variants.some(variant => variant.active));
  const previewPrice = form.type === "percentage"
    ? Math.round(normalPrice * (1 - Number(form.value || 0) / 100) * 100) / 100
    : Number(form.value);
  const discount = normalPrice > 0 && previewPrice > 0 ? Math.round((1 - previewPrice / normalPrice) * 100) : 0;
  const submit = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    try {
      const payload = { product_id: Number(form.product_id), name: form.name.trim(), type: form.type, value: Number(form.value), deal_price: form.type === "fixed-price" ? Number(form.value) : null, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() };
      const response = promotion ? await updateSellerPromotion(promotion.id, payload) : await createSellerPromotion(payload);
      onSaved(response.data); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create promotion."); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-xl w-full max-w-lg p-6">
        <h3 className="font-[600] text-[var(--color-ink)] mb-4">{promotion ? "Edit scheduled deal" : "Create timed deal"}</h3>
        <div className="space-y-3">
          <label className="block text-xs font-[600]">Product<select value={form.product_id} onChange={event => { const next = products.find(product => product.id === Number(event.target.value)); setForm(current => ({ ...current, product_id: event.target.value, type: next?.variants.some(variant => variant.active) ? "percentage" : current.type })); }} className="mt-1 w-full border p-2.5 text-sm"><option value="">Select product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="block text-xs font-[600]">Promotion name<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="mt-1 w-full border p-2.5 text-sm" placeholder="Weekend Flash Sale" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-[600]">Discount type<select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as "fixed-price" | "percentage", value: "" }))} className="mt-1 w-full border p-2.5 text-sm"><option value="percentage">Percentage off</option><option value="fixed-price" disabled={hasVariants}>Fixed deal price</option></select></label><label className="block text-xs font-[600]">{form.type === "percentage" ? "Discount percentage" : "Deal price"}<input type="number" min="0.01" max={form.type === "percentage" ? "99.99" : undefined} step="0.01" value={form.value} onChange={event => setForm(current => ({ ...current, value: event.target.value }))} className="mt-1 w-full border p-2.5 text-sm" /></label></div>
          {hasVariants && <p className="text-xs text-[var(--color-ink-muted)]">Variant products use percentage deals. The discount is calculated from each selected variant's own current price.</p>}
          <div className="text-sm">Current price: PHP {normalPrice.toLocaleString()}<br /><span className="text-[var(--color-red)]">{discount > 0 ? `${discount}% OFF · preview PHP ${previewPrice.toLocaleString()}` : "Enter a valid discount"}</span></div>
          <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-[600]">Starts<input type="datetime-local" value={form.starts_at} onChange={event => setForm(current => ({ ...current, starts_at: event.target.value }))} className="mt-1 w-full border p-2.5 text-sm" /></label><label className="block text-xs font-[600]">Ends<input type="datetime-local" value={form.ends_at} onChange={event => setForm(current => ({ ...current, ends_at: event.target.value }))} className="mt-1 w-full border p-2.5 text-sm" /></label></div>
          {error && <p className="text-sm text-[var(--color-red)]">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
          <button disabled={saving || !form.product_id || !form.name || !form.value || !form.starts_at || !form.ends_at || discount <= 0} onClick={() => void submit()} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm disabled:opacity-50">{saving ? "Saving..." : promotion ? "Save changes" : "Create promotion"}</button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const { activeTab: tab, setActiveTab: setTab } = useUrlTab(PROMOTION_TABS, "discounts");
  const { activeTab: filter, setActiveTab: setFilter } = useUrlTab(PROMOTION_STATUS_TABS, "all", { parameter: "status" });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SellerPromotion | null>(null);
  const [now, setNow] = useState(Date.now());
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [promotions, setPromotions] = useState<SellerPromotion[]>([]);
  const cancel = async (promotion: SellerPromotion) => {
    const response = await cancelSellerPromotion(promotion.id);
    setPromotions(current => current.map(item => item.id === promotion.id ? response.data : item));
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchSellerPromotions();
        if (!active) return;
        setPromotions(response.data);
        const offset = new Date(response.server_time).getTime() - Date.now();
        setServerClockOffset(offset);
        setNow(Date.now() + offset);
      } catch {
        if (!active) return;
        setPromotions([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + serverClockOffset), 1000);
    return () => window.clearInterval(timer);
  }, [serverClockOffset]);

  const filteredPromotions = useMemo(() => promotions.filter((promotion) => filter === "all" || mapStatus(promotion.status) === filter), [filter, promotions]);

  const campaigns = useMemo(() => {
    return promotions.map((promotion) => ({
      id: promotion.id,
      name: promotion.code,
      description: promotion.applies_to,
      startDate: promotion.start_date ?? "TBD",
      endDate: promotion.end_date ?? "TBD",
      status: mapStatus(promotion.status),
      productsAffected: promotion.category ? 1 : 0,
      discountPct: promotion.type === "percentage" ? promotion.value : 0,
      totalRedemptions: promotion.usage_count,
    }));
  }, [promotions]);

  const filteredCampaigns = useMemo(() => campaigns.filter((campaign) => filter === "all" || campaign.status === filter), [campaigns, filter]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Promotions</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Discounts and promotional offers from your backend data</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
          + Create discount
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active discounts", value: promotions.filter((promotion) => mapStatus(promotion.status) === "active").length, color: "var(--color-green)" },
          { label: "Scheduled", value: promotions.filter((promotion) => mapStatus(promotion.status) === "scheduled").length, sub: "upcoming timed deals" },
          { label: "Promotion records", value: promotions.length, sub: "all statuses" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{card.label}</p>
            <p className="font-[var(--font-display)] text-2xl font-[400]" style={{ color: card.color ?? "var(--color-ink)" }}>{card.value}</p>
            {card.sub && <p className="text-xs text-[var(--color-ink-disabled)]">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {PROMOTION_TABS.map((value) => (
            <button key={value} onClick={() => setTab(value)} className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px capitalize cursor-pointer transition-colors ${tab === value ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PROMOTION_STATUS_TABS.map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={`font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded-sm border cursor-pointer capitalize transition-colors ${filter === value ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
              {value}
            </button>
          ))}
        </div>
      </div>

      {tab === "discounts" && (
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                {["Promotion", "Type", "Value", "Pricing", "Promo allocation", "Period", "Product", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.map((promotion) => {
                const cfg = STATUS_CFG[mapStatus(promotion.status)];

                return (
                  <tr key={promotion.id} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="block text-xs font-[600] text-[var(--color-ink)]">{promotion.name ?? promotion.code}</span>
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{promotion.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] capitalize">{promotion.type.replace("-", " ")}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-sm font-[500] text-[var(--color-green)]">{formatValue(promotion)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)]"><span className="block">Regular PHP {(promotion.regular_price ?? 0).toLocaleString()}</span>{promotion.sale_price !== null && promotion.sale_price !== undefined && <span className="block">Sale PHP {promotion.sale_price.toLocaleString()}</span>}<span className="block font-[500] text-[var(--color-green)]">Promo PHP {(promotion.promotion_price ?? promotion.deal_price ?? 0).toLocaleString()}</span></td>
                    <td className="px-4 py-3.5">
                      {promotion.kind === "deal" ? <span className="text-xs text-[var(--color-ink-disabled)]">Not tracked</span> : <><span className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{promotion.usage_count}</span>{promotion.usage_limit !== null && <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-disabled)]"> / {promotion.usage_limit}</span>}</>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] whitespace-nowrap">
                      {promotion.start_date ?? "TBD"} {" -> "} {promotion.end_date ?? "TBD"}
                      {promotion.status === "active" && promotion.ends_at && <span className="block mt-1 font-[var(--font-mono)] text-[9px] text-[var(--color-red)]">Ends in {remainingLabel(new Date(promotion.ends_at).getTime() - now)}</span>}
                      {promotion.status === "scheduled" && promotion.starts_at && <span className="block mt-1 font-[var(--font-mono)] text-[9px] text-[var(--color-navy)]">Starts in {remainingLabel(new Date(promotion.starts_at).getTime() - now)}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] max-w-32 truncate">{promotion.applies_to}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5"><div className="flex gap-2">{promotion.kind === "deal" && promotion.status === "scheduled" && <button onClick={() => setEditing(promotion)} className="text-xs text-[var(--color-navy)] hover:underline">Edit</button>}{promotion.kind === "deal" && ["active", "scheduled"].includes(promotion.status) && <button onClick={() => void cancel(promotion)} className="text-xs text-[var(--color-red)] hover:underline">Cancel</button>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const cfg = STATUS_CFG[campaign.status];
            return (
              <div key={String(campaign.id)} className="bg-white border border-[var(--color-border)] rounded-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-[600] text-[var(--color-ink)]">{campaign.name}</h3>
                      <span className="font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-[var(--color-ink-muted)] mb-3">{campaign.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-[var(--color-ink-muted)]">
                      <span>{campaign.startDate} {" -> "} {campaign.endDate}</span>
                      <span>{campaign.productsAffected} products</span>
                      <span className="text-[var(--color-green)] font-[500]">{campaign.discountPct}% off</span>
                      <span>{campaign.totalRedemptions} redemptions</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateDiscountModal onClose={() => setShowCreate(false)} onSaved={promotion => setPromotions(current => [promotion, ...current])} />}
      {editing && <CreateDiscountModal promotion={editing} onClose={() => setEditing(null)} onSaved={saved => setPromotions(current => current.map(promotion => promotion.id === saved.id ? saved : promotion))} />}
    </div>
  );
}
