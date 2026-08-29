import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { exportSellerSalesReport, fetchSellerDashboard, type SellerDashboard as SellerDashboardData } from "../../api/seller";
import { useToast } from "../../components/ToastProvider";
import { useUrlTab } from "../../hooks/useUrlTab";

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
  const { activeTab: range, setActiveTab: setRange } = useUrlTab<Range>(["7d", "30d", "90d"], "30d", { parameter: "range" });
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const response = await fetchSellerDashboard(Number.parseInt(range, 10) as 7 | 30 | 90);
        if (!active) return;
        setDashboard(response.data);
        setExportFrom(response.data.reporting_period.from);
        setExportTo(response.data.reporting_period.to);
      } catch (error) {
        if (active) {
          setDashboard(null);
          showToast({ kind: "error", title: "Analytics unavailable", error, errorContext: "seller" });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [range, showToast]);

  const revenueSeries = dashboard?.revenue_series ?? [];
  const orderSeries = dashboard?.order_series ?? [];
  const totalRevenue = dashboard?.sales_summary?.net_product_sales ?? 0;
  const totalOrders = dashboard?.sales_summary?.total_orders ?? 0;
  const averageOrderValue = dashboard?.sales_summary?.average_order_value ?? 0;

  const topProducts = dashboard?.top_products ?? [];
  const categoryBreakdown = dashboard?.category_breakdown ?? [];
  const sellerName = dashboard?.seller?.business_name ?? "Seller";

  const runExport = async () => {
    if (exporting || !exportFrom || !exportTo) return;

    if (exportFrom > exportTo) {
      showToast({ kind: "error", title: "Invalid date range", message: "The start date must be on or before the end date." });
      return;
    }

    setExporting(true);
    try {
      const result = await exportSellerSalesReport({ from: exportFrom, to: exportTo, format: exportFormat });
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = result.filename ?? `maketo-sales-report-${exportFrom}-to-${exportTo}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setExportOpen(false);
      showToast({ kind: "success", title: "Sales report exported successfully." });
    } catch (error) {
      showToast({ kind: "error", title: "Unable to export sales report", error, errorContext: "seller" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading analytics...</div>;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-navy)] px-3 py-2 text-xs font-[600] text-white transition-opacity hover:opacity-90"
              aria-expanded={exportOpen}
            >
              <Download size={14} aria-hidden="true" />
              Export report
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-sm border border-[var(--color-border)] bg-white p-4 shadow-lg">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-[600] text-[var(--color-ink)]">Export sales report</h2>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Uses authoritative completed sales data.</p>
                  </div>
                  <button type="button" onClick={() => setExportOpen(false)} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]" aria-label="Close export options">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-[var(--color-ink-muted)]">
                    From
                    <input type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} className="mt-1 w-full rounded-sm border border-[var(--color-border)] px-2.5 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)]" />
                  </label>
                  <label className="text-xs text-[var(--color-ink-muted)]">
                    To
                    <input type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} className="mt-1 w-full rounded-sm border border-[var(--color-border)] px-2.5 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)]" />
                  </label>
                </div>
                <fieldset className="mt-4 space-y-2">
                  <legend className="mb-2 text-xs font-[600] text-[var(--color-ink)]">Format</legend>
                  {([
                    ["xlsx", "Excel (.xlsx)", "Best for sorting, filtering, and calculations"],
                    ["pdf", "PDF - A4 Landscape", "Best for printing and records"],
                  ] as const).map(([value, label, description]) => (
                    <label key={value} className="flex cursor-pointer items-start gap-2 rounded-sm border border-[var(--color-border)] p-2.5">
                      <input type="radio" name="export-format" value={value} checked={exportFormat === value} onChange={() => setExportFormat(value)} className="mt-0.5" />
                      <span><span className="block text-xs font-[600] text-[var(--color-ink)]">{label}</span><span className="block text-[11px] text-[var(--color-ink-muted)]">{description}</span></span>
                    </label>
                  ))}
                </fieldset>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setExportOpen(false)} disabled={exporting} className="rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-ink-muted)] disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={() => void runExport()} disabled={exporting || !exportFrom || !exportTo} className="rounded-sm bg-[var(--color-navy)] px-3 py-2 text-xs font-[600] text-white disabled:cursor-not-allowed disabled:opacity-50">{exporting ? "Preparing report..." : "Export"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Net product sales", value: `PHP ${totalRevenue.toLocaleString()}`, accent: "var(--color-navy)" },
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
          <LineChart data={revenueSeries.map((point) => point.value)} />
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
          <BarChart data={orderSeries.map((point) => point.value)} />
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
        <LineChart data={orderSeries.map((point) => point.value)} color="var(--color-amber)" height={80} />
      </div>
    </div>
  );
}
