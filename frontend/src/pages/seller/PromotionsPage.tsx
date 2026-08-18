import { useEffect, useMemo, useState } from "react";
import { fetchSellerPromotions, type SellerPromotion } from "../../api/seller";

type PromoStatus = "active" | "scheduled" | "expired" | "draft";

const STATUS_CFG: Record<PromoStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "var(--color-green)", bg: "var(--color-green-light)" },
  scheduled: { label: "Scheduled", color: "var(--color-navy)", bg: "var(--color-navy-surface)" },
  expired: { label: "Expired", color: "var(--color-ink-disabled)", bg: "var(--color-surface)" },
  draft: { label: "Draft", color: "var(--color-ink-muted)", bg: "var(--color-surface)" },
};

function mapStatus(status: string): PromoStatus {
  return (status in STATUS_CFG ? status : "draft") as PromoStatus;
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

function CreateDiscountModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-xl w-full max-w-lg p-6">
        <h3 className="font-[600] text-[var(--color-ink)] mb-2">Create discount code</h3>
        <p className="text-sm text-[var(--color-ink-muted)] mb-5">Promotion creation is still UI-driven. Connect the create endpoint before enabling this flow.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const [tab, setTab] = useState<"discounts" | "campaigns">("discounts");
  const [filter, setFilter] = useState<PromoStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [promotions, setPromotions] = useState<SellerPromotion[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchSellerPromotions();
        if (!active) return;
        setPromotions(response.data);
      } catch {
        if (!active) return;
        setPromotions([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
          { label: "Total redemptions", value: promotions.reduce((sum, promotion) => sum + promotion.usage_count, 0), sub: "from loaded promotions" },
          { label: "Promo count", value: promotions.length, sub: "stored seller promos" },
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
          {(["discounts", "campaigns"] as const).map((value) => (
            <button key={value} onClick={() => setTab(value)} className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px capitalize cursor-pointer transition-colors ${tab === value ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "active", "scheduled", "expired"] as const).map((value) => (
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
                {["Code", "Type", "Value", "Min order", "Usage", "Period", "Applies to", "Status"].map((heading) => (
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
                      <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded">{promotion.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] capitalize">{promotion.type.replace("-", " ")}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-sm font-[500] text-[var(--color-green)]">{formatValue(promotion)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)]">{promotion.min_order !== null ? `PHP ${promotion.min_order.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{promotion.usage_count}</span>
                      {promotion.usage_limit !== null && <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-disabled)]"> / {promotion.usage_limit}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] whitespace-nowrap">
                      {promotion.start_date ?? "TBD"} {" -> "} {promotion.end_date ?? "TBD"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] max-w-32 truncate">{promotion.applies_to}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </td>
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

      {showCreate && <CreateDiscountModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
