import { useState } from "react";

type ReviewStatus = "published" | "pending" | "rejected";

type Review = {
  id: string;
  product: string;
  seller: string;
  productImage: string;
  orderId: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  status: ReviewStatus;
  helpful: number;
  notHelpful: number;
  isMine: boolean;
  sellerReply?: { body: string; date: string };
  images?: string[];
};

const REVIEWS: Review[] = [
  {
    id: "r1",
    product: "Minimalist Chronograph Watch",
    seller: "Atelier Manila",
    productImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=120&fit=crop&auto=format",
    orderId: "ORD-2849",
    rating: 5,
    title: "Absolutely stunning timepiece",
    body: "The craftsmanship on this watch is exceptional. The silver case has a wonderful weight to it, and the black dial is crisp and readable in all lighting conditions. The leather strap came slightly stiff but has broken in beautifully after a few weeks of wear. Packaging was also very thoughtful — came in a wooden box with a polishing cloth.",
    date: "Aug 12, 2026",
    status: "published",
    helpful: 24,
    notHelpful: 2,
    isMine: true,
    sellerReply: {
      body: "Thank you so much, Ana! We're thrilled the watch has lived up to your expectations. The strap does soften beautifully with wear — glad you're experiencing that. We hope it brings you joy for years to come!",
      date: "Aug 13, 2026",
    },
    images: [
      "https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=200&h=200&fit=crop&auto=format",
    ],
  },
  {
    id: "r2",
    product: "Natural Botanical Skincare Set",
    seller: "Verde Botanics",
    productImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120&h=120&fit=crop&auto=format",
    orderId: "ORD-2831",
    rating: 4,
    title: "Lovely products, slightly delayed shipping",
    body: "The skincare set itself is beautiful — the lavender variant smells incredible and my skin has been noticeably softer after two weeks. The serum has become a morning staple. Knocked one star because the delivery took 6 days instead of the estimated 3–5, but the products themselves are 5-star quality.",
    date: "Aug 15, 2026",
    status: "pending",
    helpful: 0,
    notHelpful: 0,
    isMine: true,
  },
];

const AWAITING_REVIEW = [
  {
    id: "ar1",
    product: "Genuine Leather Tote Bag",
    seller: "Casa Leather",
    orderId: "ORD-2814",
    productImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=120&h=120&fit=crop&auto=format",
    deliveredDate: "Aug 5, 2026",
  },
];

const COMMUNITY_REVIEWS: Review[] = [
  {
    id: "c1",
    product: "Minimalist Chronograph Watch",
    seller: "Atelier Manila",
    productImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=120&fit=crop&auto=format",
    orderId: "",
    rating: 5,
    title: "Perfect gift for my partner",
    body: "Got this as an anniversary gift and my partner hasn't taken it off since. The quality is miles above what you'd expect at this price. Highly recommend.",
    date: "Aug 8, 2026",
    status: "published",
    helpful: 31,
    notHelpful: 1,
    isMine: false,
  },
  {
    id: "c2",
    product: "Minimalist Chronograph Watch",
    seller: "Atelier Manila",
    productImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=120&fit=crop&auto=format",
    orderId: "",
    rating: 3,
    title: "Good watch, clasp could be better",
    body: "The dial and strap are excellent but the clasp mechanism feels a bit loose compared to similar watches I've owned. Seller was responsive when I mentioned this — they said a replacement clasp can be shipped separately. Overall still a good buy.",
    date: "Jul 30, 2026",
    status: "published",
    helpful: 8,
    notHelpful: 0,
    isMine: false,
  },
];

const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  published: { label: "Published", color: "var(--color-green)", bg: "var(--color-green-light)" },
  pending:   { label: "Under review", color: "var(--color-amber)", bg: "var(--color-amber-light)" },
  rejected:  { label: "Not approved", color: "var(--color-red)", bg: "var(--color-red-light)" },
};

function StarRating({ rating, interactive = false, value = 0, onChange }: {
  rating?: number;
  interactive?: boolean;
  value?: number;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = interactive ? (hover || value) : (rating ?? 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          width={interactive ? "20" : "13"} height={interactive ? "20" : "13"} viewBox="0 0 10 10"
          fill={i <= Math.round(display) ? "var(--color-amber)" : "var(--color-border)"}
          className={interactive ? "cursor-pointer transition-colors hover:scale-110" : ""}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(i)}>
          <path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" />
        </svg>
      ))}
    </div>
  );
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map(n => ({ stars: n, count: reviews.filter(r => r.rating === n).length }));
  const max = Math.max(...counts.map(c => c.count), 1);
  return (
    <div className="flex items-start gap-8">
      <div className="text-center shrink-0">
        <p className="font-[var(--font-display)] text-5xl font-[300] text-[var(--color-ink)]">{avg.toFixed(1)}</p>
        <StarRating rating={avg} />
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-1">{reviews.length} reviews</p>
      </div>
      <div className="flex-1 space-y-1">
        {counts.map(({ stars, count }) => (
          <div key={stars} className="flex items-center gap-2">
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] w-3 text-right shrink-0">{stars}</span>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="var(--color-amber)" className="shrink-0"><path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" /></svg>
            <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-amber)] rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] w-3 shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review, onEdit }: { review: Review; onEdit?: (id: string) => void }) {
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);
  const [counts, setCounts] = useState({ yes: review.helpful, no: review.notHelpful });
  const statusCfg = STATUS_CONFIG[review.status];

  const vote = (v: "yes" | "no") => {
    if (helpful) return;
    setHelpful(v);
    setCounts(prev => ({ ...prev, [v]: prev[v] + 1 }));
  };

  return (
    <div className="border-b border-[var(--color-border-subtle)] last:border-0 py-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-9 h-9 bg-[var(--color-navy)] rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-[var(--font-display)] text-sm">{review.isMine ? "AR" : "B"}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-[600] text-[var(--color-ink)]">{review.isMine ? "Ana Reyes (You)" : "Buyer"}</span>
                {review.isMine && (
                  <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={review.rating} />
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{review.date}</span>
              </div>
            </div>
            {review.isMine && review.status !== "rejected" && onEdit && (
              <button
                onClick={() => onEdit(review.id)}
                className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer flex items-center gap-1 shrink-0">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M10 2.5L11.5 4 4.5 11H3v-1.5L10 2.5z" /></svg>
                Edit
              </button>
            )}
          </div>

          {/* Title + body */}
          <p className="text-sm font-[600] text-[var(--color-ink)] mt-2 mb-1">{review.title}</p>
          <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">{review.body}</p>

          {/* Review images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-3">
              {review.images.map((img, i) => (
                <div key={i} className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Seller reply */}
          {review.sellerReply && (
            <div className="mt-4 ml-0 pl-4 border-l-2 border-[var(--color-navy-border)] bg-[var(--color-navy-surface)] rounded-r-sm p-3">
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] uppercase tracking-wide mb-1">Seller response · {review.sellerReply.date}</p>
              <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">{review.sellerReply.body}</p>
            </div>
          )}

          {/* Helpful vote */}
          {!review.isMine && (
            <div className="flex items-center gap-3 mt-3">
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Helpful?</span>
              <button
                onClick={() => vote("yes")}
                disabled={!!helpful}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors cursor-pointer ${helpful === "yes" ? "bg-[var(--color-green-light)] border-[var(--color-green-border)] text-[var(--color-green)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 7h2l2-5 2 1v6h4l1 3H2V7z" /></svg>
                Yes ({counts.yes})
              </button>
              <button
                onClick={() => vote("no")}
                disabled={!!helpful}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors cursor-pointer ${helpful === "no" ? "bg-[var(--color-red-light)] border-[var(--color-red-border)] text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"}`}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12 7h-2L8 12 6 11V5H2L1 2h11v5z" /></svg>
                No ({counts.no})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ orderId, product, productImage, seller, existingReview, onSubmit, onCancel }: {
  orderId: string;
  product: string;
  productImage: string;
  seller: string;
  existingReview?: Review;
  onSubmit: (data: { rating: number; title: string; body: string }) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [title, setTitle] = useState(existingReview?.title ?? "");
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [error, setError] = useState("");

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  const handleSubmit = () => {
    if (!rating) { setError("Please select a rating."); return; }
    if (!title.trim()) { setError("Please add a review title."); return; }
    if (body.trim().length < 20) { setError("Please write at least 20 characters in your review."); return; }
    setError("");
    onSubmit({ rating, title, body });
  };

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="w-12 h-12 bg-[var(--color-surface)] rounded-sm overflow-hidden border border-[var(--color-border)] shrink-0">
          <img src={productImage} alt={product} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-[600] text-[var(--color-ink)]">{existingReview ? "Edit your review" : "Write a review"}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">{product} · {seller}</p>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">Order {orderId}</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Star rating */}
        <div>
          <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-2">Your rating *</label>
          <div className="flex items-center gap-3">
            <StarRating interactive value={rating} onChange={setRating} />
            {rating > 0 && <span className="text-sm text-[var(--color-ink-muted)]">{ratingLabels[rating]}</span>}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1.5">Review title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Sum up your experience in a few words"
            className="w-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors"
          />
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-1 text-right">{title.length}/100</p>
        </div>

        {/* Body */}
        <div>
          <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1.5">Review *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Share your experience with this product. What did you like or dislike? How is the quality, sizing, or delivery?"
            className="w-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors resize-none leading-relaxed"
          />
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-1 text-right">{body.length}/2000</p>
        </div>

        {error && (
          <p className="text-xs text-[var(--color-red)] bg-[var(--color-red-light)] border border-[var(--color-red-border)] px-3 py-2 rounded-sm">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={handleSubmit} className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
            {existingReview ? "Update review" : "Submit review"}
          </button>
          <button onClick={onCancel} className="px-4 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">Cancel</button>
          {existingReview && (
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] ml-auto">Edited reviews go back into the review queue.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const [myReviews, setMyReviews] = useState<Review[]>(REVIEWS);
  const [communityReviews] = useState<Review[]>(COMMUNITY_REVIEWS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [writingFor, setWritingFor] = useState<typeof AWAITING_REVIEW[0] | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "community">("mine");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState(AWAITING_REVIEW);

  const handleSubmitNew = (data: { rating: number; title: string; body: string }) => {
    if (!writingFor) return;
    const newReview: Review = {
      id: `r${Date.now()}`,
      product: writingFor.product,
      seller: writingFor.seller,
      productImage: writingFor.productImage,
      orderId: writingFor.id,
      rating: data.rating,
      title: data.title,
      body: data.body,
      date: "Aug 15, 2026",
      status: "pending",
      helpful: 0,
      notHelpful: 0,
      isMine: true,
    };
    setMyReviews(prev => [newReview, ...prev]);
    setAwaiting(prev => prev.filter(a => a.id !== writingFor.id));
    setWritingFor(null);
    setSubmitted(newReview.id);
    setTimeout(() => setSubmitted(null), 4000);
  };

  const handleUpdate = (id: string, data: { rating: number; title: string; body: string }) => {
    setMyReviews(prev => prev.map(r => r.id === id ? { ...r, ...data, status: "pending" } : r));
    setEditingId(null);
    setSubmitted(id);
    setTimeout(() => setSubmitted(null), 4000);
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Reviews</span>
        </div>

        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">My Reviews</h1>

        {/* Success toast */}
        {submitted && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
            <p className="text-sm text-[var(--color-green)] font-[500]">Your review has been submitted and is under review. It will appear once approved.</p>
          </div>
        )}

        {/* Awaiting review */}
        {awaiting.length > 0 && !writingFor && (
          <div className="mb-6 bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-amber-light)]">
              <h3 className="text-sm font-[600] text-[var(--color-amber)]">Awaiting your review</h3>
            </div>
            {awaiting.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 h-12 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                  <img src={item.productImage} alt={item.product} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{item.product}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{item.seller} · Delivered {item.deliveredDate}</p>
                </div>
                <button
                  onClick={() => setWritingFor(item)}
                  className="text-xs font-[500] px-4 py-2 bg-[var(--color-navy)] text-white rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer whitespace-nowrap">
                  Write review
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Review form — writing new */}
        {writingFor && (
          <div className="mb-6">
            <ReviewForm
              orderId={writingFor.id}
              product={writingFor.product}
              productImage={writingFor.productImage}
              seller={writingFor.seller}
              onSubmit={handleSubmitNew}
              onCancel={() => setWritingFor(null)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── LEFT: Review list ──────────────────────────── */}
          <div>
            {/* Tabs */}
            <div className="flex gap-0 border-b border-[var(--color-border)] mb-5">
              {([
                { id: "mine", label: `My Reviews (${myReviews.length})` },
                { id: "community", label: "Community Reviews" },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-[500] border-b-2 transition-colors cursor-pointer ${activeTab === tab.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "mine" ? (
              myReviews.length === 0 ? (
                <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center">
                  <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">No reviews yet</p>
                  <p className="text-sm text-[var(--color-ink-muted)]">Reviews you write for purchased products will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myReviews.map(review => {
                    if (editingId === review.id) {
                      return (
                        <ReviewForm
                          key={review.id}
                          orderId={review.orderId}
                          product={review.product}
                          productImage={review.productImage}
                          seller={review.seller}
                          existingReview={review}
                          onSubmit={(data) => handleUpdate(review.id, data)}
                          onCancel={() => setEditingId(null)}
                        />
                      );
                    }
                    return (
                      <div key={review.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                        {/* Product header */}
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                          <div className="w-10 h-10 bg-[var(--color-surface)] rounded-sm overflow-hidden border border-[var(--color-border)] shrink-0">
                            <img src={review.productImage} alt={review.product} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{review.product}</p>
                            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{review.seller} · {review.orderId}</p>
                          </div>
                        </div>
                        <div className="px-5">
                          <ReviewCard review={review} onEdit={(id) => setEditingId(id)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="bg-white border border-[var(--color-border)] rounded-sm">
                <div className="px-5 py-5 border-b border-[var(--color-border)]">
                  <RatingSummary reviews={communityReviews} />
                </div>
                <div className="px-5">
                  {communityReviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Stats sidebar ─────────────────────────── */}
          <div className="space-y-4">

            {/* My review stats */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-sm font-[600] text-[var(--color-ink)] mb-4">Review Summary</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Published", value: myReviews.filter(r => r.status === "published").length, color: "text-[var(--color-green)]" },
                  { label: "Pending", value: myReviews.filter(r => r.status === "pending").length, color: "text-[var(--color-amber)]" },
                  { label: "Helpful votes", value: myReviews.reduce((sum, r) => sum + r.helpful, 0), color: "text-[var(--color-navy)]" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className={`font-[var(--font-display)] text-2xl font-[300] ${color}`}>{value}</p>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                <RatingSummary reviews={myReviews} />
              </div>
            </div>

            {/* Review guidelines */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4">
              <p className="text-xs font-[600] text-[var(--color-ink)] mb-3">Review guidelines</p>
              <ul className="space-y-2">
                {[
                  "Describe your genuine experience with the product",
                  "Focus on product quality, accuracy, and delivery",
                  "Avoid personal information or contact details",
                  "Be respectful of sellers and other buyers",
                  "Reviews must relate to a verified purchase",
                ].map(g => (
                  <li key={g} className="flex items-start gap-2 text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round" className="shrink-0 mt-0.5"><path d="M2 5l2.5 2.5 3.5-4" /></svg>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
