import { useEffect, useMemo, useState } from "react";
import { fetchSellerDashboard, type SellerDashboard as SellerDashboardData } from "../../api/seller";

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
      <p className="text-xs text-[var(--color-ink-muted)] mb-1">{label}</p>
      <p className="font-[var(--font-display)] text-2xl font-[400]" style={{ color: accent ?? "var(--color-ink)" }}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-ink-disabled)]">{sub}</p>}
    </div>
  );
}

function SeriesBars({ data, color = "var(--color-navy)" }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...data.map((point) => point.value));

  return (
    <div className="flex items-end gap-2 h-44">
      {data.map((point) => (
        <div key={point.label} className="flex-1 flex flex-col items-center justify-end gap-1">
          <div className="w-full max-w-8 bg-[var(--color-surface)] rounded-sm overflow-hidden flex items-end" style={{ height: "100%" }}>
            <div className="w-full rounded-sm" style={{ height: `${Math.max(4, (point.value / max) * 100)}%`, background: color }} />
          </div>
          <span className="text-[10px] text-[var(--color-ink-disabled)] font-[var(--font-mono)]">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function SellerDashboard() {
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchSellerDashboard();
        if (!active) return;
        setDashboard(response.data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load seller dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const summary = dashboard?.summary;
  const revenueSeries = dashboard?.revenue_series ?? [];
  const orderSeries = dashboard?.order_series ?? [];
  const topProducts = dashboard?.top_products ?? [];
  const categoryBreakdown = dashboard?.category_breakdown ?? [];
  const recentOrders = dashboard?.recent_orders ?? [];
  const recentProducts = dashboard?.recent_products ?? [];

  const recentActivityLabel = useMemo(() => {
    if (!summary?.recent_activity?.length) {
      return "No recent seller activity yet.";
    }

    return "Recent activity is based on your latest orders and updates.";
  }, [summary?.recent_activity]);

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading seller dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-6">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">Dashboard</h1>
          <p className="text-sm text-[var(--color-red)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">
            {dashboard?.seller?.business_name ?? "Seller dashboard"}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{recentActivityLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card label="Products" value={`${summary?.total_products ?? 0}`} sub={`${summary?.active_products ?? 0} active`} />
        <Card label="Low stock" value={`${summary?.low_stock_products ?? 0}`} sub="Needs attention" accent="var(--color-amber)" />
        <Card label="Pending orders" value={`${summary?.pending_orders ?? 0}`} sub="Awaiting action" accent="var(--color-amber)" />
        <Card label="Completed" value={`${summary?.completed_orders ?? 0}`} sub="Fulfilled orders" accent="var(--color-green)" />
        <Card label="Sales" value={`₱${Number(summary?.total_sales ?? 0).toLocaleString()}`} sub="Lifetime gross" accent="var(--color-navy)" />
        <Card label="Promotions" value={`${summary?.promotions_count ?? 0}`} sub="Active and scheduled" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Revenue trend</h2>
              <p className="text-xs text-[var(--color-ink-muted)]">Last {revenueSeries.length} days</p>
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">Backend-powered</span>
          </div>
          <SeriesBars data={revenueSeries.map((point) => ({ label: point.label, value: point.value }))} />
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Revenue by category</h2>
          <div className="space-y-3">
            {categoryBreakdown.length > 0 ? categoryBreakdown.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--color-ink-muted)] truncate">{item.name}</span>
                  <span className="text-[var(--color-ink)] font-[var(--font-mono)]">{item.pct}%</span>
                </div>
                <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-navy)] rounded-full" style={{ width: `${Math.max(4, item.pct)}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-[var(--color-ink-muted)]">No category breakdown yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-1">Orders</h2>
          <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-4">{summary?.orders_count ?? 0}</p>
          <SeriesBars data={orderSeries.map((point) => ({ label: point.label, value: point.value }))} color="var(--color-amber)" />
        </div>

        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Top products</h2>
            <span className="text-xs text-[var(--color-ink-muted)]">by revenue</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                {["#", "Product", "Category", "Revenue", "Orders", "Returns"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.length > 0 ? topProducts.map((product, index) => (
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
                  <td className="px-4 py-3 font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{product.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)]">{product.orders}</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{product.returns}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-[var(--color-ink-muted)] text-center">No products sold yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[var(--color-border)] rounded-sm">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Recent orders</h2>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{order.order_number ?? `Order #${order.id}`}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] truncate">{order.buyer?.name ?? "Guest buyer"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{order.grand_total.toLocaleString()}</p>
                  <p className="text-xs text-[var(--color-ink-disabled)] capitalize">{order.status.replaceAll("-", " ")}</p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-sm text-[var(--color-ink-muted)]">No recent orders yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">Recent products</h2>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {recentProducts.length > 0 ? recentProducts.map((product) => (
              <div key={product.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{product.name}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] truncate">{product.category?.name ?? "Uncategorized"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{product.price.toLocaleString()}</p>
                  <p className="text-xs text-[var(--color-ink-disabled)]">{product.stock_quantity} in stock</p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-sm text-[var(--color-ink-muted)]">No products yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
