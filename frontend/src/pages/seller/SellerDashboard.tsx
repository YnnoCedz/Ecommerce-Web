import { useState } from "react";
import { useNavigate } from "react-router";

const REVENUE_DATA = [42000, 38500, 55000, 61200, 48000, 72000, 67500, 80000, 91200, 85000, 78000, 95400, 88000, 102000, 97500, 115000, 108000, 124000, 119000, 98000, 132000, 141000, 128000, 155000, 147000, 162000, 158000, 171000, 165000, 184000];
const ORDER_DATA = [12, 9, 15, 18, 14, 21, 19, 24, 27, 25, 22, 28, 26, 31, 29, 34, 32, 38, 36, 30, 40, 43, 39, 47, 45, 49, 48, 52, 50, 56];

function RevenueChart() {
  const w = 600; const h = 120; const pad = { t: 8, r: 8, b: 24, l: 48 };
  const iw = w - pad.l - pad.r; const ih = h - pad.t - pad.b;
  const min = Math.min(...REVENUE_DATA); const max = Math.max(...REVENUE_DATA);
  const range = max - min || 1;
  const pts = REVENUE_DATA.map((v, i) => ({ x: pad.l + (i / (REVENUE_DATA.length - 1)) * iw, y: pad.t + ih - ((v - min) / range) * ih }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${(pad.t + ih).toFixed(1)} L${pts[0].x},${(pad.t + ih).toFixed(1)} Z`;
  const ylabels = [min, min + range * 0.5, max].map(v => Math.round(v / 1000) + "k");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1A3550" stopOpacity="0.15" /><stop offset="100%" stopColor="#1A3550" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={pad.t + ih - t * ih} x2={pad.l + iw} y2={pad.t + ih - t * ih} stroke="var(--color-border)" strokeWidth="0.5" />
          <text x={pad.l - 4} y={pad.t + ih - t * ih + 4} textAnchor="end" fontSize="9" fill="var(--color-ink-disabled)" fontFamily="JetBrains Mono">{ylabels[i]}</text>
        </g>
      ))}
      <path d={area} fill="url(#rg)" />
      <path d={path} fill="none" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="var(--color-navy)" />
      )}
    </svg>
  );
}

function OrderBars() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = ORDER_DATA.slice(-7);
  const max = Math.max(...data);
  const w = 320; const h = 72; const bw = 32; const gap = 12;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = (v / max) * (h - 16);
        const x = i * (bw + gap) + gap;
        const isToday = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={h - bh - 16} width={bw} height={bh} rx="2" fill={isToday ? "var(--color-navy)" : "var(--color-navy-surface)"} />
            <text x={x + bw / 2} y={h - 4} textAnchor="middle" fontSize="8" fill="var(--color-ink-disabled)" fontFamily="JetBrains Mono">{days[i]}</text>
            <text x={x + bw / 2} y={h - bh - 20} textAnchor="middle" fontSize="8" fill={isToday ? "var(--color-navy)" : "var(--color-ink-disabled)"} fontFamily="JetBrains Mono">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

const RECENT_ORDERS = [
  { id: "ORD-2891", buyer: "Carlos Mendoza", product: "Organic Lavender Serum (x2)", amount: 2890, status: "pending", time: "2m ago" },
  { id: "ORD-2889", buyer: "Jessa Flores",   product: "Rose Hip Face Oil",            amount: 1450, status: "processing", time: "18m ago" },
  { id: "ORD-2887", buyer: "Ana Reyes",       product: "Natural Botanical Set (x3)",  amount: 5670, status: "ready",      time: "1h ago" },
  { id: "ORD-2883", buyer: "Miguel Torres",   product: "Aloe Gel Moisturizer",        amount: 980,  status: "shipped",    time: "3h ago" },
  { id: "ORD-2880", buyer: "Sofia Cruz",      product: "Bamboo Charcoal Soap (x4)",   amount: 1200, status: "delivered",  time: "Yesterday" },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pending",    color: "var(--color-amber)",  bg: "var(--color-amber-light)"  },
  processing: { label: "Preparing", color: "var(--color-navy)",   bg: "var(--color-navy-surface)" },
  ready:      { label: "Ready",     color: "var(--color-violet)", bg: "var(--color-violet-light)" },
  shipped:    { label: "Shipped",   color: "var(--color-green)",  bg: "var(--color-green-light)"  },
  delivered:  { label: "Delivered", color: "var(--color-green)",  bg: "var(--color-green-light)"  },
};

const LOW_STOCK = [
  { name: "Organic Lavender Serum — 30ml", sku: "VB-SRM-001", stock: 3, threshold: 10 },
  { name: "Rose Hip Face Oil — 50ml",       sku: "VB-OIL-003", stock: 1, threshold: 8  },
  { name: "Bamboo Charcoal Soap",           sku: "VB-SOP-007", stock: 5, threshold: 15 },
];

const QUICK_ACTIONS = [
  { label: "Add product",      icon: "➕", desc: "List a new item" },
  { label: "Process orders",   icon: "📦", desc: "4 pending action" },
  { label: "Update inventory", icon: "📋", desc: "3 items low" },
  { label: "Create promo",     icon: "🎁", desc: "Boost your sales" },
  { label: "View analytics",   icon: "📈", desc: "This month's data" },
  { label: "Manage store",     icon: "🏪", desc: "Edit your profile" },
];

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const quickActionRoutes: Record<string, string> = {
    "Add product": "/seller-center/products/new",
    "Process orders": "/seller-center/orders",
    "Update inventory": "/seller-center/inventory",
    "Create promo": "/seller-center/promotions",
    "View analytics": "/seller-center/analytics",
    "Manage store": "/seller-center/store",
  };

  const stats = [
    { label: "Revenue (month)", value: "₱184,000", change: "+18.4%", up: true, sub: "vs last month" },
    { label: "Orders (month)",  value: "56",        change: "+12%",   up: true, sub: "3 pending" },
    { label: "Active listings", value: "34",        change: "2 draft", up: null, sub: "1 archived" },
    { label: "Store rating",    value: "4.8",       change: "★",      up: null, sub: "from 214 reviews" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Welcome banner */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Good afternoon, Maria 👋</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Here's what's happening with Verde Botanics today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/seller-center/products/new")}
            className="px-4 py-2 text-sm font-[500] bg-[var(--color-navy)] text-white rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
            + Add product
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{s.label}</p>
            <div className="flex items-end justify-between">
              <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">{s.value}</p>
              {s.up !== null && (
                <span className={`font-[var(--font-mono)] text-[10px] px-1.5 py-0.5 rounded ${s.up ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-red-light)] text-[var(--color-red)]"}`}>{s.change}</span>
              )}
              {s.up === null && s.change !== "★" && <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{s.change}</span>}
              {s.change === "★" && <span className="text-[var(--color-amber)] text-base">★</span>}
            </div>
            <p className="text-xs text-[var(--color-ink-disabled)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Revenue</h2>
              <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">₱184,000 <span className="font-[var(--font-body)] text-sm text-[var(--color-green)] font-[500]">↑ 18.4%</span></p>
            </div>
            <div className="flex gap-1">
              {(["7d", "30d", "90d"] as const).map(r => (
                <button key={r} onClick={() => setRange(r)} className={`font-[var(--font-mono)] text-[9px] px-2.5 py-1 rounded-sm cursor-pointer transition-colors ${range === r ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]"}`}>{r}</button>
              ))}
            </div>
          </div>
          <RevenueChart />
          <div className="flex justify-between mt-2">
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">Jul 16</span>
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">Aug 15</span>
          </div>
        </div>

        {/* Order bars + quick stats */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3">Orders this week</h2>
            <div className="flex items-end gap-3 mb-3">
              <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">56</p>
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-green)] bg-[var(--color-green-light)] px-1.5 py-0.5 rounded mb-1">↑ 12%</span>
            </div>
            <OrderBars />
          </div>
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3">Performance</h2>
            <div className="space-y-3">
              {[
                { label: "Store views", value: "2,481", sub: "+8% vs last week" },
                { label: "Conversion rate", value: "2.26%", sub: "Industry avg: 1.8%" },
                { label: "Avg order value", value: "₱3,286", sub: "↑ from ₱2,940" },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{m.label}</p>
                    <p className="text-xs text-[var(--color-ink-disabled)]">{m.sub}</p>
                  </div>
                  <span className="font-[var(--font-mono)] text-sm font-[500] text-[var(--color-ink)]">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Recent orders</h2>
            <button onClick={() => navigate("/seller-center/orders")} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">View all</button>
          </div>
          <div>
            {RECENT_ORDERS.map((o, i) => {
              const cfg = STATUS_CFG[o.status];
              return (
                <div key={o.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < RECENT_ORDERS.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""} hover:bg-[var(--color-surface)] transition-colors cursor-pointer`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{o.id}</span>
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{o.time}</span>
                    </div>
                    <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{o.buyer}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] truncate">{o.product}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{o.amount.toLocaleString()}</p>
                    <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low stock alerts + quick actions */}
        <div className="space-y-4">
              <div className="bg-white border border-[var(--color-red-border)] rounded-sm">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-red-border)] bg-[var(--color-red-light)]">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1L1.5 13h13L8 1z" /><path d="M8 6v4M8 11.5v.5" /></svg>
                <h2 className="text-sm font-[600] text-[var(--color-red)]">Low stock ({LOW_STOCK.length})</h2>
              </div>
              <button onClick={() => navigate("/seller-center/inventory")} className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Manage</button>
            </div>
            {LOW_STOCK.map((item, i) => (
              <div key={item.sku} className={`px-4 py-3 ${i < LOW_STOCK.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""}`}>
                <p className="text-xs font-[500] text-[var(--color-ink)] truncate mb-0.5">{item.name}</p>
                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{item.sku}</span>
                  <span className={`font-[var(--font-mono)] text-[10px] font-[500] ${item.stock <= 2 ? "text-[var(--color-red)]" : "text-[var(--color-amber)]"}`}>{item.stock} left</span>
                </div>
                <div className="mt-1.5 h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(item.stock / item.threshold) * 100}%`, background: item.stock <= 2 ? "var(--color-red)" : "var(--color-amber)" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => {
                    const route = quickActionRoutes[a.label];
                    if (route) navigate(route);
                  }}
                  className="flex flex-col gap-1 p-3 border border-[var(--color-border)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all text-left group">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-xs font-[500] text-[var(--color-ink)] group-hover:text-[var(--color-navy)]">{a.label}</span>
                  <span className="text-[10px] text-[var(--color-ink-disabled)]">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
