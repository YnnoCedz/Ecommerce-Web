import { useEffect, useState } from "react";
import { FileText, LoaderCircle, Scale, Search } from "lucide-react";
import {
  fetchAdminDispute,
  fetchAdminDisputes,
  resolveAdminDispute,
  type DisputeDetail,
  type DisputeSummary,
} from "../../api/adminModeration";

const OUTCOMES = [
  ["approve_return", "Approve return"],
  ["reject", "Reject claim"],
  ["full_refund", "Full simulated refund"],
  ["partial_refund", "Partial simulated refund"],
  ["buyer_side", "Resolve for buyer"],
  ["seller_side", "Resolve for seller"],
] as const;

function money(value: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(value);
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString("en-PH") : "Not available";
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [selected, setSelected] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [outcome, setOutcome] = useState("approve_return");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  useEffect(() => {
    let active = true;
    void fetchAdminDisputes()
      .then(async (response) => {
        if (!active) return;
        setDisputes(response.data);
        if (response.data[0]) {
          setDetailLoading(true);
          const detail = await fetchAdminDispute(response.data[0].id);
          if (active) setSelected(detail.data);
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

  const filtered = disputes.filter((dispute) => {
    const query = search.trim().toLowerCase();
    return (status === "all" || dispute.status === status)
      && (!query || dispute.reference.toLowerCase().includes(query) || dispute.order_number?.toLowerCase().includes(query) || dispute.buyer_name?.toLowerCase().includes(query) || dispute.seller_name?.toLowerCase().includes(query));
  });

  const openDispute = async (dispute: DisputeSummary) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetchAdminDispute(dispute.id);
      setSelected(response.data);
      setNotes(response.data.resolution_notes ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the dispute.");
    } finally {
      setDetailLoading(false);
    }
  };

  const resolve = async () => {
    if (!selected) return;
    if (notes.trim().length < 5) {
      setError("Resolution notes must contain at least 5 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await resolveAdminDispute(selected.id, {
        resolution_type: outcome,
        resolution_notes: notes.trim(),
        ...(outcome === "partial_refund" ? { refund_amount: Number(refundAmount) } : {}),
      });
      setSelected(response.data);
      setDisputes((current) => current.map((item) => item.id === response.data.id ? response.data : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to resolve the dispute.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div><h1 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)]">Disputes</h1><p className="text-sm text-[var(--color-ink-muted)] mt-1">Resolve escalated buyer returns with a complete transaction history.</p></div>
        <div className="text-right text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)]"><p>{disputes.filter((item) => ["open", "reviewing"].includes(item.status)).length} open</p><p>{disputes.length} total</p></div>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex gap-3 flex-wrap">
          <label className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dispute, order, buyer..." className="pl-8 pr-3 py-2 w-64 max-w-full border border-[var(--color-border)] rounded-sm bg-white text-xs focus:outline-none focus:border-[var(--color-navy)]" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm bg-white text-xs">
            <option value="all">All statuses</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option>
          </select>
        </div>

        {error && <div className="m-4 px-4 py-3 border border-[var(--color-red)]/30 bg-[var(--color-red-light)] text-xs text-[var(--color-red)]">{error}</div>}

        <div className="grid lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.7fr)] min-h-[36rem]">
          <div className="border-r border-[var(--color-border)] overflow-y-auto">
            {loading ? <div className="h-full flex items-center justify-center gap-2 text-sm text-[var(--color-ink-muted)]"><LoaderCircle size={16} className="animate-spin" /> Loading disputes...</div>
              : filtered.length === 0 ? <div className="h-full flex flex-col items-center justify-center gap-2 py-16 text-[var(--color-ink-muted)]"><Scale size={28} /><p className="text-sm">No disputes found.</p></div>
              : filtered.map((dispute) => <button key={dispute.id} onClick={() => void openDispute(dispute)} className={`w-full p-4 text-left border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] ${selected?.id === dispute.id ? "bg-[var(--color-navy-surface)] border-l-2 border-l-[var(--color-navy)]" : ""}`}>
                <div className="flex justify-between gap-2"><span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{dispute.reference}</span><span className={`text-[9px] font-[var(--font-mono)] ${dispute.status === "open" ? "text-[var(--color-red)]" : "text-[var(--color-ink-muted)]"}`}>{label(dispute.status)}</span></div>
                <p className="text-sm font-[600] mt-2">{dispute.order_number}</p><p className="text-xs text-[var(--color-ink-muted)] mt-1">{dispute.buyer_name} vs {dispute.seller_name}</p><p className="text-xs mt-2">Requested {money(dispute.requested_amount)}</p>
              </button>)}
          </div>

          <div className="overflow-y-auto">
            {detailLoading ? <div className="h-full flex items-center justify-center"><LoaderCircle size={20} className="animate-spin" /></div>
              : !selected ? <div className="h-full flex items-center justify-center text-sm text-[var(--color-ink-muted)]">Select a dispute to view its details.</div>
              : <div className="p-5 md:p-6 space-y-6">
                <div className="flex justify-between gap-4 flex-wrap"><div><p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{selected.reference}</p><h2 className="font-[var(--font-display)] text-xl mt-1">{selected.reason}</h2><p className="text-xs text-[var(--color-ink-muted)] mt-1">Opened {date(selected.opened_at)}</p></div><span className="h-fit px-2 py-1 text-[10px] font-[var(--font-mono)] bg-[var(--color-surface)] border border-[var(--color-border)]">{label(selected.status)}</span></div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <section className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)]"><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)]">Buyer</p><p className="text-sm font-[600] mt-1">{selected.buyer.name}</p><p className="text-xs text-[var(--color-ink-muted)]">{selected.buyer.email}</p></section>
                  <section className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)]"><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)]">Seller</p><p className="text-sm font-[600] mt-1">{selected.seller.name}</p><p className="text-xs text-[var(--color-ink-muted)]">{selected.seller.email}</p></section>
                </div>

                <section className="border border-[var(--color-border)]"><div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs font-[600]">Order and return</div><div className="p-4 grid sm:grid-cols-3 gap-4 text-xs"><div><span className="text-[var(--color-ink-muted)]">Order</span><p className="font-[600] mt-1">{selected.order.order_number}</p></div><div><span className="text-[var(--color-ink-muted)]">Seller order</span><p className="font-[600] mt-1">#{selected.seller_order.id} · {label(selected.seller_order.status)}</p></div><div><span className="text-[var(--color-ink-muted)]">Return</span><p className="font-[600] mt-1">#{selected.return_request.id} · {label(selected.return_request.status)}</p></div></div></section>

                <section><h3 className="text-xs font-[600] mb-2">Affected order items</h3><div className="border border-[var(--color-border)] divide-y divide-[var(--color-border-subtle)]">{selected.items.map((item) => <div key={item.id} className="p-3 flex justify-between gap-3 text-xs"><div><p className="font-[500]">{item.product_name}</p><p className="text-[var(--color-ink-muted)]">{item.sku} · Qty {item.quantity}</p></div><span>{money(item.refund_amount)}</span></div>)}</div></section>

                <div className="grid sm:grid-cols-2 gap-4"><section><h3 className="text-xs font-[600] mb-2">Buyer statement</h3><p className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-sm leading-relaxed min-h-20">{selected.buyer_statement || "No statement provided."}</p></section><section><h3 className="text-xs font-[600] mb-2">Seller response</h3><p className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-sm leading-relaxed min-h-20">{selected.seller_response || "No response provided."}</p></section></div>

                <section><h3 className="text-xs font-[600] mb-2">Private evidence</h3>{selected.evidence.length ? <div className="flex flex-wrap gap-2">{selected.evidence.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] text-xs hover:border-[var(--color-navy)]"><FileText size={13} />{file.name}</a>)}</div> : <p className="text-xs text-[var(--color-ink-muted)]">No evidence files.</p>}</section>

                <section><h3 className="text-xs font-[600] mb-2">Payment and refund history</h3><div className="border border-[var(--color-border)] divide-y divide-[var(--color-border-subtle)]">{selected.payments.map((payment) => <div key={payment.id} className="p-3 grid grid-cols-[1fr_auto] gap-2 text-xs"><div><p className="font-[500]">{label(payment.type)} · {payment.reference}</p><p className="text-[var(--color-ink-muted)]">{label(payment.status)} · {date(payment.occurred_at)}</p></div><span>{money(payment.amount, payment.currency)}</span></div>)}</div></section>

                {["open", "reviewing"].includes(selected.status) ? <section className="p-4 border border-[var(--color-navy)]/20 bg-[var(--color-navy-surface)] space-y-3"><h3 className="text-sm font-[600]">Admin resolution</h3><select value={outcome} onChange={(event) => setOutcome(event.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] bg-white text-sm">{OUTCOMES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>{outcome === "partial_refund" && <input type="number" min="0.01" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder={`Amount below ${selected.return_request.requested_amount}`} className="w-full px-3 py-2 border border-[var(--color-border)] text-sm" />}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Required resolution notes..." className="w-full px-3 py-2 border border-[var(--color-border)] bg-white text-sm resize-none" /><button disabled={saving} onClick={() => void resolve()} className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm disabled:opacity-60">{saving ? "Resolving..." : "Resolve dispute"}</button></section>
                  : <section className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)]"><p className="text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)]">Final resolution</p><p className="text-sm font-[600] mt-2">{label(selected.resolution_type ?? selected.status)}</p><p className="text-sm mt-2">{selected.resolution_notes}</p><p className="text-xs text-[var(--color-ink-muted)] mt-2">Resolved by {selected.resolved_by?.name ?? "Administrator"} on {date(selected.resolved_at)}</p></section>}
              </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
