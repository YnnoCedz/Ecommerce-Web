import { useEffect, useState, type ReactNode } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import {
  AlertCircle, ArrowLeft, BarChart3, Boxes, Building2, ClipboardList, ExternalLink,
  Mail, MapPin, PackageCheck, RefreshCw, Route, Search, ShieldCheck, Truck, UserRoundCheck,
  Users, Warehouse,
} from "lucide-react"
import {
  approveRiderApplication, assignShipmentRider, checkInShipment, fetchHubs,
  fetchRiderApplication, fetchRiderApplications, fetchRiders, fetchShipment, fetchShipments,
  rejectRiderApplication, viewRiderDocument,
  type AuthUser, type LogisticsContext, type LogisticsHub, type LogisticsShipment,
  type PageMeta, type RiderAffiliation, type RiderApplication,
} from "../api"
import { MARKETPLACE_URL } from "../config"
import {
  Alert, Button, Card, DataTable, DetailRow, EmptyState, LoadingRows, PageHeader,
  Select, StatusBadge, TableCell, TableRow,
} from "../components/ui"

const formatDate = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Not available"
const messageOf = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback

function FilterBar({ search, onSearch, status, onStatus, statuses = [], onRefresh, children }: {
  search: string; onSearch: (value: string) => void; status?: string; onStatus?: (value: string) => void
  statuses?: string[]; onRefresh: () => void; children?: ReactNode
}) {
  return <div className="flex flex-wrap items-end gap-3 rounded-sm border border-[var(--color-border)] bg-white p-3">
    <label className="min-w-[15rem] flex-1">
      <span className="sr-only">Search</span>
      <span className="flex items-center gap-2 rounded-sm border border-[var(--color-border)] px-3 py-2.5 focus-within:border-[var(--color-navy)]">
        <Search size={14} aria-hidden="true" className="text-[var(--color-ink-muted)]" />
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search tracking or order" className="w-full bg-transparent text-sm outline-none" />
      </span>
    </label>
    {onStatus && <label className="min-w-44">
      <span className="sr-only">Status</span>
      <select value={status} onChange={event => onStatus(event.target.value)} className="w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-navy)]">
        <option value="">All statuses</option>
        {statuses.map(value => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}
      </select>
    </label>}
    {children}
    <Button variant="secondary" onClick={onRefresh} className="py-2.5"><RefreshCw size={14} /> Refresh</Button>
  </div>
}

function Pagination({ meta, onPage }: { meta: PageMeta | null; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) return null
  return <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white px-4 py-3 text-xs text-[var(--color-ink-muted)]">
    <span>Page {meta.current_page} of {meta.last_page} · {meta.total} records</span>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="py-1.5 px-3">Previous</Button>
      <Button variant="secondary" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="py-1.5 px-3">Next</Button>
    </div>
  </div>
}

export function DashboardPage({ user, context }: { user: AuthUser; context: LogisticsContext }) {
  return <>
    <PageHeader title="Logistics dashboard" subtitle={`${context.provider.company_name} operational workspace`} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card title="Provider" icon={<Building2 size={15} />}><dl className="space-y-4">
        <DetailRow label="Company">{context.provider.company_name}</DetailRow>
        <DetailRow label="Provider code"><span className="font-[var(--font-mono)] text-xs">{context.provider.code}</span></DetailRow>
        <DetailRow label="Status"><StatusBadge status={context.provider.status} /></DetailRow>
      </dl></Card>
      <Card title="Your access" icon={<ShieldCheck size={15} />}><dl className="space-y-4">
        <DetailRow label="Staff">{context.staff.name || user.display_name}</DetailRow>
        <DetailRow label="Access level">{context.staff.type.replaceAll("_", " ")}</DetailRow>
        <DetailRow label="Status"><StatusBadge status={context.staff.status} /></DetailRow>
      </dl></Card>
      <Card title="Hub context" icon={<Warehouse size={15} />}><dl className="space-y-4">
        <DetailRow label="Primary hub">{context.staff.primary_hub?.name ?? "Provider-wide"}</DetailRow>
        <DetailRow label="Authorized hubs">{context.authorized_hubs.length}</DetailRow>
        <DetailRow label="Coverage">{context.authorized_hubs.map(hub => hub.name).join(", ") || "No hubs configured"}</DetailRow>
      </dl></Card>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Quick actions"><div className="grid gap-2 sm:grid-cols-2">
        <Link className="rounded-sm border border-[var(--color-border)] p-3 text-sm hover:border-[var(--color-navy)]" to="/operations/incoming">Receive incoming parcels</Link>
        <Link className="rounded-sm border border-[var(--color-border)] p-3 text-sm hover:border-[var(--color-navy)]" to="/operations/assignments">Assign ready deliveries</Link>
        <Link className="rounded-sm border border-[var(--color-border)] p-3 text-sm hover:border-[var(--color-navy)]" to="/riders?tab=applications">Review Rider applications</Link>
        <Link className="rounded-sm border border-[var(--color-border)] p-3 text-sm hover:border-[var(--color-navy)]" to="/hubs">View hub network</Link>
      </div></Card>
      <Card title="Operational overview"><EmptyState icon={<BarChart3 size={18} />} title="Live metrics are not available yet" description="The current Logistics API exposes provider context and operational records, but no synchronized KPI aggregate. No placeholder totals are shown." /></Card>
    </div>
  </>
}

export function PendingOperationalPage({ title, description, icon, detail }: { title: string; description: string; icon: ReactNode; detail: string }) {
  return <><PageHeader title={title} subtitle={description} /><Card><EmptyState icon={icon} title="Operational integration pending" description={detail} /></Card></>
}

export const PickupRequestsPage = () => <PendingOperationalPage title="Pickup Requests" description="Review and coordinate seller parcel collection requests." icon={<ClipboardList size={18} />} detail="First-mile pickup requests do not yet have a tenant-scoped backend endpoint. This workspace will remain read-only until that separate first-mile contract exists; it does not reuse shipments.courier_id or the last-mile picked-up state." />
export const SortingPage = () => <PendingOperationalPage title="Sorting" description="Organize received parcels into the correct destination workflow." icon={<Boxes size={18} />} detail="Sorting lanes, decisions, and exception states are not currently represented by a Logistics API. No synthetic queue or status has been created." />
export const MessagesPage = () => <PendingOperationalPage title="Messages" description="Provider-scoped operational communication." icon={<Mail size={18} />} detail="Existing messaging authorization does not yet expose a Logistics-provider participant contract. No fake conversations or chat actions are shown." />
export const ReportsPage = () => <PendingOperationalPage title="Reports" description="Operational reporting for this Logistics provider." icon={<BarChart3 size={18} />} detail="The backend does not yet provide provider-scoped aggregates or export endpoints. No charts, totals, Excel, or PDF actions are fabricated." />

function useShipments(initialStatus = "") {
  const [rows, setRows] = useState<LogisticsShipment[]>([]); const [meta, setMeta] = useState<PageMeta | null>(null)
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(initialStatus); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [refresh, setRefresh] = useState(0)
  useEffect(() => { let active = true; const timer = window.setTimeout(() => {
    setLoading(true); setError(null)
    fetchShipments({ search: search.trim() || undefined, status: status || undefined, per_page: 20, page })
      .then(response => { if (active) { setRows(response.data); setMeta(response.meta) } })
      .catch(reason => { if (active) setError(messageOf(reason, "Unable to load shipments.")) })
      .finally(() => { if (active) setLoading(false) })
  }, search ? 250 : 0); return () => { active = false; window.clearTimeout(timer) } }, [search, status, page, refresh])
  return { rows, setRows, meta, search, setSearch, status, setStatus, page, setPage, loading, error, setError, reload: () => setRefresh(value => value + 1) }
}

export function ShipmentsPage() {
  const state = useShipments()
  return <><PageHeader title="Shipments" subtitle="Monitor last-mile shipments assigned to your Logistics provider." />
    <FilterBar search={state.search} onSearch={value => { state.setSearch(value); state.setPage(1) }} status={state.status} onStatus={value => { state.setStatus(value); state.setPage(1) }} statuses={["ready", "picked-up", "in-transit", "out-for-delivery", "delivered"]} onRefresh={state.reload} />
    {state.error && <Alert>{state.error}</Alert>}
    <Card>{state.loading ? <LoadingRows rows={6} /> : state.rows.length ? <DataTable headers={["Tracking", "Order", "Current hub", "Rider", "Status", "Received", "Actions"]}>{state.rows.map(row => <TableRow key={row.id}>
      <TableCell><span className="font-[var(--font-mono)] text-xs">{row.tracking_number}</span></TableCell><TableCell>{row.order_number ?? "—"}</TableCell><TableCell>{row.current_hub?.name ?? "Not checked in"}</TableCell><TableCell>{row.courier?.name ?? "Unassigned"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{formatDate(row.hub_received_at)}</TableCell><TableCell><Link className="text-xs font-[600] text-[var(--color-navy)] hover:underline" to={`/operations/shipments/${row.id}`}>View details</Link></TableCell>
    </TableRow>)}</DataTable> : <EmptyState icon={<Truck size={18} />} title="No shipments found" description="No provider-scoped shipments match the current search and status filters." />}</Card>
    <Pagination meta={state.meta} onPage={state.setPage} />
  </>
}

export function ShipmentDetailPage() {
  const { id } = useParams(); const [data, setData] = useState<LogisticsShipment | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { const shipmentId = Number(id); if (!Number.isInteger(shipmentId)) { setError("Invalid shipment reference."); setLoading(false); return }
    fetchShipment(shipmentId).then(response => setData(response.data)).catch(reason => setError(messageOf(reason, "Unable to load shipment."))).finally(() => setLoading(false))
  }, [id])
  return <><Link to="/operations/shipments" className="inline-flex items-center gap-2 text-xs font-[600] text-[var(--color-navy)]"><ArrowLeft size={13} /> Back to shipments</Link>
    <PageHeader title={data?.tracking_number ?? "Shipment details"} subtitle="Provider-scoped delivery record and tracking timeline." actions={data && <StatusBadge status={data.status} />} />
    {error && <Alert>{error}</Alert>}{loading ? <Card><LoadingRows rows={7} /></Card> : data && <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Shipment"><dl className="space-y-4"><DetailRow label="Tracking">{data.tracking_number}</DetailRow><DetailRow label="Order">{data.order_number ?? "—"}</DetailRow><DetailRow label="Provider">{data.provider?.company_name ?? "—"}</DetailRow><DetailRow label="Current hub">{data.current_hub?.name ?? "Not checked in"}</DetailRow><DetailRow label="Rider">{data.courier?.name ?? "Unassigned"}</DetailRow><DetailRow label="POD"><StatusBadge status={data.proof_of_delivery?.exists ? "verified" : "pending"} label={data.proof_of_delivery?.exists ? "Submitted" : "Not submitted"} /></DetailRow></dl></Card>
      <section className="lg:col-span-2"><Card title="Tracking timeline">{data.tracking_events?.length ? <ol className="space-y-4">{data.tracking_events.map((event, index) => <li key={`${event.status}-${index}`} className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-navy)]" /><div><StatusBadge status={event.status} /><p className="mt-1 text-sm">{event.location || "Location not recorded"}</p><p className="text-xs text-[var(--color-ink-muted)]">{event.note || "No note"} · {formatDate(event.occurred_at)}</p></div></li>)}</ol> : <EmptyState icon={<Route size={18} />} title="No tracking events" description="Timeline entries will appear when the backend records shipment transitions." />}</Card></section>
    </div>}
  </>
}

export function IncomingParcelsPage({ context }: { context: LogisticsContext }) {
  const state = useShipments("ready"); const [hubId, setHubId] = useState(String(context.staff.primary_hub?.id ?? context.authorized_hubs[0]?.id ?? "")); const [busy, setBusy] = useState<number | null>(null)
  const incoming = state.rows.filter(row => !row.hub_received_at)
  const receive = async (row: LogisticsShipment) => { if (!hubId) return; setBusy(row.id); state.setError(null); try { await checkInShipment(row.id, Number(hubId)); state.reload() } catch (reason) { state.setError(messageOf(reason, "Unable to confirm hub receipt.")) } finally { setBusy(null) } }
  return <><PageHeader title="Incoming Parcels" subtitle="Receive provider-assigned shipments into an authorized hub." />
    <Alert type="info">This queue uses the existing hub check-in contract. It does not represent or update first-mile seller collection.</Alert>
    <FilterBar search={state.search} onSearch={state.setSearch} onRefresh={state.reload}><label className="min-w-52"><span className="sr-only">Receiving hub</span><select value={hubId} onChange={event => setHubId(event.target.value)} className="w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm"><option value="">Select receiving hub</option>{context.authorized_hubs.map(hub => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label></FilterBar>
    {state.error && <Alert>{state.error}</Alert>}<Card>{state.loading ? <LoadingRows rows={5} /> : incoming.length ? <DataTable headers={["Tracking", "Order", "Expected hub", "Status", "Received", "Action"]}>{incoming.map(row => <TableRow key={row.id}><TableCell>{row.tracking_number}</TableCell><TableCell>{row.order_number ?? "—"}</TableCell><TableCell>{row.current_hub?.name ?? "Awaiting check-in"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>Not received</TableCell><TableCell><Button disabled={!hubId} loading={busy === row.id} onClick={() => void receive(row)} className="py-2 px-3">Confirm received</Button></TableCell></TableRow>)}</DataTable> : <EmptyState icon={<PackageCheck size={18} />} title="No incoming parcels" description="No ready provider shipments are awaiting hub receipt." />}</Card>
  </>
}

export function AssignmentsPage() {
  const state = useShipments("ready"); const [riders, setRiders] = useState<RiderAffiliation[]>([]); const [selections, setSelections] = useState<Record<number, string>>({}); const [busy, setBusy] = useState<number | null>(null)
  useEffect(() => { fetchRiders().then(response => setRiders(response.data)).catch(reason => state.setError(messageOf(reason, "Unable to load eligible riders."))) }, [])
  const rows = state.rows.filter(row => !row.courier)
  const assign = async (row: LogisticsShipment) => { const courierId = Number(selections[row.id]); if (!courierId) return; setBusy(row.id); state.setError(null); try { await assignShipmentRider(row.id, courierId); state.reload() } catch (reason) { state.setError(messageOf(reason, "Unable to assign Rider.")) } finally { setBusy(null) } }
  return <><PageHeader title="Delivery Assignment" subtitle="Assign last-mile Riders through the provider-scoped dispatch service." /><Alert type="info">The backend remains authoritative: cross-provider Riders and invalid hub assignments are rejected, and CourierAssignmentService remains the sole writer of shipments.courier_id.</Alert>
    <FilterBar search={state.search} onSearch={state.setSearch} onRefresh={state.reload} />{state.error && <Alert>{state.error}</Alert>}
    <Card>{state.loading ? <LoadingRows rows={5} /> : rows.length ? <DataTable headers={["Shipment", "Order", "Current hub", "Eligible Rider", "Status", "Action"]}>{rows.map(row => <TableRow key={row.id}><TableCell>{row.tracking_number}</TableCell><TableCell>{row.order_number ?? "—"}</TableCell><TableCell>{row.current_hub?.name ?? "Not checked in"}</TableCell><TableCell><select aria-label={`Rider for ${row.tracking_number}`} value={selections[row.id] ?? ""} onChange={event => setSelections(current => ({ ...current, [row.id]: event.target.value }))} className="min-w-44 rounded-sm border border-[var(--color-border)] px-2 py-2 text-sm"><option value="">Select Rider</option>{riders.filter(rider => !row.current_hub || rider.primary_hub?.id === row.current_hub.id).map(rider => <option key={rider.id} value={rider.courier_id}>{rider.courier_name ?? `Rider ${rider.courier_id}`}</option>)}</select></TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell><Button disabled={!selections[row.id]} loading={busy === row.id} onClick={() => void assign(row)} className="py-2 px-3">Assign Rider</Button></TableCell></TableRow>)}</DataTable> : <EmptyState icon={<UserRoundCheck size={18} />} title="No deliveries awaiting assignment" description="Every matching ready shipment is assigned, or no provider shipments are currently ready." />}</Card>
  </>
}

export function HubsPage() {
  const [rows, setRows] = useState<LogisticsHub[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { fetchHubs().then(response => setRows(response.data)).catch(reason => setError(messageOf(reason, "Unable to load hubs."))).finally(() => setLoading(false)) }, [])
  return <><PageHeader title="Hubs" subtitle="Authorized sorting centers belonging to your Logistics provider." />{error && <Alert>{error}</Alert>}<Card>{loading ? <LoadingRows rows={5} /> : rows.length ? <DataTable headers={["Hub", "Code", "Location", "Service areas", "Status", "Action"]}>{rows.map(hub => <TableRow key={hub.id}><TableCell><strong>{hub.name}</strong></TableCell><TableCell><span className="font-[var(--font-mono)] text-xs">{hub.code}</span></TableCell><TableCell>{[hub.address.city_label, hub.address.province_label].filter(Boolean).join(", ") || "—"}</TableCell><TableCell>{hub.service_areas.filter(area => area.active).length}</TableCell><TableCell><StatusBadge status={hub.active ? "active" : "inactive"} /></TableCell><TableCell><Link to={`/hubs/${hub.id}`} className="text-xs font-[600] text-[var(--color-navy)]">View</Link></TableCell></TableRow>)}</DataTable> : <EmptyState icon={<Warehouse size={18} />} title="No hubs configured" description="No authorized hubs are available for this provider." />}</Card></>
}

export function HubDetailPage({ context }: { context: LogisticsContext }) {
  const { id } = useParams(); const [hub, setHub] = useState<LogisticsHub | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { fetchHubs().then(response => setHub(response.data.find(item => item.id === Number(id)) ?? null)).catch(reason => setError(messageOf(reason, "Unable to load hub."))).finally(() => setLoading(false)) }, [id])
  return <><Link to="/hubs" className="inline-flex items-center gap-2 text-xs font-[600] text-[var(--color-navy)]"><ArrowLeft size={13} /> Back to hubs</Link>{error && <Alert>{error}</Alert>}{loading ? <Card><LoadingRows /></Card> : !hub ? <Card><EmptyState icon={<Warehouse size={18} />} title="Hub not found" description="This hub is not within your authorized provider scope." /></Card> : <><PageHeader title={hub.name} subtitle={`${context.provider.company_name} · ${hub.code}`} actions={<StatusBadge status={hub.active ? "active" : "inactive"} />} /><div className="grid gap-4 lg:grid-cols-2"><Card title="Hub information"><dl className="space-y-4"><DetailRow label="Address">{[hub.address.line1, hub.address.line2, hub.address.barangay_label, hub.address.city_label, hub.address.province_label, hub.address.postal_code].filter(Boolean).join(", ")}</DetailRow><DetailRow label="Provider">{context.provider.company_name}</DetailRow><DetailRow label="Code">{hub.code}</DetailRow></dl></Card><Card title="Service areas">{hub.service_areas.length ? <ul className="space-y-2">{hub.service_areas.map(area => <li key={area.municipality_code} className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 text-sm"><span>{area.municipality_label}</span><StatusBadge status={area.active ? "active" : "inactive"} /></li>)}</ul> : <EmptyState icon={<MapPin size={18} />} title="No service areas" description="No municipality coverage is configured for this hub." />}</Card></div></>}</>
}

export function RidersPage({ context }: { context: LogisticsContext }) {
  const [params, setParams] = useSearchParams(); const canReview = context.staff.type === "provider_manager"; const requestedTab = params.get("tab"); const tab = requestedTab === "inactive" ? "inactive" : requestedTab === "active" || !canReview ? "active" : "applications"
  const [applications, setApplications] = useState<RiderApplication[]>([]); const [riders, setRiders] = useState<RiderAffiliation[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [search, setSearch] = useState(""); const [refresh, setRefresh] = useState(0)
  useEffect(() => { let active = true; setLoading(true); setError(null); const job = tab === "applications" ? fetchRiderApplications({ status: "pending", search: search || undefined }) : fetchRiders(); job.then(response => { if (active) tab === "applications" ? setApplications(response.data as RiderApplication[]) : setRiders(response.data as RiderAffiliation[]) }).catch(reason => { if (active) setError(messageOf(reason, "Unable to load Riders.")) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [tab, search, refresh])
  return <><PageHeader title="Riders" subtitle="Review provider-owned applications and manage active affiliations." />
    <div className="flex overflow-x-auto border-b border-[var(--color-border)]">{[["applications", "Applications"], ["active", "Active Riders"], ["inactive", "Suspended / Inactive"]].filter(([value]) => value !== "applications" || canReview).map(([value, label]) => <button key={value} onClick={() => setParams({ tab: value })} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${tab === value ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)]"}`}>{label}</button>)}</div>
    {!canReview && <Alert type="info">Rider application decisions are restricted to provider managers. Your {context.staff.type.replaceAll("_", " ")} access remains scoped to active Riders in the authorized hub.</Alert>}
    {tab === "applications" && <FilterBar search={search} onSearch={setSearch} onRefresh={() => setRefresh(value => value + 1)} />}{error && <Alert>{error}</Alert>}
    <Card>{loading ? <LoadingRows rows={5} /> : tab === "applications" ? applications.length ? <DataTable headers={["Applicant", "Vehicle", "Plate", "Applied", "Provider", "Status", "Action"]}>{applications.map(row => <TableRow key={row.id}><TableCell><div>{row.applicant?.name ?? "Unknown"}</div><span className="text-xs text-[var(--color-ink-muted)]">{row.applicant?.email}</span></TableCell><TableCell>{row.vehicle.type} · {row.vehicle.make} {row.vehicle.model}</TableCell><TableCell>{row.vehicle.plate_number}</TableCell><TableCell>{formatDate(row.submitted_at)}</TableCell><TableCell>{row.provider?.company_name ?? context.provider.company_name}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell><Link to={`/riders/${row.id}?kind=application`} className="text-xs font-[600] text-[var(--color-navy)]">Review</Link></TableCell></TableRow>)}</DataTable> : <EmptyState icon={<Users size={18} />} title="No pending Rider applications" description="New Rider applications selected for this provider will appear here." /> : tab === "active" ? riders.length ? <DataTable headers={["Rider", "Primary hub", "Affiliation", "Assigned", "Action"]}>{riders.map(row => <TableRow key={row.id}><TableCell>{row.courier_name ?? `Rider ${row.courier_id}`}</TableCell><TableCell>{row.primary_hub?.name ?? "—"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{formatDate(row.assigned_at)}</TableCell><TableCell><Link to={`/riders/${row.courier_id}?kind=active`} className="text-xs font-[600] text-[var(--color-navy)]">View</Link></TableCell></TableRow>)}</DataTable> : <EmptyState icon={<Users size={18} />} title="No active Riders" description="Approved and actively affiliated Riders will appear here." /> : <EmptyState icon={<AlertCircle size={18} />} title="Inactive Rider history unavailable" description="The current Riders endpoint returns active affiliations only. Historical affiliations require a dedicated provider-scoped API." />}</Card>
    <p className="text-xs text-[var(--color-ink-muted)]">Rider registration remains app-only. This portal does not provide Rider web registration.</p>
  </>
}

export function RiderDetailPage({ context }: { context: LogisticsContext }) {
  const { id } = useParams(); const [params] = useSearchParams(); const kind = params.get("kind"); const [application, setApplication] = useState<RiderApplication | null>(null); const [rider, setRider] = useState<RiderAffiliation | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [hubId, setHubId] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false)
  const load = () => { setLoading(true); setError(null); const riderId = Number(id); const job = kind === "application" ? fetchRiderApplication(riderId).then(response => setApplication(response.data)) : fetchRiders().then(response => setRider(response.data.find(item => item.courier_id === riderId) ?? null)); job.catch(value => setError(messageOf(value, "Unable to load Rider details."))).finally(() => setLoading(false)) }
  useEffect(load, [id, kind])
  const approve = async () => { if (!application || !hubId) return; setBusy(true); try { await approveRiderApplication(application.id, Number(hubId)); load() } catch (value) { setError(messageOf(value, "Unable to approve Rider.")) } finally { setBusy(false) } }
  const reject = async () => { if (!application || reason.trim().length < 5) return; setBusy(true); try { await rejectRiderApplication(application.id, reason.trim()); load() } catch (value) { setError(messageOf(value, "Unable to reject Rider.")) } finally { setBusy(false) } }
  const openDocument = async (documentId: number) => { try { const response = await viewRiderDocument(documentId); window.open(response.data.temporary_url, "_blank", "noopener,noreferrer") } catch (value) { setError(messageOf(value, "Unable to open private document.")) } }
  return <><Link to="/riders" className="inline-flex items-center gap-2 text-xs font-[600] text-[var(--color-navy)]"><ArrowLeft size={13} /> Back to Riders</Link>{error && <Alert>{error}</Alert>}{loading ? <Card><LoadingRows rows={6} /></Card> : application ? <><PageHeader title={application.applicant?.name ?? "Rider application"} subtitle={application.applicant?.email} actions={<StatusBadge status={application.status} />} /><div className="grid gap-4 lg:grid-cols-2"><Card title="Application profile"><dl className="space-y-4"><DetailRow label="Provider">{application.provider?.company_name ?? context.provider.company_name}</DetailRow><DetailRow label="Vehicle">{application.vehicle.year} {application.vehicle.make} {application.vehicle.model}</DetailRow><DetailRow label="Type">{application.vehicle.type}</DetailRow><DetailRow label="Plate">{application.vehicle.plate_number}</DetailRow><DetailRow label="Primary hub">{application.primary_hub?.name ?? "Not selected"}</DetailRow><DetailRow label="Submitted">{formatDate(application.submitted_at)}</DetailRow></dl></Card><Card title="Private documents">{application.documents.length ? application.documents.map(document => <button key={document.id} onClick={() => void openDocument(document.id)} className="flex w-full items-center justify-between rounded-sm border border-[var(--color-border)] p-3 text-sm hover:border-[var(--color-navy)]"><span>{document.document_type.replaceAll("_", " ")}</span><ExternalLink size={14} /></button>) : <p className="text-sm text-[var(--color-ink-muted)]">No authorized document metadata is available.</p>}</Card></div>{application.status === "pending" && <Card title="Provider decision"><div className="grid gap-4 md:grid-cols-2"><Select id="primary-hub" label="Primary hub for approval" value={hubId} onChange={setHubId} options={context.authorized_hubs.map(hub => ({ value: String(hub.id), label: hub.name }))} placeholder="Select an authorized hub" /><label><span className="mb-1.5 block text-xs font-[600]">Rejection reason</span><textarea value={reason} onChange={event => setReason(event.target.value)} className="min-h-24 w-full rounded-sm border border-[var(--color-border)] p-3 text-sm" placeholder="Required only when rejecting" /></label></div><div className="flex flex-wrap gap-2"><Button loading={busy} disabled={!hubId} onClick={() => void approve()}>Approve and affiliate</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={() => void reject()}>Reject application</Button></div></Card>}</> : rider ? <><PageHeader title={rider.courier_name ?? `Rider ${rider.courier_id}`} subtitle="Active provider affiliation" actions={<StatusBadge status={rider.status} />} /><Card><dl className="space-y-4"><DetailRow label="Provider">{context.provider.company_name}</DetailRow><DetailRow label="Primary hub">{rider.primary_hub?.name ?? "—"}</DetailRow><DetailRow label="Affiliated">{formatDate(rider.assigned_at)}</DetailRow><DetailRow label="Operational state">Not exposed by current API</DetailRow></dl></Card></> : <Card><EmptyState icon={<Users size={18} />} title="Rider not found" description="This Rider is not visible within your active provider scope." /></Card>}</>
}

export function ProviderPage({ context }: { context: LogisticsContext }) { return <><PageHeader title="Provider Profile" subtitle="Read-only Logistics provider information from the authorized context." /><div className="grid gap-4 lg:grid-cols-2"><Card title="Provider information"><dl className="space-y-4"><DetailRow label="Company">{context.provider.company_name}</DetailRow><DetailRow label="Code">{context.provider.code}</DetailRow><DetailRow label="Status"><StatusBadge status={context.provider.status} /></DetailRow></dl></Card><Card title="Business documents"><EmptyState icon={<Building2 size={18} />} title="Document details are protected" description="The current Logistics context does not expose provider documents. Private application documents remain available only through authorized review endpoints." /></Card></div></> }
export function StaffPage({ user, context }: { user: AuthUser; context: LogisticsContext }) { return <><PageHeader title="Staff & Access" subtitle="Access information for the current authorized Logistics staff member." /><Card><DataTable headers={["Name", "Email", "Staff type", "Primary hub", "Status"]}><TableRow><TableCell>{context.staff.name || user.display_name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{context.staff.type.replaceAll("_", " ")}</TableCell><TableCell>{context.staff.primary_hub?.name ?? "Provider-wide"}</TableCell><TableCell><StatusBadge status={context.staff.status} /></TableCell></TableRow></DataTable><p className="px-4 pb-4 text-xs text-[var(--color-ink-muted)]">A provider-scoped staff listing endpoint is not currently available, so no additional accounts are inferred.</p></Card></> }
export function SettingsPage() { return <><PageHeader title="Settings" subtitle="Shared identity security and Logistics portal preferences." /><div className="grid gap-4 md:grid-cols-2"><Card title="Account & security"><p className="text-sm text-[var(--color-ink-muted)]">Password and two-factor authentication remain part of the shared Marketo identity system.</p><a href={`${MARKETPLACE_URL}/account/security`} className="inline-flex items-center gap-2 text-sm font-[600] text-[var(--color-navy)]">Open Marketo security <ExternalLink size={14} /></a></Card><Card title="Logistics preferences"><EmptyState icon={<ShieldCheck size={18} />} title="No provider settings API" description="Notification and provider preference controls will appear only after a backend contract exists." /></Card></div></> }
