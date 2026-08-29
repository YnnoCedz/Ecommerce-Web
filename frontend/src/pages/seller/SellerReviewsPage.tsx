import { useEffect, useState } from "react";
import { CheckCircle2, Star, Trash2 } from "lucide-react";
import { deleteSellerReviewReply, fetchSellerReviews, saveSellerReviewReply, type SellerReview } from "../../api/seller";
import { useToast } from "../../components/ToastProvider";

export default function SellerReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const response = await fetchSellerReviews();
      setReviews(response.data);
      setDrafts(Object.fromEntries(response.data.map((review) => [review.id, review.reply?.body ?? ""])));
    } catch (error) {
      showToast({ kind: "error", title: "Reviews unavailable", error, errorContext: "seller" });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async (review: SellerReview) => {
    const body = drafts[review.id]?.trim();
    if (!body) return;
    setBusyId(review.id);
    try { const response = await saveSellerReviewReply(review.id, body); await load(); showToast({ title: "Reply saved", message: response.message }); }
    catch (error) { showToast({ kind: "error", title: "Reply not saved", error, errorContext: "seller" }); }
    finally { setBusyId(null); }
  };

  const remove = async (review: SellerReview) => {
    setBusyId(review.id);
    try { await deleteSellerReviewReply(review.id); await load(); showToast({ title: "Reply removed" }); }
    catch (error) { showToast({ kind: "error", title: "Reply not removed", error, errorContext: "seller" }); }
    finally { setBusyId(null); }
  };

  return <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 lg:px-12"><div className="mb-6"><h1 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)]">Product reviews</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Reply to verified buyer reviews for products in your store.</p></div>{loading ? <p className="text-sm text-[var(--color-ink-muted)]">Loading reviews...</p> : reviews.length === 0 ? <div className="rounded-sm border border-[var(--color-border)] bg-white p-10 text-center text-sm text-[var(--color-ink-muted)]">No reviews yet.</div> : <div className="space-y-4">{reviews.map((review) => <article key={review.id} className="rounded-sm border border-[var(--color-border)] bg-white p-5"><div className="flex gap-4"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--color-surface)]">{review.product_image && <img src={review.product_image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-[600] text-[var(--color-ink)]">{review.product_name}</p><p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{review.buyer_name} {review.verified_purchase && <span className="ml-1 inline-flex items-center gap-1 text-[var(--color-green)]"><CheckCircle2 size={11} /> Verified purchase</span>}</p></div><span className="text-xs capitalize text-[var(--color-ink-muted)]">{review.status}</span></div><div className="mt-2 flex gap-0.5">{[1,2,3,4,5].map((value) => <Star key={value} size={15} className={value <= review.rating ? "fill-[var(--color-amber)] text-[var(--color-amber)]" : "text-[var(--color-border)]"} />)}</div>{review.title && <p className="mt-2 text-sm font-[600]">{review.title}</p>}<p className="mt-1 text-sm text-[var(--color-ink-secondary)]">{review.body || "No written comment."}</p><p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">{review.submitted_at ? new Date(review.submitted_at).toLocaleString() : ""}</p></div></div><div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4"><label className="text-xs font-[500] text-[var(--color-ink)]">Seller reply<textarea value={drafts[review.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))} maxLength={3000} rows={3} className="mt-1.5 w-full resize-none rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-navy)]" placeholder="Write a public reply..." /></label><div className="mt-3 flex justify-end gap-2">{review.reply && <button onClick={() => void remove(review)} disabled={busyId === review.id} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-red)]"><Trash2 size={14} /> Remove</button>}<button onClick={() => void save(review)} disabled={busyId === review.id || !drafts[review.id]?.trim()} className="rounded-sm bg-[var(--color-navy)] px-4 py-2 text-sm text-white disabled:opacity-50">{review.reply ? "Update reply" : "Post reply"}</button></div></div></article>)}</div>}</div>;
}
