import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LoaderCircle, MessageSquare, RotateCcw, Star, X } from "lucide-react";
import { createReview, startConversation } from "../../api/account";
import { cancelSellerOrder, completeSellerOrder, fetchBuyerOrder, requestReturn, retryOrderPayment, type BuyerOrderDetail } from "../../api/buyer";
import { useToast } from "../../components/ToastProvider";
import DeliveryProofViewer from "../../components/orders/DeliveryProofViewer";

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
  const { showToast } = useToast();
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(orderNumber));
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [reviewSellerOrderId, setReviewSellerOrderId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [action, setAction] = useState<{ type: "cancel" | "return"; sellerOrderId: number } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [returnReason, setReturnReason] = useState("damaged_item");
  const [selectedReturnItems, setSelectedReturnItems] = useState<Record<number, boolean>>({});
  const [evidence, setEvidence] = useState<File[]>([]);
  const [actionBusy, setActionBusy] = useState(false);

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
  const reviewItem = order?.items.find((item) => item.seller_order_id === reviewSellerOrderId && !item.reviewed) ?? null;
  const shippingAddress = order
    ? [order.shipping_name, order.shipping_phone, order.shipping_line1, order.shipping_line2, order.shipping_city, order.shipping_province, order.shipping_postal_code]
      .filter(Boolean)
      .join(" · ")
    : "";

  const markReceived = async (sellerOrderId: number) => {
    if (!orderNumber) return;
    setCompletingId(sellerOrderId);
    try {
      const response = await completeSellerOrder(orderNumber, sellerOrderId);
      const refreshed = await fetchBuyerOrder(orderNumber);
      setOrder(refreshed.data);
      setReviewSellerOrderId(sellerOrderId);
      setReviewRating(5);
      setReviewComment("");
      showToast({ title: "Order received", message: response.message });
    } catch (err) {
      showToast({ kind: "error", title: "Order not completed", error: err, errorContext: "orders" });
    } finally {
      setCompletingId(null);
    }
  };

  const submitProductReview = async () => {
    if (!order || !reviewItem) return;
    setSavingReview(true);
    try {
      const response = await createReview({
        order_item_id: reviewItem.id,
        rating: reviewRating,
        title: "",
        body: reviewComment,
      });
      const remaining = order.items.filter((item) => item.seller_order_id === reviewSellerOrderId && !item.reviewed && item.id !== reviewItem.id);
      setOrder({ ...order, items: order.items.map((item) => item.id === reviewItem.id ? { ...item, reviewed: true, review_id: response.data.id } : item) });
      setReviewRating(5);
      setReviewComment("");
      if (remaining.length === 0) setReviewSellerOrderId(null);
      showToast({ title: "Review submitted", message: response.message });
    } catch (err) {
      showToast({ kind: "error", title: "Review not saved", error: err, errorContext: "orders" });
    } finally {
      setSavingReview(false);
    }
  };

  const refresh = async () => {
    if (!orderNumber) return;
    setOrder((await fetchBuyerOrder(orderNumber)).data);
  };

  const messageSeller = async (sellerOrder: BuyerOrderDetail["seller_orders"][number]) => {
    try {
      const response = await startConversation({ seller_id: sellerOrder.seller_id, order_id: order.id, seller_order_id: sellerOrder.id, subject: `Order ${order.order_number}` });
      navigate(`/account/messages?conversation=${response.data.id}`);
    } catch (error) { showToast({ kind: "error", title: "Conversation unavailable", error, errorContext: "messaging" }); }
  };

  const submitResolution = async () => {
    if (!action || !orderNumber || actionReason.trim().length < 5) return;
    setActionBusy(true);
    try {
      if (action.type === "cancel") {
        const response = await cancelSellerOrder(orderNumber, action.sellerOrderId, actionReason.trim());
        showToast({ title: "Order cancelled", message: response.message });
      } else {
        const items = order.items.filter((item) => item.seller_order_id === action.sellerOrderId && selectedReturnItems[item.id]).map((item) => ({ order_item_id: item.id, quantity: item.quantity }));
        if (items.length === 0) throw new Error("Select at least one item to return.");
        const response = await requestReturn(orderNumber, action.sellerOrderId, { reason: returnReason, buyer_statement: actionReason.trim(), items, evidence });
        showToast({ title: "Return requested", message: response.message });
      }
      await refresh(); setAction(null); setActionReason(""); setSelectedReturnItems({}); setEvidence([]);
    } catch (error) { showToast({ kind: "error", title: "Request not saved", error, errorContext: "orders" }); }
    finally { setActionBusy(false); }
  };

  const retryPayment = async () => {
    if (!orderNumber) return;
    try { const response = await retryOrderPayment(orderNumber); await refresh(); showToast({ title: response.data.status === "paid" ? "Demo payment successful" : "Payment attempt saved", message: response.message }); }
    catch (error) { showToast({ kind: "error", title: "Payment retry failed", error, errorContext: "checkout" }); }
  };

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
    <>
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
                  <DeliveryProofViewer shipmentId={sellerOrder.shipment_id} proof={sellerOrder.proof_of_delivery} />
                  {sellerOrder.can_mark_received && (
                    <button onClick={() => void markReceived(sellerOrder.id)} disabled={completingId === sellerOrder.id} className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[var(--color-green)] px-4 py-2.5 text-sm font-[600] text-white disabled:cursor-not-allowed disabled:opacity-60">
                      {completingId === sellerOrder.id && <LoaderCircle size={15} className="animate-spin" />}
                      Order Received
                    </button>
                  )}
                  {sellerOrder.status === "completed" && order.items.some((item) => item.seller_order_id === sellerOrder.id && !item.reviewed) && (
                    <button onClick={() => setReviewSellerOrderId(sellerOrder.id)} className="mt-4 rounded-sm border border-[var(--color-navy)] px-4 py-2.5 text-sm font-[500] text-[var(--color-navy)] hover:bg-[var(--color-navy-surface)]">
                      Review products
                    </button>
                  )}
                  {sellerOrder.status === "completed" && order.items.filter((item) => item.seller_order_id === sellerOrder.id).every((item) => item.reviewed) && (
                    <p className="mt-4 inline-flex rounded-full bg-[var(--color-green-light)] px-3 py-1 text-xs font-[600] text-[var(--color-green)]">Reviewed</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => void messageSeller(sellerOrder)} className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-ink)] hover:border-[var(--color-navy)]"><MessageSquare size={14} /> Message seller</button>
                    {sellerOrder.can_cancel && <button onClick={() => setAction({ type: "cancel", sellerOrderId: sellerOrder.id })} className="rounded-sm border border-[var(--color-red-border)] px-3 py-2 text-xs text-[var(--color-red)]">Cancel seller order</button>}
                    {sellerOrder.can_return && <button onClick={() => setAction({ type: "return", sellerOrderId: sellerOrder.id })} className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs"><RotateCcw size={14} /> Request return</button>}
                  </div>
                  {sellerOrder.cancellation && <p className="mt-3 text-xs text-[var(--color-ink-muted)]">Cancelled: {sellerOrder.cancellation.reason}</p>}
                  {sellerOrder.return_requests.map((item) => <p key={item.id} className="mt-2 text-xs capitalize text-[var(--color-navy)]">Return #{item.id}: {item.status.replaceAll("_", " ")}</p>)}
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
                {(order.payment_status === "failed" || order.payment_status === "pending") && order.payment_method !== "cod" && <button onClick={() => void retryPayment()} className="mt-3 w-full rounded-sm border border-[var(--color-navy)] px-3 py-2 text-sm text-[var(--color-navy)]">Retry demo payment</button>}
                <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3"><p className="mb-2 text-xs font-[600] text-[var(--color-ink)]">Transaction history</p>{order.payments.map((payment) => <div key={payment.id} className="mb-2 rounded-sm bg-[var(--color-surface)] p-2.5 text-xs"><div className="flex justify-between"><span className="capitalize">{payment.type} · {payment.status.replaceAll("_", " ")}</span><span>{currency(payment.amount)}</span></div><p className="mt-1 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{payment.reference ?? "No reference"}{payment.sandbox ? " · Demo transaction" : ""}</p></div>)}</div>
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
    {reviewSellerOrderId !== null && reviewItem && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Review purchased product">
        <div className="w-full max-w-md rounded-sm border border-[var(--color-border)] bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">How was your purchase?</p><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Rate {reviewItem.product_name ?? "this product"}. Your comment is optional.</p></div>
            <button onClick={() => setReviewSellerOrderId(null)} aria-label="Close review" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"><X size={19} /></button>
          </div>
          <div className="mt-5 flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${rating} stars`} onClick={() => setReviewRating(rating)}><Star size={28} className={rating <= reviewRating ? "fill-[var(--color-amber)] text-[var(--color-amber)]" : "text-[var(--color-border)]"} /></button>)}
          </div>
          <label className="mt-5 block text-xs font-[500] text-[var(--color-ink)]">Comment (optional)<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={3000} rows={4} placeholder="Share what went well..." className="mt-1.5 w-full resize-none rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-navy)]" /></label>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setReviewSellerOrderId(null)} className="px-3 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">Maybe later</button>
            <button onClick={() => void submitProductReview()} disabled={savingReview} className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm font-[500] text-white disabled:opacity-60">{savingReview && <LoaderCircle size={15} className="animate-spin" />}Submit review</button>
          </div>
        </div>
      </div>
    )}
    {action && (
      <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-sm border border-[var(--color-border)] bg-white p-6"><div className="flex justify-between gap-3"><div><h2 className="font-[var(--font-display)] text-xl">{action.type === "cancel" ? "Cancel seller order" : "Request return / refund"}</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">This request is validated and persisted by Marketo.</p></div><button onClick={() => setAction(null)}><X size={19} /></button></div>{action.type === "return" && <><label className="mt-5 block text-xs font-[500]">Reason<select value={returnReason} onChange={(event) => setReturnReason(event.target.value)} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm"><option value="damaged_item">Damaged item</option><option value="wrong_item">Wrong item</option><option value="missing_item">Missing item</option><option value="defective_item">Defective item</option><option value="not_as_described">Item not as described</option><option value="other">Other</option></select></label><div className="mt-4 space-y-2">{order.items.filter((item) => item.seller_order_id === action.sellerOrderId).map((item) => <label key={item.id} className="flex items-center gap-3 rounded-sm border border-[var(--color-border)] p-3 text-sm"><input type="checkbox" checked={Boolean(selectedReturnItems[item.id])} onChange={(event) => setSelectedReturnItems((current) => ({ ...current, [item.id]: event.target.checked }))} /><span className="flex-1">{item.product_name} × {item.quantity}</span><span>{currency(item.subtotal)}</span></label>)}</div><label className="mt-4 block text-xs font-[500]">Evidence (optional)<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setEvidence(Array.from(event.target.files ?? []).slice(0, 5))} className="mt-1.5 block w-full text-sm" /></label></>}<label className="mt-4 block text-xs font-[500]">{action.type === "cancel" ? "Cancellation reason" : "Explanation"}<textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} minLength={5} maxLength={3000} rows={4} className="mt-1.5 w-full resize-none rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" /></label><div className="mt-5 flex justify-end gap-2"><button onClick={() => setAction(null)} className="px-4 py-2.5 text-sm text-[var(--color-ink-muted)]">Keep order</button><button onClick={() => void submitResolution()} disabled={actionBusy || actionReason.trim().length < 5} className="rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm text-white disabled:opacity-50">{actionBusy ? "Saving..." : "Confirm request"}</button></div></div></div>
    )}
    </>
  );
}

export { STATE_CONFIG };
