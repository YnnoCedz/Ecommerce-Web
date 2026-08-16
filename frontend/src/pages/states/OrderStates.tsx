import { useState } from "react";
import PublicShell from "../../shells/PublicShell";

type OrderStateId =
  | "pending" | "confirmed" | "processing" | "ready"
  | "picked-up" | "in-transit" | "delivered" | "completed"
  | "cancelled" | "failed" | "returned" | "refunded";

const STATE_CFG: Record<OrderStateId, {
  label: string; badge: string; badgeBg: string; badgeText: string;
  icon: string; description: string; eta?: string;
  actions: string[]; progressStep: number; branch?: string;
}> = {
  pending:     { label: "Pending",          badge: "Pending",          badgeBg: "bg-yellow-100", badgeText: "text-yellow-700", icon: "⏳", description: "Order received. Waiting for seller to confirm.", eta: "Confirm usually within 2 hours", actions: ["Cancel order"], progressStep: 0, },
  confirmed:   { label: "Confirmed",        badge: "Confirmed",        badgeBg: "bg-[var(--color-navy-surface)]", badgeText: "text-[var(--color-navy)]", icon: "✅", description: "Seller has confirmed your order and is preparing it.", eta: "Estimated dispatch: Aug 16", actions: ["Message seller", "Cancel order"], progressStep: 1, },
  processing:  { label: "Processing",       badge: "Processing",       badgeBg: "bg-[var(--color-navy-surface)]", badgeText: "text-[var(--color-navy)]", icon: "📦", description: "Seller is packing your items and preparing the shipment.", eta: "Ready for pickup: Aug 16, 5:00 PM", actions: ["Message seller"], progressStep: 2, },
  ready:       { label: "Ready for pickup", badge: "Ready",            badgeBg: "bg-[var(--color-amber-light)]", badgeText: "text-[var(--color-amber)]", icon: "🔔", description: "Order is packed and ready. Courier will pick up today.", eta: "J&T Express pickup: Aug 16, 3–7 PM", actions: ["Track shipment"], progressStep: 3, },
  "picked-up": { label: "Picked up",        badge: "Picked up",        badgeBg: "bg-[var(--color-amber-light)]", badgeText: "text-[var(--color-amber)]", icon: "🚗", description: "Courier has picked up your parcel from the seller.", eta: "Tracking: JT-PH-2026081634891", actions: ["Track shipment", "Message seller"], progressStep: 4, },
  "in-transit":{ label: "In transit",       badge: "In transit",       badgeBg: "bg-[var(--color-amber-light)]", badgeText: "text-[var(--color-amber)]", icon: "🚚", description: "Your parcel is on the way. Estimated delivery tomorrow.", eta: "ETA: Aug 17, 9 AM – 6 PM", actions: ["Track shipment"], progressStep: 5, },
  delivered:   { label: "Delivered",        badge: "Delivered",        badgeBg: "bg-[var(--color-green-light)]", badgeText: "text-[var(--color-green)]", icon: "📬", description: "Your order was delivered. Confirm receipt to release payment to seller.", eta: "Delivered Aug 17 at 2:41 PM", actions: ["Confirm receipt", "Report issue"], progressStep: 6, },
  completed:   { label: "Completed",        badge: "Completed",        badgeBg: "bg-[var(--color-green-light)]", badgeText: "text-[var(--color-green)]", icon: "⭐", description: "Order completed. Leave a review to help other buyers.", eta: "Completed Aug 17", actions: ["Leave a review", "Buy again", "Request return"], progressStep: 7, },
  cancelled:   { label: "Cancelled",        badge: "Cancelled",        badgeBg: "bg-[var(--color-surface)]", badgeText: "text-[var(--color-ink-muted)]", icon: "✕", description: "This order was cancelled. If you were charged, a refund is being processed.", eta: "Refund in 3–5 business days", actions: ["View refund status", "Order again"], progressStep: -1, branch: "cancelled" },
  failed:      { label: "Failed",           badge: "Failed",           badgeBg: "bg-[var(--color-red-light)]", badgeText: "text-[var(--color-red)]", icon: "⚠", description: "Order could not be completed. Payment was not captured.", eta: "No charge made to your account", actions: ["Try again", "Contact support"], progressStep: -1, branch: "failed" },
  returned:    { label: "Returned",         badge: "Returned",         badgeBg: "bg-[var(--color-red-light)]", badgeText: "text-[var(--color-red)]", icon: "↩", description: "Return request approved. Drop off or schedule a pickup with J&T Express.", eta: "Return pickup: Aug 20", actions: ["Print return label", "Track return"], progressStep: -1, branch: "returned" },
  refunded:    { label: "Refunded",         badge: "Refunded",         badgeBg: "bg-[var(--color-violet-light)]", badgeText: "text-[var(--color-violet)]", icon: "↵", description: "Your refund of ₱1,248 has been processed to your original payment method.", eta: "Credit in 3–5 business days", actions: ["View transaction details"], progressStep: -1, branch: "refunded" },
};

const PROGRESS_STEPS = ["Pending", "Confirmed", "Processing", "Ready", "Picked up", "In transit", "Delivered", "Completed"];

const ITEM = {
  name: "Hydrating Face Toner 150ml",
  variant: "Original scent",
  qty: 2,
  price: "₱485",
  img: "photo-1596462502278-27bfdc403348",
};

const ORDER = {
  id: "ORD-5501",
  seller: "GlowLab PH",
  date: "Aug 15, 2026",
  subtotal: "₱970",
  delivery: "₱80",
  total: "₱1,050",
  address: "32 Katipunan Ave, Brgy. Loyola Heights, Quezon City, 1108",
  courier: "J&T Express",
  tracking: "JT-PH-2026081634891",
};

function OrderDetailView({ stateId }: { stateId: OrderStateId }) {
  const cfg = STATE_CFG[stateId];
  const isTerminal = ["cancelled", "failed", "returned", "refunded"].includes(stateId);

  return (
    <PublicShell isLoggedIn cartCount={1}>
      <div className="max-w-screen-lg mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)] mb-1">Order {ORDER.id} · Placed {ORDER.date}</p>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Order details</h1>
          </div>
          <span className={`font-[var(--font-mono)] text-[10px] px-3 py-1.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.badge}</span>
        </div>

        {/* Progress bar (non-terminal) */}
        {!isTerminal && (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Order progress</p>
              {cfg.eta && <p className="text-xs text-[var(--color-ink-muted)]">{cfg.eta}</p>}
            </div>
            <div className="relative flex items-center justify-between">
              {/* Track line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--color-border)]" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--color-navy)] transition-all"
                style={{ width: `${(cfg.progressStep / (PROGRESS_STEPS.length - 1)) * 100}%` }}
              />
              {PROGRESS_STEPS.map((step, i) => (
                <div key={step} className="relative flex flex-col items-center gap-2 z-10">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    i < cfg.progressStep ? "bg-[var(--color-navy)] border-[var(--color-navy)]" :
                    i === cfg.progressStep ? "bg-white border-[var(--color-navy)]" :
                    "bg-white border-[var(--color-border)]"
                  }`}>
                    {i < cfg.progressStep && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l3 3 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {i === cfg.progressStep && <div className="w-2 h-2 rounded-full bg-[var(--color-navy)]" />}
                  </div>
                  <p className={`text-[9px] font-[var(--font-mono)] whitespace-nowrap ${i === cfg.progressStep ? "text-[var(--color-navy)] font-[600]" : i < cfg.progressStep ? "text-[var(--color-ink-muted)]" : "text-[var(--color-ink-disabled)]"}`}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status card */}
        <div className={`rounded-sm p-4 mb-5 flex items-start gap-3 border ${
          isTerminal && ["cancelled","failed"].includes(stateId) ? "bg-[var(--color-red-light)]/40 border-[var(--color-red-border)]" :
          isTerminal ? "bg-[var(--color-violet-light)] border-[var(--color-violet-border)]" :
          "bg-[var(--color-navy-surface)] border-[var(--color-navy-border)]"
        }`}>
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-[600] text-[var(--color-ink)]">{cfg.label}</p>
            <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{cfg.description}</p>
            {cfg.eta && <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-1.5">{cfg.eta}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Order items + info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Items */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Items from {ORDER.seller}</p>
              </div>
              <div className="p-5 flex items-center gap-4">
                <img src={`https://images.unsplash.com/${ITEM.img}?w=72&h=72&fit=crop&auto=format`} alt={ITEM.name} className={`w-18 h-18 object-cover rounded-sm border border-[var(--color-border)] ${["cancelled","failed"].includes(stateId) ? "opacity-50" : ""}`} style={{ width: 72, height: 72 }} />
                <div className="flex-1">
                  <p className={`text-sm font-[500] text-[var(--color-ink)] ${["cancelled","failed"].includes(stateId) ? "line-through opacity-50" : ""}`}>{ITEM.name}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{ITEM.variant} · Qty: {ITEM.qty}</p>
                  <p className="text-sm font-[600] text-[var(--color-ink)] mt-1.5">{ITEM.price} × {ITEM.qty}</p>
                </div>
              </div>
            </div>

            {/* Delivery info */}
            {!["pending", "cancelled", "failed"].includes(stateId) && (
              <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Delivery</p>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📍</span>
                  <div>
                    <p className="text-sm text-[var(--color-ink)]">{ORDER.address}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-1">{ORDER.courier} · {ORDER.tracking}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {cfg.actions.map(action => (
                <button key={action} className="px-4 py-2 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-navy)]/30 rounded-sm cursor-pointer transition-colors">
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 h-fit">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Summary</p>
            <div className="space-y-2.5 text-sm border-b border-[var(--color-border-subtle)] pb-4 mb-4">
              <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Subtotal</span><span>{ORDER.subtotal}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Delivery</span><span>{ORDER.delivery}</span></div>
            </div>
            <div className="flex justify-between font-[600] text-sm mb-1">
              <span>Total</span><span>{ORDER.total}</span>
            </div>
            {stateId === "refunded" && (
              <div className="mt-3 p-2.5 bg-[var(--color-violet-light)] rounded-sm">
                <p className="text-xs text-[var(--color-violet)]">Refund of ₱1,050 issued to original payment method</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

const STATE_LIST: { id: OrderStateId; emoji: string }[] = [
  { id: "pending", emoji: "⏳" },
  { id: "confirmed", emoji: "✅" },
  { id: "processing", emoji: "📦" },
  { id: "ready", emoji: "🔔" },
  { id: "picked-up", emoji: "🚗" },
  { id: "in-transit", emoji: "🚚" },
  { id: "delivered", emoji: "📬" },
  { id: "completed", emoji: "⭐" },
  { id: "cancelled", emoji: "✕" },
  { id: "failed", emoji: "⚠" },
  { id: "returned", emoji: "↩" },
  { id: "refunded", emoji: "↵" },
];

export function OrderStateGallery() {
  const [active, setActive] = useState<OrderStateId>("pending");
  return (
    <div className="h-full flex flex-col">
      {/* State selector strip */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-2 flex gap-1 flex-wrap shrink-0">
        {STATE_LIST.map(s => {
          const cfg = STATE_CFG[s.id];
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs cursor-pointer transition-colors ${active === s.id ? `${cfg.badgeBg} ${cfg.badgeText} font-[500]` : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-white"}`}
            >
              <span>{s.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>
      {/* Order detail */}
      <div className="flex-1 overflow-y-auto">
        <OrderDetailView key={active} stateId={active} />
      </div>
    </div>
  );
}
