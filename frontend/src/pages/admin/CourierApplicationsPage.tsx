import { useEffect, useState } from "react"
import { ExternalLink, Search, X } from "lucide-react"
import {
  fetchCourierApplication,
  fetchCourierApplications,
  viewCourierDocument,
  type CourierApplication,
} from "../../api/courierApplications"
import { StatusBadge } from "../../components/admin/StatusBadge"

const TABS = ["pending", "approved", "rejected", "all"] as const

export default function CourierApplicationsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("pending")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<CourierApplication[]>([])
  const [selected, setSelected] = useState<CourierApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(
      () => {
        setLoading(true)
        fetchCourierApplications({
          status: tab === "all" ? undefined : tab,
          search: search.trim() || undefined,
        })
          .then((response) => {
            if (active) setRows(response.data)
          })
          .catch((caught) => {
            if (active)
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Unable to load courier applications.",
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

  const open = async (application: CourierApplication) => {
    setError(null)
    try {
      setSelected((await fetchCourierApplication(application.id)).data)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load application details.",
      )
    }
  }

  const openDocument = async (documentId: number) => {
    setError(null)
    try {
      const response = await viewCourierDocument(documentId)
      window.open(response.data.temporary_url, "_blank", "noopener,noreferrer")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to open this private document.",
      )
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)]">
      <main
        className={`min-w-0 flex-1 ${selected ? "hidden lg:block" : "block"}`}
      >
        <header className="border-b border-[var(--color-border)] bg-white p-5">
          <h1 className="font-[var(--font-display)] text-xl">
            Courier Applications
          </h1>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            Read-only Marketo oversight of provider-owned Rider applications.
            Provider managers approve or reject applicants in their tenant.
          </p>
          <div className="mt-4 flex overflow-x-auto border-b border-[var(--color-border)]">
            {TABS.map((value) => (
              <button
                key={value}
                onClick={() => {
                  setTab(value)
                  setSelected(null)
                }}
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm capitalize ${
                  tab === value
                    ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                    : "border-transparent text-[var(--color-ink-muted)]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="mt-3 flex max-w-lg items-center gap-2 border border-[var(--color-border)] px-3 py-2">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full outline-none text-sm"
              placeholder="Search applicant, email, or plate number"
            />
          </label>
        </header>
        {error && (
          <p
            className="m-5 bg-[var(--color-red-light)] p-3 text-sm text-[var(--color-red)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p className="p-8 text-sm text-[var(--color-ink-muted)]">
            Loading courier applications...
          </p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-[var(--color-ink-muted)]">
            No {tab === "all" ? "courier applications" : `${tab} applications`}{" "}
            found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] bg-white text-sm">
              <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3">Applicant</th>
                  <th>Contact</th>
                  <th>Vehicle</th>
                  <th>Plate Number</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((application) => (
                  <tr
                    key={application.id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"
                  >
                    <td className="p-3">
                      <p>{application.applicant?.name ?? "Unknown"}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {application.reference}
                      </p>
                    </td>
                    <td>{application.mobile}</td>
                    <td className="capitalize">
                      {application.vehicle.type} · {application.vehicle.make}{" "}
                      {application.vehicle.model}
                    </td>
                    <td className="font-[var(--font-mono)] text-xs">
                      {application.vehicle.plate_number}
                    </td>
                    <td>
                      {application.submitted_at
                        ? new Date(application.submitted_at).toLocaleDateString(
                            "en-PH",
                          )
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge status={application.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => void open(application)}
                        className="text-xs font-[600] text-[var(--color-navy)] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {selected && (
        <aside className="w-full overflow-y-auto border-l border-[var(--color-border)] bg-white p-5 lg:w-[30rem]">
          <button
            onClick={() => setSelected(null)}
            className="float-right p-1"
            aria-label="Close application details"
          >
            <X size={17} />
          </button>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">
            {selected.reference}
          </p>
          <h2 className="mt-1 font-[var(--font-display)] text-xl">
            {selected.applicant?.name ?? "Courier applicant"}
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {selected.applicant?.email} · {selected.mobile}
          </p>
          <div className="mt-5 space-y-2 text-sm">
            {[
              ["Status", selected.status],
              [
                "Address",
                [
                  selected.address.line1,
                  selected.address.line2,
                  selected.address.barangay,
                  selected.address.city,
                  selected.address.province,
                  selected.address.postal_code,
                ]
                  .filter(Boolean)
                  .join(", "),
              ],
              [
                "Vehicle",
                `${selected.vehicle.year} ${selected.vehicle.make} ${selected.vehicle.model} (${selected.vehicle.type})`,
              ],
              ["Plate", selected.vehicle.plate_number],
              ["Color", selected.vehicle.color],
              [
                "Submitted",
                selected.submitted_at
                  ? new Date(selected.submitted_at).toLocaleString("en-PH")
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[5rem_1fr] gap-2 border-b border-[var(--color-border-subtle)] pb-2"
              >
                <span className="text-[var(--color-ink-muted)]">{label}</span>
                <span className="break-words capitalize">
                  {label === "Status" ? (
                    <StatusBadge status={String(value)} />
                  ) : (
                    value
                  )}
                </span>
              </div>
            ))}
          </div>
          {selected.rejection_reason && (
            <div className="mt-4 bg-[var(--color-red-light)] p-3 text-xs text-[var(--color-red)]">
              <strong>Rejection reason:</strong> {selected.rejection_reason}
            </div>
          )}
          <h3 className="mb-2 mt-6 text-xs font-[600] uppercase tracking-wide text-[var(--color-ink-muted)]">
            Private documents
          </h3>
          {selected.documents.map((document) => (
            <button
              key={document.id}
              onClick={() => void openDocument(document.id)}
              className="mb-2 flex min-h-11 w-full items-center justify-between border border-[var(--color-border)] p-3 text-sm"
            >
              <span className="capitalize">
                {document.document_type.replaceAll("_", " ")}
              </span>
              <ExternalLink size={14} />
            </button>
          ))}
          {selected.status === "pending" && <p className="mt-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-ink-muted)]">Awaiting review by the selected Logistics provider's authorized manager.</p>}
        </aside>
      )}
    </div>
  )
}
