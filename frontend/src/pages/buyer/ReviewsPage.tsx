import { useEffect, useState } from "react";
import { CheckCircle2, Pencil, Star, Trash2 } from "lucide-react";
import { createReview, deleteReview, fetchEligibleReviews, fetchReviews, updateReview, type BuyerReview, type ReviewEligibility } from "../../api/account";
import { useToast } from "../../components/ToastProvider";

type Draft = { order_item_id: number | null; review_id: number | null; rating: number; title: string; body: string };
const emptyDraft: Draft = { order_item_id: null, review_id: null, rating: 5, title: "", body: "" };

export default function ReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<BuyerReview[]>([]);
  const [eligible, setEligible] = useState<ReviewEligibility[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [reviewResponse, eligibleResponse] = await Promise.all([fetchReviews(), fetchEligibleReviews()]);
      setReviews(reviewResponse.data);
      setEligible(eligibleResponse.data);
    } catch (error) { showToast({ kind: "error", title: "Reviews unavailable", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.order_item_id && !draft.review_id) return;
    setSaving(true);
    try {
      const payload = { rating: draft.rating, title: draft.title, body: draft.body };
      const response = draft.review_id ? await updateReview(draft.review_id, payload) : await createReview({ ...payload, order_item_id: draft.order_item_id as number });
      showToast({ title: draft.review_id ? "Review updated" : "Review submitted", message: response.message });
      setDraft(emptyDraft);
      await load();
    } catch (error) { showToast({ kind: "error", title: "Review not saved", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setSaving(false); }
  };

  const remove = async (review: BuyerReview) => {
    if (!window.confirm(`Delete your review for ${review.product_name ?? "this product"}?`)) return;
    try { const response = await deleteReview(review.id); showToast({ title: "Review deleted", message: response.message }); await load(); }
    catch (error) { showToast({ kind: "error", title: "Review not deleted", message: error instanceof Error ? error.message : "Please try again." }); }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 lg:px-12">
      <div className="mb-5"><h1 className="font-[var(--font-display)] text-2xl">My reviews</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Products become reviewable after you mark their delivered order as received.</p></div>
      {loading ? <div className="rounded-sm border border-[var(--color-border)] bg-white p-10 text-sm text-[var(--color-ink-muted)]">Loading reviews...</div> : <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          {reviews.length === 0 ? <div className="rounded-sm border border-[var(--color-border)] bg-white p-10 text-center"><Star className="mx-auto mb-3 text-[var(--color-ink-muted)]" /><p className="text-sm text-[var(--color-ink-muted)]">You have not submitted a review yet.</p></div> : reviews.map((review) => <article key={review.id} className="rounded-sm border border-[var(--color-border)] bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-[600]">{review.product_name ?? "Product"}</p><p className="mt-1 text-xs text-[var(--color-ink-muted)]">{review.seller_name}</p></div><div className="flex gap-1">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < review.rating ? "fill-[var(--color-amber)] text-[var(--color-amber)]" : "text-[var(--color-border)]"} />)}</div></div>{review.title && <h2 className="mt-4 text-sm font-[600]">{review.title}</h2>}<p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{review.body}</p><div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3"><span className="flex items-center gap-1 text-[10px] text-[var(--color-green)]"><CheckCircle2 size={12} /> Verified purchase</span><div className="flex gap-3"><button onClick={() => setDraft({ review_id: review.id, order_item_id: review.order_item_id, rating: review.rating, title: review.title ?? "", body: review.body })} className="flex items-center gap-1 text-xs text-[var(--color-navy)]"><Pencil size={13} /> Edit</button><button onClick={() => void remove(review)} className="flex items-center gap-1 text-xs text-[var(--color-red)]"><Trash2 size={13} /> Delete</button></div></div></article>)}
        </section>
        <form onSubmit={submit} className="h-fit rounded-sm border border-[var(--color-border)] bg-white p-5 lg:sticky lg:top-28">
          <h2 className="text-sm font-[600]">{draft.review_id ? "Edit review" : "Write a review"}</h2>
          {!draft.review_id && <label className="mt-4 block text-xs font-[500]">Completed product<select value={draft.order_item_id ?? ""} onChange={(e) => setDraft({ ...draft, order_item_id: Number(e.target.value) || null })} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm"><option value="">Select a product</option>{eligible.map((item) => <option key={item.order_item_id} value={item.order_item_id}>{item.product_name} - {item.order_number}</option>)}</select></label>}
          {!draft.review_id && eligible.length === 0 && <p className="mt-3 text-xs text-[var(--color-ink-muted)]">No completed products are waiting for a review.</p>}
          <div className="mt-4"><p className="text-xs font-[500]">Rating</p><div className="mt-2 flex gap-2">{[1,2,3,4,5].map((rating) => <button key={rating} type="button" aria-label={`${rating} stars`} onClick={() => setDraft({ ...draft, rating })}><Star size={22} className={rating <= draft.rating ? "fill-[var(--color-amber)] text-[var(--color-amber)]" : "text-[var(--color-border)]"} /></button>)}</div></div>
          <label className="mt-4 block text-xs font-[500]">Title (optional)<input value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" /></label>
          <label className="mt-4 block text-xs font-[500]">Comment (optional)<textarea value={draft.body} maxLength={3000} rows={5} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="mt-1.5 w-full resize-none rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" /></label>
          <div className="mt-4 flex gap-2"><button disabled={saving || (!draft.review_id && !draft.order_item_id)} className="rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm text-white disabled:opacity-50">{saving ? "Saving..." : draft.review_id ? "Save review" : "Submit review"}</button>{draft.review_id && <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-sm border border-[var(--color-border)] px-4 py-2.5 text-sm">Cancel</button>}</div>
        </form>
      </div>}
    </div>
  );
}
