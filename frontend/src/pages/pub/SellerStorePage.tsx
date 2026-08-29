import { useEffect, useMemo, useState } from "react";
import { Rating, Price } from "../../Part03";
import { IconHeart, IconChevronRight, IconMessages } from "../../shells/icons";
import { fetchCatalogSeller, type CatalogProduct, type CatalogSeller } from "../../api/catalog";
import { DEFAULT_SELLER_BANNER } from "./visuals";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastProvider";
import { startConversation } from "../../api/account";
import { Flag } from "lucide-react";
import ReportDialog from "../../components/ReportDialog";
import { useUrlTab } from "../../hooks/useUrlTab";

type NavFn = (page: string, params?: Record<string, string>) => void;
const STORE_FRONT_TABS = ["products", "reviews", "about"] as const;

function ProductCard({ product, onNavigate }: { product: CatalogProduct; onNavigate: NavFn }) {
  const discount = product.discount_percentage || null;
  return (
    <div className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer" onClick={() => onNavigate("product", { slug: product.slug })}>
      <div className="relative bg-[var(--color-surface)] aspect-square overflow-hidden">
        <img src={`${product.image}?w=400&h=400&fit=crop&auto=format`} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        {product.badge && <span className="absolute top-2 left-2 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-navy)] text-white">{product.badge}</span>}
        {discount && !product.badge && <span className="absolute top-2 right-2 font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-red)] text-white">-{discount}%</span>}
      </div>
      <div className="p-3">
        <p className="text-xs font-[500] text-[var(--color-ink)] line-clamp-2 mb-1.5 leading-snug">{product.name}</p>
        <Rating value={product.rating} count={product.rating_count} />
        <div className="mt-1.5"><Price amount={product.price} original={product.original_price ?? undefined} size="sm" /></div>
        {product.free_shipping && <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-green)] mt-1">Free Shipping</p>}
      </div>
    </div>
  );
}

export default function SellerStorePage({ sellerSlug, onNavigate }: { sellerSlug: string; onNavigate: NavFn }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [seller, setSeller] = useState<CatalogSeller | null>(null);
  const [followed, setFollowed] = useState(false);
  const { activeTab, setActiveTab } = useUrlTab(STORE_FRONT_TABS, "products");
  const [sort, setSort] = useState("relevance");
  const [reportOpen, setReportOpen] = useState(false);

  const messageSeller = async () => {
    if (!user) { onNavigate("login"); return; }
    if (!seller) return;
    try { const response = await startConversation({ seller_id: seller.id, subject: seller.name }); navigate(`/account/messages?conversation=${response.data.id}`); }
    catch (error) { showToast({ kind: "error", title: "Conversation unavailable", error, errorContext: "messaging" }); }
  };

  useEffect(() => {
    void fetchCatalogSeller(sellerSlug).then((response) => setSeller(response.data)).catch(() => setSeller(null));
  }, [sellerSlug]);

  const displayProducts = useMemo(() => {
    if (!seller) return [];
    const products = [...seller.products];
    if (sort === "price-asc") return products.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return products.sort((a, b) => b.price - a.price);
    if (sort === "rating") return products.sort((a, b) => b.rating - a.rating);
    return products;
  }, [seller, sort]);

  if (!seller) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full px-4 md:px-8 lg:px-12 py-16 text-center">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading seller store...</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="relative" style={{ height: "220px" }}>
        <img src={seller.banner || `${DEFAULT_SELLER_BANNER}?w=1400&h=400&fit=crop&auto=format`} alt={seller.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 md:left-8 lg:left-12">
          <div className="flex items-center gap-1.5">
            <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-white/60 hover:text-white cursor-pointer">Home</button>
            <IconChevronRight size={9} className="text-white/40" />
            <span className="font-[var(--font-mono)] text-[11px] text-white/80">{seller.name}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto">
          <div className="flex items-start gap-4 pt-6 pb-5">
            <div className="w-16 h-16 bg-[var(--color-navy)] rounded-sm overflow-hidden flex items-center justify-center shrink-0 mt-2 border-2 border-white shadow-[0_4px_16px_rgba(28,27,24,0.15)]">
              {seller.logo || seller.avatar ? (
                <img src={seller.logo || seller.avatar || ""} alt={`${seller.name} logo`} className="h-full w-full object-cover" />
              ) : (
                <span className="font-[var(--font-display)] text-2xl text-white font-[400]">{seller.initials}</span>
              )}
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
                  <Rating value={seller.rating} count={seller.rating_count} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setFollowed(f => !f)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-[500] rounded-sm border transition-all cursor-pointer ${followed ? "bg-[var(--color-red-light)] border-[var(--color-red-border)] text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                    <IconHeart size={13} />
                    {followed ? "Following" : "Follow"}
                  </button>
                  <button onClick={() => void messageSeller()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-[500] rounded-sm border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] transition-all cursor-pointer">
                    <IconMessages size={13} />
                    Message
                  </button>
                  <button onClick={() => user ? setReportOpen(true) : onNavigate("login")} className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer">
                    <Flag size={13} />
                    Report
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-8 pb-4 border-b border-[var(--color-border)] flex-wrap">
            {[
              { label: "Products", value: seller.product_count.toLocaleString() },
              { label: "Followers", value: seller.follower_count >= 1000 ? `${(seller.follower_count / 1000).toFixed(1)}k` : seller.follower_count.toString() },
              { label: "Response Rate", value: `${seller.response_rate}%` },
              { label: "Responds", value: seller.response_time },
              { label: "Member Since", value: `${seller.joined_year}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-[600] text-[var(--color-ink)]">{value}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-0">
            {STORE_FRONT_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 text-sm font-[500] border-b-2 transition-all cursor-pointer ${activeTab === tab ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {tab === "products"
                  ? `Products (${displayProducts.length})`
                  : tab === "reviews"
                    ? `Reviews (${seller.rating_count.toLocaleString()})`
                    : "About"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        {activeTab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[var(--color-ink-muted)]">
                <span className="font-[500] text-[var(--color-ink)]">{displayProducts.length}</span> products
              </p>
              <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm border border-[var(--color-border)] bg-white rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)]">
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayProducts.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="max-w-2xl">
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
                  <p className="text-xs text-[var(--color-ink-muted)]">{seller.rating_count.toLocaleString()} reviews</p>
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
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-3">
              <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">Seller reviews will appear here once the review workflow is connected to customer orders.</p>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="max-w-xl">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-6 mb-4">
              <h3 className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-3">About {seller.name}</h3>
              <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">{seller.description}</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
                {[
                  { label: "Location", value: seller.location },
                  { label: "Category", value: seller.category },
                  { label: "Member Since", value: seller.joined_year.toString() },
                  { label: "Total Products", value: seller.product_count.toString() },
                  { label: "Response Time", value: seller.response_time },
                  { label: "Response Rate", value: `${seller.response_rate}%` },
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
              <p className="text-xs text-[var(--color-navy)]/70 leading-relaxed">All orders from this seller are covered by Maketo's Buyer Protection Policy.</p>
            </div>
          </div>
        )}
      </div>
      {reportOpen && <ReportDialog targetType="seller" targetId={seller.id} targetName={seller.name} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
