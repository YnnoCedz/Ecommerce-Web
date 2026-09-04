import { useEffect, useState } from "react"
import { ExternalLink, Search, X } from "lucide-react"
import {
  approveUserRegistration,
  fetchUserRegistration,
  fetchUserRegistrations,
  rejectUserRegistration,
  viewUserDocument,
  type UserRegistration,
  type UserRegistrationStatus,
} from "../../api/userRegistrations"
import { StatusBadge } from "../../components/admin/StatusBadge"
import ConfirmDialog from "../../components/ConfirmDialog"

const TABS: { key: UserRegistrationStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

function formatAddress(row: UserRegistration): string {
  const address = row.address
  if (!address) return "—"

  return [
    address.line1,
    address.barangay,
    address.city,
    address.province,
    address.region,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ")
}

/**
 * Phase 2.6 - Maketo Admin review of marketplace User registrations.
 * Seller, Rider and Logistics applications keep their own separate queues.
 */
export default function UserRegistrationsPage() {
  const [tab, setTab] = useState<UserRegistrationStatus>("pending")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<UserRegistration[]>([])
  const [selected, setSelected] = useState<UserRegistration | null>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmApproval, setConfirmApproval] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    fetchUserRegistrations({ status: tab, search: search.trim() || undefined })
      .then(response => setRows(response.data))
      .catch(caught =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load registrations.",
        ),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(
      () => {
        setLoading(true)
        fetchUserRegistrations({
          status: tab,
          search: search.trim() || undefined,
        })
          .then(response => {
            if (active) setRows(response.data)
          })
          .catch(caught => {
            if (active)
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Unable to load registrations.",
              )
          })
          .finally(() => {
            if (active) setLoading(false)
          })
      },
      search ? 250 : 0,
    )

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [tab, search])

  const open = async (row: UserRegistration) => {
    setError(null)
    setReason("")
    try {
      const response = await fetchUserRegistration(row.id)
      setSelected(response.data)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to open this registration.",
      )
    }
  }

  const openDocument = async (documentId: number) => {
    try {
      const response = await viewUserDocument(documentId)
      window.open(response.data.temporary_url, "_blank", "noopener,noreferrer")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to open the identity document.",
      )
    }
  }

  const approve = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await approveUserRegistration(selected.id)
      setConfirmApproval(false)
      setSelected(null)
      reload()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to approve.",
      )
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    if (!selected) return
    if (reason.trim().length < 5) {
      setError("Provide a reason of at least 5 characters.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await rejectUserRegistration(selected.id, reason.trim())
      setSelected(null)
      reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reject.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">
          Pending Registrations
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Review marketplace user registrations before their accounts are
          activated.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-sm border border-[var(--color-red-border)] bg-[var(--color-red-light)] text-sm text-[var(--color-red)] flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-sm border border-[var(--color-border)] p-1 bg-white">
          {TABS.map(entry => (
            <button
              key={entry.key}
              onClick={() => setTab(entry.key)}
              className={`px-3 py-1.5 text-xs font-[500] rounded-sm transition-colors ${
                tab === entry.key
                  ? "bg-[var(--color-navy)] text-white"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email or phone"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-sm border border-[var(--color-border)] bg-white outline-none focus:border-[var(--color-navy)]"
          />
        </div>
      </div>

      <div className="border border-[var(--color-border)] rounded-sm bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left">
            <tr className="text-xs text-[var(--color-ink-muted)] uppercase tracking-wide">
              <th className="px-4 py-3 font-[600]">Reference</th>
              <th className="px-4 py-3 font-[600]">Applicant</th>
              <th className="px-4 py-3 font-[600]">Email</th>
              <th className="px-4 py-3 font-[600]">Submitted</th>
              <th className="px-4 py-3 font-[600]">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[var(--color-ink-muted)]"
                >
                  Loading registrations...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[var(--color-ink-muted)]"
                >
                  No registrations in this state.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map(row => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-4 py-3 font-[var(--font-mono)] text-xs">
                    {row.reference}
                  </td>
                  <td className="px-4 py-3">{row.display_name}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {row.email}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {row.submitted_at
                      ? new Date(row.submitted_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.registration_status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => open(row)}
                      className="text-xs font-[500] text-[var(--color-navy)] hover:underline"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[var(--color-border)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">
                  {selected.display_name}
                </h2>
                <p className="text-xs font-[var(--font-mono)] text-[var(--color-ink-muted)] mt-0.5">
                  {selected.reference}
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs text-[var(--color-ink-muted)]">Email</dt>
                  <dd>{selected.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-muted)]">Mobile</dt>
                  <dd>{selected.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-muted)]">Sex</dt>
                  <dd>{selected.sex ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-muted)]">
                    Birthday / Age
                  </dt>
                  <dd>
                    {selected.birthdate ?? "—"}
                    {selected.age !== null ? ` (${selected.age})` : ""}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-[var(--color-ink-muted)]">
                    Registration address
                  </dt>
                  <dd>{formatAddress(selected)}</dd>
                </div>
              </dl>

              <div>
                <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                  Identity documents
                </p>
                {(selected.documents ?? []).length === 0 && (
                  <p className="text-[var(--color-ink-muted)]">
                    No documents submitted.
                  </p>
                )}
                <ul className="space-y-2">
                  {(selected.documents ?? []).map(document => (
                    <li
                      key={document.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border border-[var(--color-border)] rounded-sm"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm">
                          {document.original_filename}
                        </span>
                        <span className="block text-xs text-[var(--color-ink-muted)]">
                          {document.document_type} ·{" "}
                          {Math.round(document.file_size / 1024)} KB
                        </span>
                      </span>
                      <button
                        onClick={() => openDocument(document.id)}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-[500] text-[var(--color-navy)] hover:underline"
                      >
                        View <ExternalLink size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.registration_status === "pending" ? (
                <div className="pt-2 space-y-3 border-t border-[var(--color-border)]">
                  <label className="block text-xs font-[600] text-[var(--color-ink)] pt-3">
                    Rejection reason (required to reject)
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-sm border border-[var(--color-border)] outline-none focus:border-[var(--color-navy)]"
                    placeholder="Explain what the applicant needs to know."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={saving}
                      onClick={reject}
                      className="px-4 py-2 text-sm font-[500] rounded-sm border border-[var(--color-red-border)] text-[var(--color-red)] hover:bg-[var(--color-red-light)] disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => setConfirmApproval(true)}
                      className="px-4 py-2 text-sm font-[500] rounded-sm bg-[var(--color-navy)] text-white hover:opacity-90 disabled:opacity-60"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-[var(--color-border)] text-sm">
                  <p className="text-[var(--color-ink-muted)]">
                    Reviewed
                    {selected.reviewer ? ` by ${selected.reviewer.name}` : ""}
                    {selected.reviewed_at
                      ? ` on ${new Date(selected.reviewed_at).toLocaleString()}`
                      : ""}
                    .
                  </p>
                  {selected.decision_reason && (
                    <p className="mt-1">{selected.decision_reason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmApproval}
        title="Approve this registration?"
        description="The account becomes active and the applicant is emailed that they can sign in."
        confirmLabel="Approve"
        onConfirm={approve}
        onCancel={() => setConfirmApproval(false)}
      />
    </div>
  )
}
