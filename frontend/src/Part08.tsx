import { useState } from "react";
import PublicShell from "./shells/PublicShell";
import CheckoutFlow from "./pages/checkout/CheckoutFlow";
import OrderHistoryPage from "./pages/orders/OrderHistoryPage";
import OrderDetailPage, { DELIVERY_STATES, DeliveryState } from "./pages/orders/OrderDetailPage";
import SellerOrdersPage from "./pages/seller/SellerOrdersPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";

type Section = "checkout" | "payment-states" | "orders" | "order-detail" | "seller-orders" | "admin-orders";
type CheckoutStep = 1 | 2 | 3 | 4 | 5 | 6;
type PaymentOutcome = "processing" | "failed";

const SECTIONS: { id: Section; label: string; sublabel: string }[] = [
  { id: "checkout",       label: "Checkout",        sublabel: "6-step flow" },
  { id: "payment-states", label: "Payment States",  sublabel: "Processing · Success · Failed" },
  { id: "orders",         label: "Order History",   sublabel: "List · Search · Filters" },
  { id: "order-detail",   label: "Order Detail",    sublabel: "Tracking · Timeline · All states" },
  { id: "seller-orders",  label: "Seller Orders",   sublabel: "Fulfillment · Courier view" },
  { id: "admin-orders",   label: "Admin Orders",    sublabel: "Exceptions · Full detail" },
];

const DELIVERY_STATE_LABELS: Record<DeliveryState, string> = {
  "awaiting-fulfillment": "Awaiting",
  "processing":           "Processing",
  "ready-for-pickup":     "Ready",
  "picked-up":            "Picked up",
  "in-transit":           "In transit",
  "out-for-delivery":     "Out for delivery",
  "delivered":            "Delivered",
  "completed":            "Completed",
  "cancelled":            "Cancelled",
  "failed":               "Failed",
  "returned":             "Returned",
  "refunded":             "Refunded",
};

function PaymentStatesPanel() {
  const [state, setState] = useState<"processing" | "success" | "failed">("processing");

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* State switcher */}
        <div className="flex gap-2 justify-center mb-8">
          {(["processing", "success", "failed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={`px-4 py-2 text-sm font-[500] rounded-sm border transition-colors cursor-pointer capitalize ${state === s ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-8">
          {state === "processing" && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-[var(--color-border)]" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[var(--color-navy)] animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-1">Processing payment…</p>
                <p className="text-sm text-[var(--color-ink-muted)]">Please do not close this window or press the back button.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2L3 5v5c0 3.5 2.6 6.8 6 7.5C13.4 16.8 16 13.5 16 10V5L9 2z" /></svg>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Secured with 256-bit TLS encryption</span>
              </div>
              <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 space-y-1.5">
                {[["Merchant", "Marketo Inc."], ["Amount", "₱6,640"], ["Method", "Visa •••• 4242"]].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[var(--color-ink-muted)]">{label}</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-green-light)] border-2 border-[var(--color-green-border)] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round"><path d="M6 16l7 7 13-13" /></svg>
              </div>
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Payment successful</p>
                <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-1">₱6,640 paid</p>
                <p className="text-sm text-[var(--color-ink-muted)]">Your order has been placed and confirmed.</p>
              </div>
              <div className="w-full max-w-sm bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm p-4 space-y-1.5">
                {[["Order reference", "ORD-2857"], ["Transaction ID", "VX-20260815-28570"], ["Amount", "₱6,640"], ["Method", "Visa •••• 4242"], ["Date", "Aug 15, 2026"]].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[var(--color-green)]/70">{label}</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-green)] font-[500]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Track my order</button>
                <button className="px-4 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer transition-colors">Continue shopping</button>
              </div>
            </div>
          )}

          {state === "failed" && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-red-light)] border-2 border-[var(--color-red-border)] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"><path d="M8 8l16 16M24 8L8 24" /></svg>
              </div>
              <div>
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Payment failed</p>
                <p className="text-sm text-[var(--color-ink-muted)] mb-1">We could not process your payment. No charge was made.</p>
              </div>
              <div className="w-full max-w-sm bg-[var(--color-red-light)] border border-[var(--color-red-border)] rounded-sm p-4 space-y-1.5">
                {[["Reason", "Insufficient funds"], ["Error code", "4012"], ["Amount", "₱6,640"], ["Method", "Visa •••• 4242"]].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[var(--color-red)]/70">{label}</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-red)]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <button className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Try a different card</button>
                <button className="w-full py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer transition-colors">Try another payment method</button>
                <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Contact payment support</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Part08() {
  const [section, setSection] = useState<Section>("checkout");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [paymentOutcome, setPaymentOutcome] = useState<"success" | "failed">("success");
  const [deliveryState, setDeliveryState] = useState<DeliveryState>("in-transit");

  const noShell = section === "seller-orders" || section === "admin-orders";

  const renderContent = () => {
    if (noShell) {
      if (section === "seller-orders") return <SellerOrdersPage />;
      if (section === "admin-orders") return <AdminOrdersPage />;
    }

    const wrapped = (children: React.ReactNode) => (
      <PublicShell isLoggedIn cartCount={3} wishlistCount={34}>{children}</PublicShell>
    );

    switch (section) {
      case "checkout": return wrapped(<CheckoutFlow initialStep={checkoutStep} simulatePayment={paymentOutcome} key={`${checkoutStep}-${paymentOutcome}`} />);
      case "payment-states": return wrapped(<PaymentStatesPanel />);
      case "orders": return wrapped(<OrderHistoryPage />);
      case "order-detail": return wrapped(<OrderDetailPage deliveryState={deliveryState} key={deliveryState} />);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-ground)]">

      {/* ── CONTROL STRIP ──────────────────────────────────── */}
      <div className="shrink-0 bg-[#0F2030] border-b border-white/10 flex items-center gap-3 px-4 py-2 overflow-x-auto">
        <span className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest shrink-0">PART 08 — CHECKOUT & ORDERS</span>

        {/* Section tabs */}
        <div className="flex items-center gap-1 shrink-0">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`shrink-0 font-[var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${section === s.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/15 shrink-0" />

        {/* Sub-controls per section */}
        {section === "checkout" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="font-[var(--font-mono)] text-[9px] text-white/30">step:</span>
              {([1, 2, 3, 4, 5, 6] as CheckoutStep[]).map(s => (
                <button key={s} onClick={() => setCheckoutStep(s)}
                  className={`font-[var(--font-mono)] text-[10px] w-6 h-6 rounded-sm cursor-pointer transition-colors ${checkoutStep === s ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/10"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-mono)] text-[9px] text-white/30">payment:</span>
              {(["success", "failed"] as const).map(o => (
                <button key={o} onClick={() => setPaymentOutcome(o)}
                  className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-sm cursor-pointer transition-colors ${paymentOutcome === o ? "bg-white/20 text-white" : "text-white/35 hover:text-white/60"}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        {section === "order-detail" && (
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-[var(--font-mono)] text-[9px] text-white/30 shrink-0">state:</span>
            {DELIVERY_STATES.map(s => (
              <button key={s} onClick={() => setDeliveryState(s)}
                className={`shrink-0 font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-sm cursor-pointer transition-colors ${deliveryState === s ? "bg-white/20 text-white" : "text-white/35 hover:text-white/60"}`}>
                {DELIVERY_STATE_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
