import { useState } from "react";

type Customer = {
  id: string; name: string; initials: string;
  email: string; mobile: string; location: string;
  totalOrders: number; totalSpent: number;
  lastOrderDate: string; lastOrderId: string; lastOrderProduct: string;
  joinedDate: string; rating?: number;
};

const CUSTOMERS: Customer[] = [
  { id: "c01", name: "Ana Reyes",       initials: "AR", email: "ana.reyes@email.com",     mobile: "+63 917 000 0001", location: "Makati, Metro Manila",       totalOrders: 8, totalSpent: 14240, lastOrderDate: "Aug 15, 2026", lastOrderId: "ORD-2831", lastOrderProduct: "Natural Botanical Skincare Set", joinedDate: "Oct 2025", rating: 5 },
  { id: "c02", name: "Carlos Mendoza",  initials: "CM", email: "c.mendoza@email.com",      mobile: "+63 918 000 0002", location: "Quezon City, Metro Manila",   totalOrders: 5, totalSpent: 8750,  lastOrderDate: "Aug 12, 2026", lastOrderId: "ORD-2891", lastOrderProduct: "Organic Lavender Serum (x2)", joinedDate: "Jan 2026", rating: 4 },
  { id: "c03", name: "Jessa Flores",    initials: "JF", email: "jessa.f@email.com",        mobile: "+63 919 000 0003", location: "Pasig, Metro Manila",         totalOrders: 3, totalSpent: 4200,  lastOrderDate: "Aug 14, 2026", lastOrderId: "ORD-2889", lastOrderProduct: "Rose Hip Face Oil", joinedDate: "Mar 2026", rating: 5 },
  { id: "c04", name: "Miguel Torres",   initials: "MT", email: "m.torres@email.com",       mobile: "+63 920 000 0004", location: "Cebu City, Cebu",             totalOrders: 2, totalSpent: 2180,  lastOrderDate: "Aug 14, 2026", lastOrderId: "ORD-2887", lastOrderProduct: "Aloe Vera Gel Moisturizer", joinedDate: "Jun 2026", rating: 4 },
  { id: "c05", name: "Sofia Cruz",      initials: "SC", email: "sofia.c@email.com",        mobile: "+63 921 000 0005", location: "Taguig, Metro Manila",        totalOrders: 12, totalSpent: 22400, lastOrderDate: "Aug 13, 2026", lastOrderId: "ORD-2880", lastOrderProduct: "Bamboo Charcoal Soap (x4)", joinedDate: "Jul 2025", rating: 5 },
  { id: "c06", name: "Ramon Villanueva",initials: "RV", email: "r.villanueva@email.com",   mobile: "+63 922 000 0006", location: "Davao City, Davao",           totalOrders: 1, totalSpent: 1450,  lastOrderDate: "Aug 10, 2026", lastOrderId: "ORD-2850", lastOrderProduct: "Organic Lavender Serum", joinedDate: "Aug 2026", rating: 5 },
  { id: "c07", name: "Liza Bautista",   initials: "LB", email: "liza.b@email.com",         mobile: "+63 923 000 0007", location: "Marikina, Metro Manila",      totalOrders: 6, totalSpent: 9800,  lastOrderDate: "Jul 28, 2026", lastOrderId: "ORD-2800", lastOrderProduct: "SPF 50 Mineral Sunscreen (x3)", joinedDate: "Feb 2026" },
];

const CUSTOMER_ORDERS: Record<string, { id: string; date: string; product: string; amount: number; status: string }[]> = {
  c01: [
    { id: "ORD-2831", date: "Aug 15, 2026", product: "Natural Botanical Skincare Set", amount: 3200, status: "In transit" },
    { id: "ORD-2749", date: "Jul 20, 2026", product: "Organic Lavender Serum (x2)", amount: 2900, status: "Delivered" },
    { id: "ORD-2680", date: "Jun 11, 2026", product: "Rose Hip Face Oil", amount: 1490, status: "Delivered" },
    { id: "ORD-2612", date: "May 5, 2026", product: "SPF 50 Mineral Sunscreen", amount: 1200, status: "Delivered" },
  ],
  c05: [
    { id: "ORD-2880", date: "Aug 13, 2026", product: "Bamboo Charcoal Soap (x4)", amount: 1280, status: "Delivered" },
    { id: "ORD-2820", date: "Aug 2, 2026", product: "Tinted Lip Balm Set", amount: 1140, status: "Delivered" },
    { id: "ORD-2760", date: "Jul 22, 2026", product: "Natural Botanical Skincare Set (x2)", amount: 6400, status: "Delivered" },
  ],
};

function CustomerRow({ c, active, onClick }: { c: Customer; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-0 cursor-pointer transition-colors ${active ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
      <div className="w-9 h-9 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-[500]">{c.initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{c.name}</p>
        <p className="text-xs text-[var(--color-ink-muted)] truncate">{c.location}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{c.totalSpent.toLocaleString()}</p>
        <p className="text-xs text-[var(--color-ink-disabled)]">{c.totalOrders} orders</p>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [selected, setSelected] = useState<Customer>(CUSTOMERS[0]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("spent");

  const filtered = CUSTOMERS
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "spent") return b.totalSpent - a.totalSpent;
      if (sort === "orders") return b.totalOrders - a.totalOrders;
      if (sort === "recent") return 0;
      return 0;
    });

  const orders = CUSTOMER_ORDERS[selected.id] ?? [];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Customers</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{CUSTOMERS.length} total customers</p>
        </div>
      </div>

      <div className="flex gap-5 h-[calc(100vh-240px)] min-h-96">
        {/* ── LIST ── */}
        <div className="w-80 shrink-0 bg-white border border-[var(--color-border)] rounded-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-2 shrink-0">
            <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-sm px-3 py-2 bg-[var(--color-surface)] focus-within:border-[var(--color-navy)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers" className="text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent flex-1 font-[var(--font-body)]" />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
              <option value="spent">Sort by: top spenders</option>
              <option value="orders">Sort by: most orders</option>
              <option value="recent">Sort by: most recent</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <CustomerRow key={c.id} c={c} active={selected.id === c.id} onClick={() => setSelected(c)} />
            ))}
          </div>
        </div>

        {/* ── DETAIL ── */}
        <div className="flex-1 min-w-0 bg-white border border-[var(--color-border)] rounded-sm overflow-y-auto">
          {/* Profile header */}
          <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-[500]">{selected.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">{selected.name}</h2>
                  <p className="text-sm text-[var(--color-ink-muted)]">{selected.location}</p>
                  {selected.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="12" height="12" viewBox="0 0 14 14" fill={i < (selected.rating ?? 0) ? "var(--color-amber)" : "none"} stroke="var(--color-amber)" strokeWidth="1"><path d="M7 1l1.6 3.8 4 0.4-3 2.8 0.8 4-3.4-2-3.4 2 0.8-4-3-2.8 4-0.4z" /></svg>
                      ))}
                      <span className="text-xs text-[var(--color-ink-muted)] ml-1">avg. rating given</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm hover:bg-white cursor-pointer transition-colors">Message</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="space-y-4">
              <div>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Customer summary</p>
                <div className="space-y-2">
                  {[
                    { label: "Total orders", value: `${selected.totalOrders}` },
                    { label: "Lifetime spend", value: `₱${selected.totalSpent.toLocaleString()}` },
                    { label: "Avg. order value", value: `₱${Math.round(selected.totalSpent / selected.totalOrders).toLocaleString()}` },
                    { label: "Customer since", value: selected.joinedDate },
                    { label: "Last order", value: selected.lastOrderDate },
                  ].map(row => (
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
                    { icon: "✉", label: selected.email },
                    { icon: "📱", label: selected.mobile },
                    { icon: "📍", label: selected.location },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="text-sm shrink-0">{row.icon}</span>
                      <span className="text-xs text-[var(--color-ink-muted)] truncate">{row.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-ink-disabled)] mt-3 leading-relaxed">Contact details are shared by Marketo for order fulfilment only. Do not contact customers outside of order-related conversations.</p>
              </div>
            </div>

            {/* Order history */}
            <div className="lg:col-span-2">
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Order history ({orders.length > 0 ? orders.length : selected.totalOrders})</p>
              {orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.map(o => (
                    <div key={o.id} className="flex items-center gap-4 px-4 py-3.5 border border-[var(--color-border)] rounded-sm hover:bg-[var(--color-surface)] transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{o.id}</span>
                          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{o.date}</span>
                        </div>
                        <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{o.product}</p>
                        <span className={`font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block ${o.status === "Delivered" ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-navy-surface)] text-[var(--color-navy)]"}`}>{o.status}</span>
                      </div>
                      <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)] shrink-0">₱{o.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Stub rows when no detailed data */}
                  {Array.from({ length: Math.min(selected.totalOrders, 3) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5 border border-[var(--color-border)] rounded-sm opacity-50">
                      <div className="flex-1">
                        <div className="h-2.5 w-24 bg-[var(--color-border)] rounded mb-2" />
                        <div className="h-3 w-48 bg-[var(--color-surface)] rounded" />
                      </div>
                      <div className="h-3 w-16 bg-[var(--color-surface)] rounded" />
                    </div>
                  ))}
                  <p className="text-xs text-[var(--color-ink-disabled)] text-center py-2">Full order history available in order management</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
