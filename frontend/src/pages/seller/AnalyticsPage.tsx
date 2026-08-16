import { useState } from "react";

type Range = "7d" | "30d" | "90d";

const REVENUE_30 = [42000,38500,55000,61200,48000,72000,67500,80000,91200,85000,78000,95400,88000,102000,97500,115000,108000,124000,119000,98000,132000,141000,128000,155000,147000,162000,158000,171000,165000,184000];
const ORDERS_30 = [12,9,15,18,14,21,19,24,27,25,22,28,26,31,29,34,32,38,36,30,40,43,39,47,45,49,48,52,50,56];
const REVENUE_7 = REVENUE_30.slice(-7);
const ORDERS_7 = ORDERS_30.slice(-7);
const REVENUE_90 = [...Array.from({length:60}).map((_,i)=>20000+i*2000+Math.sin(i)*5000), ...REVENUE_30];
const ORDERS_90 = [...Array.from({length:60}).map((_,i)=>6+i*0.5+Math.sin(i)*2), ...ORDERS_30].map(Math.round);

function LineChart({ data, color = "var(--color-navy)", area = true, height = 100 }: { data: number[]; color?: string; area?: boolean; height?: number }) {
  const w = 600; const h = height; const padL = 44; const padR = 8; const padT = 8; const padB = 20;
  const iw = w - padL - padR; const ih = h - padT - padB;
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: padL + (i / (data.length - 1)) * iw,
    y: padT + ih - ((v - min) / range) * ih,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${pts[pts.length - 1].x.toFixed(1)},${(padT + ih).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + ih).toFixed(1)} Z`;
  const fmt = (v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : `${v}`;
  const ylabels = [min, min + range/2, max].map(fmt);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`lg-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={padT + ih * (1 - t)} x2={padL + iw} y2={padT + ih * (1 - t)} stroke="var(--color-border)" strokeWidth="0.5" />
          <text x={padL - 4} y={padT + ih * (1 - t) + 4} textAnchor="end" fontSize="9" fill="var(--color-ink-disabled)" fontFamily="JetBrains Mono">{ylabels[i]}</text>
        </g>
      ))}
      {area && <path d={areaPath} fill={`url(#lg-${color.replace(/[^a-z]/gi,'')})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={color} />}
    </svg>
  );
}

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data);
  const w = 480; const h = 80;
  const bw = Math.floor((w - 20) / data.length - 4);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = (v / max) * (h - 20);
        const x = 10 + i * ((w - 20) / data.length);
        const isLast = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={h - bh - 16} width={bw} height={bh} rx="2" fill={isLast ? "var(--color-navy)" : "var(--color-navy-surface)"} />
            <text x={x + bw / 2} y={h - 4} textAnchor="middle" fontSize="8" fill="var(--color-ink-disabled)" fontFamily="JetBrains Mono">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

const TOP_PRODUCTS = [
  { name: "Organic Lavender Serum 30ml", category: "Skincare", revenue: 412280, orders: 284, returns: 2, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=40&h=40&fit=crop&auto=format" },
  { name: "Tinted Botanical Lip Balm Set", category: "Lip Care", revenue: 301950, orders: 671, returns: 5, image: "https://images.unsplash.com/photo-1586495777744-4e6232bf2176?w=40&h=40&fit=crop&auto=format" },
  { name: "Aloe Vera Gel Moisturizer", category: "Skincare", revenue: 236640, orders: 408, returns: 3, image: "https://images.unsplash.com/photo-1556228720-da76e7f25ea6?w=40&h=40&fit=crop&auto=format" },
  { name: "Natural Botanical Skincare Set", category: "Skincare Sets", revenue: 998400, orders: 312, returns: 1, image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=40&h=40&fit=crop&auto=format" },
  { name: "Bamboo Charcoal Soap Bar", category: "Body Care", revenue: 166720, orders: 521, returns: 8, image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=40&h=40&fit=crop&auto=format" },
];

const CAT_DATA = [
  { name: "Skincare", revenue: 820000, pct: 44 },
  { name: "Skincare Sets", revenue: 998400, pct: 32 },
  { name: "Body Care", revenue: 212000, pct: 12 },
  { name: "Lip Care", revenue: 301950, pct: 8 },
  { name: "Sun Care", revenue: 72000, pct: 4 },
];
const CAT_COLORS = ["var(--color-navy)", "var(--color-amber)", "var(--color-green)", "var(--color-violet)", "var(--color-ink-muted)"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");

  const revData = range === "7d" ? REVENUE_7 : range === "90d" ? REVENUE_90 : REVENUE_30;
  const ordData = range === "7d" ? ORDERS_7 : range === "90d" ? ORDERS_90 : ORDERS_30;
  const totalRev = revData[revData.length - 1];
  const totalOrd = ordData.reduce((a, b) => a + b, 0);
  const aov = Math.round(totalRev / (totalOrd || 1));

  const dayLabels = (n: number) => {
    const days = ["M","T","W","T","F","S","S"];
    if (n <= 7) return Array.from({length:n}).map((_,i) => days[i % 7]);
    return Array.from({length:n}).map((_,i) => i % 7 === 0 ? `W${Math.floor(i/7)+1}` : "");
  };

  const kpis = [
    { label: "Total revenue", value: `₱${(totalRev).toLocaleString()}`, change: "+18.4%", up: true },
    { label: "Total orders", value: totalOrd.toString(), change: "+12%", up: true },
    { label: "Avg. order value", value: `₱${aov.toLocaleString()}`, change: "+5.2%", up: true },
    { label: "Return rate", value: "1.2%", change: "-0.3%", up: true },
    { label: "Conversion rate", value: "2.26%", change: "+0.4%", up: true },
    { label: "Store views", value: "18,420", change: "+9.1%", up: true },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Analytics</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Verde Botanics performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-0.5">
            {(["7d","30d","90d"] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)} className={`font-[var(--font-mono)] text-[10px] px-3 py-1 rounded-sm cursor-pointer transition-colors ${range === r ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{r}</button>
            ))}
          </div>
          <button className="px-3 py-2 text-xs border border-[var(--color-border)] bg-white rounded-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] cursor-pointer">Export ↓</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-sm px-4 py-3.5">
            <p className="text-[11px] text-[var(--color-ink-muted)] mb-1">{k.label}</p>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">{k.value}</p>
            <span className={`font-[var(--font-mono)] text-[9px] px-1 py-0.5 rounded mt-1 inline-block ${k.up ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-red-light)] text-[var(--color-red)]"}`}>{k.change}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue trend */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Revenue trend</h2>
              <p className="text-xs text-[var(--color-ink-muted)]">{range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 90 days"}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block bg-[var(--color-navy)] rounded" /> This period</span>
            </div>
          </div>
          <LineChart data={revData} />
        </div>

        {/* Category breakdown */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Revenue by category</h2>
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              {(() => {
                let offset = 0;
                const circumference = 2 * Math.PI * 50;
                return CAT_DATA.map((c, i) => {
                  const dash = (c.pct / 100) * circumference;
                  const el = (
                    <circle key={c.name} cx="60" cy="60" r="50" fill="none"
                      stroke={CAT_COLORS[i]} strokeWidth="20"
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += dash;
                  return el;
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Total</span>
              <span className="font-[var(--font-display)] text-base font-[400] text-[var(--color-ink)]">₱2.4M</span>
            </div>
          </div>
          <div className="space-y-2">
            {CAT_DATA.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[i] }} />
                <span className="flex-1 text-xs text-[var(--color-ink-muted)] truncate">{c.name}</span>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink)]">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Orders chart */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-1">Orders</h2>
          <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-4">{totalOrd}</p>
          <BarChart data={ordData.slice(-7)} labels={dayLabels(7)} />
        </div>

        {/* Top products */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Top products</h2>
            <span className="text-xs text-[var(--color-ink-muted)]">by revenue</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                {["#", "Product", "Category", "Revenue", "Orders", "Returns"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_PRODUCTS.map((p, i) => (
                <tr key={p.name} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-disabled)]">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-[500] text-[var(--color-ink)] truncate max-w-40">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-ink-muted)]">{p.category}</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{(p.revenue/1000).toFixed(0)}k</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)]">{p.orders}</td>
                  <td className="px-4 py-3">
                    <span className={`font-[var(--font-mono)] text-[10px] ${p.returns > 5 ? "text-[var(--color-amber)]" : "text-[var(--color-ink-disabled)]"}`}>{p.returns}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales trend details */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
        <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Orders over time</h2>
        <LineChart data={ordData} color="var(--color-amber)" height={80} />
      </div>
    </div>
  );
}
