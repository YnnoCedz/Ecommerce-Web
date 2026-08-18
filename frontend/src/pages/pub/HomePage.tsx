import { useEffect, useMemo, useState } from "react";
import { Rating, Price } from "../../Part03";
import { IconSearch, IconChevronRight, IconTrendUp, IconBox, IconOrders } from "../../shells/icons";
import { fetchCatalogCategories, fetchCatalogProducts, fetchCatalogSellers, type CatalogCategory, type CatalogProduct, type CatalogSeller } from "../../api/catalog";
import { CATEGORY_VISUALS } from "./visuals";

type NavFn = (page: string, params?: Record<string, string>) => void;

function TrustBadge({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 shrink-0 bg-[var(--color-navy-surface)] rounded-sm flex items-center justify-center text-[var(--color-navy)]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-[600] text-[var(--color-ink)]">{title}</p>
        <p className="text-xs text-[var(--color-ink-muted)]">{sub}</p>
      </div>
    </div>
  );
}

function SectionHeader({ label, title, cta, onCta }: { label?: string; title: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        {label && <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">{label}</p>}
        <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">{title}</h2>
      </div>
      {cta && (
        <button onClick={onCta} className="flex items-center gap-1 text-sm text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
          {cta} <IconChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function HomeProductCard({ product, onNavigate }: { product: CatalogProduct; onNavigate: NavFn }) {
  const [wished, setWished] = useState(false);
  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : null;
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
        <div className="mb-2"><Rating value={product.rating} count={product.rating_count} /></div>
        <Price amount={product.price} original={product.original_price ?? undefined} size="sm" />
        {product.free_shipping && (
          <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-green)] mt-1">Free Shipping</p>
        )}
      </div>
    </div>
  );
}

function DealCard({ product, onNavigate }: { product: CatalogProduct; onNavigate: NavFn }) {
  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : null;
  if (!discount) return null;
  return (
    <div
      onClick={() => onNavigate("product", { slug: product.slug })}
      className="group shrink-0 w-44 bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] cursor-pointer transition-all">
      <div className="relative bg-[var(--color-surface)] aspect-square overflow-hidden">
        <img src={`${product.image}?w=320&h=320&fit=crop&auto=format`} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        <div className="absolute top-0 left-0 right-0 bg-[var(--color-red)] text-white text-center py-1.5">
          <p className="font-[var(--font-mono)] text-[11px] font-[600] tracking-wide">{discount}% OFF</p>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-[500] text-[var(--color-ink)] line-clamp-2 mb-1.5 leading-snug">{product.name}</p>
        <Price amount={product.price} original={product.original_price ?? undefined} size="sm" />
      </div>
    </div>
  );
}

export default function HomePage({ onNavigate }: { onNavigate: NavFn }) {
  const [heroSearch, setHeroSearch] = useState("");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [sellers, setSellers] = useState<CatalogSeller[]>([]);

  useEffect(() => {
    void Promise.all([
      fetchCatalogCategories(),
      fetchCatalogProducts(),
      fetchCatalogSellers(),
    ]).then(([cats, prods, sellersResponse]) => {
      setCategories(cats.data);
      setProducts(prods.data);
      setSellers(sellersResponse.data);
    }).catch(() => {
      setCategories([]);
      setProducts([]);
      setSellers([]);
    });
  }, []);

  const deals = useMemo(() => products.filter(p => p.original_price), [products]);

  return (
    <div>
      <div className="relative overflow-hidden bg-[var(--color-navy)]" style={{ minHeight: "480px" }}>
        <img
          src="https://images.unsplash.com/photo-1780798464793-be53ffd37b79?w=1400&h=600&fit=crop&auto=format"
          alt="Marketplace"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.25 }}
        />
        <div className="relative flex flex-col items-center justify-center text-center px-6 py-20 md:py-28">
          <p className="font-[var(--font-mono)] text-[11px] text-white/50 tracking-widest uppercase mb-4">
            {sellers.length.toLocaleString()} Independent Sellers · {products.length.toLocaleString()} Products
          </p>
          <h1 className="font-[var(--font-display)] text-4xl md:text-6xl font-[300] text-white leading-[1.05] mb-3 max-w-2xl">
            Discover something
            <br />
            <em className="italic font-[300]">genuinely original.</em>
          </h1>
          <p className="text-white/60 text-base font-[300] mb-8 max-w-md">
            The marketplace for independent creators, artisans, and curated sellers.
          </p>

          <div className="w-full max-w-xl">
            <div className="flex bg-white rounded-sm overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              <input
                type="text"
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
                placeholder="Search for products, sellers, or categories…"
                className="flex-1 px-5 py-3.5 text-sm text-[var(--color-ink)] bg-transparent outline-none placeholder:text-[var(--color-ink-disabled)]"
                onKeyDown={e => e.key === "Enter" && onNavigate("search", { q: heroSearch })}
              />
              <button
                onClick={() => onNavigate("search", { q: heroSearch })}
                className="px-5 bg-[var(--color-amber)] text-white font-[500] text-sm flex items-center gap-2 hover:bg-[var(--color-amber-hover)] transition-colors cursor-pointer">
                <IconSearch size={14} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[var(--color-ground)]" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
      </div>

      <section className="bg-[var(--color-ground)] px-4 md:px-8 lg:px-12 py-10">
        <div className="max-w-screen-xl mx-auto">
          <SectionHeader label="Browse" title="Shop by Category" cta="All Categories" onCta={() => onNavigate("category", { cat: "all" })} />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => onNavigate("category", { cat: cat.slug })}
                className="group flex flex-col items-center gap-2 cursor-pointer">
                <div className="w-full aspect-square rounded-sm overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] group-hover:border-[var(--color-navy)] group-hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] transition-all">
                  <img
                    src={`${CATEGORY_VISUALS[cat.slug]?.image ?? CATEGORY_VISUALS["home-garden"].image}?w=160&h=160&fit=crop&auto=format`}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs font-[500] text-[var(--color-ink)] text-center leading-tight group-hover:text-[var(--color-navy)] transition-colors">{cat.label}</p>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{(cat.count / 1000).toFixed(1)}k</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-[var(--color-border)] px-4 md:px-8 lg:px-12 py-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">Limited time</p>
              <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Today's Deals</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-[var(--color-red-light)] border border-[var(--color-red-border)] rounded-sm px-3 py-1.5">
              <span className="w-1.5 h-1.5 bg-[var(--color-red)] rounded-full animate-pulse" />
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-red)] font-[500]">Ends in 08:42:19</span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {deals.map(p => <DealCard key={p.id} product={p} onNavigate={onNavigate} />)}
            <button
              onClick={() => onNavigate("search", { q: "sale" })}
              className="shrink-0 w-44 bg-[var(--color-navy)] rounded-sm flex flex-col items-center justify-center gap-2 text-white hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
              <span className="font-[var(--font-display)] text-4xl font-[300]">+{products.length - deals.length}</span>
              <span className="text-xs text-white/70">more deals</span>
              <span className="flex items-center gap-1 text-xs font-[500]">View All <IconChevronRight size={11} /></span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-ground)] px-4 md:px-8 lg:px-12 py-10">
        <div className="max-w-screen-xl mx-auto">
          <SectionHeader label="Handpicked" title="Featured Products" cta="Browse all" onCta={() => onNavigate("category", { cat: "all" })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map(p => <HomeProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-[var(--color-border)] px-4 md:px-8 lg:px-12 py-10">
        <div className="max-w-screen-xl mx-auto">
          <SectionHeader label="Community" title="Top Sellers" cta="All sellers" onCta={() => onNavigate("search", { q: "" })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {sellers.map(seller => (
              <button
                key={seller.slug}
                onClick={() => onNavigate("seller", { slug: seller.slug })}
                className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 text-left hover:border-[var(--color-navy)] hover:shadow-[0_4px_16px_rgba(28,27,24,0.08)] transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                    <span className="font-[var(--font-display)] text-base text-white font-[400]">{seller.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-[600] text-[var(--color-ink)] truncate">{seller.name}</p>
                      {seller.verified && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="6" fill="var(--color-navy)" />
                          <path d="M3.5 6l1.8 1.8 3-3.6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] truncate">{seller.category}</p>
                  </div>
                </div>
                <Rating value={seller.rating} count={seller.rating_count} />
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-2">{seller.product_count} products</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-navy)] px-4 md:px-8 lg:px-12 py-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <IconBox size={20} />,
                title: "Buyer Protection",
                sub: "Full refund if your order doesn't arrive or match description",
                stat: "100% Protected",
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zM7 10l2 2 4-4" /></svg>,
                title: "Verified Sellers",
                sub: "Every seller passes identity verification and quality review",
                stat: "Approved by Admin",
              },
              {
                icon: <IconTrendUp size={20} />,
                title: "Secure Payments",
                sub: "Multiple payment methods. Encrypted and PCI-compliant",
                stat: "Bank-level Security",
              },
              {
                icon: <IconOrders size={20} />,
                title: "Easy Returns",
                sub: "15-day returns for most products. Simple, no-hassle process",
                stat: "15-day Window",
              },
            ].map(({ icon, title, sub, stat }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-white/10 rounded flex items-center justify-center text-white/70">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-[600] text-white mb-0.5">{title}</p>
                  <p className="text-xs text-white/50 leading-relaxed mb-1.5">{sub}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-amber)] tracking-wide">{stat}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-ground)] px-4 md:px-8 lg:px-12 py-12">
        <div className="max-w-screen-xl mx-auto">
          <div className="bg-white border border-[var(--color-border)] rounded-sm px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-2">Stay in the loop</p>
              <h3 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-1">Get deals before everyone else.</h3>
              <p className="text-sm text-[var(--color-ink-muted)]">Weekly deals, new arrivals, and seller spotlights — straight to your inbox.</p>
            </div>
            <div className="flex gap-2 w-full max-w-sm shrink-0">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 text-sm border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 transition-all"
              />
              <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 md:px-8 lg:px-12 py-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: `${products.length.toLocaleString()}+`, label: "Products Listed" },
              { value: `${sellers.length.toLocaleString()}+`, label: "Active Sellers" },
              { value: "1.2M+", label: "Happy Buyers" },
              { value: "98%", label: "Satisfaction Rate" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-[var(--font-display)] text-3xl font-[400] text-[var(--color-navy)]">{value}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
