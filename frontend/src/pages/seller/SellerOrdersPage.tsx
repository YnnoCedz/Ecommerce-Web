import { useState } from "react";

type FulfillmentStatus = "new" | "confirmed" | "preparing" | "ready" | "picked-up" | "in-transit" | "delivered" | "completed" | "cancelled" | "failed";

const FULFILLMENT_CONFIG: Record<FulfillmentStatus, { label: string; color: string; bg: string; border: string; actions: string[] }> = {
  "new":        { label: "New order",     color: "var(--color-amber)",      bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   actions: ["Confirm", "Cancel"] },
  "confirmed":  { label: "Confirmed",     color: "var(--color-navy)",       bg: "var(--color-navy-surface)",   border: "var(--color-navy-border)",    actions: ["Mark preparing"] },
  "preparing":  { label: "Preparing",     color: "var(--color-navy)",       bg: "var(--color-navy-surface)",   border: "var(--color-navy-border)",    actions: ["Mark ready"] },
  "ready":      { label: "Ready",         color: "var(--color-green)",      bg: "var(--color-green-light)",    border: "var(--color-green-border)",   actions: ["Awaiting pickup"] },
  "picked-up":  { label: "Picked up",     color: "var(--color-amber)",      bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   actions: [] },
  "in-transit": { label: "In transit",    color: "var(--color-amber)",      bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   actions: [] },
  "delivered":  { label: "Delivered",     color: "var(--color-green)",      bg: "var(--color-green-light)",    border: "var(--color-green-border)",   actions: [] },
  "completed":  { label: "Completed",     color: "var(--color-green)",      bg: "var(--color-green-light)",    border: "var(--color-green-border)",   actions: [] },
  "cancelled":  { label: "Cancelled",     color: "var(--color-ink-muted)",  bg: "var(--color-surface)",        border: "var(--color-border)",         actions: [] },
  "failed":     { label: "Failed",        color: "var(--color-red)",        bg: "var(--color-red-light)",      border: "var(--color-red-border)",     actions: [] },
};

type SellerOrder = {
  id: string;
  date: string;
  customer: { name: string; email: string };
  items: { product: string; variant: string; qty: number; price: number; image: string }[];
  total: number;
  status: FulfillmentStatus;
  courier?: { name: string; tracking: string; driver?: string };
  deliveryAddress: string;
  paymentMethod: string;
};

const SELLER_ORDERS: SellerOrder[] = [
  {
    id: "ORD-2849",
    date: "Aug 5, 2026",
    customer: { name: "Ana Reyes", email: "ana.reyes@example.com" },
    items: [
      { product: "Minimalist Chronograph Watch", variant: "Silver / Black dial", qty: 1, price: 4200, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop&auto=format" },
      { product: "Genuine Leather Strap — 20mm", variant: "Tan / Silver buckle", qty: 2, price: 580, image: "https://images.unsplash.com/photo-1617077644557-64be144aa306?w=100&h=100&fit=crop&auto=format" },
    ],
    total: 5360,
    status: "completed",
    courier: { name: "J&T Express", tracking: "PH82849120", driver: "Marco S." },
    deliveryAddress: "24B Sampaguita St., Salcedo Village, Makati",
    paymentMethod: "Visa •••• 4242",
  },
  {
    id: "ORD-2837",
    date: "Aug 12, 2026",
    customer: { name: "Carlos Rivera", email: "carlos.r@example.com" },
    items: [
      { product: "Brass Desk Clock", variant: "Antique brass", qty: 1, price: 1850, image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=100&h=100&fit=crop&auto=format" },
    ],
    total: 1850,
    status: "new",
    deliveryAddress: "88 Adriatico St., Malate, Manila",
    paymentMethod: "GCash",
  },
  {
    id: "ORD-2835",
    date: "Aug 11, 2026",
    customer: { name: "Sofia Cruz", email: "sofia.cruz@example.com" },
    items: [
      { product: "Minimalist Chronograph Watch", variant: "Gold / White dial", qty: 1, price: 4200, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop&auto=format" },
    ],
    total: 4200,
    status: "preparing",
    deliveryAddress: "15F Robinsons Cybergate, Mandaluyong",
    paymentMethod: "Maya",
  },
  {
    id: "ORD-2830",
    date: "Aug 10, 2026",
    customer: { name: "Ben Torres", email: "ben.torres@example.com" },
    items: [
      { product: "Minimalist Chronograph Watch", variant: "Rose Gold / Cream", qty: 1, price: 4200, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop&auto=format" },
    ],
    total: 4200,
    status: "in-transit",
    courier: { name: "LBC", tracking: "LBC83012994", driver: "Joey M." },
    deliveryAddress: "30F BGC One Corporate Centre, Taguig",
    paymentMethod: "Visa •••• 1234",
  },
  {
    id: "ORD-2821",
    date: "Aug 8, 2026",
    customer: { name: "Lena Bautista", email: "lena.b@example.com" },
    items: [
      { product: "Genuine Leather Strap — 20mm", variant: "Black / Gold buckle", qty: 3, price: 580, image: "https://images.unsplash.com/photo-1617077644557-64be144aa306?w=100&h=100&fit=crop&auto=format" },
    ],
    total: 1740,
    status: "cancelled",
    deliveryAddress: "55 Timog Ave., Quezon City",
    paymentMethod: "COD",
  },
];

function StatusBadge({ status }: { status: FulfillmentStatus }) {
  const cfg = FULFILLMENT_CONFIG[status];
  return (
    <span className="inline-flex items-center font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function FulfillmentFlow({ current }: { current: FulfillmentStatus }) {
  const flow: FulfillmentStatus[] = ["new", "confirmed", "preparing", "ready", "picked-up", "in-transit", "delivered", "completed"];
  const currentIdx = flow.indexOf(current);
  if (currentIdx === -1) return null;

  const labels: Record<string, string> = {
    "new": "New", "confirmed": "Confirmed", "preparing": "Preparing",
    "ready": "Ready", "picked-up": "Picked up", "in-transit": "Transit",
    "delivered": "Delivered", "completed": "Done"
  };

  return (
    <div className="flex items-center gap-0 mb-4 overflow-x-auto">
      {flow.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const cfg = FULFILLMENT_CONFIG[s];
        return (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-[var(--font-mono)] whitespace-nowrap ${
              done ? "bg-[var(--color-green-light)] text-[var(--color-green)]" :
              active ? "" : "text-[var(--color-ink-disabled)]"
            }`} style={active ? { background: cfg.bg, color: cfg.color } : {}}>
              {done && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 5l2.5 2.5 3.5-4" /></svg>}
              {labels[s]}
            </div>
            {i < flow.length - 1 && (
              <div className={`w-4 h-px ${done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, onAction }: { order: SellerOrder; onAction: (id: string, action: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = FULFILLMENT_CONFIG[order.status];

  return (
    <div className={`bg-white border rounded-sm overflow-hidden transition-colors ${order.status === "new" ? "border-[var(--color-amber-border)]" : "border-[var(--color-border)]"}`}>
      {/* New order highlight */}
      {order.status === "new" && (
        <div className="h-1 bg-[var(--color-amber)]" />
      )}

      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div>
          <p className="font-[var(--font-mono)] text-[11px] font-[600] text-[var(--color-ink)]">{order.id}</p>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.date}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{order.customer.name}</p>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] truncate">{order.customer.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={order.status} />
          <span className="font-[var(--font-display)] text-base font-[400] text-[var(--color-ink)]">₱{order.total.toLocaleString()}</span>
          <button onClick={() => setExpanded(e => !e)} className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`}><path d="M2 4l4 4 4-4" /></svg>
          </button>
        </div>
      </div>

      {/* Items preview (always visible) */}
      <div className="flex gap-4 px-5 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex gap-2">
          {order.items.map(it => (
            <div key={it.product} className="w-12 h-12 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
              <img src={it.image} alt={it.product} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          {order.items.map(it => (
            <p key={it.product} className="text-xs text-[var(--color-ink)] truncate leading-relaxed">
              {it.product} <span className="text-[var(--color-ink-muted)]">({it.variant}) × {it.qty}</span>
            </p>
          ))}
        </div>

        {/* Quick actions */}
        {cfg.actions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {cfg.actions.map(action => (
              <button
                key={action}
                onClick={() => onAction(order.id, action)}
                className={`text-xs font-[500] px-3 py-1.5 rounded-sm cursor-pointer transition-colors whitespace-nowrap ${
                  action === "Cancel"
                    ? "border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
                    : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
                }`}>
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 py-4 space-y-4">
          <FulfillmentFlow current={order.status} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delivery info */}
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">Delivery address</p>
              <p className="text-sm text-[var(--color-ink-secondary)]">{order.customer.name}</p>
              <p className="text-sm text-[var(--color-ink-secondary)]">{order.deliveryAddress}</p>
            </div>

            {/* Payment */}
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">Payment</p>
              <p className="text-sm text-[var(--color-ink)]">{order.paymentMethod}</p>
              <p className="text-sm font-[600] text-[var(--color-ink)]">₱{order.total.toLocaleString()}</p>
            </div>

            {/* Courier info */}
            {order.courier && (
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">Courier assignment</p>
                <p className="text-sm font-[500] text-[var(--color-ink)]">{order.courier.name}</p>
                {order.courier.driver && <p className="text-sm text-[var(--color-ink-secondary)]">Driver: {order.courier.driver}</p>}
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">Tracking: {order.courier.tracking}</p>
              </div>
            )}

            {/* Items with prices */}
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">Items</p>
              {order.items.map(it => (
                <div key={it.product} className="flex justify-between text-sm mb-0.5">
                  <span className="text-[var(--color-ink-secondary)] truncate mr-2">{it.product} × {it.qty}</span>
                  <span className="font-[500] text-[var(--color-ink)] shrink-0">₱{(it.price * it.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>(SELLER_ORDERS);
  const [activeFilter, setActiveFilter] = useState<"all" | "new" | "active" | "completed" | "cancelled">("all");
  const [search, setSearch] = useState("");

  const handleAction = (id: string, action: string) => {
    const progressMap: Record<string, FulfillmentStatus> = {
      "Confirm": "confirmed",
      "Mark preparing": "preparing",
      "Mark ready": "ready",
    };
    if (action === "Cancel") {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
    } else if (progressMap[action]) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: progressMap[action] } : o));
    }
  };

  const filters: { id: typeof activeFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: orders.length },
    { id: "new", label: "New", count: orders.filter(o => o.status === "new").length },
    { id: "active", label: "Active", count: orders.filter(o => ["confirmed", "preparing", "ready", "picked-up", "in-transit"].includes(o.status)).length },
    { id: "completed", label: "Completed", count: orders.filter(o => ["delivered", "completed"].includes(o.status)).length },
    { id: "cancelled", label: "Cancelled / Failed", count: orders.filter(o => ["cancelled", "failed"].includes(o.status)).length },
  ];

  let filtered = orders;
  if (activeFilter === "new") filtered = filtered.filter(o => o.status === "new");
  else if (activeFilter === "active") filtered = filtered.filter(o => ["confirmed", "preparing", "ready", "picked-up", "in-transit"].includes(o.status));
  else if (activeFilter === "completed") filtered = filtered.filter(o => ["delivered", "completed"].includes(o.status));
  else if (activeFilter === "cancelled") filtered = filtered.filter(o => ["cancelled", "failed"].includes(o.status));

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(o => o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.items.some(it => it.product.toLowerCase().includes(q)));
  }

  const newCount = orders.filter(o => o.status === "new").length;

  return (
    <div className="px-6 py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Orders</h1>
            {newCount > 0 && (
              <p className="text-sm text-[var(--color-amber)] mt-0.5 font-[500]">{newCount} new {newCount === 1 ? "order" : "orders"} require your attention</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm px-4 py-2 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Today's revenue", value: "₱11,360", sub: "+2 orders" },
            { label: "Pending action", value: newCount.toString(), sub: "Require confirmation", urgent: newCount > 0 },
            { label: "In transit", value: orders.filter(o => ["picked-up", "in-transit", "out-for-delivery"].includes(o.status)).length.toString(), sub: "Active shipments" },
            { label: "Completed (Aug)", value: "18", sub: "₱68,400 earned" },
          ].map(({ label, value, sub, urgent }) => (
            <div key={label} className={`bg-white border rounded-sm p-4 ${urgent ? "border-[var(--color-amber-border)] bg-[var(--color-amber-light)]" : "border-[var(--color-border)]"}`}>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1">{label}</p>
              <p className={`font-[var(--font-display)] text-2xl font-[300] ${urgent ? "text-[var(--color-amber)]" : "text-[var(--color-ink)]"}`}>{value}</p>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{sub}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l2.5 2.5" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID, customer or product…" className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-[var(--color-border)] rounded-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors" />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 border-b border-[var(--color-border)] mb-5">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-[500] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeFilter === f.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
              {f.label}
              <span className={`font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded ${activeFilter === f.id ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-muted)]"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Order cards */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">No orders found</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
  );
}
