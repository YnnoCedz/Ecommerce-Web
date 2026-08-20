import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { fetchBuyerOrder, type BuyerOrderDetail } from "../../api/buyer";

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

const STATE_CONFIG: Record<DeliveryState, { label: string; color: string; bg: string; border: string; icon: string }> = {
  "awaiting-fulfillment": { label: "Awaiting Fulfillment", color: "var(--color-ink-muted)", bg: "var(--color-surface)", border: "var(--color-border)", icon: "⏳" },
  processing: { label: "Processing", color: "var(--color-navy)", bg: "var(--color-navy-surface)", border: "var(--color-navy-border)", icon: "⚙️" },
  "ready-for-pickup": { label: "Ready for Pickup", color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)", icon: "📦" },
  "picked-up": { label: "Picked Up", color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)", icon: "🛻" },
  "in-transit": { label: "In Transit", color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)", icon: "🛣️" },
  "out-for-delivery": { label: "Out for Delivery", color: "#7B5200", bg: "#FEF3C7", border: "#FBD87F", icon: "🏃" },
  delivered: { label: "Delivered", color: "var(--color-green)", bg: "var(--color-green-light)", border: "var(--color-green-border)", icon: "✅" },
  completed: { label: "Completed", color: "var(--color-green)", bg: "var(--color-green-light)", border: "var(--color-green-border)", icon: "🎉" },
  cancelled: { label: "Cancelled", color: "var(--color-ink-muted)", bg: "var(--color-surface)", border: "var(--color-border)", icon: "✕" },
  failed: { label: "Delivery Failed", color: "var(--color-red)", bg: "var(--color-red-light)", border: "var(--color-red-border)", icon: "⚠️" },
  returned: { label: "Returned", color: "var(--color-red)", bg: "var(--color-red-light)", border: "var(--color-red-border)", icon: "↩" },
  refunded: { label: "Refunded", color: "var(--color-violet)", bg: "var(--color-violet-light)", border: "var(--color-violet-border)", icon: "💳" },
};

export const DELIVERY_STATES = Object.keys(STATE_CONFIG) as DeliveryState[];

const POSITIVE_FLOW: DeliveryState[] = ["awaiting-fulfillment", "processing", "ready-for-pickup", "picked-up", "in-transit", "out-for-delivery", "delivered", "completed"];

function normalizeState(status: string | null | undefined): DeliveryState {
  if (!status) return "processing";
  const mapped = status.replaceAll("_", "-") as DeliveryState;
  return mapped in STATE_CONFIG ? mapped : "processing";
}

function currency(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

function Timeline({ state }: { state: DeliveryState }) {
  const steps: { state: DeliveryState; label: string }[] = [
    { state: "awaiting-fulfillment", label: "Order placed" },
    { state: "processing", label: "Seller confirmed" },
    { state: "ready-for-pickup", label: "Ready for pickup" },
    { state: "picked-up", label: "Picked up" },
    { state: "in-transit", label: "In transit" },
    { state: "out-for-delivery", label: "Out for delivery" },
    { state: "delivered", label: "Delivered" },
    { state: "completed", label: "Completed" },
  ];

  const currentIdx = steps.findIndex((step) => step.state === state);

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const done = index < currentIdx;
        const active = index === currentIdx;

        return (
          <div key={step.state} className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${done ? "bg-[var(--color-green)]" : active ? "border-2 bg-white" : "bg-[var(--color-border)]"}`} style={active ? { borderColor: STATE_CONFIG[state].color, background: STATE_CONFIG[state].bg } : {}}>
                {done && <div className="w-2 h-2 rounded-full bg-white" />}
                {active && <div className="w-2 h-2 rounded-full" style={{ background: STATE_CONFIG[state].color }} />}
              </div>
              {index < steps.length - 1 && <div className={`w-px flex-1 min-h-[24px] mt-0.5 mb-0.5 ${done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />}
            </div>
            <div className="pb-3 min-w-0">
              <p className={`text-sm font-[${active ? "600" : "400"}] ${active ? "" : done ? "text-[var(--color-ink-secondary)]" : "text-[var(--color-ink-disabled)]"}`} style={active ? { color: STATE_CONFIG[state].color } : {}}>
                {step.label}
              </p>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{done || active ? "Recorded in backend order history" : "Pending"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage({ orderNumber, deliveryState }: { orderNumber?: string; deliveryState?: DeliveryState }) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(orderNumber));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const response = await fetchBuyerOrder(orderNumber);
        if (!active) return;
        setOrder(response.data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setOrder(null);
        setError(err instanceof Error ? err.message : "Unable to load order details.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [orderNumber]);

  const state = useMemo(() => normalizeState(order?.status ?? deliveryState), [deliveryState, order?.status]);
  const cfg = STATE_CONFIG[state];
  const shippingAddress = order
    ? [order.shipping_name, order.shipping_phone, order.shipping_line1, order.shipping_line2, order.shipping_city, order.shipping_province, order.shipping_postal_code]
      .filter(Boolean)
      .join(" · ")
    : "";

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading order details...</div>;
  }

  if (error) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-6">
            <p className="text-sm text-[var(--color-red)]">{error}</p>
            <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors">Go back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 text-sm text-[var(--color-ink-muted)]">
            No order details are available for this route.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate("/account/orders")} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Orders</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{order.order_number ?? `Order #${order.id}`}</span>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
          <span className="text-xl shrink-0">{cfg.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-[600]" style={{ color: cfg.color }}>{cfg.label}</p>
            <p className="text-xs mt-0.5" style={{ color: cfg.color, opacity: 0.75 }}>
              {order.payment_status ? `Payment status: ${order.payment_status}` : "Order details loaded from the backend."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-5">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-0.5">Order reference</p>
                  <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-navy)]">{order.order_number ?? `Order #${order.id}`}</p>
                </div>
                <div className="text-right">
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Placed on</p>
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{order.placed_at ? new Date(order.placed_at).toLocaleString() : "Unavailable"}</p>
                </div>
              </div>
            </div>

            {order.seller_orders.map((sellerOrder) => (
              <div key={sellerOrder.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="w-8 h-8 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                    <span className="text-white font-[var(--font-display)] text-sm">{sellerOrder.seller_name[0] ?? "S"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-[600] text-[var(--color-ink)]">{sellerOrder.seller_name}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] capitalize">{sellerOrder.status.replaceAll("-", " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-[600] text-[var(--color-ink)]">{currency(sellerOrder.grand_total)}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Shipping {currency(sellerOrder.shipping_fee)}</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-[var(--color-ink-muted)]">Tracking number: {sellerOrder.tracking_number ?? "Not yet assigned"}</p>
                  {sellerOrder.courier_name && <p className="text-sm text-[var(--color-ink-muted)]">Courier: {sellerOrder.courier_name}</p>}
                </div>
              </div>
            ))}

            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-3">Delivery Address</p>
              <p className="text-sm font-[500] text-[var(--color-ink)]">{order.shipping_name ?? "No recipient name"}</p>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{order.shipping_phone ?? ""}</p>
              <p className="text-sm text-[var(--color-ink-secondary)] mt-1">{shippingAddress || "No shipping address available."}</p>
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Payment Summary</p>
              <div className="space-y-2">
                {[
                  ["Method", order.payment_method ?? "Unknown"],
                  ["Status", order.payment_status ?? "Unknown"],
                  ["Merchandise", currency(order.items.reduce((sum, item) => sum + item.subtotal, 0))],
                  ["Shipping", currency(order.seller_orders.reduce((sum, sellerOrder) => sum + sellerOrder.shipping_fee, 0))],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[var(--color-ink-muted)]">{label}</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{value}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--color-border)] pt-2 flex justify-between">
                  <span className="font-[600] text-[var(--color-ink)]">Total paid</span>
                  <span className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">{currency(order.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Order Items</p>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-14 h-14 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                      {item.image ? <img src={item.image} alt={item.product_name ?? "Item"} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug truncate">{item.product_name ?? "Item"}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{item.variant_name ?? "Default"} · Qty {item.quantity}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">SKU: {item.sku ?? "N/A"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-[600] text-[var(--color-ink)]">{currency(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-4">Delivery Timeline</p>
              <Timeline state={state} />
            </div>

            {POSITIVE_FLOW.includes(state) && state !== "completed" && (
              <div className="bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] uppercase tracking-wide mb-1">Status note</p>
                <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-navy)]">This order is currently {cfg.label.toLowerCase()}.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { STATE_CONFIG };
