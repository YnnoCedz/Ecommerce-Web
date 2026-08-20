import { useEffect, useMemo, useState } from "react";
import { fetchSellerDashboard, type SellerDashboard as SellerDashboardData } from "../../api/seller";

type Range = "7d" | "30d" | "90d";

function LineChart({ data, color = "var(--color-navy)", height = 100 }: { data: number[]; color?: string; height?: number }) {
  const w = 600;
  const h = height;
  const padL = 44;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((value, index) => ({
    x: padL + (index / Math.max(1, data.length - 1)) * iw,
    y: padT + ih - ((value - min) / range) * ih,
  }));
  const path = pts.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />}
    </svg>
  );
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 480;
  const h = 80;
  const bw = Math.floor((w - 20) / data.length - 4);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {data.map((value, index) => {
        const bh = (value / max) * (h - 20);
        const x = 10 + index * ((w - 20) / data.length);
        return (
          <rect
            key={index}
            x={x}
            y={h - bh - 16}
            width={bw}
            height={bh}
            rx="2"
            fill={index === data.length - 1 ? "var(--color-navy)" : "var(--color-navy-surface)"}
          />
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchSellerDashboard();
        if (!active) return;
        setDashboard(response.data);
      } catch {
        if (active) setDashboard(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const slicedRevenue = useMemo(() => {
    const series = dashboard?.revenue_series ?? [];
    if (range === "7d") return series.slice(-7);
    if (range === "90d") return series;
    return series.slice(-30);
  }, [dashboard?.revenue_series, range]);

  const slicedOrders = useMemo(() => {
    const series = dashboard?.order_series ?? [];
    if (range === "7d") return series.slice(-7);
    if (range === "90d") return series;
    return series.slice(-30);
  }, [dashboard?.order_series, range]);

  const totalRevenue = slicedRevenue.length > 0 ? slicedRevenue[slicedRevenue.length - 1].value : 0;
  const totalOrders = slicedOrders.reduce((sum, point) => sum + point.value, 0);
  const averageOrderValue = Math.round(totalRevenue / Math.max(1, totalOrders));

  const topProducts = dashboard?.top_products ?? [];
  const categoryBreakdown = dashboard?.category_breakdown ?? [];
  const sellerName = dashboard?.seller?.business_name ?? "Seller";

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading analytics...</div>;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Analytics</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{sellerName} performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-0.5">
            {(["7d", "30d", "90d"] as Range[]).map((value) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`font-[var(--font-mono)] text-[10px] px-3 py-1 rounded-sm cursor-pointer transition-colors ${range === value ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Total revenue", value: `PHP ${totalRevenue.toLocaleString()}`, accent: "var(--color-navy)" },
          { label: "Total orders", value: totalOrders.toString() },
          { label: "Avg. order value", value: `PHP ${averageOrderValue.toLocaleString()}` },
          { label: "Pending orders", value: `${dashboard?.summary?.pending_orders ?? 0}` },
          { label: "Completed", value: `${dashboard?.summary?.completed_orders ?? 0}` },
          { label: "Store products", value: `${dashboard?.summary?.total_products ?? 0}` },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-[var(--color-border)] rounded-sm px-4 py-3.5">
            <p className="text-[11px] text-[var(--color-ink-muted)] mb-1">{card.label}</p>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]" style={{ color: card.accent ?? "var(--color-ink)" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Revenue trend</h2>
              <p className="text-xs text-[var(--color-ink-muted)]">Pulled from seller dashboard series data</p>
            </div>
          </div>
          <LineChart data={slicedRevenue.map((point) => point.value)} />
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Revenue by category</h2>
          <div className="space-y-3">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--color-ink-muted)] truncate">{item.name}</span>
                    <span className="text-[var(--color-ink)] font-[var(--font-mono)]">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-navy)] rounded-full" style={{ width: `${Math.max(4, item.pct)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">No category data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-1">Orders</h2>
          <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-4">{totalOrders}</p>
          <BarChart data={slicedOrders.map((point) => point.value)} />
        </div>

        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Top products</h2>
            <span className="text-xs text-[var(--color-ink-muted)]">by revenue</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                {["#", "Product", "Category", "Revenue", "Orders", "Returns"].map((heading) => (
                  <th key={heading} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <tr key={`${product.name}-${index}`} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                    <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-disabled)]">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm font-[500] text-[var(--color-ink)] truncate max-w-40">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-ink-muted)]">{product.category}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-sm text-[var(--color-ink)]">PHP {product.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)]">{product.orders}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{product.returns}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-[var(--color-ink-muted)] text-center">
                    No products sold yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
        <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Orders over time</h2>
        <LineChart data={slicedOrders.map((point) => point.value)} color="var(--color-amber)" height={80} />
      </div>
    </div>
  );
}
