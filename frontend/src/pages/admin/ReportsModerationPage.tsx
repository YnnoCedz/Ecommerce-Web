import { useState } from "react";

type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
type ReportTargetType = "seller" | "buyer" | "product" | "conversation";
type ReportReason = "fraud" | "fake-listing" | "policy-violation" | "harassment" | "counterfeit" | "spam" | "other";

type Report = {
  id: string; createdAt: string; status: ReportStatus;
  targetType: ReportTargetType; targetId: string; targetName: string;
  reporterName: string; reporterId: string;
  reason: ReportReason; description: string;
  hasEvidence: boolean; evidenceCount?: number;
  resolvedBy?: string; resolutionNote?: string;
  severity: "low" | "medium" | "high" | "critical";
};

const REPORTS: Report[] = [
  { id: "RPT-0018", createdAt: "2026-08-15T10:21:00", status: "pending", targetType: "seller", targetId: "S-441", targetName: "GlowLab PH", reporterName: "Maria Santos", reporterId: "U-2811", reason: "fraud", description: "Received a product that is clearly counterfeit. The packaging looks fake and the seller refused to issue a refund even after I sent photos.", hasEvidence: true, evidenceCount: 4, severity: "critical" },
  { id: "RPT-0017", createdAt: "2026-08-15T08:55:00", status: "pending", targetType: "product", targetId: "PRD-8820", targetName: "Premium Korean Serum Set (24-piece)", reporterName: "Josie Cruz", reporterId: "U-1402", reason: "counterfeit", description: "These are obvious counterfeits of Laneige brand products. No authentic branding, different scent.", hasEvidence: true, evidenceCount: 2, severity: "high" },
  { id: "RPT-0016", createdAt: "2026-08-14T17:30:00", status: "reviewing", targetType: "buyer", targetId: "U-3120", targetName: "buyer_alex99", reporterName: "NaturalGlow Store", reporterId: "S-502", reason: "fraud", description: "This buyer filed a false chargeback after receiving the item. Tracking confirms delivery.", hasEvidence: true, evidenceCount: 3, severity: "high" },
  { id: "RPT-0015", createdAt: "2026-08-14T14:12:00", status: "pending", targetType: "seller", targetId: "S-830", targetName: "TechMart Official", reporterName: "Ramon Dela Cruz", reporterId: "U-5520", reason: "fake-listing", description: "The product photos don't match what was sent. Multiple reviews mention the same issue.", hasEvidence: false, severity: "medium" },
  { id: "RPT-0014", createdAt: "2026-08-14T11:05:00", status: "reviewing", targetType: "conversation", targetId: "MSG-2210", targetName: "Conversation with FashionHub PH", reporterName: "Ana Reyes", reporterId: "U-4411", reason: "harassment", description: "The seller became hostile and threatening when I asked for a refund. Using offensive language.", hasEvidence: false, severity: "high" },
  { id: "RPT-0013", createdAt: "2026-08-13T20:44:00", status: "resolved", targetType: "seller", targetId: "S-211", targetName: "BudgetFinds PH", reporterName: "John Bautista", reporterId: "U-1180", reason: "spam", description: "This seller spams product links in conversations constantly without context.", hasEvidence: false, resolvedBy: "Admin Morales", resolutionNote: "Issued warning. Seller acknowledged and agreed to stop unsolicited messaging.", severity: "low" },
  { id: "RPT-0012", createdAt: "2026-08-13T15:22:00", status: "dismissed", targetType: "product", targetId: "PRD-6601", targetName: "Organic Moringa Capsules 60ct", reporterName: "anon_buyer_ph", reporterId: "U-9901", reason: "policy-violation", description: "This product makes medical claims that aren't allowed.", hasEvidence: false, resolvedBy: "Admin Santos", resolutionNote: "Investigated listing. No prohibited health claims found in current listing text.", severity: "low" },
  { id: "RPT-0011", createdAt: "2026-08-12T09:18:00", status: "resolved", targetType: "buyer", targetId: "U-7721", targetName: "test_account_1", reporterName: "StyleHaven PH", reporterId: "S-319", reason: "fraud", description: "Buyer creates fake orders and cancels repeatedly. Seems to be testing fraud exploits.", hasEvidence: true, evidenceCount: 6, resolvedBy: "Admin Torres", resolutionNote: "Account investigated. Suspicious pattern confirmed. Account suspended pending identity verification.", severity: "critical" },
];

const SEVERITY_CFG: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: "Critical", bg: "bg-[var(--color-red-light)]", text: "text-[var(--color-red)]" },
  high:     { label: "High",     bg: "bg-orange-50",                text: "text-orange-700" },
  medium:   { label: "Medium",   bg: "bg-yellow-50",                text: "text-yellow-700" },
  low:      { label: "Low",      bg: "bg-[var(--color-surface)]",   text: "text-[var(--color-ink-muted)]" },
};

const STATUS_CFG: Record<ReportStatus, { label: string; bg: string; text: string }> = {
  pending:   { label: "Pending",   bg: "bg-yellow-50",                text: "text-yellow-700" },
  reviewing: { label: "Reviewing", bg: "bg-[var(--color-navy-surface)]", text: "text-[var(--color-navy)]" },
  resolved:  { label: "Resolved",  bg: "bg-[var(--color-green-light)]", text: "text-[var(--color-green)]" },
  dismissed: { label: "Dismissed", bg: "bg-[var(--color-surface)]",   text: "text-[var(--color-ink-muted)]" },
};

const REASON_LABELS: Record<ReportReason, string> = {
  fraud: "Fraud / Scam", "fake-listing": "Fake listing", "policy-violation": "Policy violation",
  harassment: "Harassment", counterfeit: "Counterfeit product", spam: "Spam", other: "Other",
};

const TARGET_ICONS: Record<ReportTargetType, string> = {
  seller: "🏪", buyer: "👤", product: "📦", conversation: "💬",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function DetailPanel({ report, onClose, onAction }: { report: Report; onClose: () => void; onAction: (id: string, status: ReportStatus, note: string) => void }) {
  const [note, setNote] = useState(report.resolutionNote || "");
  const [confirming, setConfirming] = useState<ReportStatus | null>(null);

  const sev = SEVERITY_CFG[report.severity];
  const sts = STATUS_CFG[report.status];

  const handleAction = (status: ReportStatus) => {
    onAction(report.id, status, note);
    setConfirming(null);
  };

  return (
    <div className="w-96 shrink-0 border-l border-[var(--color-border)] flex flex-col h-full bg-white">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-start justify-between">
        <div>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{report.id}</p>
          <p className="font-[600] text-[var(--color-ink)] text-sm mt-0.5">{REASON_LABELS[report.reason]}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer mt-0.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 1l12 12M13 1L1 13" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-3">
          <div className="flex gap-2">
            <span className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded ${sev.bg} ${sev.text}`}>{sev.label}</span>
            <span className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded ${sts.bg} ${sts.text}`}>{sts.label}</span>
          </div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{new Date(report.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>

        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-3">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Target</p>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-sm border border-[var(--color-border)]">
            <span className="text-xl">{TARGET_ICONS[report.targetType]}</span>
            <div>
              <p className="text-sm font-[500] text-[var(--color-ink)]">{report.targetName}</p>
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] capitalize">{report.targetType} · {report.targetId}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-2">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Reporter</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs font-[600] text-[var(--color-ink-muted)]">
              {report.reporterName[0]}
            </div>
            <div>
              <p className="text-sm text-[var(--color-ink)]">{report.reporterName}</p>
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{report.reporterId}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-2">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Description</p>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed">{report.description}</p>
        </div>

        {report.hasEvidence && (
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-2">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Evidence</p>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm flex items-center gap-2 cursor-pointer hover:border-[var(--color-navy)]/40 transition-colors">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-navy)" strokeWidth="1.4"><rect x="1" y="1" width="12" height="12" rx="1" /><path d="M4 5h6M4 7h6M4 9h4" /></svg>
                <span className="text-xs text-[var(--color-navy)]">View {report.evidenceCount} attachment{report.evidenceCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        )}

        {report.resolvedBy && (
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-2">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Resolution</p>
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Resolved by {report.resolvedBy}</p>
            <p className="text-sm text-[var(--color-ink)] leading-relaxed">{report.resolutionNote}</p>
          </div>
        )}

        {(report.status === "pending" || report.status === "reviewing") && (
          <div className="px-5 py-4 space-y-3">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Moderator note</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add resolution note..." className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)] resize-none" />

            {confirming ? (
              <div className="p-3 bg-[var(--color-red-light)] border border-[var(--color-red)]/20 rounded-sm space-y-2">
                <p className="text-xs text-[var(--color-red)] font-[500]">Confirm action: mark as {confirming}</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(null)} className="px-3 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Cancel</button>
                  <button onClick={() => handleAction(confirming)} className="px-3 py-1.5 bg-[var(--color-red)] text-white text-xs rounded-sm cursor-pointer">Confirm</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.status === "pending" && (
                  <button onClick={() => onAction(report.id, "reviewing", "")} className="px-3 py-2 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs font-[500] rounded-sm cursor-pointer">Take case</button>
                )}
                <button onClick={() => setConfirming("resolved")} className="px-3 py-2 bg-[var(--color-green-light)] text-[var(--color-green)] text-xs font-[500] rounded-sm cursor-pointer">Resolve</button>
                <button onClick={() => setConfirming("dismissed")} className="px-3 py-2 bg-[var(--color-surface)] text-[var(--color-ink-muted)] text-xs font-[500] rounded-sm cursor-pointer border border-[var(--color-border)]">Dismiss</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsModerationPage() {
  const [reports, setReports] = useState<Report[]>(REPORTS);
  const [selected, setSelected] = useState<Report | null>(REPORTS[0]);
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ReportTargetType>("all");
  const [sevFilter, setSevFilter] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");

  const filtered = reports.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && r.targetType !== typeFilter) return false;
    if (sevFilter !== "all" && r.severity !== sevFilter) return false;
    if (search && !r.targetName.toLowerCase().includes(search.toLowerCase()) && !r.reporterName.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = reports.filter(r => r.status === "pending").length;
  const reviewing = reports.filter(r => r.status === "reviewing").length;
  const critical = reports.filter(r => r.severity === "critical" && r.status === "pending").length;

  const handleAction = (id: string, status: ReportStatus, note: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status, ...(status === "resolved" || status === "dismissed" ? { resolvedBy: "Admin (You)", resolutionNote: note || r.resolutionNote } : {}) } : r));
    setSelected(prev => prev?.id === id ? { ...prev, status, ...(status === "resolved" || status === "dismissed" ? { resolvedBy: "Admin (You)", resolutionNote: note || prev.resolutionNote } : {}) } : prev);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white flex items-center gap-6 flex-wrap">
        <div>
          <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Reports & Moderation</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {critical > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-red-light)] border border-[var(--color-red)]/20 rounded-sm"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" /><span className="font-[var(--font-mono)] text-[10px] text-[var(--color-red)] font-[600]">{critical} critical pending</span></div>}
          <div className="flex items-center gap-1.5"><span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Pending</span><span className="font-[var(--font-mono)] text-[10px] font-[600] text-[var(--color-ink)] bg-yellow-100 px-1.5 py-0.5 rounded">{pending}</span></div>
          <div className="flex items-center gap-1.5"><span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Reviewing</span><span className="font-[var(--font-mono)] text-[10px] font-[600] text-[var(--color-navy)] bg-[var(--color-navy-surface)] px-1.5 py-0.5 rounded">{reviewing}</span></div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4" /><path d="M11 11l-2-2" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="pl-8 pr-3 py-1.5 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] w-48 font-[var(--font-body)]" />
        </div>
        {([["all","All status"],["pending","Pending"],["reviewing","Reviewing"],["resolved","Resolved"],["dismissed","Dismissed"]] as [string, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v as "all" | ReportStatus)} className={`px-3 py-1.5 rounded-sm text-xs cursor-pointer transition-colors ${statusFilter === v ? "bg-[var(--color-navy)] text-white" : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{l}</button>
        ))}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | ReportTargetType)} className="px-3 py-1.5 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none font-[var(--font-body)] cursor-pointer">
          <option value="all">All types</option>
          <option value="seller">Sellers</option>
          <option value="buyer">Buyers</option>
          <option value="product">Products</option>
          <option value="conversation">Conversations</option>
        </select>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-3 py-1.5 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none font-[var(--font-body)] cursor-pointer">
          <option value="all">All severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="ml-auto font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{filtered.length} of {reports.length} reports</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-ink-muted)]">
              <p className="text-sm">No reports match your filters.</p>
            </div>
          ) : filtered.map(r => {
            const sev = SEVERITY_CFG[r.severity];
            const sts = STATUS_CFG[r.status];
            return (
              <button key={r.id} onClick={() => setSelected(r)} className={`w-full text-left px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer ${selected?.id === r.id ? "bg-[var(--color-surface)] border-l-2 border-l-[var(--color-navy)]" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{TARGET_ICONS[r.targetType]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{r.id}</span>
                      <span className={`font-[var(--font-mono)] text-[8px] px-1.5 py-0.5 rounded ${sev.bg} ${sev.text}`}>{sev.label}</span>
                      <span className={`font-[var(--font-mono)] text-[8px] px-1.5 py-0.5 rounded ${sts.bg} ${sts.text}`}>{sts.label}</span>
                    </div>
                    <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{r.targetName}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] truncate">{REASON_LABELS[r.reason]} · by {r.reporterName}</p>
                  </div>
                  <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] shrink-0">{timeAgo(r.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && <DetailPanel key={selected.id} report={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
      </div>
    </div>
  );
}
