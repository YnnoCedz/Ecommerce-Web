import { useState } from "react";

type OrderStatus = "processing" | "in-transit" | "out-for-delivery" | "delivered" | "completed" | "cancelled" | "returned" | "refunded" | "failed";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  "processing":       { label: "Processing",         color: "var(--color-navy)",    bg: "var(--color-navy-surface)",   border: "var(--color-navy-border)",   dot: "bg-[var(--color-navy)]" },
  "in-transit":       { label: "In transit",          color: "var(--color-amber)",   bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   dot: "bg-[var(--color-amber)]" },
  "out-for-delivery": { label: "Out for delivery",    color: "var(--color-amber)",   bg: "var(--color-amber-light)",    border: "var(--color-amber-border)",   dot: "bg-[var(--color-amber)] animate-pulse" },
  "delivered":        { label: "Delivered",           color: "var(--color-green)",   bg: "var(--color-green-light)",    border: "var(--color-green-border)",   dot: "bg-[var(--color-green)]" },
  "completed":        { label: "Completed",           color: "var(--color-green)",   bg: "var(--color-green-light)",    border: "var(--color-green-border)",   dot: "bg-[var(--color-green)]" },
  "cancelled":        { label: "Cancelled",           color: "var(--color-ink-muted)", bg: "var(--color-surface)",      border: "var(--color-border)",         dot: "bg-[var(--color-ink-muted)]" },
  "returned":         { label: "Returned",            color: "var(--color-red)",     bg: "var(--color-red-light)",      border: "var(--color-red-border)",     dot: "bg-[var(--color-red)]" },
  "refunded":         { label: "Refunded",            color: "var(--color-violet)",  bg: "var(--color-violet-light)",   border: "var(--color-violet-border)",  dot: "bg-[var(--color-violet)]" },
  "failed":           { label: "Failed",              color: "var(--color-red)",     bg: "var(--color-red-light)",      border: "var(--color-red-border)",     dot: "bg-[var(--color-red)]" },
};

type Order = {
  id: string;
  date: string;
  sellers: { name: string; itemCount: number }[];
  mainProduct: string;
  mainImage: string;
  itemCount: number;
  total: number;
  status: OrderStatus;
  tracking?: string;
  canReview: boolean;
  canReturn: boolean;
};

const ORDERS: Order[] = [
  { id: "ORD-2849", date: "Aug 5, 2026",  sellers: [{ name: "Atelier Manila", itemCount: 2 }], mainProduct: "Minimalist Chronograph Watch + 1 item", mainImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop&auto=format", itemCount: 2, total: 5360, status: "completed", canReview: true, canReturn: true },
  { id: "ORD-2831", date: "Aug 10, 2026", sellers: [{ name: "Verde Botanics", itemCount: 1 }], mainProduct: "Natural Botanical Skincare Set", mainImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100&h=100&fit=crop&auto=format", itemCount: 1, total: 1200, status: "out-for-delivery", tracking: "PH82831095", canReview: false, canReturn: false },
  { id: "ORD-2814", date: "Aug 13, 2026", sellers: [{ name: "Casa Leather", itemCount: 1 }], mainProduct: "Genuine Leather Tote Bag", mainImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&h=100&fit=crop&auto=format", itemCount: 1, total: 2800, status: "processing", canReview: false, canReturn: false },
  { id: "ORD-2790", date: "Jul 28, 2026", sellers: [{ name: "Bloom Studio", itemCount: 1 }], mainProduct: "Pressed Flower Art Print — A3", mainImage: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=100&h=100&fit=crop&auto=format", itemCount: 1, total: 650, status: "delivered", tracking: "PH82790043", canReview: true, canReturn: true },
  { id: "ORD-2765", date: "Jul 15, 2026", sellers: [{ name: "Habi Textiles", itemCount: 2 }, { name: "Clay & Co.", itemCount: 1 }], mainProduct: "Linen Throw Blanket + 2 items", mainImage: "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=100&h=100&fit=crop&auto=format", itemCount: 3, total: 3720, status: "completed", canReview: true, canReturn: false },
  { id: "ORD-2744", date: "Jul 2, 2026",  sellers: [{ name: "Verde Botanics", itemCount: 1 }], mainProduct: "Vitamin C Brightening Set", mainImage: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=100&h=100&fit=crop&auto=format", itemCount: 1, total: 890, status: "returned", canReview: false, canReturn: false },
  { id: "ORD-2718", date: "Jun 18, 2026", sellers: [{ name: "Atelier Manila", itemCount: 1 }], mainProduct: "Brass Desk Clock", mainImage: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=100&h=100&fit=crop&auto=format", itemCount: 1, total: 1850, status: "refunded", canReview: false, canReturn: false },
  { id: "ORD-2701", date: "Jun 5, 2026",  sellers: [{ name: "Form & Weave", itemCount: 1 }], mainProduct: "Rattan Accent Chair", mainImage: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=100&h=100&fit=crop&auto=format", itemCount: 1, total: 8500, status: "cancelled", canReview: false, canReturn: false },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

type FilterTab = "all" | "active" | "completed" | "cancelled" | "returns";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled / Failed" },
  { id: "returns", label: "Returns & Refunds" },
];

function filterOrders(orders: Order[], tab: FilterTab, search: string, seller: string): Order[] {
  let filtered = orders;
  if (tab === "active") filtered = filtered.filter(o => ["processing", "in-transit", "out-for-delivery"].includes(o.status));
  else if (tab === "completed") filtered = filtered.filter(o => ["delivered", "completed"].includes(o.status));
  else if (tab === "cancelled") filtered = filtered.filter(o => ["cancelled", "failed"].includes(o.status));
  else if (tab === "returns") filtered = filtered.filter(o => ["returned", "refunded"].includes(o.status));

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(o => o.id.toLowerCase().includes(q) || o.mainProduct.toLowerCase().includes(q) || o.sellers.some(s => s.name.toLowerCase().includes(q)));
  }
  if (seller) filtered = filtered.filter(o => o.sellers.some(s => s.name === seller));
  return filtered;
}

export default function OrderHistoryPage({ onViewDetail }: { onViewDetail?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const allSellers = Array.from(new Set(ORDERS.flatMap(o => o.sellers.map(s => s.name)))).sort();
  let filtered = filterOrders(ORDERS, activeTab, search, sellerFilter);
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "amount-desc") return b.total - a.total;
    if (sortBy === "amount-asc") return a.total - b.total;
    return 0;
  });

  const tabCounts: Record<FilterTab, number> = {
    all: ORDERS.length,
    active: ORDERS.filter(o => ["processing", "in-transit", "out-for-delivery"].includes(o.status)).length,
    completed: ORDERS.filter(o => ["delivered", "completed"].includes(o.status)).length,
    cancelled: ORDERS.filter(o => ["cancelled", "failed"].includes(o.status)).length,
    returns: ORDERS.filter(o => ["returned", "refunded"].includes(o.status)).length,
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">My Orders</span>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">My Orders</h1>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">{ORDERS.length} total orders</span>
        </div>

        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]">
              <circle cx="7" cy="7" r="4.5" /><path d="M11 11l2.5 2.5" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by order ID, product or seller…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-[var(--color-border)] rounded-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sellerFilter}
              onChange={e => setSellerFilter(e.target.value)}
              className="text-sm bg-white border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] cursor-pointer">
              <option value="">All sellers</option>
              {allSellers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm bg-white border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] cursor-pointer">
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Amount: high to low</option>
              <option value="amount-asc">Amount: low to high</option>
            </select>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 border-b border-[var(--color-border)] mb-5 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-[500] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
              {tab.label}
              <span className={`font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded ${activeTab === tab.id ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-muted)]"}`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Order cards */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">No orders found</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:border-[var(--color-navy-border)] transition-colors">
                  {/* Order header */}
                  <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div>
                      <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)] font-[600]">{order.id}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.date}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.sellers.map(s => (
                        <span key={s.name} className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-white border border-[var(--color-border)] rounded text-[var(--color-ink-muted)]">{s.name}</span>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Order body */}
                  <div className="flex gap-4 px-5 py-4">
                    <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                      <img src={order.mainImage} alt={order.mainProduct} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-1 truncate">{order.mainProduct}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.itemCount} {order.itemCount === 1 ? "item" : "items"}</p>
                      {order.tracking && (
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">Tracking: {order.tracking}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col justify-between">
                      <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">₱{order.total.toLocaleString()}</p>
                      <div className="flex items-center gap-2 justify-end mt-2">
                        {order.canReview && (
                          <button className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">Review</button>
                        )}
                        {order.canReturn && (
                          <button className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer transition-colors">Return</button>
                        )}
                        {order.tracking && (
                          <button className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer">Track</button>
                        )}
                        <button
                          onClick={() => onViewDetail?.(order.id)}
                          className="text-xs font-[500] px-3 py-1 bg-[var(--color-navy)] text-white rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
                          Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status strip for active orders */}
                  {["processing", "in-transit", "out-for-delivery"].includes(order.status) && (
                    <div className="px-5 py-2 border-t" style={{ borderColor: `${cfg.border}`, background: `${cfg.bg}` }}>
                      <p className="text-xs font-[500]" style={{ color: cfg.color }}>
                        {order.status === "processing" ? "Your order is being prepared by the seller." :
                         order.status === "in-transit" ? "Your package is on its way." :
                         "Your package is out for delivery today!"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
