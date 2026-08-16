import { useState } from "react";
import { PRODUCTS } from "./data";
import { Rating, Price } from "../../Part03";
import { IconSearch, IconChevronRight } from "../../shells/icons";

type NavFn = (page: string, params?: Record<string, string>) => void;

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "sales", label: "Best Selling" },
];

const PRICE_RANGES = [
  { label: "Under ₱500", min: 0, max: 500 },
  { label: "₱500 – ₱1,000", min: 500, max: 1000 },
  { label: "₱1,000 – ₱3,000", min: 1000, max: 3000 },
  { label: "₱3,000 – ₱5,000", min: 3000, max: 5000 },
  { label: "Over ₱5,000", min: 5000, max: Infinity },
];

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
        {discount && !product.badge && (
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

export default function SearchPage({
  query: initialQuery = "",
  onNavigate,
}: {
  query?: string;
  onNavigate: NavFn;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [sort, setSort] = useState("relevance");
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [freeShipping, setFreeShipping] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [page, setPage] = useState(1);

  // Simulate filtering / "no results" toggle
  let results = PRODUCTS;
  if (query.trim()) {
    const q = query.toLowerCase();
    const searched = PRODUCTS.filter(
      p => p.name.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    if (!noResults) results = searched.length > 0 ? searched : PRODUCTS;
    else results = [];
  }
  if (selectedPrice !== null) {
    const r = PRICE_RANGES[selectedPrice];
    results = results.filter(p => p.price >= r.min && p.price <= r.max);
  }
  if (minRating !== null) results = results.filter(p => p.rating >= minRating);
  if (freeShipping) results = results.filter(p => p.freeShipping);
  if (sort === "price-asc") results = [...results].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") results = [...results].sort((a, b) => b.price - a.price);
  if (sort === "rating") results = [...results].sort((a, b) => b.rating - a.rating);

  const doSearch = () => { setQuery(inputValue); setPage(1); };

  const SUGGESTED = ["Leather bag", "Natural skincare", "Handmade ceramics", "Chronograph watch", "Canvas sneakers"];

  return (
    <div className="bg-[var(--color-ground)] min-h-full">

      {/* ── SEARCH BAR STRIP ───────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 md:px-8 lg:px-12 py-5">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex gap-2 max-w-2xl">
            <div className="flex-1 flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm overflow-hidden focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10 transition-all">
              <IconSearch size={15} className="ml-3.5 text-[var(--color-ink-muted)] shrink-0" />
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="Search products, sellers, categories…"
                className="flex-1 px-3 py-2.5 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none"
              />
              {inputValue && (
                <button onClick={() => { setInputValue(""); setQuery(""); }}
                  className="mr-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11" /></svg>
                </button>
              )}
            </div>
            <button onClick={doSearch}
              className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
              Search
            </button>
          </div>

          {/* Query info / suggestions */}
          {query ? (
            <div className="flex items-center gap-2 mt-3">
              <p className="text-sm text-[var(--color-ink-muted)]">
                {results.length > 0 ? (
                  <><span className="font-[500] text-[var(--color-ink)]">{results.length.toLocaleString()}</span> results for <span className="font-[500] text-[var(--color-ink)]">"{query}"</span></>
                ) : (
                  <>No results for <span className="font-[500] text-[var(--color-ink)]">"{query}"</span></>
                )}
              </p>
              {/* Demo toggle */}
              <button onClick={() => setNoResults(r => !r)}
                className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] border border-dashed border-[var(--color-border)] px-2 py-0.5 rounded cursor-pointer hover:border-[var(--color-border-strong)]">
                {noResults ? "show results" : "demo: no results"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-[var(--color-ink-muted)]">Try:</span>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => { setInputValue(s); setQuery(s); }}
                  className="text-xs px-2.5 py-1 border border-[var(--color-border)] rounded-full text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        <div className="flex gap-6">

          {/* ── FILTER SIDEBAR ──────────────────────────────────── */}
          <aside className="hidden lg:block w-52 shrink-0">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Refine</p>
            <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              {/* Price */}
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-2.5">Price Range</p>
                <div className="space-y-2">
                  {PRICE_RANGES.map((r, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedPrice === i ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"}`}>
                        {selectedPrice === i && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <span className="text-sm text-[var(--color-ink)]">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Rating */}
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-2.5">Min. Rating</p>
                {[4, 3, 2].map(r => (
                  <button key={r} onClick={() => setMinRating(minRating === r ? null : r)}
                    className={`flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded-sm w-full mb-0.5 transition-colors ${minRating === r ? "bg-[var(--color-amber-light)]" : "hover:bg-[var(--color-surface)]"}`}>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="12" height="12" viewBox="0 0 14 14" fill={i < r ? "#B8782A" : "#DDD9CE"}><path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" /></svg>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--color-ink-muted)]">& up</span>
                  </button>
                ))}
              </div>
              {/* Delivery */}
              <div className="px-4 py-3">
                <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setFreeShipping(f => !f)}>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${freeShipping ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}>
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${freeShipping ? "left-4" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm text-[var(--color-ink)]">Free shipping only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* ── RESULTS AREA ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {results.length > 0 ? (
              <>
                {/* Sort bar */}
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    <span className="font-[500] text-[var(--color-ink)]">{results.length}</span> products
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--color-ink-muted)]">Sort:</label>
                    <select value={sort} onChange={e => setSort(e.target.value)}
                      className="text-sm border border-[var(--color-border)] bg-white rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)] transition-colors">
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-sm text-sm font-[500] transition-colors cursor-pointer ${page === p ? "bg-[var(--color-navy)] text-white" : "border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)]"}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(5, p + 1))}
                    className="w-8 h-8 flex items-center justify-center border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] cursor-pointer">
                    <IconChevronRight size={12} />
                  </button>
                </div>
              </>
            ) : (
              /* ── NO RESULTS STATE ────────────────────── */
              <div className="py-16 text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <IconSearch size={28} className="text-[var(--color-ink-muted)]" />
                </div>
                <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">No results found</h2>
                <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">
                  We couldn't find anything for <strong>"{query}"</strong>. Try different keywords, or browse our categories.
                </p>
                <div className="space-y-2 text-sm text-[var(--color-ink-muted)] text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 mb-6">
                  <p className="font-[600] text-[var(--color-ink)] mb-2">Search tips:</p>
                  <p>• Use fewer or more general keywords</p>
                  <p>• Check for typos or try alternate spellings</p>
                  <p>• Try browsing by category instead</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  <p className="w-full text-xs text-[var(--color-ink-muted)] mb-1">Try searching for:</p>
                  {["Leather bag", "Skincare", "Watches", "Ceramics"].map(s => (
                    <button key={s} onClick={() => { setInputValue(s); setQuery(s); setNoResults(false); }}
                      className="px-3 py-1.5 border border-[var(--color-border)] rounded-full text-xs text-[var(--color-ink)] hover:border-[var(--color-navy)] cursor-pointer transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => onNavigate("home")}
                  className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
                  Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
