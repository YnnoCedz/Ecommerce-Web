import { useState } from "react";

type Range = "7d" | "30d" | "90d";

function genData(n: number, base: number, variance: number, trend = 0) {
  return Array.from({ length: n }, (_, i) => Math.round(base + trend * i + (Math.random() - 0.5) * variance * 2));
}

const DATA: Record<Range, { gmv: number[]; orders: number[]; users: number[]; sessions: number[]; sellers: number[]; conversion: number[] }> = {
  "7d":  { gmv: genData(7, 280000, 60000, 5000), orders: genData(7, 840, 200, 10), users: genData(7, 120, 40, 2), sessions: genData(7, 4200, 800, 50), sellers: genData(7, 8, 4, 0), conversion: genData(7, 42, 8, 0) },
  "30d": { gmv: genData(30, 260000, 70000, 3000), orders: genData(30, 820, 220, 5), users: genData(30, 110, 45, 1), sessions: genData(30, 3900, 900, 30), sellers: genData(30, 7, 5, 0), conversion: genData(30, 40, 10, 0) },
  "90d": { gmv: genData(90, 230000, 80000, 2000), orders: genData(90, 780, 250, 3), users: genData(90, 95, 55, 1), sessions: genData(90, 3500, 1100, 20), sellers: genData(90, 6, 6, 0), conversion: genData(90, 38, 12, 0) },
};

function LineChart({ data, color = "#1A3550", areaColor, height = 80 }: { data: number[]; color?: string; areaColor?: string; height?: number }) {
  const n = data.length; const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const W = 400; const H = height;
  const xs = data.map((_, i) => (i / (n - 1)) * W);
  const ys = data.map(v => H - ((v - min) / range) * (H - 8) - 4);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {areaColor && <path d={area} fill={areaColor} opacity="0.12" />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, color = "#1A3550", height = 64 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data) || 1;
  const W = 400; const H = height; const n = data.length;
  const bw = (W / n) * 0.6; const gap = W / n;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((v, i) => {
        const bh = (v / max) * (H - 4);
        return <rect key={i} x={i * gap + (gap - bw) / 2} y={H - bh} width={bw} height={bh} rx="1" fill={color} opacity="0.8" />;
      })}
    </svg>
  );
}

function KpiCard({ label, value, sub, data, color, format = "number" }: { label: string; value: number; sub: string; data: number[]; color: string; format?: "currency" | "number" | "percent" }) {
  const display = format === "currency" ? `₱${(value / 1000).toFixed(0)}K` : format === "percent" ? `${(value / 10).toFixed(1)}%` : value.toLocaleString();
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
      <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">{label}</p>
      <p className="font-[var(--font-display)] text-2xl font-[600] text-[var(--color-ink)] mb-0.5">{display}</p>
      <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] mb-3">{sub}</p>
      <LineChart data={data} color={color} areaColor={color} height={40} />
    </div>
  );
}

const TOP_CATEGORIES = [
  { name: "Health and Beauty", gmv: 4820000, orders: 18420, pct: 28 },
  { name: "Women's Apparel",   gmv: 3940000, orders: 22800, pct: 23 },
  { name: "Electronics & Gadgets",  gmv: 3210000, orders: 9640,  pct: 19 },
  { name: "Home and Garden",   gmv: 2180000, orders: 11200, pct: 13 },
  { name: "Health and Beauty", gmv: 1640000, orders: 13600, pct: 10 },
  { name: "Sports and Outdoors", gmv: 910000,  orders: 7200,  pct: 5  },
  { name: "Other",                  gmv: 340000,  orders: 3800,  pct: 2  },
];

const TOP_SELLERS = [
  { name: "GlowLab PH",       gmv: 842000,  orders: 3210, rating: 4.9, growth: 18 },
  { name: "TechMart Official", gmv: 718000,  orders: 1840, rating: 4.7, growth: 7  },
  { name: "NaturalGlow Store", gmv: 630000,  orders: 4120, rating: 4.8, growth: 24 },
  { name: "StyleHaven PH",    gmv: 510000,  orders: 2880, rating: 4.6, growth: -2 },
  { name: "FashionHub PH",    gmv: 480000,  orders: 3600, rating: 4.5, growth: 11 },
];

function DonutChart({ slices }: { slices: { color: string; pct: number }[] }) {
  const R = 44; const cx = 50; const cy = 50;
  let startAngle = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];
  for (const s of slices) {
    const angle = (s.pct / 100) * Math.PI * 2;
    const x1 = cx + R * Math.cos(startAngle); const y1 = cy + R * Math.sin(startAngle);
    const endAngle = startAngle + angle;
    const x2 = cx + R * Math.cos(endAngle); const y2 = cy + R * Math.sin(endAngle);
    const lg = angle > Math.PI ? 1 : 0;
    paths.push({ d: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`, color: s.color });
    startAngle = endAngle;
  }
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
      <circle cx={cx} cy={cy} r={28} fill="white" />
    </svg>
  );
}

const CAT_COLORS = ["#1A3550","#B8782A","#2D6A4F","#8B2C2C","#4A3272","#7C6144","#9B9B8A"];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const d = DATA[range];

  const totalGmv = d.gmv.reduce((a, b) => a + b, 0);
  const totalOrders = d.orders.reduce((a, b) => a + b, 0);
  const totalUsers = d.users.reduce((a, b) => a + b, 0);
  const avgConversion = Math.round(d.conversion.reduce((a, b) => a + b, 0) / d.conversion.length);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Platform analytics</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Marketplace performance and growth metrics</p>
        </div>
        <div className="flex gap-1">
          {(["7d","30d","90d"] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-xs rounded-sm cursor-pointer transition-colors ${range === r ? "bg-[var(--color-navy)] text-white" : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{r}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Gross Merchandise Value" value={totalGmv} sub={`${range} total · ₱${(totalGmv / d.gmv.length / 1000).toFixed(0)}K/day avg`} data={d.gmv} color="#1A3550" format="currency" />
        <KpiCard label="Total Orders" value={totalOrders} sub={`${Math.round(totalOrders / d.orders.length)}/day avg`} data={d.orders} color="#2D6A4F" format="number" />
        <KpiCard label="New Users" value={totalUsers} sub="across buyers & sellers" data={d.users} color="#B8782A" format="number" />
        <KpiCard label="Sessions" value={d.sessions.reduce((a, b) => a + b, 0)} sub={`${(avgConversion / 10).toFixed(1)}% avg conversion`} data={d.sessions} color="#4A3272" format="number" />
      </div>

      {/* GMV trend */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">GMV trend</p>
          <p className="font-[var(--font-display)] text-sm text-[var(--color-ink)]">₱{(totalGmv / 1000000).toFixed(2)}M total</p>
        </div>
        <LineChart data={d.gmv} color="#1A3550" areaColor="#1A3550" height={100} />
        <div className="flex justify-between mt-2">
          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{range === "7d" ? "7 days ago" : range === "30d" ? "30 days ago" : "90 days ago"}</span>
          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">Today</span>
        </div>
      </div>

      {/* Orders + Users side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Daily orders</p>
          <BarChart data={d.orders} color="#2D6A4F" height={72} />
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">New user signups</p>
          <BarChart data={d.users} color="#B8782A" height={72} />
        </div>
      </div>

      {/* Category breakdown + Top sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">GMV by category</p>
          <div className="flex items-center gap-5">
            <DonutChart slices={TOP_CATEGORIES.map((c, i) => ({ color: CAT_COLORS[i], pct: c.pct }))} />
            <div className="flex-1 space-y-2">
              {TOP_CATEGORIES.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CAT_COLORS[i] }} />
                  <span className="text-xs text-[var(--color-ink)] truncate flex-1">{c.name}</span>
                  <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top sellers */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Top sellers by GMV</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="text-left font-[var(--font-mono)] text-[8px] text-[var(--color-ink-disabled)] pb-2">Store</th>
                <th className="text-right font-[var(--font-mono)] text-[8px] text-[var(--color-ink-disabled)] pb-2">GMV</th>
                <th className="text-right font-[var(--font-mono)] text-[8px] text-[var(--color-ink-disabled)] pb-2">Orders</th>
                <th className="text-right font-[var(--font-mono)] text-[8px] text-[var(--color-ink-disabled)] pb-2">Growth</th>
              </tr>
            </thead>
            <tbody>
              {TOP_SELLERS.map((s, i) => (
                <tr key={s.name} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] w-4">{i + 1}</span>
                      <div>
                        <p className="text-xs font-[500] text-[var(--color-ink)]">{s.name}</p>
                        <p className="font-[var(--font-mono)] text-[8px] text-[var(--color-ink-muted)]">★ {s.rating}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-[var(--font-mono)] text-[10px] text-[var(--color-ink)]">₱{(s.gmv / 1000).toFixed(0)}K</td>
                  <td className="py-2.5 text-right font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{s.orders.toLocaleString()}</td>
                  <td className="py-2.5 text-right">
                    <span className={`font-[var(--font-mono)] text-[9px] ${s.growth >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>{s.growth >= 0 ? "+" : ""}{s.growth}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category table */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
        <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Category performance breakdown</p>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {["Category","GMV","Orders","GMV share","Avg order value"].map(h => (
                <th key={h} className="text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOP_CATEGORIES.filter(c => c.name !== "Other").map((c, i) => (
              <tr key={c.name} className="border-b border-[var(--color-border-subtle)] last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CAT_COLORS[i] }} />
                    <span className="text-sm text-[var(--color-ink)]">{c.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 font-[var(--font-mono)] text-xs text-[var(--color-ink)]">₱{(c.gmv / 1000000).toFixed(2)}M</td>
                <td className="py-3 pr-4 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{c.orders.toLocaleString()}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: CAT_COLORS[i] }} />
                    </div>
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{c.pct}%</span>
                  </div>
                </td>
                <td className="py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">₱{Math.round(c.gmv / c.orders).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
