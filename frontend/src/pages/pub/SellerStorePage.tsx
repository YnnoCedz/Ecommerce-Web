import { useState } from "react";
import { PRODUCTS, SELLERS } from "./data";
import { Rating, Price } from "../../Part03";
import { IconHeart, IconChevronRight, IconMessages } from "../../shells/icons";

type NavFn = (page: string, params?: Record<string, string>) => void;

const SELLER_REVIEWS = [
  { user: "Marco S.", date: "Aug 2, 2026", rating: 5, body: "Incredible packaging and super fast shipping. One of the best sellers I've dealt with on this platform. The product quality matched every description.", product: "Minimalist Chronograph Watch" },
  { user: "Lena T.", date: "Jul 22, 2026", rating: 5, body: "Very responsive, answered all my questions before purchase. Item arrived in perfect condition. Will definitely buy again from this store!", product: "Leather Tote Bag" },
  { user: "Paulo M.", date: "Jul 11, 2026", rating: 4, body: "Good seller overall. Shipping took a bit longer than estimated but the product itself is excellent quality. Communication was great throughout.", product: "Ceramic Bowl Set" },
  { user: "Aisha V.", date: "Jun 28, 2026", rating: 5, body: "This shop is the real deal. Every item I've ordered has been beautifully made. Their packaging makes great gifts too.", product: "Wool Beanie" },
];

function ProductCard({ product, onNavigate }: { product: typeof PRODUCTS[0]; onNavigate: NavFn }) {
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : null;
  return (
    <div className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer"
      onClick={() => onNavigate("product", { slug: product.slug })}>
      <div className="relative bg-[var(--color-surface)] aspect-square overflow-hidden">
        <img src={`${product.image}?w=400&h=400&fit=crop&auto=format`} alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        {product.badge && <span className="absolute top-2 left-2 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-navy)] text-white">{product.badge}</span>}
        {discount && !product.badge && <span className="absolute top-2 right-2 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-red)] text-white">-{discount}%</span>}
      </div>
      <div className="p-3">
        <p className="text-xs font-[500] text-[var(--color-ink)] line-clamp-2 mb-1.5 leading-snug">{product.name}</p>
        <Rating value={product.rating} count={product.ratingCount} />
        <div className="mt-1.5"><Price amount={product.price} original={product.originalPrice} size="sm" /></div>
        {product.freeShipping && <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-green)] mt-1">Free Shipping</p>}
      </div>
    </div>
  );
}

export default function SellerStorePage({ sellerSlug, onNavigate }: { sellerSlug: string; onNavigate: NavFn }) {
  const seller = SELLERS.find(s => s.slug === sellerSlug) ?? SELLERS[0];
  const sellerProducts = PRODUCTS.filter(p => p.sellerSlug === seller.slug);
  // If seller has no products in data, show all products as demo
  const displayProducts = sellerProducts.length > 0 ? sellerProducts : PRODUCTS.slice(0, 6);

  const [followed, setFollowed] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [sort, setSort] = useState("relevance");

  return (
    <div className="bg-[var(--color-ground)] min-h-full">

      {/* ── STORE BANNER ────────────────────────────────────── */}
      <div className="relative" style={{ height: "220px" }}>
        <img src={`${seller.banner}?w=1400&h=400&fit=crop&auto=format`} alt={seller.name}
          className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Breadcrumb overlay */}
        <div className="absolute top-4 left-4 md:left-8 lg:left-12">
          <div className="flex items-center gap-1.5">
            <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-white/60 hover:text-white cursor-pointer">Home</button>
            <IconChevronRight size={9} className="text-white/40" />
            <span className="font-[var(--font-mono)] text-[11px] text-white/80">{seller.name}</span>
          </div>
        </div>
      </div>

      {/* ── STORE IDENTITY CARD ─────────────────────────────── */}
      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto">
          {/* Avatar + info row */}
          <div className="flex items-start gap-4 pt-6 pb-5">
            {/* Avatar (overlaps banner) */}
            <div className="w-16 h-16 bg-[var(--color-navy)] rounded-sm flex items-center justify-center shrink-0 mt-2 border-2 border-white shadow-[0_4px_16px_rgba(28,27,24,0.15)]">
              <span className="font-[var(--font-display)] text-2xl text-white font-[400]">{seller.initials}</span>
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">{seller.name}</h1>
                    {seller.verified && (
                      <div className="flex items-center gap-1 bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] px-2 py-0.5 rounded-full">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="6" fill="var(--color-navy)" />
                          <path d="M3.5 6l1.8 1.8 3-3.6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-navy)] font-[500] tracking-wide">VERIFIED</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] mb-1">{seller.category} · {seller.location}</p>
                  <Rating value={seller.rating} count={seller.ratingCount} />
                </div>
                {/* CTA buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setFollowed(f => !f)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-[500] rounded-sm border transition-all cursor-pointer ${followed ? "bg-[var(--color-red-light)] border-[var(--color-red-border)] text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                    <IconHeart size={13} />
                    {followed ? "Following" : "Follow"}
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-[500] rounded-sm border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] transition-all cursor-pointer">
                    <IconMessages size={13} />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-8 pb-4 border-b border-[var(--color-border)] flex-wrap">
            {[
              { label: "Products", value: seller.productCount.toLocaleString() },
              { label: "Followers", value: seller.followerCount >= 1000 ? `${(seller.followerCount / 1000).toFixed(1)}k` : seller.followerCount.toString() },
              { label: "Response Rate", value: `${seller.responseRate}%` },
              { label: "Responds", value: seller.responseTime },
              { label: "Member Since", value: `${seller.joinedYear}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-[600] text-[var(--color-ink)]">{value}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{label}</p>
              </div>
            ))}
          </div>

          {/* Tab navigation */}
          <div className="flex gap-0">
            {[
              { id: "products", label: `Products (${displayProducts.length})` },
              { id: "reviews", label: `Reviews (${seller.ratingCount.toLocaleString()})` },
              { id: "about", label: "About" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-[500] border-b-2 transition-all cursor-pointer ${activeTab === tab.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">

        {/* Products tab */}
        {activeTab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[var(--color-ink-muted)]">
                <span className="font-[500] text-[var(--color-ink)]">{displayProducts.length}</span> products
              </p>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="text-sm border border-[var(--color-border)] bg-white rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)]">
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayProducts.map(p => (
                <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === "reviews" && (
          <div className="max-w-2xl">
            {/* Rating summary */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-6">
              <div className="flex gap-8 items-start">
                <div className="text-center shrink-0">
                  <p className="font-[var(--font-display)] text-5xl font-[300] text-[var(--color-ink)]">{seller.rating}</p>
                  <div className="flex justify-center my-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="16" height="16" viewBox="0 0 14 14" fill={i < Math.round(seller.rating) ? "#B8782A" : "#DDD9CE"}>
                        <path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)]">{seller.ratingCount.toLocaleString()} reviews</p>
                </div>
                <div className="flex-1">
                  {[
                    { label: "Accuracy", pct: 97 },
                    { label: "Communication", pct: 99 },
                    { label: "Shipping speed", pct: 94 },
                    { label: "Packaging", pct: 98 },
                  ].map(({ label, pct }) => (
                    <div key={label} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-[var(--color-ink-muted)] w-28 shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-amber)] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] w-6">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Review list */}
            {SELLER_REVIEWS.map((r, i) => (
              <div key={i} className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-3">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0">
                    <span className="font-[500] text-sm text-[var(--color-ink-muted)]">{r.user[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-[600] text-[var(--color-ink)]">{r.user}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{r.date}</p>
                    </div>
                    <div className="flex mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="12" height="12" viewBox="0 0 14 14" fill={i < r.rating ? "#B8782A" : "#DDD9CE"}>
                          <path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-2">{r.body}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">for: {r.product}</p>
              </div>
            ))}
            <button className="w-full py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-navy)] font-[500] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
              Load More Reviews
            </button>
          </div>
        )}

        {/* About tab */}
        {activeTab === "about" && (
          <div className="max-w-xl">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-4">
              <h3 className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-3">About {seller.name}</h3>
              <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">{seller.description}</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
                {[
                  { label: "Location", value: seller.location },
                  { label: "Category", value: seller.category },
                  { label: "Member Since", value: seller.joinedYear.toString() },
                  { label: "Total Products", value: seller.productCount.toString() },
                  { label: "Response Time", value: seller.responseTime },
                  { label: "Response Rate", value: `${seller.responseRate}%` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-[500] text-[var(--color-ink)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-sm p-4">
              <p className="text-sm text-[var(--color-navy)] font-[500] mb-1">Buyer Protection Applies</p>
              <p className="text-xs text-[var(--color-navy)]/70 leading-relaxed">All orders from this seller are covered by Marketo's Buyer Protection Policy. If your order doesn't arrive or doesn't match the description, you're eligible for a full refund.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
