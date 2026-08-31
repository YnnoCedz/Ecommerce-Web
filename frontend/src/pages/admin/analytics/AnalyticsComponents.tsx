import type { ReactNode } from "react"
import type { AdminAnalyticsMetric } from "../../../api/admin"

export type ChartPoint = Record<string, string | number>
const COLORS = ["#17324d", "#2f7d6d", "#c17836", "#8b5e83"]
export const money = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value)
export const compact = (value: number) => new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(value)

export function AnalyticsKpis({ metrics, definitions }: { metrics: Record<string, AdminAnalyticsMetric>; definitions: Array<{ key: string; label: string; format?: (value: number) => string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{definitions.map(({ key, label, format = compact }) => {
    const metric = metrics[key]
    if (!metric) return null
    return <article key={key} className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.05]">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">{label}</p>
      <p className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-navy)] md:text-3xl">{format(Number(metric.value))}</p>
      {metric.change_percent !== null ? <p className={`mt-1 text-xs font-medium ${metric.change_percent >= 0 ? "text-emerald-700" : "text-red-700"}`}>{metric.change_percent >= 0 ? "↑" : "↓"} {Math.abs(metric.change_percent)}% vs previous period</p> : <div className="h-4"/>}
    </article>
  })}</div>
}

export function AnalyticsPanel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.05] md:p-6 ${className}`}><div className="mb-5"><h2 className="font-[var(--font-display)] text-lg text-[var(--color-navy)]">{title}</h2>{subtitle && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{subtitle}</p>}</div>{children}</section>
}

export function TrendChart({ points, series, height = 280, valueFormat = compact }: { points: ChartPoint[]; series: Array<[string, string]>; height?: number; valueFormat?: (value: number) => string }) {
  if (!points.length) return <EmptyChart/>
  const width = 800, padX = 48, padY = 32
  const max = Math.max(1, ...points.flatMap((point) => series.map(([key]) => Number(point[key] ?? 0))))
  const x = (index: number) => padX + (index * (width - padX - 14)) / Math.max(points.length - 1, 1)
  const y = (value: number) => height - padY - (value / max) * (height - padY * 2)
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }} role="img" aria-label={series.map(([, label]) => label).join(" and ")}>
    {[0, .5, 1].map((ratio) => <g key={ratio}><line x1={padX} x2={width - 10} y1={y(max * ratio)} y2={y(max * ratio)} stroke="#e8edf2"/><text x="2" y={y(max * ratio) + 4} fontSize="10" fill="#718096">{valueFormat(max * ratio)}</text></g>)}
    {series.map(([key], index) => <polyline key={key} fill="none" stroke={COLORS[index]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points.map((point, pointIndex) => `${x(pointIndex)},${y(Number(point[key] ?? 0))}`).join(" ")}/>)}
    <text x={padX} y={height - 7} fontSize="10" fill="#718096">{String(points[0]?.date ?? "")}</text><text x={width - 74} y={height - 7} fontSize="10" fill="#718096">{String(points.at(-1)?.date ?? "")}</text>
  </svg><ChartLegend series={series}/></div>
}

export function RevenueOrdersChart({ points }: { points: ChartPoint[] }) {
  if (!points.length) return <EmptyChart/>
  const width = 900, height = 350, padX = 54, padY = 38
  const salesMax = Math.max(1, ...points.map((point) => Number(point.gross_sales ?? 0)))
  const ordersMax = Math.max(1, ...points.map((point) => Number(point.total ?? 0)))
  const x = (index: number) => padX + (index * (width - padX - 28)) / Math.max(points.length - 1, 1)
  const y = (value: number, max: number) => height - padY - (value / max) * (height - padY * 2)
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }} role="img" aria-label="Revenue and orders trend">
    {[0, .5, 1].map((ratio) => <g key={ratio}><line x1={padX} x2={width - 28} y1={y(salesMax * ratio, salesMax)} y2={y(salesMax * ratio, salesMax)} stroke="#e8edf2"/><text x="2" y={y(salesMax * ratio, salesMax) + 4} fontSize="10" fill="#718096">{compact(salesMax * ratio)}</text><text x={width - 22} y={y(ordersMax * ratio, ordersMax) + 4} fontSize="10" fill="#718096">{compact(ordersMax * ratio)}</text></g>)}
    <polyline fill="none" stroke={COLORS[0]} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={points.map((point, index) => `${x(index)},${y(Number(point.gross_sales ?? 0), salesMax)}`).join(" ")}/>
    <polyline fill="none" stroke={COLORS[1]} strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="round" strokeLinecap="round" points={points.map((point, index) => `${x(index)},${y(Number(point.total ?? 0), ordersMax)}`).join(" ")}/>
    <text x={padX} y={height - 8} fontSize="10" fill="#718096">{String(points[0]?.date ?? "")}</text><text x={width - 88} y={height - 8} fontSize="10" fill="#718096">{String(points.at(-1)?.date ?? "")}</text>
  </svg><ChartLegend series={[["gross_sales", "Gross sales"], ["total", "Orders"]]}/></div>
}

export function BreakdownBars({ values, labels }: { values: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(values)
  if (!entries.length || entries.every(([, value]) => Number(value) === 0)) return <EmptyChart/>
  const max = Math.max(1, ...entries.map(([, value]) => Number(value)))
  return <div className="space-y-4 py-2">{entries.map(([key, value], index) => <div key={key}><div className="mb-1.5 flex justify-between text-xs"><span className="capitalize text-[var(--color-ink-muted)]">{labels?.[key] ?? key.replaceAll("_", " ")}</span><span className="font-semibold text-[var(--color-navy)]">{compact(Number(value))}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(3, Number(value) / max * 100)}%`, backgroundColor: COLORS[index % COLORS.length] }}/></div></div>)}</div>
}

export function RankingTable({ rows, type, limit = 10 }: { rows: Array<{ id: number; name: string; gmv?: number; orders?: number; sales?: number; units?: number }>; type: "seller" | "product"; limit?: number }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-[var(--color-ink-muted)]">No performance data for this period.</p>
  return <ol className="divide-y divide-slate-100">{rows.slice(0, limit).map((row, index) => <li key={row.id} className="flex items-center gap-3 py-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-[var(--color-navy)]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span><span className="text-right text-sm font-semibold text-[var(--color-navy)]">{money(Number(type === "seller" ? row.gmv : row.sales))}<small className="block font-normal text-[var(--color-ink-muted)]">{type === "seller" ? `${row.orders ?? 0} orders` : `${row.units ?? 0} units`}</small></span></li>)}</ol>
}

function ChartLegend({ series }: { series: Array<[string, string]> }) { return <div className="mt-2 flex flex-wrap justify-center gap-5 text-xs text-[var(--color-ink-muted)]">{series.map(([, label], index) => <span key={label} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }}/>{label}</span>)}</div> }
function EmptyChart() { return <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 text-sm text-[var(--color-ink-muted)]">No data for this period</div> }
