import { useState } from "react";
import { PRODUCTS, CATEGORIES, categoryBySlug } from "./data";
import { Rating, Price } from "../../Part03";
import { IconSearch, IconChevronRight, IconChevronDown } from "../../shells/icons";

type NavFn = (page: string, params?: Record<string, string>) => void;

const PRICE_RANGES = [
  { label: "Under ₱500", min: 0, max: 500 },
  { label: "₱500 – ₱1,000", min: 500, max: 1000 },
  { label: "₱1,000 – ₱3,000", min: 1000, max: 3000 },
  { label: "₱3,000 – ₱5,000", min: 3000, max: 5000 },
  { label: "Over ₱5,000", min: 5000, max: Infinity },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "sales", label: "Best Selling" },
];

function FilterSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-border)] py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-sm font-[600] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
        {title}
        <IconChevronDown size={13} className={`text-[var(--color-ink-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pt-2 pb-1">{children}</div>}
    </div>
  );
}

function ProductCard({ product, onNavigate }: { product: typeof PRODUCTS[0]; onNavigate: NavFn }) {
  const [wished, setWished] = useState(false);
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : null;
  return (
    <div
      className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_20px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer"
      onClick={() => onNavigate("product", { slug: product.slug })}>
      <div className="relative overflow-hidden bg-[var(--color-surface)] aspect-square">
        <img src={`${product.image}?w=400&h=400&fit=crop&auto=format`} alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        {product.badge && (
          <span className="absolute top-2.5 left-2.5 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-1 rounded-sm bg-[var(--color-navy)] text-white">{product.badge}</span>
        )}
        {discount && (
          <span className="absolute top-2.5 right-2.5 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-1 rounded-sm bg-[var(--color-red)] text-white">-{discount}%</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); setWished(w => !w); }}
          className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer shadow-sm">
          <svg width="13" height="13" viewBox="0 0 14 14" fill={wished ? "#8B2C2C" : "none"} stroke={wished ? "#8B2C2C" : "#6B6860"} strokeWidth="1.4">
            <path d="M7 12.5s-5.5-3.2-5.5-7A3 3 0 0 1 7 3.7 3 3 0 0 1 12.5 5.5c0 3.8-5.5 7-5.5 7z" />
          </svg>
        </button>
      </div>
      <div className="p-3.5">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-1 truncate">{product.seller}</p>
        <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-2 line-clamp-2">{product.name}</p>
        <div className="mb-2"><Rating value={product.rating} count={product.ratingCount} /></div>
        <Price amount={product.price} original={product.originalPrice} size="sm" />
        {product.freeShipping && <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-green)] mt-1">Free Shipping</p>}
      </div>
    </div>
  );
}

export default function CategoryPage({ catSlug, onNavigate }: { catSlug: string; onNavigate: NavFn }) {
  const cat = categoryBySlug(catSlug) ?? {
    slug: "all", label: "All Products", count: PRODUCTS.length, image: CATEGORIES[0].image, subs: [] as string[],
  };
  const subcats = cat.subs.map((label, i) => ({ label, count: Math.max(1, Math.round(cat.count / (cat.subs.length + i))) }));

  const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState({ price: true, rating: true, delivery: true, sellers: false });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const toggle = (section: keyof typeof filterOpen) =>
    setFilterOpen(f => ({ ...f, [section]: !f[section] }));

  // Apply filters to products
  let products = PRODUCTS;
  if (selectedPriceRange !== null) {
    const r = PRICE_RANGES[selectedPriceRange];
    products = products.filter(p => p.price >= r.min && p.price <= r.max);
  }
  if (minRating !== null) products = products.filter(p => p.rating >= minRating);
  if (freeShippingOnly) products = products.filter(p => p.freeShipping);
  if (sort === "price-asc") products = [...products].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") products = [...products].sort((a, b) => b.price - a.price);
  if (sort === "rating") products = [...products].sort((a, b) => b.rating - a.rating);
  if (sort === "sales") products = [...products].sort((a, b) => b.soldCount - a.soldCount);

  const totalPages = Math.max(1, Math.ceil(cat.count / 24));

  const FilterPanel = () => (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      {/* Subcategories */}
      <div className="border-b border-[var(--color-border)] py-3">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase px-4 pb-2">Subcategories</p>
        <div className="space-y-0.5 px-2">
          <button
            onClick={() => setSelectedSubcat(null)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${!selectedSubcat ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
            <span>All {cat.label}</span>
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{(cat.count / 1000).toFixed(1)}k</span>
          </button>
          {subcats.map(sub => (
            <button
              key={sub.label}
              onClick={() => setSelectedSubcat(sub.label)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${selectedSubcat === sub.label ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
              <span>{sub.label}</span>
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{sub.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <FilterSection title="Price Range" open={filterOpen.price} onToggle={() => toggle("price")}>
        <div className="space-y-2">
          {PRICE_RANGES.map((r, i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedPriceRange === i ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"}`}
                onClick={() => setSelectedPriceRange(selectedPriceRange === i ? null : i)}>
                {selectedPriceRange === i && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span className="text-sm text-[var(--color-ink)]">{r.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Minimum Rating" open={filterOpen.rating} onToggle={() => toggle("rating")}>
        <div className="space-y-2">
          {[4, 3, 2].map(r => (
            <button key={r} onClick={() => setMinRating(minRating === r ? null : r)}
              className={`flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded-sm w-full transition-colors ${minRating === r ? "bg-[var(--color-amber-light)] text-[var(--color-amber)]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="13" height="13" viewBox="0 0 14 14" fill={i < r ? "#B8782A" : "#DDD9CE"}><path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" /></svg>
                ))}
              </div>
              <span>& up</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Delivery */}
      <FilterSection title="Delivery" open={filterOpen.delivery} onToggle={() => toggle("delivery")}>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <button
            onClick={() => setFreeShippingOnly(f => !f)}
            className={`w-8 h-4 rounded-full transition-colors relative ${freeShippingOnly ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${freeShippingOnly ? "left-4" : "left-0.5"}`} />
          </button>
          <span className="text-sm text-[var(--color-ink)]">Free shipping only</span>
        </label>
      </FilterSection>

      {/* Clear button */}
      {(selectedPriceRange !== null || minRating !== null || freeShippingOnly || selectedSubcat) && (
        <div className="px-4 py-3">
          <button
            onClick={() => { setSelectedPriceRange(null); setMinRating(null); setFreeShippingOnly(false); setSelectedSubcat(null); }}
            className="w-full py-2 text-xs font-[500] text-[var(--color-red)] border border-[var(--color-red-border)] rounded-sm hover:bg-[var(--color-red-light)] transition-colors cursor-pointer">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[var(--color-ground)] min-h-full">

      {/* ── CATEGORY HEADER ────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[var(--color-navy)]" style={{ height: "180px" }}>
        <img src={`${cat.image}?w=1400&h=300&fit=crop&auto=format`} alt={cat.label}
          className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.2 }} />
        <div className="relative px-4 md:px-8 lg:px-12 flex flex-col justify-end h-full pb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-3">
            <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-white/50 hover:text-white/80 cursor-pointer">Home</button>
            <IconChevronRight size={10} className="text-white/30" />
            <span className="font-[var(--font-mono)] text-[11px] text-white/80">{cat.label}</span>
          </div>
          <h1 className="font-[var(--font-display)] text-3xl font-[300] text-white mb-1">{cat.label}</h1>
          <p className="font-[var(--font-mono)] text-[11px] text-white/50">{cat.count.toLocaleString()} products</p>
        </div>
      </div>

      {/* ── SUBCATEGORY PILLS ───────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto overflow-x-auto">
          <div className="flex gap-2 py-3">
            <button
              onClick={() => setSelectedSubcat(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-[500] transition-colors cursor-pointer border ${!selectedSubcat ? "bg-[var(--color-navy)] text-white border-transparent" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
              All
            </button>
            {subcats.map(sub => (
              <button
                key={sub.label}
                onClick={() => setSelectedSubcat(sub.label)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-[500] transition-colors cursor-pointer border ${selectedSubcat === sub.label ? "bg-[var(--color-navy)] text-white border-transparent" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        <div className="flex gap-6">

          {/* ── FILTER SIDEBAR (desktop) ─────────────────────────── */}
          <aside className="hidden lg:block w-56 shrink-0">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Filters</p>
            <FilterPanel />
          </aside>

          {/* ── PRODUCT AREA ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Sort bar */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <p className="text-sm text-[var(--color-ink-muted)] hidden sm:block">
                  Showing <span className="font-[500] text-[var(--color-ink)]">{products.length}</span> results
                </p>
                {/* Mobile filter toggle */}
                <button onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-sm text-xs font-[500] text-[var(--color-ink)] hover:border-[var(--color-navy)] cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 3h11M3 6.5h7M5 10h3" /></svg>
                  Filters
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--color-ink-muted)]">Sort:</label>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="text-sm border border-[var(--color-border)] bg-white rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)] transition-colors">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Product grid */}
            {products.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">No products found</p>
                <p className="text-sm text-[var(--color-ink-muted)] mb-4">Try adjusting or clearing your filters.</p>
                <button onClick={() => { setSelectedPriceRange(null); setMinRating(null); setFreeShippingOnly(false); }}
                  className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
              </div>
            )}

            {/* Pagination */}
            {products.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  <IconChevronRight size={12} className="rotate-180" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-sm text-sm font-[500] transition-colors cursor-pointer ${page === i + 1 ? "bg-[var(--color-navy)] text-white" : "border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)]"}`}>
                    {i + 1}
                  </button>
                ))}
                {totalPages > 5 && <span className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] text-sm">…</span>}
                {totalPages > 5 && (
                  <button onClick={() => setPage(totalPages)}
                    className={`w-8 h-8 flex items-center justify-center rounded-sm text-sm font-[500] transition-colors cursor-pointer ${page === totalPages ? "bg-[var(--color-navy)] text-white" : "border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)]"}`}>
                    {totalPages}
                  </button>
                )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  <IconChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ─────────────────────────────────── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--color-ground)] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)] bg-white">
              <p className="font-[600] text-sm text-[var(--color-ink)]">Filters</p>
              <button onClick={() => setMobileFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
              </button>
            </div>
            <div className="p-4"><FilterPanel /></div>
          </div>
        </div>
      )}
    </div>
  );
}
