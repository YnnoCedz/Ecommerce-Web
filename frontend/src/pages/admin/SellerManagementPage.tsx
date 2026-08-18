import { useEffect, useMemo, useState } from "react";
import {
  approveSellerApplication,
  fetchSellerApplication,
  fetchSellerApplications,
  rejectSellerApplication,
  viewSellerDocument,
  type SellerApplicationSummary,
} from "../../api/sellerApplications";

type SellerStatus = "active" | "suspended" | "under-review" | "rejected";

type Seller = {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  category: string;
  status: SellerStatus;
  joinedDate: string;
  products: number;
  orders: number;
  revenue: number;
  rating: number;
  verified: boolean;
  location: string;
  flags: number;
};

type ApplicationStatus = "pending" | "reviewing" | "approved" | "rejected" | "flagged";

const STATUS_CFG: Record<SellerStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "var(--color-green)", bg: "var(--color-green-light)" },
  suspended: { label: "Suspended", color: "var(--color-amber)", bg: "var(--color-amber-light)" },
  "under-review": { label: "Under review", color: "var(--color-navy)", bg: "var(--color-navy-surface)" },
  rejected: { label: "Rejected", color: "var(--color-red)", bg: "var(--color-red-light)" },
};

const APP_CFG: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "var(--color-amber)", bg: "var(--color-amber-light)" },
  reviewing: { label: "Reviewing", color: "var(--color-navy)", bg: "var(--color-navy-surface)" },
  approved: { label: "Approved", color: "var(--color-green)", bg: "var(--color-green-light)" },
  rejected: { label: "Rejected", color: "var(--color-red)", bg: "var(--color-red-light)" },
  flagged: { label: "Flagged", color: "var(--color-violet)", bg: "var(--color-violet-light)" },
};

const SELLERS: Seller[] = [
  { id: "s001", storeName: "Verde Botanics", ownerName: "Maria Santos", email: "maria@verdebotanics.com", category: "Health and Beauty", status: "active", joinedDate: "Jan 2026", products: 34, orders: 1240, revenue: 2840000, rating: 4.8, verified: true, location: "Pasig", flags: 0 },
  { id: "s002", storeName: "Atelier Manila", ownerName: "David Reyes", email: "d.reyes@atelier.ph", category: "Women's Apparel", status: "active", joinedDate: "Mar 2026", products: 48, orders: 891, revenue: 1620000, rating: 4.9, verified: true, location: "Makati", flags: 0 },
  { id: "s003", storeName: "Techwave PH", ownerName: "Jun Santos", email: "j.santos@techwave.ph", category: "Electronics and Gadgets", status: "active", joinedDate: "Nov 2025", products: 120, orders: 3210, revenue: 8900000, rating: 4.6, verified: true, location: "QC", flags: 1 },
  { id: "s004", storeName: "Homecraft Goods", ownerName: "Ana Flores", email: "a.flores@homecraft.ph", category: "Home and Garden", status: "suspended", joinedDate: "Feb 2026", products: 22, orders: 340, revenue: 482000, rating: 3.9, verified: true, location: "Cebu", flags: 3 },
  { id: "s005", storeName: "Fresh Finds PH", ownerName: "Leo Cruz", email: "l.cruz@freshfinds.ph", category: "Food and Gourmet", status: "under-review", joinedDate: "Aug 2026", products: 0, orders: 0, revenue: 0, rating: 0, verified: false, location: "Davao", flags: 0 },
  { id: "s006", storeName: "Quick Deals Online", ownerName: "Unknown", email: "quickdeals@yopmail.com", category: "Electronics and Gadgets", status: "rejected", joinedDate: "Jul 2026", products: 0, orders: 0, revenue: 0, rating: 0, verified: false, location: "Unknown", flags: 5 },
];

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: number): string {
  return value > 0 ? `₱${(value / 1000000).toFixed(1)}M` : "—";
}

function mapSummary(summary: SellerApplicationSummary) {
  return {
    apiId: summary.id,
    id: `APP-${String(summary.id).padStart(6, "0")}`,
    applicant: summary.applicant?.name ?? summary.contact_name ?? "Unknown",
    email: summary.applicant?.email ?? summary.contact_email ?? "",
    phone: summary.contact_phone ?? summary.applicant?.mobile ?? summary.applicant?.phone ?? undefined,
    businessName: summary.business_name,
    category: summary.categories.map(category => category.name).join(", "),
    status: summary.status as ApplicationStatus,
    submittedDate: formatDate(summary.submitted_at),
    businessType: summary.trade_name ?? "—",
    tin: summary.tin ?? "—",
    ownerId: summary.owner_id_number ?? "—",
    reviewedBy: summary.reviewed_by ?? undefined,
    notes: summary.rejection_reason ?? undefined,
    documents: summary.documents.map(document => ({
      id: document.id,
      name: document.document_type === "owner_id" ? "Owner ID" : document.document_type === "seller_certificate" ? "Seller Certificate" : "Business Document",
      file: document.original_filename ?? document.file_name,
      document_type: document.document_type,
      private: document.private,
    })),
  };
}

function SellerDetailPanel({ seller, onClose }: { seller: Seller; onClose: () => void }) {
  const cfg = STATUS_CFG[seller.status];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-[600] text-[var(--color-ink)]">{seller.storeName}</p>
            {seller.flags > 0 && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1.5 py-0.5 rounded">{seller.flags} flags</span>}
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">{seller.ownerName} · {seller.email}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
          {seller.verified && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-green-light)] text-[var(--color-green)] px-2 py-1 rounded">Verified</span>}
          <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] px-2 py-1 rounded">{seller.category}</span>
        </div>
        <div className="space-y-2">
          {[
            ["Seller ID", seller.id],
            ["Location", seller.location],
            ["Joined", seller.joinedDate],
            ["Products", `${seller.products}`],
            ["Total orders", `${seller.orders.toLocaleString()}`],
            ["GMV", formatCurrency(seller.revenue)],
            ["Rating", seller.rating > 0 ? `★ ${seller.rating}` : "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
              <span className="text-xs text-[var(--color-ink-muted)]">{label}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({ app, onSelect, selected }: { app: ReturnType<typeof mapSummary>; onSelect: () => void; selected: boolean }) {
  const cfg = APP_CFG[app.status];
  return (
    <tr onClick={onSelect} className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${selected ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
      <td className="px-4 py-3">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)]">{app.id}</p>
        <p className="text-xs font-[500] text-[var(--color-ink)]">{app.applicant}</p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">{app.email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-[500] text-[var(--color-ink)]">{app.businessName}</p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">{app.category || "No categories selected"}</p>
      </td>
      <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{app.businessType}</td>
      <td className="px-4 py-3 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{app.submittedDate}</td>
      <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
    </tr>
  );
}

function ApplicationDetail({
  app,
  onClose,
  onApprove,
  onReject,
  onViewDocument,
  onRejectReasonChange,
  rejectReason,
  busy,
}: {
  app: ReturnType<typeof mapSummary>;
  onClose: () => void;
  onApprove: (id: number) => Promise<void> | void;
  onReject: (id: number, reason: string) => Promise<void> | void;
  onViewDocument: (docId: number) => Promise<void> | void;
  onRejectReasonChange: (reason: string) => void;
  rejectReason: string;
  busy: boolean;
}) {
  const cfg = APP_CFG[app.status];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{app.id}</p>
          <p className="text-sm font-[600] text-[var(--color-ink)]">{app.businessName}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
        <div className="space-y-2">
          {[
            ["Applicant", app.applicant],
            ["Email", app.email],
            ["Phone", app.phone ?? "—"],
            ["Category", app.category || "—"],
            ["Business type", app.businessType],
            ["Owner ID", app.ownerId],
            ["TIN", app.tin],
            ["Submitted", app.submittedDate],
            ["Reviewed by", app.reviewedBy ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
              <span className="text-xs text-[var(--color-ink-muted)]">{label}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{value}</span>
            </div>
          ))}
        </div>
        {app.notes && (
          <div className="px-3 py-3 bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] rounded-sm">
            <p className="text-xs text-[var(--color-amber)] font-[500] mb-1">Review notes</p>
            <p className="text-xs text-[var(--color-ink)]">{app.notes}</p>
          </div>
        )}
        <div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Verification documents</p>
          {(app.documents.length ? app.documents : [{ id: app.apiId, name: "Seller Certificate", file: "Pending private upload", document_type: "seller_certificate", private: true }]).map(doc => (
            <div key={doc.id} className="flex items-center justify-between px-3 py-2.5 border border-[var(--color-border)] rounded-sm mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--color-navy)" strokeWidth="1.3" strokeLinecap="round" className="shrink-0"><rect x="2" y="1" width="10" height="12" rx="1.5" /><path d="M4 5h6M4 7.5h6M4 10h3" /></svg>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--color-ink)] truncate">{doc.name}</p>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] truncate">{doc.file}</p>
                </div>
              </div>
              <button onClick={() => onViewDocument(doc.id)} className="text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer shrink-0 ml-2">View</button>
            </div>
          ))}
          <p className="flex items-center gap-1.5 text-[10px] text-[var(--color-ink-muted)] mt-1">
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="6" width="8" height="6" rx="1" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" /></svg>
            Private. Visible to administrators only.
          </p>
        </div>
        {(app.status === "pending" || app.status === "reviewing" || app.status === "flagged") && (
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => onRejectReasonChange(e.target.value)}
              placeholder="Add review note for rejection or internal review..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] resize-none font-[var(--font-body)]"
            />
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => onApprove(app.apiId)} className="flex-1 py-2 bg-[var(--color-green)] text-white text-xs font-[500] rounded-sm hover:opacity-90 cursor-pointer disabled:opacity-60">
                Approve
              </button>
              <button disabled={busy} onClick={() => onReject(app.apiId, rejectReason)} className="flex-1 py-2 bg-[var(--color-red)] text-white text-xs font-[500] rounded-sm hover:opacity-90 cursor-pointer disabled:opacity-60">
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SellerManagementPage() {
  const [tab, setTab] = useState<"sellers" | "applications">("sellers");
  const [applications, setApplications] = useState<ReturnType<typeof mapSummary>[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedApp, setSelectedApp] = useState<ReturnType<typeof mapSummary> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (tab !== "applications") return;

    let active = true;
    setLoadingApps(true);
    setAppsError(null);

    fetchSellerApplications({ per_page: 50 })
      .then(response => {
        if (!active) return;
        setApplications(response.data.map(mapSummary));
      })
      .catch(error => {
        if (!active) return;
        setAppsError(error instanceof Error ? error.message : "Unable to load seller applications.");
      })
      .finally(() => {
        if (active) setLoadingApps(false);
      });

    return () => {
      active = false;
    };
  }, [tab]);

  const handleSelectApplication = async (app: ReturnType<typeof mapSummary>) => {
    setSelectedApp(app);
    setRejectReason(app.notes ?? "");
    setDetailBusy(true);

    try {
      const response = await fetchSellerApplication(app.apiId);
      setSelectedApp(mapSummary(response.data));
      setRejectReason(response.data.rejection_reason ?? "");
    } catch {
      // Keep the list item details if the detail request fails.
    } finally {
      setDetailBusy(false);
    }
  };

  const handleApprove = async (id: number) => {
    setDetailBusy(true);
    try {
      const response = await approveSellerApplication(id);
      const updated = mapSummary(response.data);
      setApplications(prev => prev.map(app => (app.apiId === id ? updated : app)));
      setSelectedApp(updated);
    } finally {
      setDetailBusy(false);
    }
  };

  const handleReject = async (id: number, reason: string) => {
    if (!reason.trim()) return;

    setDetailBusy(true);
    try {
      const response = await rejectSellerApplication(id, reason.trim());
      const updated = mapSummary(response.data);
      setApplications(prev => prev.map(app => (app.apiId === id ? updated : app)));
      setSelectedApp(updated);
    } finally {
      setDetailBusy(false);
    }
  };

  const handleViewDocument = async (docId: number) => {
    const response = await viewSellerDocument(docId);
    window.open(response.data.temporary_url, "_blank", "noopener,noreferrer");
  };

  const filteredSellers = useMemo(
    () =>
      SELLERS.filter(seller => {
        if (search && !seller.storeName.toLowerCase().includes(search.toLowerCase()) && !seller.ownerName.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "all" && seller.status !== statusFilter) return false;
        return true;
      }),
    [search, statusFilter],
  );

  const filteredApps = useMemo(
    () =>
      applications.filter(app => {
        if (appStatusFilter !== "all" && app.status !== appStatusFilter) return false;
        if (search && !app.businessName.toLowerCase().includes(search.toLowerCase()) && !app.applicant.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [applications, appStatusFilter, search],
  );

  const appPendingCount = applications.filter(app => app.status === "pending" || app.status === "reviewing" || app.status === "flagged").length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex flex-col ${selectedSeller || selectedApp ? "hidden lg:flex lg:flex-1" : "flex-1"} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Sellers</h1>
          </div>
          <div className="flex gap-1 border-b border-[var(--color-border)] -mx-5 px-5 mb-3">
            {(["sellers", "applications"] as const).map(section => (
              <button
                key={section}
                onClick={() => setTab(section)}
                className={`px-4 py-2 text-sm font-[500] border-b-2 -mb-px cursor-pointer capitalize transition-colors ${tab === section ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}
              >
                {section === "applications" ? `Applications${appPendingCount > 0 ? ` (${appPendingCount})` : ""}` : "Sellers"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-navy)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === "sellers" ? "Search stores or owners" : "Search applications"} className="text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent flex-1 font-[var(--font-body)]" />
            </div>
            {tab === "sellers" && (
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="under-review">Under review</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
            {tab === "applications" && (
              <select value={appStatusFilter} onChange={e => setAppStatusFilter(e.target.value)} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="flagged">Flagged</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {tab === "sellers" ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
                <tr>
                  {["Store", "Category", "Status", "Products", "Orders", "GMV", "Rating", ""].map(header => (
                    <th key={header} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map(seller => {
                  const cfg = STATUS_CFG[seller.status];
                  return (
                    <tr key={seller.id} onClick={() => setSelectedSeller(seller)} className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${selectedSeller?.id === seller.id ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-[500] text-[var(--color-ink)]">{seller.storeName}</p>
                        <p className="text-[10px] text-[var(--color-ink-muted)]">{seller.ownerName}</p>
                        {seller.flags > 0 && <span className="font-[var(--font-mono)] text-[8px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1 py-0.5 rounded">{seller.flags} flags</span>}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{seller.category}</td>
                      <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                      <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{seller.products}</td>
                      <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{seller.orders.toLocaleString()}</td>
                      <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{formatCurrency(seller.revenue)}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-amber)]">{seller.rating > 0 ? `★ ${seller.rating}` : "—"}</td>
                      <td className="px-4 py-3"><button className="text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer">View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div>
              {loadingApps && <div className="px-5 py-6 text-sm text-[var(--color-ink-muted)]">Loading seller applications...</div>}
              {appsError && <div className="px-5 py-6 text-sm text-[var(--color-red)]">{appsError}</div>}
              {!loadingApps && !appsError && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
                    <tr>
                      {["Application", "Business", "Type", "Submitted", "Status"].map(header => (
                        <th key={header} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map(app => (
                      <ApplicationRow key={app.apiId} app={app} onSelect={() => void handleSelectApplication(app)} selected={selectedApp?.apiId === app.apiId} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedSeller && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col overflow-hidden">
          <SellerDetailPanel seller={selectedSeller} onClose={() => setSelectedSeller(null)} />
        </div>
      )}

      {selectedApp && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col overflow-hidden">
          <ApplicationDetail
            app={selectedApp}
            onClose={() => setSelectedApp(null)}
            onApprove={id => void handleApprove(id)}
            onReject={(id, reason) => void handleReject(id, reason)}
            onViewDocument={id => void handleViewDocument(id)}
            onRejectReasonChange={setRejectReason}
            rejectReason={rejectReason}
            busy={detailBusy}
          />
        </div>
      )}
    </div>
  );
}
