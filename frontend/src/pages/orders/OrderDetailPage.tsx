import { useState } from "react";

export type DeliveryState =
  | "awaiting-fulfillment"
  | "processing"
  | "ready-for-pickup"
  | "picked-up"
  | "in-transit"
  | "out-for-delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed"
  | "returned"
  | "refunded";

const DELIVERY_STATES: DeliveryState[] = [
  "awaiting-fulfillment",
  "processing",
  "ready-for-pickup",
  "picked-up",
  "in-transit",
  "out-for-delivery",
  "delivered",
  "completed",
  "cancelled",
  "failed",
  "returned",
  "refunded",
];

const STATE_CONFIG: Record<DeliveryState, { label: string; color: string; bg: string; border: string; icon: string }> = {
  "awaiting-fulfillment": { label: "Awaiting Fulfillment", color: "var(--color-ink-muted)",   bg: "var(--color-surface)",        border: "var(--color-border)",         icon: "⏳" },
  "processing":           { label: "Processing",           color: "var(--color-navy)",         bg: "var(--color-navy-surface)",   border: "var(--color-navy-border)",    icon: "⚙️" },
  "ready-for-pickup":     { label: "Ready for Pickup",     color: "var(--color-amber)",         bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   icon: "📦" },
  "picked-up":            { label: "Picked Up",            color: "var(--color-amber)",         bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   icon: "🚚" },
  "in-transit":           { label: "In Transit",           color: "var(--color-amber)",         bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   icon: "🛣️" },
  "out-for-delivery":     { label: "Out for Delivery",     color: "#7B5200",                   bg: "#FEF3C7",                     border: "#FBD87F",                     icon: "🏃" },
  "delivered":            { label: "Delivered",            color: "var(--color-green)",         bg: "var(--color-green-light)",    border: "var(--color-green-border)",   icon: "✅" },
  "completed":            { label: "Completed",            color: "var(--color-green)",         bg: "var(--color-green-light)",    border: "var(--color-green-border)",   icon: "🎉" },
  "cancelled":            { label: "Cancelled",            color: "var(--color-ink-muted)",     bg: "var(--color-surface)",        border: "var(--color-border)",         icon: "✕" },
  "failed":               { label: "Delivery Failed",      color: "var(--color-red)",           bg: "var(--color-red-light)",      border: "var(--color-red-border)",     icon: "⚠️" },
  "returned":             { label: "Returned",             color: "var(--color-red)",           bg: "var(--color-red-light)",      border: "var(--color-red-border)",     icon: "↩" },
  "refunded":             { label: "Refunded",             color: "var(--color-violet)",        bg: "var(--color-violet-light)",   border: "var(--color-violet-border)",  icon: "💜" },
};

const POSITIVE_FLOW: DeliveryState[] = [
  "awaiting-fulfillment",
  "processing",
  "ready-for-pickup",
  "picked-up",
  "in-transit",
  "out-for-delivery",
  "delivered",
  "completed",
];

const ORDER = {
  id: "ORD-2831",
  date: "August 10, 2026",
  placedAt: "10:32 AM",
  sellers: [
    {
      slug: "verde-botanics",
      name: "Verde Botanics",
      rating: 4.7,
      location: "Quezon City, NCR",
      items: [
        { id: "i1", product: "Natural Botanical Skincare Set", variant: "Dry skin / Lavender", qty: 1, price: 1200, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120&h=120&fit=crop&auto=format" },
      ],
      shippingFee: 80,
      deliveryMethod: "Standard delivery",
    },
  ],
  address: { name: "Ana Reyes", phone: "+63 917 555 0182", line1: "24B Sampaguita St., Salcedo Village", city: "Makati", province: "Metro Manila", zip: "1227" },
  payment: { method: "GCash", reference: "GC-20260810-28310", total: 1280 },
  courier: { name: "J&T Express", driver: "Romel D.", vehicle: "Motorcycle", reference: "PH82831095" },
};

function buildTimeline(state: DeliveryState): { label: string; time: string; done: boolean; active: boolean }[] {
  const isTerminal = !POSITIVE_FLOW.includes(state) || state === "cancelled" || state === "failed";

  if (isTerminal && !POSITIVE_FLOW.includes(state)) {
    const common = [
      { label: "Order placed", time: "Aug 10, 10:32 AM", done: true, active: false },
      { label: "Seller confirmed", time: "Aug 10, 2:15 PM", done: true, active: false },
    ];
    if (state === "cancelled") return [...common, { label: "Order cancelled", time: "Aug 11, 9:00 AM", done: false, active: true }];
    if (state === "failed") return [...common,
      { label: "Out for delivery", time: "Aug 13, 9:00 AM", done: true, active: false },
      { label: "Delivery attempted", time: "Aug 13, 3:45 PM", done: true, active: false },
      { label: "Delivery failed", time: "Aug 13, 3:45 PM", done: false, active: true },
    ];
    if (state === "returned") return [...common,
      { label: "Delivered", time: "Aug 12, 2:00 PM", done: true, active: false },
      { label: "Return requested", time: "Aug 14, 11:00 AM", done: true, active: false },
      { label: "Return in transit", time: "Aug 15, 9:30 AM", done: true, active: false },
      { label: "Returned to seller", time: "Aug 16, 2:15 PM", done: false, active: true },
    ];
    if (state === "refunded") return [...common,
      { label: "Return processed", time: "Aug 14, 11:00 AM", done: true, active: false },
      { label: "Refund initiated", time: "Aug 15, 9:00 AM", done: true, active: false },
      { label: "Refund completed", time: "Aug 16, 10:30 AM", done: false, active: true },
    ];
    return common;
  }

  const steps: { state: DeliveryState; label: string; time: string }[] = [
    { state: "awaiting-fulfillment", label: "Order placed", time: "Aug 10, 10:32 AM" },
    { state: "processing", label: "Seller confirmed", time: "Aug 10, 2:15 PM" },
    { state: "ready-for-pickup", label: "Ready for courier pickup", time: "Aug 11, 8:30 AM" },
    { state: "picked-up", label: "Picked up by J&T Express", time: "Aug 11, 9:00 AM" },
    { state: "in-transit", label: "In transit to Makati hub", time: "Aug 12, 7:15 AM" },
    { state: "out-for-delivery", label: "Out for delivery", time: "Aug 13, 8:00 AM" },
    { state: "delivered", label: "Delivered to Ana Reyes", time: "Aug 13, 2:30 PM" },
    { state: "completed", label: "Order completed", time: "Aug 13, 2:30 PM" },
  ];

  const currentIdx = steps.findIndex(s => s.state === state);
  return steps.map((s, i) => ({
    label: s.label,
    time: s.time,
    done: i < currentIdx,
    active: i === currentIdx,
  }));
}

function TrackingTimeline({ state }: { state: DeliveryState }) {
  const timeline = buildTimeline(state);
  const cfg = STATE_CONFIG[state];

  return (
    <div>
      <div className="space-y-0">
        {timeline.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 transition-colors ${
                step.done ? "bg-[var(--color-green)]" :
                step.active ? `border-2 bg-white` : "bg-[var(--color-border)]"
              }`} style={step.active ? { borderColor: cfg.color, background: cfg.bg } : {}}>
                {step.done && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M2 5l2.5 2.5 3.5-4" /></svg>}
                {step.active && <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />}
              </div>
              {i < timeline.length - 1 && (
                <div className={`w-px flex-1 min-h-[24px] mt-0.5 mb-0.5 ${step.done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />
              )}
            </div>
            <div className="pb-4 min-w-0">
              <p className={`text-sm font-[${step.active ? "600" : "400"}] ${step.active ? "" : step.done ? "text-[var(--color-ink-secondary)]" : "text-[var(--color-ink-disabled)]"}`} style={step.active ? { color: cfg.color } : {}}>
                {step.label}
              </p>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{step.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailPage({ deliveryState = "in-transit" }: { deliveryState?: DeliveryState }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const cfg = STATE_CONFIG[deliveryState];

  const merchandise = ORDER.sellers.reduce((sum, s) => sum + s.items.reduce((ss, it) => ss + it.price * it.qty, 0) + s.shippingFee, 0);
  const isActive = POSITIVE_FLOW.includes(deliveryState) && deliveryState !== "completed";
  const isTerminal = ["completed", "delivered", "cancelled", "failed", "returned", "refunded"].includes(deliveryState);

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Orders</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{ORDER.id}</span>
        </div>

        {/* Status banner */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
          <span className="text-xl shrink-0">{cfg.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-[600]" style={{ color: cfg.color }}>{cfg.label}</p>
            <p className="text-xs mt-0.5" style={{ color: cfg.color, opacity: 0.75 }}>
              {deliveryState === "out-for-delivery" ? "Your package will arrive today between 2–6 PM." :
               deliveryState === "delivered" || deliveryState === "completed" ? "Delivered on August 13, 2026 at 2:30 PM." :
               deliveryState === "in-transit" ? "Estimated delivery: August 13–14, 2026." :
               deliveryState === "awaiting-fulfillment" ? "Waiting for the seller to confirm your order." :
               deliveryState === "processing" ? "The seller is preparing your order for pickup." :
               deliveryState === "cancelled" ? "This order was cancelled. No charge was made." :
               deliveryState === "failed" ? "Delivery failed. The courier will attempt re-delivery or contact you." :
               deliveryState === "returned" ? "This order has been returned to the seller." :
               deliveryState === "refunded" ? "Your refund of ₱1,280 has been processed to GCash." :
               "Your order is being processed."}
            </p>
          </div>
          {deliveryState === "delivered" && (
            <button className="shrink-0 text-xs font-[500] px-3 py-1.5 bg-white/80 rounded-sm cursor-pointer hover:bg-white transition-colors" style={{ color: cfg.color }}>
              Write a review
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── LEFT ──────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Order reference */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-0.5">Order reference</p>
                  <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-navy)]">{ORDER.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Placed on</p>
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{ORDER.date} at {ORDER.placedAt}</p>
                </div>
              </div>
            </div>

            {/* Seller + items */}
            {ORDER.sellers.map(seller => (
              <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="w-8 h-8 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                    <span className="text-white font-[var(--font-display)] text-sm">{seller.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <button className="text-sm font-[600] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">{seller.name}</button>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{seller.location}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--color-amber)"><path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" /></svg>
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{seller.rating}</span>
                  </div>
                </div>

                {seller.items.map((item, idx) => (
                  <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                    <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                      <img src={item.image} alt={item.product} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-0.5">{item.product}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{item.variant}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Qty: {item.qty}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-[600] text-[var(--color-ink)]">₱{(item.price * item.qty).toLocaleString()}</p>
                    </div>
                  </div>
                ))}

                <div className="px-5 py-3 border-t border-[var(--color-border-subtle)] flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 8h10V4H2v4zM12 8l4 2v4h-2M4 14a2 2 0 100-4 2 2 0 000 4zM14 14a2 2 0 100-4 2 2 0 000 4z" /></svg>
                    <span>{seller.deliveryMethod}</span>
                  </div>
                  <span className="text-sm font-[600] text-[var(--color-ink)]">{seller.shippingFee === 0 ? "Free" : `₱${seller.shippingFee}`}</span>
                </div>
              </div>
            ))}

            {/* Delivery address */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-3">Delivery Address</p>
              <p className="text-sm font-[500] text-[var(--color-ink)]">{ORDER.address.name}</p>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{ORDER.address.phone}</p>
              <p className="text-sm text-[var(--color-ink-secondary)] mt-1">{ORDER.address.line1}</p>
              <p className="text-sm text-[var(--color-ink-secondary)]">{ORDER.address.city}, {ORDER.address.province} {ORDER.address.zip}</p>
            </div>

            {/* Payment summary */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Payment Summary</p>
              <div className="space-y-2">
                {[
                  ["Method", ORDER.payment.method],
                  ["Reference", ORDER.payment.reference],
                  ["Merchandise", `₱${(ORDER.payment.total - 80).toLocaleString()}`],
                  ["Shipping", "₱80"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[var(--color-ink-muted)]">{label}</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{value}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--color-border)] pt-2 flex justify-between">
                  <span className="font-[600] text-[var(--color-ink)]">Total paid</span>
                  <span className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">₱{ORDER.payment.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Support actions */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Need Help?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: "💬", label: "Message seller", action: () => setContactOpen(true) },
                  { icon: "🎧", label: "Contact support", action: () => {} },
                  { icon: "🚩", label: "Report issue", action: () => setReportOpen(true) },
                ].map(({ icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex items-center gap-2 p-3 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
                    <span>{icon}</span>
                    <span className="font-[500]">{label}</span>
                  </button>
                ))}
              </div>

              {/* Message seller form */}
              {contactOpen && (
                <div className="mt-4 border border-[var(--color-border)] rounded-sm p-4 space-y-3">
                  <p className="text-sm font-[600] text-[var(--color-ink)]">Message Verde Botanics</p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Hi! I have a question about my order…"
                    className="w-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] resize-none"
                  />
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Send</button>
                    <button onClick={() => setContactOpen(false)} className="px-4 py-2 text-sm text-[var(--color-ink-muted)] cursor-pointer hover:text-[var(--color-ink)] transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              {/* Report form */}
              {reportOpen && (
                <div className="mt-4 border border-[var(--color-red-border)] bg-[var(--color-red-light)] rounded-sm p-4 space-y-3">
                  <p className="text-sm font-[600] text-[var(--color-red)]">Report an Issue</p>
                  <select className="w-full text-sm bg-white border border-[var(--color-red-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] outline-none cursor-pointer">
                    <option>Item not received</option>
                    <option>Item damaged</option>
                    <option>Wrong item received</option>
                    <option>Counterfeit product</option>
                    <option>Seller unresponsive</option>
                    <option>Other</option>
                  </select>
                  <textarea rows={3} placeholder="Describe the issue…" className="w-full text-sm bg-white border border-[var(--color-red-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none resize-none" />
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[var(--color-red)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-red-hover)] cursor-pointer transition-colors">Submit report</button>
                    <button onClick={() => setReportOpen(false)} className="px-4 py-2 text-sm text-[var(--color-ink-muted)] cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Tracking ────────────────────────────────── */}
          <div className="space-y-5">

            {/* Courier info */}
            {isActive && !["awaiting-fulfillment", "processing", "ready-for-pickup"].includes(deliveryState) && (
              <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
                <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Courier</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                    <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">RD</span>
                  </div>
                  <div>
                    <p className="text-sm font-[600] text-[var(--color-ink)]">{ORDER.courier.driver}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{ORDER.courier.name} · {ORDER.courier.vehicle}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-ink-muted)]">Tracking number</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{ORDER.courier.reference}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-ink-muted)]">Courier</span>
                    <span className="font-[500] text-[var(--color-ink)]">{ORDER.courier.name}</span>
                  </div>
                </div>
                {deliveryState === "out-for-delivery" && (
                  <button className="mt-4 w-full py-2 border border-[var(--color-border)] text-xs font-[500] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] rounded-sm cursor-pointer transition-colors">
                    Contact courier
                  </button>
                )}
              </div>
            )}

            {/* Delivery timeline */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Delivery Timeline</p>
              <TrackingTimeline state={deliveryState} />
            </div>

            {/* Estimated delivery */}
            {isActive && !["cancelled", "failed"].includes(deliveryState) && (
              <div className="bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] uppercase tracking-wide mb-1">Estimated delivery</p>
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-navy)]">
                  {deliveryState === "out-for-delivery" ? "Today, Aug 13" : "Aug 13–14, 2026"}
                </p>
                {deliveryState === "out-for-delivery" && (
                  <p className="text-xs text-[var(--color-navy)]/70 mt-0.5">Estimated 2–6 PM window</p>
                )}
              </div>
            )}

            {/* Refund notice */}
            {deliveryState === "refunded" && (
              <div className="bg-[var(--color-violet-light)] border border-[var(--color-violet-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-violet)] uppercase tracking-wide mb-1">Refund completed</p>
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-violet)]">₱{ORDER.payment.total.toLocaleString()}</p>
                <p className="text-xs text-[var(--color-violet)]/80 mt-1">Credited to GCash on Aug 16, 2026. Allow 1–3 business days to reflect.</p>
              </div>
            )}

            {/* Report courier (only when delivered or in transit) */}
            {(deliveryState === "out-for-delivery" || deliveryState === "in-transit") && (
              <button className="w-full flex items-center gap-2 px-4 py-3 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-light)] transition-colors cursor-pointer">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 2v5M7 10v1" /></svg>
                Report courier behaviour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { DELIVERY_STATES, STATE_CONFIG };
