import { useEffect, useState } from "react";
import { Rating, Price } from "../../Part03";
import { IconSearch, IconChevronRight } from "../../shells/icons";
import { searchMarketplace, type CatalogProduct, type MarketplaceSearchResponse } from "../../api/catalog";
import { usePersistedWishlist } from "../../hooks/usePersistedWishlist";

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

function ProductCard({ product, onNavigate }: { product: CatalogProduct; onNavigate: NavFn }) {
  const { wished, busy, toggle } = usePersistedWishlist(product.id, product.name, () => onNavigate("login"));
  const discount = product.discount_percentage || null;
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
          onClick={e => { e.stopPropagation(); void toggle(); }}
          disabled={busy}
          aria-pressed={wished}
          className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer shadow-sm disabled:opacity-50">
          <svg width="13" height="13" viewBox="0 0 14 14" fill={wished ? "#8B2C2C" : "none"} stroke={wished ? "#8B2C2C" : "#6B6860"} strokeWidth="1.4">
            <path d="M7 12.5s-5.5-3.2-5.5-7A3 3 0 0 1 7 3.7 3 3 0 0 1 12.5 5.5c0 3.8-5.5 7-5.5 7z" />
          </svg>
        </button>
      </div>
      <div className="p-3.5">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-1 truncate">{product.seller}</p>
        <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-2 line-clamp-2">{product.name}</p>
        <div className="mb-2"><Rating value={product.rating} count={product.rating_count} /></div>
        <Price amount={product.price} original={product.original_price ?? undefined} size="sm" />
        {product.free_shipping && <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-green)] mt-1">Free Shipping</p>}
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
  const [sort, setSort] = useState("relevance");
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [freeShipping, setFreeShipping] = useState(false);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [meta, setMeta] = useState<MarketplaceSearchResponse["meta"]>({
    current_page: 1,
    last_page: 1,
    per_page: 24,
    total: 0,
    from: null,
    to: null,
  });
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const query = initialQuery;

  useEffect(() => {
    setPage(1);
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;

    const priceRange = selectedPrice === null ? null : PRICE_RANGES[selectedPrice];
    setLoading(true);

    void searchMarketplace({
      q: query,
      min_price: priceRange?.min,
      max_price: priceRange && Number.isFinite(priceRange.max) ? priceRange.max : undefined,
      min_rating: minRating ?? undefined,
      free_shipping: freeShipping || undefined,
      sort,
      page,
      per_page: 24,
    })
      .then((response) => {
        if (!cancelled) {
          setProducts(response.data);
          setMeta(response.meta);
          setSuggestedQuery(response.query.suggested);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setMeta(current => ({ ...current, current_page: 1, last_page: 1, total: 0, from: null, to: null }));
          setSuggestedQuery(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [freeShipping, minRating, page, query, selectedPrice, sort]);

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="bg-white border-b border-[var(--color-border)] px-4 md:px-8 lg:px-12 py-5">
        <div className="max-w-screen-xl mx-auto">
          {query ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-[var(--color-ink-muted)]">
                <span className="font-[500] text-[var(--color-ink)]">{meta.total.toLocaleString()}</span> results for <span className="font-[500] text-[var(--color-ink)]">"{query}"</span>
              </p>
              {suggestedQuery && (
                <button onClick={() => onNavigate("search", { q: suggestedQuery })} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">
                  Did you mean <span className="font-[600]">{suggestedQuery}</span>?
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">Browse all available products</p>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-52 shrink-0">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Refine</p>
            <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-2.5">Price Range</p>
                <div className="space-y-2">
                  {PRICE_RANGES.map((r, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => { setSelectedPrice(selectedPrice === i ? null : i); setPage(1); }}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedPrice === i ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"}`}>
                        {selectedPrice === i && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <span className="text-sm text-[var(--color-ink)]">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs font-[600] text-[var(--color-ink)] mb-2.5">Min. Rating</p>
                {[4, 3, 2].map(r => (
                  <button key={r} onClick={() => { setMinRating(minRating === r ? null : r); setPage(1); }}
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
              <div className="px-4 py-3">
                <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setFreeShipping(f => !f); setPage(1); }}>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${freeShipping ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}>
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${freeShipping ? "left-4" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm text-[var(--color-ink)]">Free shipping only</span>
                </label>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="py-20 text-center text-sm text-[var(--color-ink-muted)]">Searching the marketplace...</div>
            ) : products.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Showing <span className="font-[500] text-[var(--color-ink)]">{meta.from}-{meta.to}</span> of {meta.total} products
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--color-ink-muted)]">Sort:</label>
                    <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
                      className="text-sm border border-[var(--color-border)] bg-white rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)] transition-colors">
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
                </div>

                <div className="mt-8 flex items-center justify-center gap-1.5">
                  {Array.from({ length: meta.last_page }, (_, index) => index + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-sm text-sm font-[500] transition-colors cursor-pointer ${page === p ? "bg-[var(--color-navy)] text-white" : "border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)]"}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page}
                    className="w-8 h-8 flex items-center justify-center border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] cursor-pointer">
                    <IconChevronRight size={12} />
                  </button>
                </div>
              </>
            ) : (
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
