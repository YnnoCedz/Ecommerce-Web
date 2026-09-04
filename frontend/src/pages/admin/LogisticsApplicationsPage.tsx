import { useEffect, useState } from "react"
import { ExternalLink, Search, X } from "lucide-react"
import {
  approveLogisticsApplication,
  fetchLogisticsApplication,
  fetchLogisticsApplications,
  rejectLogisticsApplication,
  viewLogisticsDocument,
  type LogisticsApplication,
} from "../../api/logisticsApplications"
import ConfirmDialog from "../../components/ConfirmDialog"
import { StatusBadge } from "../../components/admin/StatusBadge"

const TABS = ["pending", "approved", "rejected", "all"] as const

export default function LogisticsApplicationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<LogisticsApplication[]>([])
  const [selected, setSelected] = useState<LogisticsApplication | null>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmApproval, setConfirmApproval] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      fetchLogisticsApplications({ status: tab === "all" ? undefined : tab, search: search.trim() || undefined })
        .then(response => { if (active) setRows(response.data) })
        .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load Logistics applications.") })
        .finally(() => { if (active) setLoading(false) })
    }, search ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [tab, search])

  async function open(application: LogisticsApplication) {
    setError(null)
    try { setSelected((await fetchLogisticsApplication(application.id)).data) }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load application details.") }
  }

  async function review(decision: "approve" | "reject") {
    if (!selected) return
    if (decision === "reject" && reason.trim().length < 5) {
      setError("Enter a rejection reason of at least 5 characters.")
      return
    }
    setSaving(true); setError(null)
    try {
      const response = decision === "approve"
        ? await approveLogisticsApplication(selected.id)
        : await rejectLogisticsApplication(selected.id, reason.trim())
      setSelected(response.data)
      setRows(current => tab === "pending" ? current.filter(item => item.id !== response.data.id) : current.map(item => item.id === response.data.id ? response.data : item))
      setReason(""); setConfirmApproval(false)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to review this application.") }
    finally { setSaving(false) }
  }

  async function openDocument(id: number) {
    setError(null)
    try {
      const response = await viewLogisticsDocument(id)
      window.open(response.data.temporary_url, "_blank", "noopener,noreferrer")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to open this private document.") }
  }

  const address = selected ? [selected.address.line1, selected.address.line2, selected.address.barangay, selected.address.city, selected.address.province, selected.address.region, selected.address.postal_code].filter(Boolean).join(", ") : ""

  return <div className="flex h-full min-h-[calc(100vh-56px)]">
    <main className={`min-w-0 flex-1 ${selected ? "hidden lg:block" : "block"}`}>
      <header className="border-b border-[var(--color-border)] bg-white p-5">
        <h1 className="font-[var(--font-display)] text-xl">Logistics Provider Applications</h1>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Review provider identity and business documents. Approval creates the provider and its first provider manager.</p>
        <div className="mt-4 flex overflow-x-auto border-b border-[var(--color-border)]">
          {TABS.map(value => <button key={value} onClick={() => { setTab(value); setSelected(null) }} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm capitalize ${tab === value ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)]"}`}>{value}</button>)}
        </div>
        <label className="mt-3 flex max-w-lg items-center gap-2 border border-[var(--color-border)] px-3 py-2"><Search size={14} /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full text-sm outline-none" placeholder="Search company or contact email" /></label>
      </header>
      {error && <p className="m-5 bg-[var(--color-red-light)] p-3 text-sm text-[var(--color-red)]" role="alert">{error}</p>}
      {loading ? <p className="p-8 text-sm text-[var(--color-ink-muted)]">Loading Logistics applications...</p> : rows.length === 0 ? <p className="p-8 text-sm text-[var(--color-ink-muted)]">No {tab === "all" ? "Logistics applications" : `${tab} applications`} found.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] bg-white text-sm"><thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-ink-muted)]"><tr><th className="p-3">Company</th><th>Applicant</th><th>Contact</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {rows.map(application => <tr key={application.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"><td className="p-3"><p>{application.company_name}</p><p className="text-xs text-[var(--color-ink-muted)]">{application.reference}</p></td><td>{application.applicant?.name ?? application.contact_name}</td><td>{application.contact_email}</td><td>{application.submitted_at ? new Date(application.submitted_at).toLocaleDateString("en-PH") : "—"}</td><td><StatusBadge status={application.status} /></td><td><button onClick={() => void open(application)} className="text-xs font-[600] text-[var(--color-navy)] hover:underline">Review</button></td></tr>)}
        </tbody></table></div>}
    </main>
    {selected && <aside className="w-full overflow-y-auto border-l border-[var(--color-border)] bg-white p-5 lg:w-[30rem]">
      <button onClick={() => setSelected(null)} className="float-right p-1" aria-label="Close application details"><X size={17} /></button>
      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{selected.reference}</p>
      <h2 className="mt-1 font-[var(--font-display)] text-xl">{selected.company_name}</h2>
      <p className="text-xs text-[var(--color-ink-muted)]">{selected.contact_name} · {selected.contact_email}</p>
      <div className="mt-5 space-y-2 text-sm">{[["Status", selected.status], ["Legal name", selected.legal_name ?? "—"], ["Phone", selected.contact_phone ?? "—"], ["Address", address || "—"], ["Submitted", selected.submitted_at ? new Date(selected.submitted_at).toLocaleString("en-PH") : "—"]].map(([label, value]) => <div key={label} className="grid grid-cols-[6rem_1fr] gap-2 border-b border-[var(--color-border-subtle)] pb-2"><span className="text-[var(--color-ink-muted)]">{label}</span><span className="break-words">{label === "Status" ? <StatusBadge status={String(value)} /> : value}</span></div>)}</div>
      {selected.rejection_reason && <div className="mt-4 bg-[var(--color-red-light)] p-3 text-xs text-[var(--color-red)]"><strong>Rejection reason:</strong> {selected.rejection_reason}</div>}
      <h3 className="mb-2 mt-6 text-xs font-[600] uppercase tracking-wide text-[var(--color-ink-muted)]">Private documents</h3>
      {selected.documents.map(document => <button key={document.id} onClick={() => void openDocument(document.id)} className="mb-2 flex min-h-11 w-full items-center justify-between border border-[var(--color-border)] p-3 text-sm"><span className="capitalize">{document.document_type.replaceAll("_", " ")}</span><ExternalLink size={14} /></button>)}
      {selected.status === "pending" && <><textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Rejection reason (required when rejecting)" rows={3} className="mt-4 w-full border border-[var(--color-border)] p-2 text-sm" /><div className="mt-3 flex gap-2"><button disabled={saving} onClick={() => setConfirmApproval(true)} className="min-h-11 bg-[var(--color-green)] px-4 py-2 text-xs text-white disabled:opacity-50">Approve</button><button disabled={saving} onClick={() => void review("reject")} className="min-h-11 bg-[var(--color-red)] px-4 py-2 text-xs text-white disabled:opacity-50">Reject</button></div></>}
    </aside>}
    <ConfirmDialog open={confirmApproval} title="Approve Logistics provider?" description="This creates an active provider and grants provider-manager capability to the applicant's existing Marketo identity." confirmLabel="Approve application" loading={saving} onCancel={() => setConfirmApproval(false)} onConfirm={() => void review("approve")} />
  </div>
}
