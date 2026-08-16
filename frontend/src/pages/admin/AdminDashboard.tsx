import { useState } from "react";

const PLATFORM_DATA = [48200, 51000, 55400, 58800, 61200, 67000, 72400, 78000, 82600, 88000, 91400, 97000, 102000, 109000, 114000, 121000, 128000, 134000, 141000, 148000, 154000, 161000, 167000, 174000, 181000, 188000, 195000, 202000, 209000, 218000];

function MiniSparkline({ data, color = "var(--color-navy)" }: { data: number[]; color?: string }) {
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const w = 80; const h = 28;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * h }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function GmvChart() {
  const data = PLATFORM_DATA;
  const w = 600; const h = 110; const padL = 48; const padR = 8; const padT = 8; const padB = 22;
  const iw = w - padL - padR; const ih = h - padT - padB;
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pts = data.map((v, i) => ({ x: padL + (i / (data.length - 1)) * iw, y: padT + ih - ((v - min) / range) * ih }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${padT + ih} L${pts[0].x},${padT + ih} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs><linearGradient id="gmv-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-navy)" stopOpacity="0.15" /><stop offset="100%" stopColor="var(--color-navy)" stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map((t, i) => {
        const v = min + range * t;
        return (
          <g key={i}>
            <line x1={padL} y1={padT + ih - t * ih} x2={padL + iw} y2={padT + ih - t * ih} stroke="var(--color-border)" strokeWidth="0.5" />
            <text x={padL - 4} y={padT + ih - t * ih + 4} textAnchor="end" fontSize="9" fill="var(--color-ink-disabled)" fontFamily="JetBrains Mono">{(v / 1000000).toFixed(1)}M</text>
          </g>
        );
      })}
      <path d={area} fill="url(#gmv-g)" />
      <path d={path} fill="none" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="var(--color-navy)" />
    </svg>
  );
}

const ACTIVITY = [
  { time: "Just now",   type: "report",      msg: "New report on seller Atelier Manila (harassment)", color: "var(--color-red)",    icon: "🚨" },
  { time: "2m ago",     type: "application", msg: "Seller application from Fresh Finds PH approved",  color: "var(--color-green)",  icon: "✅" },
  { time: "5m ago",     type: "order",       msg: "Dispute opened on ORD-2901 — ₱4,200",             color: "var(--color-amber)",  icon: "⚠️" },
  { time: "12m ago",    type: "user",        msg: "User account jbautista@email.com suspended",       color: "var(--color-red)",    icon: "🔒" },
  { time: "18m ago",    type: "system",      msg: "Delivery SLA breach alert — 4 orders delayed >48h",color: "var(--color-amber)",  icon: "🚚" },
  { time: "31m ago",    type: "report",      msg: "Report RPT-100482 resolved — content removed",     color: "var(--color-green)",  icon: "✅" },
  { time: "45m ago",    type: "application", msg: "Seller application APP-2026-08-004890 flagged",    color: "var(--color-amber)",  icon: "⚠️" },
  { time: "1h ago",     type: "system",      msg: "Platform maintenance completed successfully",       color: "var(--color-green)",  icon: "⚙️" },
];

const ALERTS = [
  { severity: "critical", msg: "14 unresolved reports — oldest is 3 days old" },
  { severity: "warning",  msg: "5 seller applications awaiting verification (>72h)" },
  { severity: "warning",  msg: "Delivery SLA breach rate at 6.2% — above 5% threshold" },
  { severity: "info",     msg: "Platform update v2.14.0 scheduled for Aug 20 at 2:00 AM" },
];

const ALERT_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  critical: { color: "var(--color-red)",   bg: "var(--color-red-light)",   border: "var(--color-red-border)",   icon: "🔴" },
  warning:  { color: "var(--color-amber)", bg: "var(--color-amber-light)", border: "var(--color-amber-border)", icon: "🟡" },
  info:     { color: "var(--color-navy)",  bg: "var(--color-navy-surface)", border: "var(--color-navy)]/20",    icon: "🔵" },
};

export default function AdminDashboard() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  const kpis = [
    { label: "GMV (month)",         value: "₱218M",  change: "+14.2%", up: true,  spark: PLATFORM_DATA.slice(-14), color: "var(--color-navy)"   },
    { label: "Total orders",        value: "48,241", change: "+11.8%", up: true,  spark: [120,140,155,170,160,188,200,195,210,225,218,240,252,265].map(v=>v*100), color: "var(--color-green)"  },
    { label: "Active users",        value: "94,312", change: "+8.3%",  up: true,  spark: [8000,8200,8500,8700,9000,9100,9300,9500,9800,10000,10200,10500,10800,11000].map(v=>v*8), color: "var(--color-violet)" },
    { label: "Active sellers",      value: "1,248",  change: "+4.1%",  up: true,  spark: [100,105,108,112,115,120,124,128,130,135,138,142,146,150].map(v=>v*8), color: "var(--color-amber)"  },
    { label: "Pending reports",     value: "14",     change: "+3",     up: false, spark: [2,3,4,3,5,6,5,7,8,9,10,11,12,14].map(v=>v*1000), color: "var(--color-red)"    },
    { label: "Seller applications", value: "8",      change: "awaiting",up: null, spark: [1,2,1,3,2,4,3,5,4,6,5,7,6,8].map(v=>v*1000), color: "var(--color-amber)"  },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Platform dashboard</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Marketo Admin · Aug 15, 2026</p>
        </div>
        <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-0.5">
          {(["7d", "30d", "90d"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`font-[var(--font-mono)] text-[10px] px-3 py-1 rounded-sm cursor-pointer transition-colors ${range === r ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{r}</button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {ALERTS.length > 0 && (
        <div className="space-y-1.5 mb-6">
          {ALERTS.map((a, i) => {
            const cfg = ALERT_CFG[a.severity];
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-sm border" style={{ background: cfg.bg, borderColor: cfg.border }}>
                <span className="text-xs shrink-0">{cfg.icon}</span>
                <p className="text-xs flex-1" style={{ color: cfg.color }}>{a.msg}</p>
                <button className="text-[10px] font-[500] cursor-pointer hover:underline shrink-0" style={{ color: cfg.color }}>View →</button>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-sm px-4 py-3.5">
            <p className="text-[11px] text-[var(--color-ink-muted)] mb-1">{k.label}</p>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">{k.value}</p>
            <div className="flex items-end justify-between mt-1">
              {k.up !== null ? (
                <span className={`font-[var(--font-mono)] text-[9px] px-1 py-0.5 rounded ${k.up ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-red-light)] text-[var(--color-red)]"}`}>{k.change}</span>
              ) : (
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{k.change}</span>
              )}
              <MiniSparkline data={k.spark} color={k.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* GMV chart */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Gross Merchandise Value</h2>
              <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">₱218M <span className="font-[var(--font-body)] text-sm text-[var(--color-green)] font-[500]">↑ 14.2%</span></p>
            </div>
          </div>
          <GmvChart />
          <div className="flex justify-between mt-1">
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">Jul 16</span>
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">Aug 15</span>
          </div>
        </div>

        {/* Seller application pipeline */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Seller applications</h2>
            <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Review all</button>
          </div>
          <div className="p-5 space-y-3">
            {[
              { stage: "Pending review",      count: 5, color: "var(--color-amber)",  bg: "var(--color-amber-light)" },
              { stage: "Under verification",  count: 3, color: "var(--color-navy)",   bg: "var(--color-navy-surface)" },
              { stage: "Approved today",      count: 4, color: "var(--color-green)",  bg: "var(--color-green-light)" },
              { stage: "Rejected this week",  count: 2, color: "var(--color-red)",    bg: "var(--color-red-light)" },
            ].map(s => (
              <div key={s.stage} className="flex items-center justify-between px-3 py-2.5 rounded-sm" style={{ background: s.bg }}>
                <span className="text-sm" style={{ color: s.color }}>{s.stage}</span>
                <span className="font-[var(--font-mono)] text-base font-[600]" style={{ color: s.color }}>{s.count}</span>
              </div>
            ))}
            <button className="w-full py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors mt-2">Review pending (5)</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform activity */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Platform activity</h2>
            <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">View all</button>
          </div>
          <div>
            {ACTIVITY.map((a, i) => (
              <div key={i} className={`flex gap-4 px-5 py-3 ${i < ACTIVITY.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""} hover:bg-[var(--color-surface)] transition-colors cursor-pointer`}>
                <span className="text-sm shrink-0 mt-0.5">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-ink)]">{a.msg}</p>
                </div>
                <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] whitespace-nowrap shrink-0 mt-0.5">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Platform health</h2>
            <div className="space-y-3">
              {[
                { label: "Uptime (30d)",       value: "99.97%", ok: true },
                { label: "Avg. response time", value: "312ms",  ok: true },
                { label: "Payment success",    value: "98.1%",  ok: true },
                { label: "Delivery SLA",       value: "93.8%",  ok: false },
                { label: "Support SLA",        value: "96.2%",  ok: true },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-ink-muted)]">{m.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${m.ok ? "bg-[var(--color-green)]" : "bg-[var(--color-amber)]"}`} />
                    <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{m.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3">Top categories (GMV)</h2>
            <div className="space-y-2">
              {[
                { name: "Health and Beauty", pct: 32, val: "₱69.8M" },
                { name: "Home and Garden",   pct: 24, val: "₱52.3M" },
                { name: "Electronics and Gadgets", pct: 19, val: "₱41.4M" },
                { name: "Women's Apparel",   pct: 15, val: "₱32.7M" },
                { name: "Sports and Outdoors", pct: 10, val: "₱21.8M" },
              ].map(c => (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-[var(--color-ink-muted)] truncate">{c.name}</span>
                    <span className="font-[var(--font-mono)] text-[var(--color-ink)] shrink-0 ml-2">{c.val}</span>
                  </div>
                  <div className="h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-navy)] rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
