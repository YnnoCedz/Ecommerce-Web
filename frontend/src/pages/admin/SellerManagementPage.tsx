import { useEffect, useState } from "react"
import { ExternalLink, Search, X } from "lucide-react"
import {
  fetchAdminDocumentRenewals,
  fetchAdminSellers,
  reviewAdminDocumentRenewal,
  updateAdminSellerStatus,
  type AdminDocumentRenewal,
  type AdminSeller,
} from "../../api/admin"
import {
  approveSellerApplication,
  fetchSellerApplication,
  fetchSellerApplications,
  rejectSellerApplication,
  requestSellerApplicationRevision,
  viewSellerDocument,
  type SellerApplicationSummary,
} from "../../api/sellerApplications"
import { useUrlTab } from "../../hooks/useUrlTab"

const money = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  )
type Tab = "sellers" | "applications" | "renewals"
const SELLER_TABS: readonly Tab[] = ["sellers", "applications", "renewals"]

export default function SellerManagementPage() {
  const { activeTab: tab, setActiveTab: setTab } = useUrlTab(
    SELLER_TABS,
    "sellers",
  )
  const [sellers, setSellers] = useState<AdminSeller[]>([])
  const [applications, setApplications] = useState<SellerApplicationSummary[]>(
    [],
  )
  const [renewals, setRenewals] = useState<AdminDocumentRenewal[]>([])
  const [selectedSeller, setSelectedSeller] = useState<AdminSeller | null>(null)
  const [selectedApplication, setSelectedApplication] =
    useState<SellerApplicationSummary | null>(null)
  const [selectedRenewal, setSelectedRenewal] =
    useState<AdminDocumentRenewal | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    const request =
      tab === "sellers"
        ? fetchAdminSellers({ search, status, per_page: 100 })
        : tab === "applications"
          ? fetchSellerApplications({
              search,
              status: status || undefined,
              per_page: 100,
            })
          : fetchAdminDocumentRenewals(status || undefined)
    request
      .then((response) => {
        if (tab === "sellers") setSellers(response.data as AdminSeller[])
        else if (tab === "applications")
          setApplications(response.data as SellerApplicationSummary[])
        else setRenewals(response.data as AdminDocumentRenewal[])
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    const timer = window.setTimeout(load, 200)
    return () => window.clearTimeout(timer)
  }, [tab, search, status])

  const changeSeller = async (next: string) => {
    if (!selectedSeller) return
    if (next !== "approved" && reason.trim().length < 5) {
      setError("Enter a reason with at least 5 characters.")
      return
    }
    setSaving(true)
    try {
      const response = await updateAdminSellerStatus(
        selectedSeller.id,
        next,
        reason.trim() || undefined,
      )
      setSellers((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      )
      setSelectedSeller(response.data)
      setReason("")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update seller.",
      )
    } finally {
      setSaving(false)
    }
  }
  const openApplication = async (application: SellerApplicationSummary) => {
    setSelectedApplication(application)
    setSelectedSeller(null)
    try {
      const response = await fetchSellerApplication(application.id)
      setSelectedApplication(response.data)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load application.",
      )
    }
  }
  const review = async (approve: boolean) => {
    if (!selectedApplication) return
    if (!approve && reason.trim().length < 5) {
      setError("A rejection reason is required.")
      return
    }
    setSaving(true)
    try {
      const response = approve
        ? await approveSellerApplication(selectedApplication.id)
        : await rejectSellerApplication(selectedApplication.id, reason.trim())
      setApplications((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      )
      setSelectedApplication(response.data)
      setReason("")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to review application.",
      )
    } finally {
      setSaving(false)
    }
  }
  const requestRevision = async () => {
    if (!selectedApplication || reason.trim().length < 5) {
      setError("Enter revision notes with at least 5 characters.")
      return
    }
    setSaving(true)
    try {
      const response = await requestSellerApplicationRevision(
        selectedApplication.id,
        reason.trim(),
      )
      setApplications((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      )
      setSelectedApplication(response.data)
      setReason("")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to request a revision.",
      )
    } finally {
      setSaving(false)
    }
  }
  const reviewRenewal = async (decision: "approve" | "reject") => {
    if (!selectedRenewal) return
    if (decision === "reject" && reason.trim().length < 5) {
      setError("A rejection note is required.")
      return
    }
    setSaving(true)
    try {
      const response = await reviewAdminDocumentRenewal(
        selectedRenewal.id,
        decision,
        reason.trim() || undefined,
      )
      setRenewals((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      )
      setSelectedRenewal(response.data)
      setReason("")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to review renewal.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)]">
      <main
        className={`flex-1 ${
          selectedSeller || selectedApplication || selectedRenewal
            ? "hidden lg:block"
            : "block"
        }`}
      >
        <header className="p-5 border-b border-[var(--color-border)] bg-white">
          <h1 className="font-[var(--font-display)] text-xl mb-3">Sellers</h1>
          <div className="flex border-b border-[var(--color-border)] mb-3">
            {SELLER_TABS.map((value) => (
              <button
                key={value}
                onClick={() => {
                  setTab(value)
                  setStatus("")
                  setSelectedSeller(null)
                  setSelectedApplication(null)
                  setSelectedRenewal(null)
                }}
                className={`px-4 py-2 capitalize border-b-2 ${
                  tab === value
                    ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                    : "border-transparent text-[var(--color-ink-muted)]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tab !== "renewals" && (
              <label className="flex items-center gap-2 flex-1 border border-[var(--color-border)] px-3 py-2">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full outline-none text-sm"
                  placeholder="Search sellers or applications"
                />
              </label>
            )}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {(tab === "sellers"
                ? ["approved", "suspended", "rejected"]
                : tab === "applications"
                  ? ["pending", "reviewing", "approved", "rejected"]
                  : ["pending", "approved", "rejected"]
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </header>
        {loading && (
          <p className="p-8 text-sm text-[var(--color-ink-muted)]">
            Loading {tab}...
          </p>
        )}
        {error && (
          <p className="m-5 p-3 bg-[var(--color-red-light)] text-[var(--color-red)] text-sm">
            {error}
          </p>
        )}
        {!loading && tab === "sellers" && (
          <table className="w-full bg-white text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-ink-muted)]">
              <tr>
                <th className="p-3">Store</th>
                <th>Status</th>
                <th>Categories</th>
                <th>Products</th>
                <th>Orders</th>
                <th>GMV</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr
                  key={seller.id}
                  onClick={() => {
                    setSelectedSeller(seller)
                    setSelectedApplication(null)
                  }}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] cursor-pointer"
                >
                  <td className="p-3">
                    <p>{seller.trade_name || seller.business_name}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {seller.user?.name ?? "No owner"}
                    </p>
                  </td>
                  <td className="capitalize">{seller.status}</td>
                  <td>{seller.categories.join(", ") || "None"}</td>
                  <td>{seller.products}</td>
                  <td>{seller.orders}</td>
                  <td>{money(seller.gmv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && tab === "applications" && (
          <table className="w-full bg-white text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-ink-muted)]">
              <tr>
                <th className="p-3">Business</th>
                <th>Applicant</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr
                  key={application.id}
                  onClick={() => void openApplication(application)}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] cursor-pointer"
                >
                  <td className="p-3">{application.business_name}</td>
                  <td>{application.applicant?.name ?? "Unknown"}</td>
                  <td className="capitalize">{application.status}</td>
                  <td>
                    {application.submitted_at
                      ? new Date(application.submitted_at).toLocaleDateString(
                          "en-PH",
                        )
                      : "Not submitted"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && tab === "renewals" && (
          <table className="w-full bg-white text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-ink-muted)]">
              <tr>
                <th className="p-3">Seller</th>
                <th>Document</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((renewal) => (
                <tr
                  key={renewal.id}
                  onClick={() => {
                    setSelectedRenewal(renewal)
                    setSelectedSeller(null)
                    setSelectedApplication(null)
                  }}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] cursor-pointer"
                >
                  <td className="p-3">{renewal.seller?.name ?? "Unknown"}</td>
                  <td className="capitalize">
                    {renewal.document_type.replaceAll("_", " ")}
                  </td>
                  <td className="capitalize">{renewal.status}</td>
                  <td>
                    {renewal.submitted_at
                      ? new Date(renewal.submitted_at).toLocaleDateString(
                          "en-PH",
                        )
                      : "—"}
                  </td>
                  <td>
                    {renewal.expires_at
                      ? new Date(renewal.expires_at).toLocaleDateString("en-PH")
                      : "Not supplied"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading &&
          ((tab === "sellers" && sellers.length === 0) ||
            (tab === "applications" && applications.length === 0) ||
            (tab === "renewals" && renewals.length === 0)) && (
            <p className="p-8 text-sm text-[var(--color-ink-muted)]">
              No {tab} found.
            </p>
          )}
      </main>
      {selectedSeller && (
        <aside className="w-full lg:w-96 border-l border-[var(--color-border)] bg-white p-5">
          <button
            onClick={() => setSelectedSeller(null)}
            className="float-right"
          >
            <X size={16} />
          </button>
          <h2 className="font-[600]">
            {selectedSeller.trade_name || selectedSeller.business_name}
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-5">
            {selectedSeller.user?.email ?? "No owner email"}
          </p>
          {[
            ["Status", selectedSeller.status],
            ["Location", `${selectedSeller.city}, ${selectedSeller.province}`],
            ["Products", selectedSeller.products],
            ["Orders", selectedSeller.orders],
            ["GMV", money(selectedSeller.gmv)],
            ["Rating", selectedSeller.rating || "No ratings"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-2 border-b border-[var(--color-border-subtle)] text-sm"
            >
              <span className="text-[var(--color-ink-muted)]">{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason required for suspension or rejection"
            rows={3}
            className="w-full border border-[var(--color-border)] p-2 text-sm mt-5"
          />
          <div className="flex gap-2 mt-3">
            <button
              disabled={saving}
              onClick={() => void changeSeller("approved")}
              className="px-3 py-2 bg-[var(--color-green)] text-white text-xs"
            >
              Approve
            </button>
            <button
              disabled={saving}
              onClick={() => void changeSeller("suspended")}
              className="px-3 py-2 bg-[var(--color-amber)] text-white text-xs"
            >
              Suspend
            </button>
            <button
              disabled={saving}
              onClick={() => void changeSeller("rejected")}
              className="px-3 py-2 bg-[var(--color-red)] text-white text-xs"
            >
              Reject
            </button>
          </div>
        </aside>
      )}
      {selectedApplication && (
        <aside className="w-full lg:w-[28rem] border-l border-[var(--color-border)] bg-white p-5 overflow-y-auto">
          <button
            onClick={() => setSelectedApplication(null)}
            className="float-right"
          >
            <X size={16} />
          </button>
          <h2 className="font-[600]">{selectedApplication.business_name}</h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-5">
            {selectedApplication.applicant?.name ?? "Unknown applicant"} ·{" "}
            {selectedApplication.applicant?.email ?? "No email"}
          </p>
          <div className="space-y-2 text-sm mb-5">
            {[
              ["Status", selectedApplication.status.replaceAll("_", " ")],
              ["TIN", selectedApplication.tin ?? "—"],
              ["DTI / SEC", selectedApplication.registration_number ?? "—"],
              ["Established", selectedApplication.established_on ?? "—"],
              [
                "Address",
                [
                  selectedApplication.address_line1,
                  selectedApplication.address_line2,
                  selectedApplication.barangay,
                  selectedApplication.city,
                  selectedApplication.province,
                  selectedApplication.postal_code,
                ]
                  .filter(Boolean)
                  .join(", "),
              ],
              [
                "Categories",
                selectedApplication.categories
                  .map((category) => category.name)
                  .join(", ") || "None",
              ],
              [
                "Submitted",
                selectedApplication.submitted_at
                  ? new Date(selectedApplication.submitted_at).toLocaleString(
                      "en-PH",
                    )
                  : "Not submitted",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[6rem_1fr] gap-2 border-b border-[var(--color-border-subtle)] pb-2"
              >
                <span className="text-[var(--color-ink-muted)]">{label}</span>
                <span className="break-words capitalize">{value}</span>
              </div>
            ))}
          </div>
          {selectedApplication.rejection_reason && (
            <div className="mb-4 rounded-sm bg-[var(--color-amber-light)] p-3 text-xs">
              <strong>Review notes:</strong>{" "}
              {selectedApplication.rejection_reason}
            </div>
          )}
          <h3 className="text-xs font-[600] uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">
            Private documents
          </h3>
          {selectedApplication.documents.map((document) => (
            <button
              key={document.id}
              onClick={async () => {
                const response = await viewSellerDocument(document.id)
                window.open(
                  response.data.temporary_url,
                  "_blank",
                  "noopener,noreferrer",
                )
              }}
              className="w-full flex justify-between border border-[var(--color-border)] p-3 text-sm mb-2"
            >
              <span>{document.document_type.replaceAll("_", " ")}</span>
              <ExternalLink size={14} />
            </button>
          ))}
          {["pending", "reviewing", "flagged"].includes(
            selectedApplication.status,
          ) && (
            <>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for rejection or revision notes"
                rows={3}
                className="w-full border border-[var(--color-border)] p-2 text-sm mt-4"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  disabled={saving}
                  onClick={() => void review(true)}
                  className="px-3 py-2 bg-[var(--color-green)] text-white text-xs"
                >
                  Approve
                </button>
                <button
                  disabled={saving}
                  onClick={() => void requestRevision()}
                  className="px-3 py-2 bg-[var(--color-amber)] text-white text-xs"
                >
                  Request revision
                </button>
                <button
                  disabled={saving}
                  onClick={() => void review(false)}
                  className="px-3 py-2 bg-[var(--color-red)] text-white text-xs"
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </aside>
      )}
      {selectedRenewal && (
        <aside className="w-full lg:w-96 border-l border-[var(--color-border)] bg-white p-5">
          <button
            onClick={() => setSelectedRenewal(null)}
            className="float-right"
          >
            <X size={16} />
          </button>
          <h2 className="font-[600]">
            {selectedRenewal.seller?.name ?? "Seller renewal"}
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-5">
            {selectedRenewal.seller?.email ?? "No email"}
          </p>
          <p className="text-sm capitalize mb-2">
            {selectedRenewal.document_type.replaceAll("_", " ")}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            Status: {selectedRenewal.status}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                const response = await viewSellerDocument(
                  selectedRenewal.renewal_of_document_id,
                )
                window.open(
                  response.data.temporary_url,
                  "_blank",
                  "noopener,noreferrer",
                )
              }}
              className="flex justify-center gap-2 border border-[var(--color-border)] p-2 text-xs"
            >
              Old document <ExternalLink size={13} />
            </button>
            <button
              onClick={async () => {
                const response = await viewSellerDocument(selectedRenewal.id)
                window.open(
                  response.data.temporary_url,
                  "_blank",
                  "noopener,noreferrer",
                )
              }}
              className="flex justify-center gap-2 border border-[var(--color-border)] p-2 text-xs"
            >
              New submission <ExternalLink size={13} />
            </button>
          </div>
          {selectedRenewal.status === "pending" && (
            <>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Review note (required for rejection)"
                rows={3}
                className="w-full border border-[var(--color-border)] p-2 text-sm mt-4"
              />
              <div className="flex gap-2 mt-3">
                <button
                  disabled={saving}
                  onClick={() => void reviewRenewal("approve")}
                  className="px-3 py-2 bg-[var(--color-green)] text-white text-xs"
                >
                  Approve renewal
                </button>
                <button
                  disabled={saving}
                  onClick={() => void reviewRenewal("reject")}
                  className="px-3 py-2 bg-[var(--color-red)] text-white text-xs"
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  )
}
