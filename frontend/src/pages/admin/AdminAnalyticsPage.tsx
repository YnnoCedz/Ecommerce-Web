import { useEffect, useRef, useState } from "react"
import { ArrowRight, RefreshCw } from "lucide-react"
import { Link } from "react-router"
import { fetchAdminActivity, fetchAdminPlatformAnalytics, type AdminActivity, type AdminAnalyticsRange, type AdminAnalyticsSectionData, type AdminAnalyticsTab } from "../../api/admin"
import { useUrlTab } from "../../hooks/useUrlTab"
import { AnalyticsKpis, AnalyticsPanel, BreakdownBars, RankingTable, RevenueOrdersChart, TrendChart, compact, money } from "./analytics/AnalyticsComponents"

const TABS: readonly AdminAnalyticsTab[] = ["overview", "commerce", "users-sellers", "catalog", "operations", "security"]
const RANGES: readonly AdminAnalyticsRange[] = ["7d", "30d", "90d", "12m"]
const TAB_LABELS: Record<AdminAnalyticsTab, string> = { overview: "Overview", commerce: "Commerce", "users-sellers": "Users & Sellers", catalog: "Catalog", operations: "Operations", security: "Security" }
const RANGE_LABELS: Record<AdminAnalyticsRange, string> = { "7d": "7 Days", "30d": "30 Days", "90d": "90 Days", "12m": "This Year" }

export default function AdminAnalyticsPage() {
  const { activeTab, setActiveTab } = useUrlTab(TABS, "overview")
  const { activeTab: range, setActiveTab: setRange } = useUrlTab(RANGES, "30d", { parameter: "range" })
  const cache = useRef(new Map<string, AdminAnalyticsSectionData>())
  const [data, setData] = useState<AdminAnalyticsSectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let mounted = true
    const key = `${activeTab}:${range}`
    const cached = cache.current.get(key)
    if (cached) { setData(cached); setLoading(false); setRefreshing(false); return () => { mounted = false } }
    setData(null); setLoading(true); setRefreshing(true)
    setError(null)
    fetchAdminPlatformAnalytics(activeTab, range).then(({ data: response }) => {
      if (!mounted) return
      cache.current.set(key, response); setData(response)
    }).catch((reason: Error) => mounted && setError(reason.message)).finally(() => { if (mounted) { setLoading(false); setRefreshing(false) } })
    return () => { mounted = false }
  }, [activeTab, range, refreshVersion])

  return <div className="mx-auto max-w-screen-xl p-4 md:p-6">
    <header className="mb-6 border-b border-slate-200 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5"><div><h1 className="font-[var(--font-display)] text-2xl text-[var(--color-navy)] md:text-3xl">Platform Analytics</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Marketplace performance, operations, and security insights</p></div><div className="flex items-center gap-2"><button onClick={() => { cache.current.delete(`${activeTab}:${range}`); setRefreshVersion((value) => value + 1) }} disabled={refreshing} className="rounded-lg p-2 text-[var(--color-ink-muted)] hover:bg-white disabled:opacity-40" aria-label="Refresh analytics"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""}/></button><select value={range} onChange={(event) => setRange(event.target.value as AdminAnalyticsRange)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[var(--color-navy)] shadow-sm outline-none focus:border-[var(--color-navy)]">{RANGES.map((value) => <option key={value} value={value}>{RANGE_LABELS[value]}</option>)}</select></div></div>
      <nav className="flex gap-1 overflow-x-auto" aria-label="Analytics sections">{TABS.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-navy)]"}`}>{TAB_LABELS[tab]}</button>)}</nav>
    </header>
    {error && <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading && !data ? <TabSkeleton/> : data && <div className={refreshing ? "opacity-60 transition-opacity" : ""}>{activeTab === "overview" && <Overview data={data} goTo={setActiveTab}/>} {activeTab === "commerce" && <Commerce data={data}/>} {activeTab === "users-sellers" && <UsersSellers data={data}/>} {activeTab === "catalog" && <Catalog data={data}/>} {activeTab === "operations" && <Operations data={data}/>} {activeTab === "security" && <Security data={data} range={range}/>}</div>}
  </div>
}

function Overview({ data, goTo }: { data: AdminAnalyticsSectionData; goTo: (tab: AdminAnalyticsTab) => void }) {
  const [performance, setPerformance] = useState<"seller" | "product">("seller")
  return <div className="space-y-5">
    <AnalyticsKpis metrics={data.kpis} definitions={[
      { key: "gross_marketplace_value", label: "Gross marketplace value", format: money }, { key: "orders", label: "Orders" }, { key: "average_order_value", label: "Average order value", format: money },
      { key: "active_buyers", label: "Active buyers" }, { key: "active_sellers", label: "Active sellers" }, { key: "order_completion_rate", label: "Order completion rate", format: (value) => `${value}%` },
    ]}/>
    <AnalyticsPanel title="Revenue & Orders Trend" subtitle="Gross marketplace value and order volume across the selected period"><RevenueOrdersChart points={data.revenue_orders_trend ?? []}/></AnalyticsPanel>
    <div className="grid gap-5 lg:grid-cols-2"><AnalyticsPanel title="Order Status" subtitle="Current period distribution"><BreakdownBars values={data.order_status ?? {}}/></AnalyticsPanel><AnalyticsPanel title="Marketplace Growth" subtitle="New buyers and sellers; administrators excluded"><TrendChart points={data.marketplace_growth ?? []} series={[["buyers", "Buyers"], ["sellers", "Sellers"]]}/></AnalyticsPanel></div>
    <AnalyticsPanel title="Marketplace Performance" subtitle="Leading revenue contributors for this period"><div className="mb-3 flex items-center justify-between gap-3"><div className="inline-flex rounded-lg bg-slate-100 p-1"><button onClick={() => setPerformance("seller")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${performance === "seller" ? "bg-white text-[var(--color-navy)] shadow-sm" : "text-[var(--color-ink-muted)]"}`}>Top Sellers</button><button onClick={() => setPerformance("product")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${performance === "product" ? "bg-white text-[var(--color-navy)] shadow-sm" : "text-[var(--color-ink-muted)]"}`}>Top Products</button></div><button onClick={() => goTo(performance === "seller" ? "users-sellers" : "catalog")} className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)]">View full analytics <ArrowRight size={14}/></button></div><RankingTable rows={performance === "seller" ? data.top_sellers ?? [] : data.top_products ?? []} type={performance} limit={5}/></AnalyticsPanel>
  </div>
}

function Commerce({ data }: { data: AdminAnalyticsSectionData }) {
  return <div className="space-y-5"><SectionIntro title="Commerce health" text="Revenue, order quality, and marketplace transaction performance."/><AnalyticsKpis metrics={data.kpis} definitions={[{ key: "gross_marketplace_value", label: "Gross marketplace value", format: money }, { key: "orders", label: "Orders" }, { key: "average_order_value", label: "Average order value", format: money }, { key: "cancellation_rate", label: "Cancellation rate", format: percent }, { key: "return_rate", label: "Return rate", format: percent }, { key: "dispute_rate", label: "Dispute rate", format: percent }]}/><AnalyticsPanel title="GMV & Orders Trend"><RevenueOrdersChart points={data.revenue_orders_trend ?? []}/></AnalyticsPanel><div className="grid gap-5 lg:grid-cols-2"><AnalyticsPanel title="Order Status Breakdown"><BreakdownBars values={data.order_status ?? {}}/></AnalyticsPanel><AnalyticsPanel title="Top Products by Revenue"><RankingTable rows={data.top_products ?? []} type="product"/></AnalyticsPanel></div><AnalyticsPanel title="Top Sellers by Revenue"><RankingTable rows={data.top_sellers ?? []} type="seller"/></AnalyticsPanel></div>
}

function UsersSellers({ data }: { data: AdminAnalyticsSectionData }) {
  return <div className="space-y-5"><SectionIntro title="Users & sellers" text="Marketplace participation, seller decisions, and compliance."/><AnalyticsKpis metrics={data.kpis} definitions={[{ key: "active_buyers", label: "Active buyers" }, { key: "active_sellers", label: "Active sellers" }, { key: "seller_applications", label: "Seller applications" }, { key: "approval_rate", label: "Approval rate", format: percent }, { key: "rejection_rate", label: "Rejection rate", format: percent }, { key: "seller_deactivations", label: "Seller deactivations" }]}/><div className="grid gap-5 lg:grid-cols-2"><AnalyticsPanel title="Buyer & Seller Growth"><TrendChart points={data.user_growth ?? []} series={[["buyers", "Buyers"], ["sellers", "Sellers"]]}/></AnalyticsPanel><AnalyticsPanel title="Seller Application Decisions"><TrendChart points={data.application_trend ?? []} series={[["approved", "Approved"], ["rejected", "Rejected"]]}/></AnalyticsPanel></div><AnalyticsPanel title="Seller Document Compliance"><BreakdownBars values={data.document_compliance ?? {}}/></AnalyticsPanel></div>
}

function Catalog({ data }: { data: AdminAnalyticsSectionData }) {
  const categories = (data.categories ?? []).map((item) => ({ date: item.name, total: item.total }))
  return <div className="space-y-5"><SectionIntro title="Catalog performance" text="Product growth, availability, and revenue contribution."/><AnalyticsKpis metrics={data.kpis} definitions={[{ key: "active_products", label: "Active products" }, { key: "inactive_products", label: "Inactive products" }, { key: "out_of_stock", label: "Out of stock" }, { key: "products_added", label: "Products added" }]}/><div className="grid gap-5 lg:grid-cols-2"><AnalyticsPanel title="Product Growth"><TrendChart points={data.product_growth ?? []} series={[["total", "Products added"]]}/></AnalyticsPanel><AnalyticsPanel title="Inventory Status"><BreakdownBars values={data.inventory ?? {}}/></AnalyticsPanel></div><AnalyticsPanel title="Products by Category"><TrendChart points={categories} series={[["total", "Products"]]}/></AnalyticsPanel><AnalyticsPanel title="Top Products"><RankingTable rows={data.top_products ?? []} type="product"/></AnalyticsPanel></div>
}

function Operations({ data }: { data: AdminAnalyticsSectionData }) {
  const exceptions = data.exceptions ?? []
  return <div className="space-y-5"><SectionIntro title="Marketplace operations" text="Fulfillment throughput, delivery health, and exceptions requiring attention."/><AnalyticsKpis metrics={data.kpis} definitions={[{ key: "awaiting_shipment", label: "Awaiting shipment" }, { key: "in_transit", label: "In transit" }, { key: "completed_deliveries", label: "Completed deliveries" }, { key: "returns", label: "Returns" }, { key: "disputes", label: "Disputes" }, { key: "average_fulfillment_hours", label: "Avg fulfillment", format: hours }]}/><div className="grid gap-5 lg:grid-cols-2"><AnalyticsPanel title="Fulfillment Trend"><TrendChart points={data.fulfillment_trend ?? []} series={[["ready", "Ready"], ["delivered", "Delivered"]]}/></AnalyticsPanel><AnalyticsPanel title="Delivery Status"><BreakdownBars values={data.delivery_status ?? {}}/></AnalyticsPanel></div>{exceptions.length > 0 && <AnalyticsPanel title="Operational Exceptions" subtitle="Oldest orders still awaiting pickup"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]"><tr><th className="pb-3">Order</th><th className="pb-3">Seller</th><th className="pb-3">Status</th><th className="pb-3">Waiting since</th></tr></thead><tbody>{exceptions.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="py-3 font-medium">{row.order_number}</td><td className="py-3">{row.seller}</td><td className="py-3 capitalize">{row.status}</td><td className="py-3 text-[var(--color-ink-muted)]">{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></AnalyticsPanel>}</div>
}

function Security({ data, range }: { data: AdminAnalyticsSectionData; range: AdminAnalyticsRange }) {
  const [activity, setActivity] = useState<AdminActivity[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { let mounted = true; setLoading(true); fetchAdminActivity({ per_page: 10, from: rangeStart(range) }).then((response) => mounted && setActivity(response.data)).finally(() => mounted && setLoading(false)); return () => { mounted = false } }, [range])
  return <div className="space-y-5"><SectionIntro title="Security & authentication" text="Captured security evidence only; historical login activity is never inferred."/><AnalyticsKpis metrics={data.kpis} definitions={[{ key: "successful_logins", label: "Successful logins" }, { key: "failed_logins", label: "Failed logins" }, { key: "mfa_failures", label: "MFA failures" }, { key: "password_changes", label: "Password changes" }, { key: "account_suspensions", label: "Account suspensions" }, { key: "danger_zone_actions", label: "Danger-zone actions" }]}/><AnalyticsPanel title="Login Trend" subtitle={data.definition}><TrendChart points={data.login_trend ?? []} series={[["successful", "Successful"], ["failed", "Failed"]]}/>{data.tracking_started_at && <p className="mt-3 text-xs text-[var(--color-ink-muted)]">Trustworthy login tracking begins {new Date(data.tracking_started_at).toLocaleString()}.</p>}</AnalyticsPanel><div className="grid gap-5 lg:grid-cols-2"><AnalyticsPanel title="Successful Logins by Role"><BreakdownBars values={Object.fromEntries((data.logins_by_role ?? []).map((item) => [item.role, item.total]))}/></AnalyticsPanel><AnalyticsPanel title="Activity Volume by Category"><BreakdownBars values={Object.fromEntries((data.activity_by_category ?? []).map((item) => [item.category, item.total]))}/></AnalyticsPanel></div><AnalyticsPanel title="Recent Platform Activity" subtitle="Latest live audit and trustworthy historical business events"><div className="divide-y divide-slate-100">{loading ? <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">Loading recent activity...</p> : activity.length ? activity.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-4 py-3"><div><p className="text-sm font-medium">{entry.description}</p><p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{entry.user?.name ?? "System / unknown"} · {entry.source_label}</p></div><time className="shrink-0 text-xs text-[var(--color-ink-muted)]">{new Date(entry.occurred_at).toLocaleString()}</time></div>) : <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">No activity for this period.</p>}</div><Link to="/admin/activity" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-navy)]">View all activity <ArrowRight size={15}/></Link></AnalyticsPanel></div>
}

function SectionIntro({ title, text }: { title: string; text: string }) { return <div><h2 className="font-[var(--font-display)] text-xl text-[var(--color-navy)]">{title}</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">{text}</p></div> }
function TabSkeleton() { return <div className="space-y-5 animate-pulse"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 rounded-xl bg-slate-100"/>)}</div><div className="h-80 rounded-2xl bg-slate-100"/></div> }
const percent = (value: number) => `${value}%`; const hours = (value: number) => `${value.toFixed(1)}h`
function rangeStart(range: AdminAnalyticsRange) { const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "12m" ? 365 : 30; const date = new Date(); date.setDate(date.getDate() - days + 1); return date.toISOString().slice(0, 10) }
