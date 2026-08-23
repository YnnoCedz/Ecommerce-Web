import { useEffect, useState } from "react";
import { FileText, LoaderCircle, MessageSquare, Package, Search, ShieldAlert, Store, Truck, User, X } from "lucide-react";
import {
  fetchAdminReport,
  fetchAdminReports,
  updateAdminReport,
  type AdminReport,
  type ReportStatus,
  type ReportTargetType,
} from "../../api/adminModeration";

const STATUS_STYLE: Record<ReportStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  reviewing: "bg-[var(--color-navy-surface)] text-[var(--color-navy)]",
  resolved: "bg-[var(--color-green-light)] text-[var(--color-green)]",
  dismissed: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
};

const SEVERITY_STYLE: Record<AdminReport["severity"], string> = {
  critical: "bg-[var(--color-red-light)] text-[var(--color-red)]",
  high: "bg-orange-50 text-orange-700",
  medium: "bg-yellow-50 text-yellow-700",
  low: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
};

const TARGET_ICONS = {
  seller: Store,
  buyer: User,
  courier: Truck,
  product: Package,
  conversation: MessageSquare,
} satisfies Record<ReportTargetType, typeof Store>;

function label(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function when(value: string | null) {
  return value ? new Date(value).toLocaleString("en-PH") : "Not available";
}

export default function ReportsModerationPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ReportStatus>("all");

  useEffect(() => {
    let active = true;
    void fetchAdminReports()
      .then(async (response) => {
        if (!active) return;
        setReports(response.data);
        if (response.data[0]) {
          setDetailLoading(true);
          const detail = await fetchAdminReport(response.data[0].id);
          if (active) {
            setSelected(detail.data);
            setNote(detail.data.moderation_notes ?? "");
          }
        }
      })
      .catch((caught: Error) => active && setError(caught.message))
      .finally(() => {
        if (active) {
          setLoading(false);
          setDetailLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  const filtered = reports.filter((report) => {
    const query = search.trim().toLowerCase();
    return (status === "all" || report.status === status)
      && (!query || report.reference.toLowerCase().includes(query) || report.target_name.toLowerCase().includes(query) || report.reporter?.name.toLowerCase().includes(query));
  });

  const openReport = async (report: AdminReport) => {
    setSelected(report);
    setNote(report.moderation_notes ?? "");
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetchAdminReport(report.id);
      setSelected(response.data);
      setNote(response.data.moderation_notes ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the report.");
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (nextStatus: ReportStatus) => {
    if (!selected) return;
    if (["resolved", "dismissed"].includes(nextStatus) && note.trim().length < 5) {
      setError("Add a moderation note before closing the report.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await updateAdminReport(selected.id, {
        status: nextStatus,
        moderation_notes: note.trim() || undefined,
      });
      setSelected(response.data);
      setReports((current) => current.map((report) => report.id === response.data.id ? response.data : report));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white flex items-center gap-6 flex-wrap">
        <div>
          <h1 className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">Reports & Moderation</h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">Live reports submitted by marketplace users.</p>
        </div>
        <div className="ml-auto flex gap-4 text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)]">
          <span>Pending <b className="text-[var(--color-ink)]">{reports.filter((item) => item.status === "pending").length}</b></span>
          <span>Reviewing <b className="text-[var(--color-navy)]">{reports.filter((item) => item.status === "reviewing").length}</b></span>
          <span>Critical <b className="text-[var(--color-red)]">{reports.filter((item) => item.status === "pending" && item.severity === "critical").length}</b></span>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-3 flex-wrap">
        <label className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." className="pl-8 pr-3 py-1.5 w-52 border border-[var(--color-border)] rounded-sm bg-white text-xs focus:outline-none focus:border-[var(--color-navy)]" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as "all" | ReportStatus)} className="px-3 py-1.5 border border-[var(--color-border)] rounded-sm bg-white text-xs">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <span className="ml-auto text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)]">{filtered.length} reports</span>
      </div>

      {error && <div className="mx-6 mt-3 px-4 py-2.5 border border-[var(--color-red)]/30 bg-[var(--color-red-light)] text-xs text-[var(--color-red)]">{error}</div>}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-2 text-sm text-[var(--color-ink-muted)]"><LoaderCircle size={16} className="animate-spin" /> Loading reports...</div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)]"><ShieldAlert size={28} /><p className="text-sm">No reports found.</p></div>
          ) : filtered.map((report) => {
            const TargetIcon = TARGET_ICONS[report.target_type];
            return (
              <button key={report.id} onClick={() => void openReport(report)} className={`w-full text-left px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] ${selected?.id === report.id ? "bg-[var(--color-surface)] border-l-2 border-l-[var(--color-navy)]" : ""}`}>
                <div className="flex items-start gap-3">
                  <TargetIcon size={18} className="mt-1 text-[var(--color-ink-muted)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2 items-center mb-1">
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{report.reference}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-[var(--font-mono)] ${SEVERITY_STYLE[report.severity]}`}>{label(report.severity)}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-[var(--font-mono)] ${STATUS_STYLE[report.status]}`}>{label(report.status)}</span>
                    </div>
                    <p className="text-sm font-[500] truncate">{report.target_name}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] truncate">{label(report.reason)} by {report.reporter?.name ?? "Unknown user"}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <aside className="w-[26rem] max-w-[48%] border-l border-[var(--color-border)] bg-white overflow-y-auto">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex justify-between">
              <div><p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{selected.reference}</p><h2 className="text-sm font-[600] mt-1">{label(selected.reason)}</h2></div>
              <button onClick={() => setSelected(null)} aria-label="Close report detail"><X size={15} /></button>
            </div>
            {detailLoading ? <div className="p-8 flex justify-center"><LoaderCircle size={18} className="animate-spin" /></div> : (
              <div className="p-5 space-y-5 text-sm">
                <section><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">Reported target</p><p className="font-[500]">{selected.target_name}</p><p className="text-xs text-[var(--color-ink-muted)]">{label(selected.target_type)} #{selected.target_id}</p></section>
                <section><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">Reporter</p><p>{selected.reporter?.name ?? "Unknown"}</p><p className="text-xs text-[var(--color-ink-muted)]">{selected.reporter?.email}</p></section>
                <section><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">Description</p><p className="leading-relaxed">{selected.description}</p></section>
                <section><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">Evidence</p>{selected.attachments?.length ? <div className="space-y-2">{selected.attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] hover:border-[var(--color-navy)]"><FileText size={13} /> <span className="truncate">{file.name}</span></a>)}</div> : <p className="text-xs text-[var(--color-ink-muted)]">No attachments.</p>}</section>
                <section><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">Timeline</p><p className="text-xs text-[var(--color-ink-muted)]">Submitted {when(selected.submitted_at)}</p>{selected.resolved_at && <p className="text-xs text-[var(--color-ink-muted)]">Resolved {when(selected.resolved_at)} by {selected.resolved_by?.name}</p>}</section>
                {!["resolved", "dismissed"].includes(selected.status) ? (
                  <section className="space-y-3">
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Moderation notes..." className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm resize-none focus:outline-none focus:border-[var(--color-navy)]" />
                    <div className="flex flex-wrap gap-2">
                      {selected.status === "pending" && <button disabled={saving} onClick={() => void changeStatus("reviewing")} className="px-3 py-2 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs">Take case</button>}
                      <button disabled={saving} onClick={() => void changeStatus("resolved")} className="px-3 py-2 bg-[var(--color-green-light)] text-[var(--color-green)] text-xs">Resolve</button>
                      <button disabled={saving} onClick={() => void changeStatus("dismissed")} className="px-3 py-2 border border-[var(--color-border)] text-xs">Dismiss</button>
                    </div>
                  </section>
                ) : selected.moderation_notes && <section><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">Resolution notes</p><p>{selected.moderation_notes}</p></section>}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
