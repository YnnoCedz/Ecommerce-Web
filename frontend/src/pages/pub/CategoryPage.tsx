import { useEffect, useMemo, useState } from "react";
import { Rating, Price } from "../../Part03";
import { IconChevronRight, IconChevronDown } from "../../shells/icons";
import { fetchCatalogCategories, fetchCatalogProducts, type CatalogCategory, type CatalogProduct } from "../../api/catalog";
import { CATEGORY_VISUALS } from "./visuals";
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

function FilterSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-border)] py-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-1.5 text-sm font-[600] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
        {title}
        <IconChevronDown size={13} className={`text-[var(--color-ink-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pt-2 pb-1">{children}</div>}
    </div>
  );
}

function ProductCard({ product, onNavigate }: { product: CatalogProduct; onNavigate: NavFn }) {
  const { wished, busy, toggle } = usePersistedWishlist(product.id, product.name, () => onNavigate("login"));
  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : null;
  return (
    <div className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_20px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer" onClick={() => onNavigate("product", { slug: product.slug })}>
      <div className="relative overflow-hidden bg-[var(--color-surface)] aspect-square">
        <img src={`${product.image}?w=400&h=400&fit=crop&auto=format`} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        {product.badge && <span className="absolute top-2.5 left-2.5 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-1 rounded-sm bg-[var(--color-navy)] text-white">{product.badge}</span>}
        {discount && <span className="absolute top-2.5 right-2.5 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-1 rounded-sm bg-[var(--color-red)] text-white">-{discount}%</span>}
        <button onClick={e => { e.stopPropagation(); void toggle(); }} disabled={busy} aria-pressed={wished} className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer shadow-sm disabled:opacity-50">
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

export default function CategoryPage({ catSlug, onNavigate }: { catSlug: string; onNavigate: NavFn }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>([]);
  const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState({ price: true, rating: true, delivery: true, sellers: false });

  useEffect(() => {
    void Promise.all([fetchCatalogCategories(), fetchCatalogProducts()]).then(([cats, products]) => {
      setCategories(cats.data);
      setAllProducts(products.data);
    }).catch(() => {
      setCategories([]);
      setAllProducts([]);
    });
  }, []);

  const cat = useMemo(() => categories.find(c => c.slug === catSlug) ?? { slug: "all", label: "All Products", count: allProducts.length, subs: [] }, [categories, catSlug, allProducts.length]);
  const catImage = CATEGORY_VISUALS[cat.slug]?.image ?? CATEGORY_VISUALS["home-garden"].image;
  const subcats = cat.subs.map((label, i) => ({ label, count: Math.max(1, Math.round(cat.count / (cat.subs.length + i))) }));

  const products = useMemo(() => {
    let next = cat.slug === "all" ? [...allProducts] : allProducts.filter(product => product.category_slug === cat.slug);
    if (selectedPriceRange !== null) {
      const r = PRICE_RANGES[selectedPriceRange];
      next = next.filter(p => p.price >= r.min && p.price <= r.max);
    }
    if (minRating !== null) next = next.filter(p => p.rating >= minRating);
    if (freeShippingOnly) next = next.filter(p => p.free_shipping);
    if (sort === "price-asc") next = [...next].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") next = [...next].sort((a, b) => b.price - a.price);
    if (sort === "rating") next = [...next].sort((a, b) => b.rating - a.rating);
    if (sort === "sales") next = [...next].sort((a, b) => b.sold_count - a.sold_count);
    if (selectedSubcat) next = next.filter(product => product.name.toLowerCase().includes(selectedSubcat.toLowerCase()));
    return next;
  }, [allProducts, cat.slug, freeShippingOnly, minRating, selectedPriceRange, selectedSubcat, sort]);

  const toggle = (section: keyof typeof filterOpen) => setFilterOpen(f => ({ ...f, [section]: !f[section] }));

  const FilterPanel = () => (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="border-b border-[var(--color-border)] py-3">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase px-4 pb-2">Subcategories</p>
        <div className="space-y-0.5 px-2">
          <button onClick={() => setSelectedSubcat(null)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${!selectedSubcat ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
            <span>All {cat.label}</span>
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{(cat.count / 1000).toFixed(1)}k</span>
          </button>
          {subcats.map(sub => (
            <button key={sub.label} onClick={() => setSelectedSubcat(sub.label)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${selectedSubcat === sub.label ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
              <span>{sub.label}</span>
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{sub.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
      <FilterSection title="Price Range" open={filterOpen.price} onToggle={() => toggle("price")}>
        <div className="space-y-2">
          {PRICE_RANGES.map((r, i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedPriceRange === i ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"}`} onClick={() => setSelectedPriceRange(selectedPriceRange === i ? null : i)}>
                {selectedPriceRange === i && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span className="text-sm text-[var(--color-ink)]">{r.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Minimum Rating" open={filterOpen.rating} onToggle={() => toggle("rating")}>
        <div className="space-y-2">
          {[4, 3, 2].map(r => (
            <button key={r} onClick={() => setMinRating(minRating === r ? null : r)} className={`flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded-sm w-full transition-colors ${minRating === r ? "bg-[var(--color-amber-light)] text-[var(--color-amber)]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
              <div className="flex">{Array.from({ length: 5 }).map((_, i) => (<svg key={i} width="13" height="13" viewBox="0 0 14 14" fill={i < r ? "#B8782A" : "#DDD9CE"}><path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" /></svg>))}</div>
              <span>& up</span>
            </button>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Delivery" open={filterOpen.delivery} onToggle={() => toggle("delivery")}>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <button onClick={() => setFreeShippingOnly(f => !f)} className={`w-8 h-4 rounded-full transition-colors relative ${freeShippingOnly ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${freeShippingOnly ? "left-4" : "left-0.5"}`} />
          </button>
          <span className="text-sm text-[var(--color-ink)]">Free shipping only</span>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="relative overflow-hidden bg-[var(--color-navy)]" style={{ height: "180px" }}>
        <img src={`${catImage}?w=1400&h=300&fit=crop&auto=format`} alt={cat.label} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.2 }} />
        <div className="relative px-4 md:px-8 lg:px-12 flex flex-col justify-end h-full pb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-white/50 hover:text-white/80 cursor-pointer">Home</button>
            <IconChevronRight size={10} className="text-white/30" />
            <span className="font-[var(--font-mono)] text-[11px] text-white/80">{cat.label}</span>
          </div>
          <h1 className="font-[var(--font-display)] text-3xl font-[300] text-white mb-1">{cat.label}</h1>
          <p className="font-[var(--font-mono)] text-[11px] text-white/50">{cat.count.toLocaleString()} products</p>
        </div>
      </div>

      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto overflow-x-auto">
          <div className="flex gap-2 py-3">
            <button onClick={() => setSelectedSubcat(null)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-[500] transition-colors cursor-pointer border ${!selectedSubcat ? "bg-[var(--color-navy)] text-white border-transparent" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>All</button>
            {subcats.map(sub => (
              <button key={sub.label} onClick={() => setSelectedSubcat(sub.label)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-[500] transition-colors cursor-pointer border ${selectedSubcat === sub.label ? "bg-[var(--color-navy)] text-white border-transparent" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-56 shrink-0">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">Filters</p>
            <FilterPanel />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-5">
              <p className="text-sm text-[var(--color-ink-muted)] hidden sm:block">
                Showing <span className="font-[500] text-[var(--color-ink)]">{products.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--color-ink-muted)]">Sort:</label>
                <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm border border-[var(--color-border)] bg-white rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)]">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">No products found</p>
                <p className="text-sm text-[var(--color-ink-muted)] mb-4">Try adjusting or clearing your filters.</p>
                <button onClick={() => { setSelectedPriceRange(null); setMinRating(null); setFreeShippingOnly(false); setSelectedSubcat(null); }} className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
