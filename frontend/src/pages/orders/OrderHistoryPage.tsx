import { useEffect, useMemo, useState } from "react";
import { fetchBuyerOrders, type BuyerOrderListItem } from "../../api/buyer";

type OrderStatus = "processing" | "in-transit" | "out-for-delivery" | "delivered" | "completed" | "cancelled" | "returned" | "refunded" | "failed";
type FilterTab = "all" | "active" | "completed" | "cancelled" | "returns";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  processing: { label: "Processing", color: "var(--color-navy)", bg: "var(--color-navy-surface)", border: "var(--color-navy-border)" },
  "in-transit": { label: "In transit", color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)" },
  "out-for-delivery": { label: "Out for delivery", color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)" },
  delivered: { label: "Delivered", color: "var(--color-green)", bg: "var(--color-green-light)", border: "var(--color-green-border)" },
  completed: { label: "Completed", color: "var(--color-green)", bg: "var(--color-green-light)", border: "var(--color-green-border)" },
  cancelled: { label: "Cancelled", color: "var(--color-ink-muted)", bg: "var(--color-surface)", border: "var(--color-border)" },
  returned: { label: "Returned", color: "var(--color-red)", bg: "var(--color-red-light)", border: "var(--color-red-border)" },
  refunded: { label: "Refunded", color: "var(--color-violet)", bg: "var(--color-violet-light)", border: "var(--color-violet-border)" },
  failed: { label: "Failed", color: "var(--color-red)", bg: "var(--color-red-light)", border: "var(--color-red-border)" },
};

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled / Failed" },
  { id: "returns", label: "Returns & Refunds" },
];

function normalizeStatus(status: string): OrderStatus {
  if (status in STATUS_CONFIG) return status as OrderStatus;
  if (status === "pending" || status === "confirmed" || status === "ready") return "processing";
  return "processing";
}

function filterOrders(orders: BuyerOrderListItem[], tab: FilterTab, search: string, seller: string): BuyerOrderListItem[] {
  let filtered = orders;
  if (tab === "active") filtered = filtered.filter(o => ["processing", "in-transit", "out-for-delivery"].includes(normalizeStatus(o.status)));
  else if (tab === "completed") filtered = filtered.filter(o => ["delivered", "completed"].includes(normalizeStatus(o.status)));
  else if (tab === "cancelled") filtered = filtered.filter(o => ["cancelled", "failed"].includes(normalizeStatus(o.status)));
  else if (tab === "returns") filtered = filtered.filter(o => ["returned", "refunded"].includes(normalizeStatus(o.status)));

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(o =>
      (o.order_number ?? String(o.id)).toLowerCase().includes(q) ||
      (o.main_product ?? "").toLowerCase().includes(q) ||
      (o.seller_names ?? []).some(name => name.toLowerCase().includes(q))
    );
  }

  if (seller) {
    filtered = filtered.filter(o => (o.seller_names ?? []).includes(seller));
  }

  return filtered;
}

export default function OrderHistoryPage({ onViewDetail }: { onViewDetail?: (id: string) => void }) {
  const [orders, setOrders] = useState<BuyerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchBuyerOrders();
        if (!active) return;
        setOrders(response.data);
      } catch {
        if (!active) return;
        setOrders([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const allSellers = useMemo(() => Array.from(new Set(orders.flatMap((order) => order.seller_names ?? []))).sort(), [orders]);

  const filtered = useMemo(() => {
    return [...filterOrders(orders, activeTab, search, sellerFilter)].sort((a, b) => {
      if (sortBy === "amount-desc") return b.grand_total - a.grand_total;
      if (sortBy === "amount-asc") return a.grand_total - b.grand_total;
      if (sortBy === "date-asc") return (a.placed_at ?? "").localeCompare(b.placed_at ?? "");
      return (b.placed_at ?? "").localeCompare(a.placed_at ?? "");
    });
  }, [activeTab, orders, search, sellerFilter, sortBy]);

  const tabCounts: Record<FilterTab, number> = {
    all: orders.length,
    active: orders.filter(o => ["processing", "in-transit", "out-for-delivery"].includes(normalizeStatus(o.status))).length,
    completed: orders.filter(o => ["delivered", "completed"].includes(normalizeStatus(o.status))).length,
    cancelled: orders.filter(o => ["cancelled", "failed"].includes(normalizeStatus(o.status))).length,
    returns: orders.filter(o => ["returned", "refunded"].includes(normalizeStatus(o.status))).length,
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">My Orders</span>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">My Orders</h1>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">{orders.length} total orders</span>
        </div>

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

        {loading ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center text-sm text-[var(--color-ink-muted)]">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">No orders found</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[normalizeStatus(order.status)];

              return (
                <div key={order.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:border-[var(--color-navy-border)] transition-colors">
                  <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div>
                      <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)] font-[600]">{order.order_number ?? `Order #${order.id}`}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.placed_at ? new Date(order.placed_at).toLocaleDateString() : "No date"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(order.seller_names ?? []).map((seller) => (
                        <span key={seller} className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-white border border-[var(--color-border)] rounded text-[var(--color-ink-muted)]">{seller}</span>
                      ))}
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 px-5 py-4">
                    <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                      {order.main_image ? <img src={order.main_image} alt={order.main_product ?? "Order item"} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-1 truncate">{order.main_product ?? "Order item"}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.item_count ?? 0} {((order.item_count ?? 0) === 1) ? "item" : "items"}</p>
                      {order.tracking_number && (
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">Tracking: {order.tracking_number}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col justify-between">
                      <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">PHP {order.grand_total.toLocaleString()}</p>
                      <button
                        onClick={() => onViewDetail?.(order.order_number ?? String(order.id))}
                        className="text-xs font-[500] px-3 py-1 bg-[var(--color-navy)] text-white rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors mt-2">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
