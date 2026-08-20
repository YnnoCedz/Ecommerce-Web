import { useEffect, useMemo, useState } from "react";
import { Rating, Price, BtnPrimary, BtnSecondary } from "../../Part03";
import { IconChevronRight, IconChevronLeft, IconHeart, IconCart, IconStore, IconBox, IconOrders } from "../../shells/icons";
import { fetchCatalogProduct, type CatalogProduct } from "../../api/catalog";
import { addCartItem } from "../../api/cart";
import { addWishlistItem, fetchWishlistStatus, removeWishlistItem } from "../../api/buyer";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastProvider";
import { WATCH_GALLERY, DEFAULT_PRODUCT_IMAGE } from "./visuals";

type NavFn = (page: string, params?: Record<string, string>) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCategoryLabel(category: CatalogProduct["category"]): string {
  if (typeof category === "string") {
    return category;
  }

  if (isRecord(category)) {
    const label = category.label;
    const name = category.name;

    if (typeof label === "string" && label.trim()) return label;
    if (typeof name === "string" && name.trim()) return name;
  }

  return "Uncategorized";
}

function getSellerName(seller: CatalogProduct["seller"]): string {
  if (typeof seller === "string") {
    return seller;
  }

  if (isRecord(seller)) {
    const name = seller.name;
    const businessName = seller.business_name;
    const tradeName = seller.trade_name;

    if (typeof name === "string" && name.trim()) return name;
    if (typeof tradeName === "string" && tradeName.trim()) return tradeName;
    if (typeof businessName === "string" && businessName.trim()) return businessName;
  }

  return "Maketo Seller";
}

function getSellerInitials(seller: CatalogProduct["seller"], fallbackName: string): string {
  if (isRecord(seller) && typeof seller.initials === "string" && seller.initials.trim()) {
    return seller.initials;
  }

  return fallbackName
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "M";
}

function ReviewCard({ review }: { review: { user: string; date: string; rating: number; title: string; body: string; helpful: number } }) {
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [cartBusy, setCartBusy] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    void fetchCatalogProduct(slug).then((response) => setProduct(response.data)).catch(() => setProduct(null));
  }, [slug]);

  useEffect(() => {
    const variants = product?.variants?.filter((variant) => variant.active) ?? [];
    const availableVariant = product?.track_inventory
      ? variants.find((variant) => variant.stock_quantity > 0)
      : variants[0];
    setSelectedVariantId(availableVariant?.id ?? variants[0]?.id ?? null);
    setQty(1);
  }, [product]);

  useEffect(() => {
    if (!user || !product) {
      setWished(false);
      return;
    }

    let active = true;
    void fetchWishlistStatus(product.id)
      .then((response) => {
        if (active) setWished(response.data.wishlisted);
      })
      .catch(() => {
        if (active) setWished(false);
      });

    return () => {
      active = false;
    };
  }, [product, user]);

  const images = useMemo(() => {
    if (!product) return [DEFAULT_PRODUCT_IMAGE];
    const fromApi = product.images?.map((image) => image.url).filter(Boolean) ?? [];
    return fromApi.length > 0 ? fromApi : product.slug === "minimalist-chronograph-watch" ? WATCH_GALLERY : [product.image];
  }, [product]);

  const related = product?.related ?? [];
  const selectedVariant = product?.variants?.find((variant) => variant.id === selectedVariantId) ?? null;
  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock_quantity ?? product?.stock_quantity ?? 0;
  const currentInStock = product ? (product.track_inventory ? currentStock > 0 : true) : false;
  const categoryLabel = product ? getCategoryLabel(product.category) : "Uncategorized";
  const sellerName = product ? getSellerName(product.seller) : "Maketo Seller";
  const sellerInitials = product ? getSellerInitials(product.seller, sellerName) : "M";
  const reviews = [
    { user: "Marco S.", date: "Jul 28, 2026", rating: 5, title: "Exceptional quality and packaging", body: "Arrived well packaged, exactly as described. The dial looks even better in person.", helpful: 42 },
    { user: "Reina C.", date: "Jul 15, 2026", rating: 5, title: "My go-to everyday watch now", body: "Seller was very responsive and shipping was fast.", helpful: 31 },
    { user: "Ben T.", date: "Jun 30, 2026", rating: 4, title: "Great watch, minor fit issue", body: "Looks amazing and the finishing is top-notch.", helpful: 18 },
  ];

  const handleAddToCart = async () => {
    if (!currentInStock) {
      showToast({ kind: "error", title: "Item unavailable", message: "This product is currently out of stock." });
      return;
    }

    setCartBusy(true);

    try {
      await addCartItem({
        product_id: product.id,
        product_variant_id: selectedVariant?.id ?? null,
        quantity: qty,
      });
      showToast({ kind: "cart", title: "Added to cart", message: `${product.name} was added successfully.` });
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? (error as { status?: number }).status : undefined;
      if (status === 401) {
        onNavigate("login");
        return;
      }

      showToast({
        kind: "error",
        title: "Could not update cart",
        message: error instanceof Error ? error.message : "Unable to add this item to your cart.",
      });
    } finally {
      setCartBusy(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      onNavigate("login");
      return;
    }

    setWishlistBusy(true);
    try {
      if (wished) {
        await removeWishlistItem(product.id);
        setWished(false);
        showToast({ kind: "wishlist", title: "Removed from wishlist", message: `${product.name} was removed.` });
      } else {
        await addWishlistItem(product.id);
        setWished(true);
        showToast({ kind: "wishlist", title: "Saved to wishlist", message: `${product.name} was saved successfully.` });
      }
    } catch (error) {
      showToast({
        kind: "error",
        title: "Could not update wishlist",
        message: error instanceof Error ? error.message : "Unable to update your wishlist.",
      });
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleBuyNow = async () => {
    if (!currentInStock) {
      showToast({ kind: "error", title: "Item unavailable", message: "This product is currently out of stock." });
      return;
    }
    setCartBusy(true);
    try {
      const response = await addCartItem({ product_id: product.id, product_variant_id: selectedVariant?.id ?? null, quantity: qty });
      const item = response.data.items.find((cartItem) => cartItem.product_id === product.id && cartItem.product_variant_id === (selectedVariant?.id ?? null));
      showToast({ kind: "cart", title: "Ready for checkout", message: `${product.name} was added to your cart.` });
      onNavigate("checkout", item ? { items: String(item.id) } : undefined);
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? (error as { status?: number }).status : undefined;
      if (status === 401) {
        onNavigate("login");
        return;
      }
      showToast({
        kind: "error",
        title: "Could not start checkout",
        message: error instanceof Error ? error.message : "Unable to start checkout.",
      });
    } finally {
      setCartBusy(false);
    }
  };

  if (!product) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full px-4 md:px-8 lg:px-12 py-16 text-center">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading product...</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="bg-white border-b border-[var(--color-border)] px-4 md:px-8 lg:px-12">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center gap-1.5 py-3">
            <button onClick={() => onNavigate("home")} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
            <IconChevronRight size={9} className="text-[var(--color-ink-disabled)]" />
            <button onClick={() => onNavigate("category", { cat: product.category_slug ?? "all" })} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">{categoryLabel}</button>
            <IconChevronRight size={9} className="text-[var(--color-ink-disabled)]" />
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)] truncate max-w-xs">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
          <div>
            <div className="flex gap-3">
              <div className="hidden md:flex flex-col gap-2 w-16 shrink-0">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-sm overflow-hidden border-2 transition-all cursor-pointer ${activeImg === i ? "border-[var(--color-navy)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"}`}>
                    <img src={`${img}?w=120&h=120&fit=crop&auto=format`} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex-1 relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square">
                <img src={`${images[activeImg]}?w=800&h=800&fit=crop&auto=format`} alt={product.name} className="w-full h-full object-cover" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white cursor-pointer transition-all">
                      <IconChevronLeft size={14} />
                    </button>
                    <button onClick={() => setActiveImg(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white cursor-pointer transition-all">
                      <IconChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4">
              {product.badge && <span className="inline-block font-[var(--font-mono)] text-[10px] font-[500] px-2.5 py-1 rounded-sm bg-[var(--color-navy)] text-white mb-3">{product.badge}</span>}
              <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] leading-snug mb-3">{product.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <Rating value={product.rating} count={product.rating_count} />
                <span className="text-xs text-[var(--color-ink-muted)]">·</span>
                <span className="text-xs text-[var(--color-ink-muted)]">{product.sold_count.toLocaleString()} sold</span>
              </div>
              <Price amount={currentPrice} original={selectedVariant ? undefined : product.original_price ?? undefined} size="lg" />
              {product.free_shipping && <p className="text-xs text-[var(--color-green)] font-[var(--font-mono)] mt-1.5">Free Standard Shipping</p>}
            </div>

            {product.variants && product.variants.length > 0 && <div className="mb-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">Product option</p>
              <div className="flex gap-2 flex-wrap">
                {product.variants.map((variant) => (
                  <button key={variant.id} onClick={() => { setSelectedVariantId(variant.id); setQty(1); }} disabled={product.track_inventory && variant.stock_quantity < 1} className={`px-3.5 py-1.5 rounded-sm text-sm font-[500] border transition-all cursor-pointer disabled:opacity-40 ${selectedVariantId === variant.id ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>}

            <div className="mb-5">
              <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">Quantity</p>
              <div className="inline-flex items-center border border-[var(--color-border)] rounded-sm overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
                  <svg width="12" height="2" viewBox="0 0 12 2" fill="none"><path d="M1 1h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
                <div className="w-10 h-9 flex items-center justify-center"><span className="text-sm font-[600] text-[var(--color-ink)]">{qty}</span></div>
                <button onClick={() => setQty(q => Math.min(10, currentStock || 10, q + 1))} className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
              <span className="text-xs text-[var(--color-ink-muted)] ml-3">{currentInStock ? (product.track_inventory ? `${currentStock} in stock` : "In stock") : "Out of stock"}</span>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => void handleAddToCart()} disabled={cartBusy || !currentInStock} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer disabled:opacity-60">
                <IconCart size={15} />
                {cartBusy ? "Adding..." : "Add to Cart"}
              </button>
              <button onClick={() => void handleWishlist()} disabled={wishlistBusy} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} className={`w-12 h-12 flex items-center justify-center border rounded-sm transition-all cursor-pointer disabled:opacity-60 ${wished ? "border-[var(--color-red-border)] bg-[var(--color-red-light)] text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-red-border)] hover:text-[var(--color-red)]"}`}>
                <IconHeart size={16} />
              </button>
            </div>
            <button onClick={() => void handleBuyNow()} disabled={cartBusy || !currentInStock} className="w-full py-3 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-amber-hover)] transition-colors cursor-pointer disabled:opacity-60 mb-5">
              Buy Now — ₱{(currentPrice * qty).toLocaleString()}
            </button>

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

            <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                  <span className="font-[var(--font-display)] text-base text-white">{sellerInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-[600] text-[var(--color-ink)] truncate">{sellerName}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => onNavigate("seller", { slug: product.seller_slug ?? "" })} className="w-full flex items-center justify-center gap-1.5 py-2 border border-[var(--color-border)] rounded-sm text-xs font-[500] text-[var(--color-navy)] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
                <IconStore size={13} />
                Visit Seller Store
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] flex">
            {[
              { id: "description", label: "Description" },
              { id: "specs", label: "Specifications" },
              { id: "reviews", label: "Reviews" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3.5 text-sm font-[500] border-b-2 transition-all cursor-pointer ${activeTab === tab.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === "description" && (
              <div className="max-w-2xl">
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-4 leading-snug">
                  {product.description || "A product curated for the Maketo marketplace."}
                </p>
              </div>
            )}

            {activeTab === "specs" && (
              <div className="max-w-lg">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["SKU", product.sku ?? "—"],
                      ["Stock", product.stock_quantity?.toString() ?? "0"],
                      ["Inventory Tracking", product.track_inventory ? "Enabled" : "Disabled"],
                      ["Free Shipping", product.free_shipping ? "Yes" : "No"],
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
                    <p className="text-xs text-[var(--color-ink-muted)]">{product.rating_count} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars, i) => (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)] w-4 text-right">{stars}</span>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="#B8782A"><path d="M7 1.5l1.56 3.16 3.49.51-2.52 2.46.59 3.47L7 9.25l-3.12 1.64.59-3.47L2 4.17l3.49-.51L7 1.5z" /></svg>
                        <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-amber)] rounded-full" style={{ width: `${Math.max(8, 100 - i * 18)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>{reviews.map((r, i) => <ReviewCard key={i} review={r} />)}</div>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-1">You may also like</p>
                <h3 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Related Products</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(p => (
                <div key={p.id} className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer" onClick={() => onNavigate("product", { slug: p.slug })}>
                  <div className="aspect-square bg-[var(--color-surface)] overflow-hidden">
                    <img src={`${p.image}?w=320&h=320&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-[500] text-[var(--color-ink)] line-clamp-2 mb-1.5 leading-snug">{p.name}</p>
                    <Price amount={p.price} original={p.original_price ?? undefined} size="sm" />
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
