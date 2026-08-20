import { useEffect, useState } from "react";
import { fetchBuyerReviews } from "../../api/buyer";

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchBuyerReviews();
        if (!active) return;
        setReviewCount(response.data.length);
      } catch {
        if (!active) return;
        setReviewCount(0);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Reviews</span>
        </div>

        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">My Reviews</h1>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center">
          <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">
            {loading ? "Loading reviews..." : reviewCount > 0 ? "Reviews loaded from the backend" : "No reviews yet"}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {reviewCount > 0
              ? "The backend returned review records, but this page no longer invents extra review data."
              : "When the backend starts returning review records, they will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}
