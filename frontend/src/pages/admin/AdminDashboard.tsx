import { useEffect, useState } from "react";
import { AlertTriangle, Package, ShoppingBag, Store, Users } from "lucide-react";
import { fetchAdminDashboard, type AdminDashboardData } from "../../api/admin";

type Range = 7 | 30 | 90;
const money = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
const date = (value: string | null) => value ? new Date(value).toLocaleString("en-PH") : "Not available";

function Trend({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-20 flex items-center justify-center text-xs text-[var(--color-ink-muted)]">Not enough activity yet</div>;
  const max = Math.max(...values, 1); const width = 600; const height = 90;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - (value / max) * (height - 8)}`).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none"><polyline points={points} fill="none" stroke="var(--color-navy)" strokeWidth="2" /></svg>;
}

export default function AdminDashboard() {
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    fetchAdminDashboard(range).then(response => { if (active) setData(response.data); }).catch((caught: Error) => { if (active) setError(caught.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  const metrics = data?.metrics;
  const cards = metrics ? [
    ["GMV", money(metrics.gmv), ShoppingBag], ["Active users", metrics.active_users.toLocaleString(), Users],
    ["Approved sellers", metrics.approved_sellers.toLocaleString(), Store], ["Active products", metrics.active_products.toLocaleString(), Package],
    ["Open reports", metrics.open_reports.toLocaleString(), AlertTriangle], ["Open disputes", metrics.open_disputes.toLocaleString(), AlertTriangle],
  ] as const : [];

  return <div className="p-6 max-w-screen-xl mx-auto space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-[var(--font-display)] text-2xl">Platform dashboard</h1><p className="text-sm text-[var(--color-ink-muted)]">Live marketplace data from the Maketo API</p></div><div className="flex border border-[var(--color-border)] p-0.5">{([7, 30, 90] as Range[]).map(value => <button key={value} onClick={() => setRange(value)} className={`px-3 py-1 text-xs ${range === value ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)]"}`}>{value}d</button>)}</div></div>
    {loading && <div className="py-16 text-center text-sm text-[var(--color-ink-muted)]">Loading dashboard...</div>}
    {error && <div className="border border-[var(--color-red-border)] bg-[var(--color-red-light)] p-4 text-sm text-[var(--color-red)]">{error}</div>}
    {!loading && !error && data && <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">{cards.map(([label, value, Icon]) => <div key={label} className="bg-white border border-[var(--color-border)] p-4"><Icon size={16} className="text-[var(--color-navy)] mb-5" /><p className="font-[var(--font-display)] text-xl">{value}</p><p className="text-xs text-[var(--color-ink-muted)]">{label}</p></div>)}</div>
      <div className="bg-white border border-[var(--color-border)] p-5"><div className="flex justify-between"><h2 className="font-[600]">GMV over time</h2><span className="text-xs text-[var(--color-ink-muted)]">{range} days</span></div><Trend values={data.series.map(point => point.gmv)} /></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <section className="bg-white border border-[var(--color-border)]"><h2 className="p-4 border-b border-[var(--color-border)] font-[600]">Recent users</h2>{data.recent_users.length ? data.recent_users.map(user => <div key={user.id} className="p-3 border-b border-[var(--color-border-subtle)] last:border-0"><p className="text-sm">{user.name}</p><p className="text-xs text-[var(--color-ink-muted)]">{user.email} · {user.role}</p></div>) : <p className="p-5 text-sm text-[var(--color-ink-muted)]">No users yet.</p>}</section>
        <section className="bg-white border border-[var(--color-border)]"><h2 className="p-4 border-b border-[var(--color-border)] font-[600]">Recent orders</h2>{data.recent_orders.length ? data.recent_orders.map(order => <div key={order.id} className="p-3 border-b border-[var(--color-border-subtle)] last:border-0 flex justify-between gap-3"><div><p className="text-sm">{order.order_number}</p><p className="text-xs text-[var(--color-ink-muted)]">{order.buyer_name ?? "Unknown buyer"} · {order.status}</p></div><span className="text-sm">{money(order.grand_total)}</span></div>) : <p className="p-5 text-sm text-[var(--color-ink-muted)]">No orders yet.</p>}</section>
        <section className="bg-white border border-[var(--color-border)]"><h2 className="p-4 border-b border-[var(--color-border)] font-[600]">Recent reports</h2>{data.recent_reports.length ? data.recent_reports.map(report => <div key={report.id} className="p-3 border-b border-[var(--color-border-subtle)] last:border-0"><p className="text-sm">{report.reference} · {report.reason}</p><p className="text-xs text-[var(--color-ink-muted)]">{report.status} · {date(report.created_at)}</p></div>) : <p className="p-5 text-sm text-[var(--color-ink-muted)]">No reports yet.</p>}</section>
      </div>
    </>}
  </div>;
}
