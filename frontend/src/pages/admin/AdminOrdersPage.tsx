import { useState } from "react";
import AdminShell from "../../shells/AdminShell";

type OrderStatus = "processing" | "ready" | "in-transit" | "out-for-delivery" | "delivered" | "completed" | "cancelled" | "failed" | "returned" | "refunded";
type ExceptionType = "none" | "dispute" | "refund-request" | "fraud-flag" | "delayed";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  "processing":       { label: "Processing",      color: "var(--color-navy)",        bg: "var(--color-navy-surface)" },
  "ready":            { label: "Ready",            color: "var(--color-amber)",       bg: "var(--color-amber-light)" },
  "in-transit":       { label: "In transit",       color: "var(--color-amber)",       bg: "var(--color-amber-light)" },
  "out-for-delivery": { label: "Out for delivery", color: "#7B5200",                  bg: "#FEF3C7" },
  "delivered":        { label: "Delivered",        color: "var(--color-green)",       bg: "var(--color-green-light)" },
  "completed":        { label: "Completed",        color: "var(--color-green)",       bg: "var(--color-green-light)" },
  "cancelled":        { label: "Cancelled",        color: "var(--color-ink-muted)",   bg: "var(--color-surface)" },
  "failed":           { label: "Failed",           color: "var(--color-red)",         bg: "var(--color-red-light)" },
  "returned":         { label: "Returned",         color: "var(--color-red)",         bg: "var(--color-red-light)" },
  "refunded":         { label: "Refunded",         color: "var(--color-violet)",      bg: "var(--color-violet-light)" },
};

const EXCEPTION_CONFIG: Record<ExceptionType, { label: string; color: string; bg: string } | null> = {
  "none": null,
  "dispute":         { label: "Dispute open",      color: "var(--color-red)",     bg: "var(--color-red-light)" },
  "refund-request":  { label: "Refund requested",  color: "var(--color-amber)",   bg: "var(--color-amber-light)" },
  "fraud-flag":      { label: "Fraud flagged",     color: "var(--color-red)",     bg: "var(--color-red-light)" },
  "delayed":         { label: "Delivery delayed",  color: "var(--color-warning)", bg: "var(--color-warning-light)" },
};

type AdminOrder = {
  id: string;
  date: string;
  customer: { name: string; email: string; id: string };
  seller: { name: string; id: string };
  items: { product: string; qty: number; price: number; image: string }[];
  total: number;
  status: OrderStatus;
  exception: ExceptionType;
  courier?: { name: string; tracking: string };
  deliveryAddress: string;
  paymentMethod: string;
  paymentRef: string;
};

const ADMIN_ORDERS: AdminOrder[] = [
  { id: "ORD-2849", date: "Aug 5, 2026",  customer: { name: "Ana Reyes",      email: "ana.reyes@example.com",    id: "USR-001" }, seller: { name: "Atelier Manila",  id: "SEL-012" }, items: [{ product: "Minimalist Chronograph Watch", qty: 1, price: 4200, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop&auto=format" }, { product: "Leather Strap 20mm", qty: 2, price: 580, image: "https://images.unsplash.com/photo-1617077644557-64be144aa306?w=80&h=80&fit=crop&auto=format" }], total: 5360, status: "completed", exception: "none", courier: { name: "J&T Express", tracking: "PH82849120" }, deliveryAddress: "24B Sampaguita, Salcedo, Makati", paymentMethod: "Visa •••• 4242", paymentRef: "VX-20260805-28490" },
  { id: "ORD-2846", date: "Aug 4, 2026",  customer: { name: "Marco Dela Cruz", email: "marco.dc@example.com",   id: "USR-091" }, seller: { name: "Verde Botanics",  id: "SEL-007" }, items: [{ product: "Botanical Skincare Set", qty: 2, price: 1200, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=80&h=80&fit=crop&auto=format" }], total: 2400, status: "refunded", exception: "dispute", courier: { name: "LBC", tracking: "LBC83012001" }, deliveryAddress: "12A Bonifacio Global City, Taguig", paymentMethod: "GCash", paymentRef: "GC-20260804-28460" },
  { id: "ORD-2837", date: "Aug 12, 2026", customer: { name: "Carlos Rivera",   email: "carlos.r@example.com",    id: "USR-043" }, seller: { name: "Atelier Manila",  id: "SEL-012" }, items: [{ product: "Brass Desk Clock", qty: 1, price: 1850, image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=80&h=80&fit=crop&auto=format" }], total: 1850, status: "processing", exception: "none", deliveryAddress: "88 Adriatico, Malate, Manila", paymentMethod: "GCash", paymentRef: "GC-20260812-28370" },
  { id: "ORD-2831", date: "Aug 10, 2026", customer: { name: "Ana Reyes",       email: "ana.reyes@example.com",    id: "USR-001" }, seller: { name: "Verde Botanics",  id: "SEL-007" }, items: [{ product: "Natural Botanical Skincare Set", qty: 1, price: 1200, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=80&h=80&fit=crop&auto=format" }], total: 1280, status: "out-for-delivery", exception: "delayed", courier: { name: "J&T Express", tracking: "PH82831095" }, deliveryAddress: "24B Sampaguita, Salcedo, Makati", paymentMethod: "GCash", paymentRef: "GC-20260810-28310" },
  { id: "ORD-2825", date: "Aug 9, 2026",  customer: { name: "Lena Bautista",   email: "lena.b@example.com",       id: "USR-087" }, seller: { name: "Casa Leather",    id: "SEL-034" }, items: [{ product: "Genuine Leather Tote Bag", qty: 1, price: 2800, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=80&h=80&fit=crop&auto=format" }], total: 2800, status: "failed", exception: "refund-request", courier: { name: "Ninja Van", tracking: "NV829250021" }, deliveryAddress: "55 Timog Ave., QC", paymentMethod: "Maya", paymentRef: "MY-20260809-28250" },
  { id: "ORD-2818", date: "Aug 7, 2026",  customer: { name: "Sofia Cruz",      email: "sofia.cruz@example.com",   id: "USR-102" }, seller: { name: "Bloom Studio",    id: "SEL-019" }, items: [{ product: "Pressed Flower Art Print A3", qty: 2, price: 650, image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=80&h=80&fit=crop&auto=format" }], total: 1300, status: "delivered", exception: "none", courier: { name: "LBC", tracking: "LBC82818997" }, deliveryAddress: "15F Robinsons, Mandaluyong", paymentMethod: "Visa •••• 5678", paymentRef: "VX-20260807-28180" },
  { id: "ORD-2810", date: "Aug 5, 2026",  customer: { name: "Ben Torres",      email: "ben.torres@example.com",   id: "USR-055" }, seller: { name: "Habi Textiles",   id: "SEL-028" }, items: [{ product: "Linen Throw Blanket", qty: 1, price: 1800, image: "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=80&h=80&fit=crop&auto=format" }], total: 1880, status: "returned", exception: "none", courier: { name: "J&T Express", tracking: "PH82810038" }, deliveryAddress: "30F BGC One Corp Centre, Taguig", paymentMethod: "COD", paymentRef: "COD-20260805-28100" },
  { id: "ORD-2804", date: "Aug 3, 2026",  customer: { name: "Rey Santos",      email: "rey.santos@example.com",   id: "USR-078" }, seller: { name: "Form & Weave",    id: "SEL-041" }, items: [{ product: "Rattan Accent Chair", qty: 1, price: 8500, image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=80&h=80&fit=crop&auto=format" }], total: 8500, status: "cancelled", exception: "fraud-flag", deliveryAddress: "18 Banawe St., QC", paymentMethod: "Bank transfer", paymentRef: "BNK-20260803-28040" },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <span className="font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>;
}

function ExceptionBadge({ type }: { type: ExceptionType }) {
  const cfg = EXCEPTION_CONFIG[type];
  if (!cfg) return null;
  return <span className="font-[var(--font-mono)] text-[10px] font-[600] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: cfg.color, background: cfg.bg }}>⚠ {cfg.label}</span>;
}

type AdminOrderFilter = "all" | "exceptions" | "active" | "completed" | "cancelled";

export default function AdminOrdersPage() {
  const [orders] = useState<AdminOrder[]>(ADMIN_ORDERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AdminOrderFilter>("all");
  const [search, setSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");

  const allSellers = Array.from(new Set(orders.map(o => o.seller.name))).sort();

  let filtered = orders;
  if (activeFilter === "exceptions") filtered = filtered.filter(o => o.exception !== "none");
  else if (activeFilter === "active") filtered = filtered.filter(o => ["processing", "ready", "in-transit", "out-for-delivery"].includes(o.status));
  else if (activeFilter === "completed") filtered = filtered.filter(o => ["delivered", "completed"].includes(o.status));
  else if (activeFilter === "cancelled") filtered = filtered.filter(o => ["cancelled", "failed", "returned", "refunded"].includes(o.status));
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(o => o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.seller.name.toLowerCase().includes(q) || o.items.some(it => it.product.toLowerCase().includes(q))); }
  if (sellerFilter) filtered = filtered.filter(o => o.seller.name === sellerFilter);

  const selectedOrder = orders.find(o => o.id === selected);
  const exceptionCount = orders.filter(o => o.exception !== "none").length;

  const filters: { id: AdminOrderFilter; label: string; count: number; urgent?: boolean }[] = [
    { id: "all", label: "All orders", count: orders.length },
    { id: "exceptions", label: "Exceptions", count: exceptionCount, urgent: true },
    { id: "active", label: "Active", count: orders.filter(o => ["processing", "ready", "in-transit", "out-for-delivery"].includes(o.status)).length },
    { id: "completed", label: "Completed", count: orders.filter(o => ["delivered", "completed"].includes(o.status)).length },
    { id: "cancelled", label: "Cancelled / Failed", count: orders.filter(o => ["cancelled", "failed", "returned", "refunded"].includes(o.status)).length },
  ];

  return (
    <AdminShell activeNav="orders">
      <div className="flex h-full min-h-screen">

        {/* ── ORDER LIST ──────────────────────────────────────── */}
        <div className={`flex flex-col ${selectedOrder ? "hidden lg:flex lg:w-[55%]" : "w-full"} border-r border-[var(--color-border)]`}>
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Orders</h1>
              <div className="flex items-center gap-2">
                {exceptionCount > 0 && (
                  <span className="font-[var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-red-light)] text-[var(--color-red)]">
                    {exceptionCount} exceptions
                  </span>
                )}
                <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">Export</button>
              </div>
            </div>

            {/* Search + seller filter */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l2.5 2.5" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders, customers, sellers…" className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors" />
              </div>
              <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] outline-none cursor-pointer">
                <option value="">All sellers</option>
                {allSellers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-0 border-b border-[var(--color-border)]">
              {filters.map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)} className={`flex items-center gap-1 px-3 py-2 text-xs font-[500] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeFilter === f.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                  {f.label}
                  <span className={`font-[var(--font-mono)] text-[9px] px-1 rounded ${f.urgent && f.count > 0 ? "bg-[var(--color-red)] text-white" : activeFilter === f.id ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-muted)]"}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
            {[
              { label: "GMV (Aug)", value: "₱265K" },
              { label: "Orders (Aug)", value: "342" },
              { label: "Avg. order value", value: "₱1,854" },
              { label: "Disputes open", value: "2", urgent: true },
            ].map(({ label, value, urgent }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className={`font-[var(--font-display)] text-lg font-[300] ${urgent ? "text-[var(--color-red)]" : "text-[var(--color-ink)]"}`}>{value}</p>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{label}</p>
              </div>
            ))}
          </div>

          {/* Order rows */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(order => {
              const isSelected = selected === order.id;
              const hasException = order.exception !== "none";
              return (
                <button
                  key={order.id}
                  onClick={() => setSelected(isSelected ? null : order.id)}
                  className={`w-full text-left flex gap-3 px-5 py-3.5 border-b border-[var(--color-border)] transition-colors cursor-pointer ${isSelected ? "bg-[var(--color-navy-surface)]" : hasException ? "bg-[var(--color-red-light)]/30 hover:bg-[var(--color-red-light)]/60" : "hover:bg-[var(--color-surface)]"}`}>
                  {/* Product thumb */}
                  <div className="w-10 h-10 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                    <img src={order.items[0].image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-[var(--font-mono)] text-[11px] font-[600] text-[var(--color-ink)]">{order.id}</span>
                          <StatusBadge status={order.status} />
                          <ExceptionBadge type={order.exception} />
                        </div>
                        <p className="text-xs text-[var(--color-ink)] mt-0.5 truncate">{order.customer.name} → <span className="text-[var(--color-ink-muted)]">{order.seller.name}</span></p>
                        <p className="text-xs text-[var(--color-ink-muted)] truncate">{order.items[0].product}{order.items.length > 1 ? ` +${order.items.length - 1}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-[600] text-[var(--color-ink)]">₱{order.total.toLocaleString()}</p>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.date}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ORDER DETAIL PANEL ──────────────────────────────── */}
        {selectedOrder ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center gap-3 sticky top-0 bg-white z-10">
              <button onClick={() => setSelected(null)} className="lg:hidden text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 5L7 9l4 4" /></svg>
              </button>
              <div className="flex-1">
                <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">Order Detail</p>
                <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-navy)]">{selectedOrder.id}</p>
              </div>
              <StatusBadge status={selectedOrder.status} />
              {selectedOrder.exception !== "none" && <ExceptionBadge type={selectedOrder.exception} />}
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Customer */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Customer</p>
                <p className="text-sm font-[600] text-[var(--color-ink)]">{selectedOrder.customer.name}</p>
                <p className="text-sm text-[var(--color-ink-secondary)]">{selectedOrder.customer.email}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-1">{selectedOrder.customer.id}</p>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs px-2.5 py-1 border border-[var(--color-border)] text-[var(--color-navy)] rounded-sm hover:bg-[var(--color-navy)] hover:text-white cursor-pointer transition-colors">View profile</button>
                  <button className="text-xs px-2.5 py-1 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-navy)] cursor-pointer transition-colors">Message</button>
                </div>
              </div>

              {/* Seller */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Seller</p>
                <p className="text-sm font-[600] text-[var(--color-ink)]">{selectedOrder.seller.name}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{selectedOrder.seller.id}</p>
                <button className="mt-2 text-xs px-2.5 py-1 border border-[var(--color-border)] text-[var(--color-navy)] rounded-sm hover:bg-[var(--color-navy)] hover:text-white cursor-pointer transition-colors">View seller</button>
              </div>

              {/* Items */}
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Products</p>
                <div className="bg-white border border-[var(--color-border)] rounded-sm divide-y divide-[var(--color-border-subtle)]">
                  {selectedOrder.items.map(it => (
                    <div key={it.product} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                        <img src={it.image} alt={it.product} className="w-full h-full object-cover" />
                      </div>
                      <p className="flex-1 text-sm text-[var(--color-ink)] truncate">{it.product} × {it.qty}</p>
                      <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">₱{(it.price * it.qty).toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-sm font-[600] text-[var(--color-ink)]">Total</span>
                    <span className="font-[var(--font-display)] text-base font-[400] text-[var(--color-ink)]">₱{selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Payment</p>
                <div className="bg-white border border-[var(--color-border)] rounded-sm p-4 space-y-1.5">
                  {[["Method", selectedOrder.paymentMethod], ["Reference", selectedOrder.paymentRef], ["Amount", `₱${selectedOrder.total.toLocaleString()}`]].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-[var(--color-ink-muted)]">{label}</span>
                      <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery */}
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Delivery</p>
                <div className="bg-white border border-[var(--color-border)] rounded-sm p-4 space-y-2">
                  <p className="text-sm text-[var(--color-ink-secondary)]">{selectedOrder.deliveryAddress}</p>
                  {selectedOrder.courier && (
                    <div className="border-t border-[var(--color-border-subtle)] pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--color-ink-muted)]">Courier</span>
                        <span className="text-[var(--color-ink)]">{selectedOrder.courier.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--color-ink-muted)]">Tracking</span>
                        <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{selectedOrder.courier.tracking}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Exception handling */}
              {selectedOrder.exception !== "none" && (
                <div className="border border-[var(--color-red-border)] bg-[var(--color-red-light)] rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v5M8 11v1M3 14h10L8 3 3 14z" /></svg>
                    <p className="text-sm font-[600] text-[var(--color-red)]">Exception: {EXCEPTION_CONFIG[selectedOrder.exception]?.label}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedOrder.exception === "dispute" && (
                      <>
                        <button className="text-xs px-3 py-1.5 bg-[var(--color-red)] text-white rounded-sm hover:bg-[var(--color-red-hover)] cursor-pointer transition-colors">Review dispute</button>
                        <button className="text-xs px-3 py-1.5 border border-[var(--color-red-border)] text-[var(--color-red)] rounded-sm cursor-pointer hover:bg-[var(--color-red)] hover:text-white transition-colors">Issue refund</button>
                      </>
                    )}
                    {selectedOrder.exception === "refund-request" && (
                      <>
                        <button className="text-xs px-3 py-1.5 bg-[var(--color-amber)] text-white rounded-sm cursor-pointer hover:bg-[var(--color-amber-hover)] transition-colors">Approve refund</button>
                        <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm cursor-pointer hover:border-[var(--color-navy)] transition-colors">Reject</button>
                      </>
                    )}
                    {selectedOrder.exception === "fraud-flag" && (
                      <>
                        <button className="text-xs px-3 py-1.5 bg-[var(--color-red)] text-white rounded-sm cursor-pointer hover:bg-[var(--color-red-hover)] transition-colors">Freeze order</button>
                        <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm cursor-pointer hover:border-[var(--color-navy)] transition-colors">Clear flag</button>
                      </>
                    )}
                    {selectedOrder.exception === "delayed" && (
                      <button className="text-xs px-3 py-1.5 bg-[var(--color-navy)] text-white rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)] transition-colors">Contact courier</button>
                    )}
                  </div>
                </div>
              )}

              {/* Admin actions */}
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Admin Actions</p>
                <div className="flex flex-wrap gap-2">
                  <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">Force status update</button>
                  <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-amber)] hover:text-[var(--color-amber)] cursor-pointer transition-colors">Apply refund</button>
                  <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-red)] hover:text-[var(--color-red)] cursor-pointer transition-colors">Cancel order</button>
                  <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">Add note</button>
                  <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">Flag for review</button>
                </div>
              </div>

              {/* Dates */}
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">Placed: {selectedOrder.date} · Updated: Aug 15, 2026</p>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-center p-12">
            <div>
              <div className="w-12 h-12 bg-[var(--color-surface)] rounded-sm flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="3" width="12" height="14" rx="1" /><path d="M6 7h6M6 10h4" /></svg>
              </div>
              <p className="text-sm text-[var(--color-ink-muted)]">Select an order to view details</p>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
