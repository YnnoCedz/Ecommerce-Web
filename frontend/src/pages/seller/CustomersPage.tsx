import { useEffect, useMemo, useState } from "react";
import { fetchSellerCustomers, fetchSellerOrders, type SellerCustomer, type SellerOrder } from "../../api/seller";

function CustomerRow({ customer, active, onClick }: { customer: SellerCustomer; active: boolean; onClick: () => void }) {
  const initials = customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-0 cursor-pointer transition-colors ${active ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
      <div className="w-9 h-9 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-[500]">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{customer.name}</p>
        <p className="text-xs text-[var(--color-ink-muted)] truncate">{customer.location ?? "No location"}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">PHP {customer.total_spent.toLocaleString()}</p>
        <p className="text-xs text-[var(--color-ink-disabled)]">{customer.total_orders} orders</p>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<SellerCustomer[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("spent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [customerResponse, orderResponse] = await Promise.all([fetchSellerCustomers(), fetchSellerOrders()]);
        if (!active) return;
        setCustomers(customerResponse.data);
        setOrders(orderResponse.data);
        setSelectedId(customerResponse.data[0]?.id ?? null);
      } catch {
        if (!active) return;
        setCustomers([]);
        setOrders([]);
        setSelectedId(null);
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return [...customers]
      .filter((customer) => !search || customer.name.toLowerCase().includes(search.toLowerCase()) || customer.email.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === "spent") return b.total_spent - a.total_spent;
        if (sort === "orders") return b.total_orders - a.total_orders;
        return (b.last_order_date ?? "").localeCompare(a.last_order_date ?? "");
      });
  }, [customers, search, sort]);

  const selected = filtered.find((customer) => customer.id === selectedId) ?? filtered[0] ?? null;
  const selectedOrders = selected ? orders.filter((order) => order.buyer?.id === selected.id).sort((a, b) => (b.placed_at ?? "").localeCompare(a.placed_at ?? "")) : [];

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading customers...</div>;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Customers</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{customers.length} total customers</p>
        </div>
      </div>

      <div className="flex gap-5 h-[calc(100vh-240px)] min-h-96">
        <div className="w-80 shrink-0 bg-white border border-[var(--color-border)] rounded-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-2 shrink-0">
            <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-sm px-3 py-2 bg-[var(--color-surface)] focus-within:border-[var(--color-navy)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className="text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent flex-1 font-[var(--font-body)]" />
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
              <option value="spent">Sort by: top spenders</option>
              <option value="orders">Sort by: most orders</option>
              <option value="recent">Sort by: most recent</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} active={selected?.id === customer.id} onClick={() => setSelectedId(customer.id)} />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 bg-white border border-[var(--color-border)] rounded-sm overflow-y-auto">
          {selected ? (
            <>
              <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
                  <span className="text-white text-xl font-[500]">{selected.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">{selected.name}</h2>
                      <p className="text-sm text-[var(--color-ink-muted)]">{selected.location ?? "No location"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Customer summary</p>
                    <div className="space-y-2">
                      {[
                        { label: "Total orders", value: `${selected.total_orders}` },
                        { label: "Lifetime spend", value: `PHP ${selected.total_spent.toLocaleString()}` },
                        { label: "Last order", value: selected.last_order_date ?? "Unknown" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0">
                          <span className="text-xs text-[var(--color-ink-muted)]">{row.label}</span>
                          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Contact information</p>
                    <div className="space-y-2">
                      {[
                        { label: selected.email },
                        { label: selected.mobile ?? "No mobile number" },
                        { label: selected.location ?? "No location" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className="text-sm shrink-0">•</span>
                          <span className="text-xs text-[var(--color-ink-muted)] truncate">{row.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Order history ({selectedOrders.length})</p>
                  {selectedOrders.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrders.map((order) => (
                        <div key={order.id} className="flex items-center gap-4 px-4 py-3.5 border border-[var(--color-border)] rounded-sm hover:bg-[var(--color-surface)] transition-colors cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.order_number ?? `Order #${order.id}`}</span>
                              <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{order.placed_at ? new Date(order.placed_at).toLocaleDateString() : "Unknown date"}</span>
                            </div>
                            <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{order.items[0]?.product_name ?? "Multiple items"}</p>
                            <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block bg-[var(--color-navy-surface)] text-[var(--color-navy)] capitalize">{order.status.replaceAll("-", " ")}</span>
                          </div>
                          <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)] shrink-0">PHP {order.grand_total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--color-ink-muted)]">No order history available for this customer.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-sm text-[var(--color-ink-muted)]">No customer selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
