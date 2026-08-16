import { useState } from "react";
import { PRODUCTS, SELLERS, WATCH_GALLERY } from "./data";
import { Rating, Price, BtnPrimary, BtnSecondary } from "../../Part03";
import { IconChevronRight, IconChevronLeft, IconHeart, IconCart, IconStore, IconBox, IconOrders } from "../../shells/icons";

type NavFn = (page: string, params?: Record<string, string>) => void;

const SIZES = ["38mm", "40mm", "42mm", "44mm"];
const COLORS = [
  { label: "Silver/Black", hex: "#7A7A7A" },
  { label: "Gold/Tan", hex: "#B8782A" },
  { label: "Rose Gold", hex: "#C07060" },
];

const REVIEWS = [
  { user: "Marco S.", date: "Jul 28, 2026", rating: 5, title: "Exceptional quality and packaging", body: "Arrived well packaged, exactly as described. The dial looks even better in person — very clean and minimal. Strap quality is excellent for the price point.", helpful: 42 },
  { user: "Reina C.", date: "Jul 15, 2026", rating: 5, title: "My go-to everyday watch now", body: "I was skeptical at first but this has become my daily driver. The sapphire crystal really resists scratches. Seller was very responsive and shipping was fast.", helpful: 31 },
  { user: "Ben T.", date: "Jun 30, 2026", rating: 4, title: "Great watch, minor fit issue on smaller wrists", body: "Looks amazing but the lugs are a bit long for my 6-inch wrist. Otherwise the finishing is top-notch and the movement is accurate.", helpful: 18 },
  { user: "Aisha V.", date: "Jun 12, 2026", rating: 5, title: "Gift-ready out of the box", body: "Bought this as a gift and the unboxing experience alone was worth it. Beautiful presentation box, card included. Will definitely buy from this seller again.", helpful: 24 },
];

const RATING_DIST = [
  { stars: 5, pct: 72 },
  { stars: 4, pct: 18 },
  { stars: 3, pct: 6 },
  { stars: 2, pct: 2 },
  { stars: 1, pct: 2 },
];

function ReviewCard({ review }: { review: typeof REVIEWS[0] }) {
  return (
    <div className="border-b border-[var(--color-border)] py-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
          <span className="font-[500] text-sm text-[var(--color-ink-muted)]">{review.user[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-[600] text-[var(--color-ink)]">{review.user}</p>
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{review.date}</p>
          </div>
          <div className="flex mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="12" height="12" viewBox="0 0 14 14" fill={i < review.rating ? "#B8782A" : "#DDD9CE"}>
                <path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm font-[600] text-[var(--color-ink)] mb-1">{review.title}</p>
      <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-3">{review.body}</p>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 9V5l3-4h1l.5 3H10l-1 5H2z" /></svg>
          Helpful ({review.helpful})
        </button>
      </div>
    </div>
  );
}

export default function ProductPage({ slug, onNavigate }: { slug: string; onNavigate: NavFn }) {
  const product = PRODUCTS.find(p => p.slug === slug) ?? PRODUCTS[0];
  const seller = SELLERS.find(s => s.slug === product.sellerSlug) ?? SELLERS[0];
  const related = PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);

  const images = product.slug === "minimalist-chronograph-watch" ? WATCH_GALLERY : [product.image, product.image, product.image];

  const [activeImg, setActiveImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState(SIZES[1]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="bg-[var(--color-ground)] min-h-full">

      {/* ── BREADCRUMB ─────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 md:px-8 lg:px-12">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center gap-1.5 py-3">
            <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
            <IconChevronRight size={9} className="text-[var(--color-ink-disabled)]" />
            <button onClick={() => onNavigate("category", { cat: product.category.toLowerCase().replace(/ &/g, "").replace(/ /g, "-") })}
              className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">{product.category}</button>
            <IconChevronRight size={9} className="text-[var(--color-ink-disabled)]" />
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)] truncate max-w-xs">{product.name}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN PRODUCT SECTION ────────────────────────────── */}
      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">

          {/* ── LEFT: GALLERY ──────────────────────────────────── */}
          <div>
            <div className="flex gap-3">
              {/* Thumbnails */}
              <div className="hidden md:flex flex-col gap-2 w-16 shrink-0">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-sm overflow-hidden border-2 transition-all cursor-pointer ${activeImg === i ? "border-[var(--color-navy)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"}`}>
                    <img src={`${img}?w=120&h=120&fit=crop&auto=format`} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {/* Main image */}
              <div className="flex-1 relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square">
                <img
                  src={`${images[activeImg]}?w=800&h=800&fit=crop&auto=format`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white cursor-pointer transition-all">
                      <IconChevronLeft size={14} />
                    </button>
                    <button onClick={() => setActiveImg(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white cursor-pointer transition-all">
                      <IconChevronRight size={14} />
                    </button>
                  </>
                )}
                {/* Dot indicators (mobile) */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 md:hidden">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${activeImg === i ? "bg-[var(--color-navy)] w-3" : "bg-[var(--color-border-strong)]"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: PURCHASE PANEL ──────────────────────────── */}
          <div>
            {/* Header */}
            <div className="mb-4">
              {product.badge && (
                <span className="inline-block font-[var(--font-mono)] text-[10px] font-[500] px-2.5 py-1 rounded-sm bg-[var(--color-navy)] text-white mb-3">{product.badge}</span>
              )}
              <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] leading-snug mb-3">{product.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <Rating value={product.rating} count={product.ratingCount} />
                <span className="text-xs text-[var(--color-ink-muted)]">·</span>
                <span className="text-xs text-[var(--color-ink-muted)]">{product.soldCount.toLocaleString()} sold</span>
              </div>
              <Price amount={product.price} original={product.originalPrice} size="lg" />
              {product.freeShipping && (
                <p className="text-xs text-[var(--color-green)] font-[var(--font-mono)] mt-1.5">Free Standard Shipping</p>
              )}
            </div>

            {/* Color picker */}
            <div className="mb-4">
              <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">Color — <span className="font-[400] text-[var(--color-ink-muted)]">{COLORS[selectedColor].label}</span></p>
              <div className="flex gap-2">
                {COLORS.map((c, i) => (
                  <button key={i} onClick={() => setSelectedColor(i)}
                    className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${selectedColor === i ? "border-[var(--color-ink)] ring-2 ring-offset-1 ring-[var(--color-ink)]/30" : "border-white shadow-[0_0_0_1.5px_var(--color-border)]"}`}
                    style={{ background: c.hex }}
                    title={c.label} />
                ))}
              </div>
            </div>

            {/* Size picker */}
            <div className="mb-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">Case Size</p>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSelectedSize(s)}
                    className={`px-3.5 py-1.5 rounded-sm text-sm font-[500] border transition-all cursor-pointer ${selectedSize === s ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty */}
            <div className="mb-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">Quantity</p>
              <div className="inline-flex items-center border border-[var(--color-border)] rounded-sm overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
                  <svg width="12" height="2" viewBox="0 0 12 2" fill="none"><path d="M1 1h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
                <div className="w-10 h-9 flex items-center justify-center">
                  <span className="text-sm font-[600] text-[var(--color-ink)]">{qty}</span>
                </div>
                <button onClick={() => setQty(q => Math.min(10, q + 1))}
                  className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
              <span className="text-xs text-[var(--color-ink-muted)] ml-3">{product.inStock ? "In stock" : "Out of stock"}</span>
            </div>

            {/* CTAs */}
            <div className="flex gap-2 mb-4">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
                <IconCart size={15} />
                Add to Cart
              </button>
              <button
                onClick={() => setWished(w => !w)}
                className={`w-12 h-12 flex items-center justify-center border rounded-sm transition-all cursor-pointer ${wished ? "border-[var(--color-red-border)] bg-[var(--color-red-light)] text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-red-border)] hover:text-[var(--color-red)]"}`}>
                <IconHeart size={16} />
              </button>
            </div>
            <button className="w-full py-3 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-amber-hover)] transition-colors cursor-pointer mb-5">
              Buy Now — ₱{(product.price * qty).toLocaleString()}
            </button>

            {/* Delivery info */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 mb-4 space-y-3">
              {[
                { icon: <IconBox size={14} />, label: "Delivery", value: "Standard: 3–5 business days · Express available" },
                { icon: <IconOrders size={14} />, label: "Returns", value: "15-day returns — hassle free, no questions asked" },
                { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5" /><path d="M7 4.5V7l1.5 1.5" /></svg>, label: "Ships in", value: "1–2 business days after order confirmation" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="text-[var(--color-ink-muted)] mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <span className="text-xs font-[600] text-[var(--color-ink)]">{label}: </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Seller card */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                  <span className="font-[var(--font-display)] text-base text-white">{seller.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-[600] text-[var(--color-ink)] truncate">{seller.name}</p>
                    {seller.verified && (
                      <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="6" fill="var(--color-navy)" />
                        <path d="M3.5 6l1.8 1.8 3-3.6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <Rating value={seller.rating} count={seller.ratingCount} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Products", value: seller.productCount },
                  { label: "Response", value: seller.responseRate + "%" },
                  { label: "On since", value: "'" + (seller.joinedYear - 2000) },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center py-2 bg-[var(--color-surface)] rounded-sm">
                    <p className="font-[500] text-sm text-[var(--color-ink)]">{value}</p>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => onNavigate("seller", { slug: seller.slug })}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-[var(--color-border)] rounded-sm text-xs font-[500] text-[var(--color-navy)] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
                <IconStore size={13} />
                Visit Seller Store
              </button>
            </div>
          </div>
        </div>

        {/* ── TABS: DESCRIPTION / SPECS / REVIEWS ─────────────── */}
        <div className="mt-10 bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] flex">
            {[
              { id: "description", label: "Description" },
              { id: "specs", label: "Specifications" },
              { id: "reviews", label: `Reviews (${product.ratingCount})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-sm font-[500] border-b-2 transition-all cursor-pointer ${activeTab === tab.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === "description" && (
              <div className="max-w-2xl">
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-4 leading-snug">
                  A timepiece built for the discerning minimalist.
                </p>
                <div className="space-y-3 text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  <p>The Minimalist Chronograph Watch combines Swiss-inspired precision engineering with clean, modern design language. Featuring a slim 9mm case profile, anti-reflective sapphire crystal, and a hand-stitched genuine leather strap, it's designed to be worn from the boardroom to the weekend.</p>
                  <p>The chronograph complication operates with a single-pusher mechanism, requiring minimal bezel intrusion and preserving the integrity of the dial. Subdials at 3, 6, and 9 o'clock positions offer elapsed seconds, 30-minute, and 12-hour tracking respectively.</p>
                  <p>Every piece is individually quality-checked before shipping. Comes with a 2-year movement warranty and a full-grain leather watch roll.</p>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {["Sapphire crystal glass", "Japanese Miyota movement", "Genuine leather strap", "50m water resistant", "2-year warranty included", "Comes with watch roll"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="var(--color-green-light)" /><path d="M4 7l2 2 4-4" stroke="var(--color-green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "specs" && (
              <div className="max-w-lg">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["Case Material", "316L Stainless Steel"],
                      ["Case Diameter", "40mm (also available: 38, 42, 44mm)"],
                      ["Case Thickness", "9.2mm"],
                      ["Crystal", "Anti-reflective Sapphire"],
                      ["Movement", "Japanese Miyota 9132 Chronograph"],
                      ["Power Reserve", "48 hours"],
                      ["Water Resistance", "50m (5 ATM)"],
                      ["Strap", "Full-grain Horween leather, 20mm lug"],
                      ["Clasp", "Deployant buckle"],
                      ["Weight", "82g (without strap)"],
                    ].map(([key, val]) => (
                      <tr key={key} className="border-b border-[var(--color-border)]">
                        <td className="py-2.5 pr-6 text-[var(--color-ink-muted)] font-[500] w-44 shrink-0">{key}</td>
                        <td className="py-2.5 text-[var(--color-ink)]">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                {/* Rating overview */}
                <div className="flex gap-10 mb-8 pb-6 border-b border-[var(--color-border)]">
                  <div className="text-center shrink-0">
                    <p className="font-[var(--font-display)] text-5xl font-[300] text-[var(--color-ink)]">{product.rating}</p>
                    <div className="flex justify-center my-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="16" height="16" viewBox="0 0 14 14" fill={i < Math.round(product.rating) ? "#B8782A" : "#DDD9CE"}>
                          <path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{product.ratingCount} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {RATING_DIST.map(({ stars, pct }) => (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)] w-4 text-right">{stars}</span>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="#B8782A"><path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" /></svg>
                        <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-amber)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] w-8">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review list */}
                <div>
                  {REVIEWS.map((r, i) => <ReviewCard key={i} review={r} />)}
                </div>

                <button className="mt-4 px-5 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-navy)] font-[500] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
                  Load More Reviews
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RELATED PRODUCTS ────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-10">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">You may also like</p>
                <h3 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Related Products</h3>
              </div>
              <button onClick={() => onNavigate("category", { cat: product.category.toLowerCase().replace(" ", "-") })}
                className="flex items-center gap-1 text-sm text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
                View all <IconChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(p => (
                <div key={p.id} className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer"
                  onClick={() => onNavigate("product", { slug: p.slug })}>
                  <div className="aspect-square bg-[var(--color-surface)] overflow-hidden">
                    <img src={`${p.image}?w=320&h=320&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-[500] text-[var(--color-ink)] line-clamp-2 mb-1.5 leading-snug">{p.name}</p>
                    <Price amount={p.price} original={p.originalPrice} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
