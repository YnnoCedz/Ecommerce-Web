import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock3, Flag, MessageSquare, Minus, Plus, RotateCcw, Star, ThumbsUp, Truck } from "lucide-react";
import { useNavigate } from "react-router";
import { Rating, Price } from "../../Part03";
import { IconChevronRight, IconChevronLeft, IconHeart, IconCart, IconStore } from "../../shells/icons";
import { fetchCatalogProduct, fetchProductReviews, type CatalogProduct, type ProductReview } from "../../api/catalog";
import { addCartItem } from "../../api/cart";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastProvider";
import { startConversation } from "../../api/account";
import ReportDialog from "../../components/ReportDialog";
import { usePersistedWishlist } from "../../hooks/usePersistedWishlist";
import { useUrlTab } from "../../hooks/useUrlTab";

const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";
const PRODUCT_TABS = ["description", "specs", "reviews"] as const;
const PRODUCT_TAB_OPTIONS: ReadonlyArray<{
  id: (typeof PRODUCT_TABS)[number];
  label: string;
}> = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
];

function dealTimeLeft(endsAt: string, now: number) {
  const total = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  const days = Math.floor(total / 86400);
  const clock = [Math.floor((total % 86400) / 3600), Math.floor((total % 3600) / 60), total % 60].map(value => String(value).padStart(2, "0")).join(":");
  return days ? `${days}d ${clock}` : clock;
}

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

function formatReviewDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function ReviewCard({ review }: { review: ProductReview }) {
  const initial = review.buyer_display_name.trim().charAt(0).toUpperCase() || "M";

  return (
    <div className="border-b border-[var(--color-border)] py-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
          <span className="font-[500] text-sm text-[var(--color-ink-muted)]">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-[600] text-[var(--color-ink)]">{review.buyer_display_name}</p>
              {review.verified_purchase && <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-green)]"><BadgeCheck size={12} /> Verified purchase</span>}
            </div>
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{formatReviewDate(review.created_at)}</p>
          </div>
          <div className="flex mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} fill={i < review.rating ? "#B8782A" : "#DDD9CE"} strokeWidth={0} />
            ))}
          </div>
        </div>
      </div>
      {review.title && <p className="text-sm font-[600] text-[var(--color-ink)] mb-1">{review.title}</p>}
      {review.body && <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-3">{review.body}</p>}
      <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]"><ThumbsUp size={12} /> Helpful ({review.helpful_count})</div>
      {review.seller_reply && <div className="mt-4 ml-4 border-l-2 border-[var(--color-border)] pl-4"><p className="text-xs font-[600] text-[var(--color-ink)] mb-1">Response from {review.seller_reply.seller_name || "seller"}</p><p className="text-sm text-[var(--color-ink-muted)]">{review.seller_reply.body}</p></div>}
    </div>
  );
}

export default function ProductPage({ slug, onNavigate }: { slug: string; onNavigate: NavFn }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [dealNow, setDealNow] = useState(Date.now());
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [refreshedPromotionId, setRefreshedPromotionId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLastPage, setReviewLastPage] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const { activeTab, setActiveTab } = useUrlTab(PRODUCT_TABS, "description");
  const [cartBusy, setCartBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setProductLoading(true);
    setProductError(null);
    setProduct(null);
    setReviews([]);
    setReviewPage(1);

    void fetchCatalogProduct(slug)
      .then((response) => {
        if (active) {
          const offset = new Date(response.server_time).getTime() - Date.now();
          setServerClockOffset(offset);
          setDealNow(Date.now() + offset);
          setProduct(response.data);
        }
      })
      .catch((error) => {
        if (active) setProductError(error instanceof Error ? error.message : "Unable to load this product.");
      })
      .finally(() => {
        if (active) setProductLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (activeTab !== "reviews" || !product) return;

    let active = true;
    setReviewsLoading(true);
    setReviewsError(null);
    void fetchProductReviews(product.slug, reviewPage)
      .then((response) => {
        if (!active) return;
        setReviews(response.data);
        setReviewLastPage(response.meta.last_page);
      })
      .catch((error) => {
        if (!active) return;
        setReviews([]);
        setReviewsError(error instanceof Error ? error.message : "Unable to load reviews.");
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, product, reviewPage]);

  useEffect(() => {
    const variants = product?.variants?.filter((variant) => variant.active) ?? [];
    const availableVariant = product?.track_inventory
      ? variants.find((variant) => variant.stock_quantity > 0)
      : variants[0];
    setSelectedVariantId(availableVariant?.id ?? variants[0]?.id ?? null);
    setQty(1);
  }, [product]);

  const { wished, busy: wishlistBusy, toggle: toggleWishlist } = usePersistedWishlist(product?.id ?? 0, product?.name ?? "Product", () => onNavigate("login"));

  const images = useMemo(() => {
    if (!product) return [PRODUCT_PLACEHOLDER];
    const fromApi = product.images?.map((image) => image.url).filter(Boolean) ?? [];
    return fromApi.length > 0 ? fromApi : [product.image || PRODUCT_PLACEHOLDER];
  }, [product]);

  const related = product?.related ?? [];
  const activeVariants = product?.variants?.filter((variant) => variant.active) ?? [];
  const defaultVariant = product?.track_inventory
    ? activeVariants.find((variant) => variant.stock_quantity > 0) ?? activeVariants[0]
    : activeVariants[0];
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant ?? null;
  const currentPrice = selectedVariant?.price ?? product?.price ?? null;
  const currentOriginalPrice = selectedVariant
    ? selectedVariant.original_price
    : product?.original_price ?? null;
  const currentBadge = selectedVariant
    ? (currentOriginalPrice !== null ? (selectedVariant.is_deal ? "DEAL" : "SALE") : null)
    : product?.badge ?? null;
  const currentIsDeal = selectedVariant ? selectedVariant.is_deal : product?.is_deal;
  const currentStock = selectedVariant?.stock_quantity ?? product?.stock_quantity ?? 0;
  const currentInStock = product ? (product.track_inventory ? currentStock > 0 : true) : false;
  const categoryLabel = product ? getCategoryLabel(product.category) : "Uncategorized";
  const sellerName = product ? getSellerName(product.seller) : "Maketo Seller";
  const sellerInitials = product ? getSellerInitials(product.seller, sellerName) : "M";
  const seller = product && typeof product.seller === "object" ? product.seller : null;
  const reviewSummary = product?.review_summary ?? {
    average_rating: product?.rating ?? 0,
    review_count: product?.rating_count ?? 0,
    rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  };

  useEffect(() => {
    if (!product?.promotion) return;
    const timer = window.setInterval(() => setDealNow(Date.now() + serverClockOffset), 1000);
    return () => window.clearInterval(timer);
  }, [product?.promotion, serverClockOffset]);

  useEffect(() => {
    if (!product?.promotion || refreshedPromotionId === product.promotion.id || new Date(product.promotion.ends_at).getTime() > dealNow) return;
    setRefreshedPromotionId(product.promotion.id);
    void fetchCatalogProduct(slug).then(response => {
      const offset = new Date(response.server_time).getTime() - Date.now();
      setServerClockOffset(offset);
      setDealNow(Date.now() + offset);
      setProduct(response.data);
    });
  }, [dealNow, product?.promotion, refreshedPromotionId, slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      showToast({ kind: "error", title: "Select an option", message: "Choose a product option before adding this item." });
      return;
    }
    if (!currentInStock) {
      showToast({ kind: "error", title: "Item unavailable", message: "This product is currently out of stock." });
      return;
    }
    if (currentPrice === null || !Number.isFinite(currentPrice)) {
      showToast({ kind: "error", title: "Price unavailable", message: "This product cannot be purchased until its price is corrected." });
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
        error,
        errorContext: "cart",
        fallbackMessage: "We couldn't add this item to your cart. Please try again.",
      });
    } finally {
      setCartBusy(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!user) { onNavigate("login"); return; }
    if (!seller) return;
    try {
      const response = await startConversation({ seller_id: seller.id, product_id: product.id, subject: product.name });
      navigate(`/account/messages?conversation=${response.data.id}`);
    } catch (error) { showToast({ kind: "error", title: "Conversation unavailable", error, errorContext: "messaging" }); }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      showToast({ kind: "error", title: "Select an option", message: "Choose a product option before continuing." });
      return;
    }
    if (!currentInStock) {
      showToast({ kind: "error", title: "Item unavailable", message: "This product is currently out of stock." });
      return;
    }
    if (currentPrice === null || !Number.isFinite(currentPrice)) {
      showToast({ kind: "error", title: "Price unavailable", message: "This product cannot be purchased until its price is corrected." });
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
        error,
        errorContext: "checkout",
        fallbackMessage: "We couldn't start checkout. Please try again.",
      });
    } finally {
      setCartBusy(false);
    }
  };

  if (productLoading) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full px-4 md:px-8 lg:px-12 py-16 text-center">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading product...</p>
      </div>
    );
  }

  if (!product || productError) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full px-4 md:px-8 lg:px-12 py-16 text-center">
        <p className="text-lg text-[var(--color-ink)] mb-2">Product unavailable</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{productError || "This product could not be found."}</p>
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
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex-1 relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square">
                <img src={images[activeImg] || PRODUCT_PLACEHOLDER} onError={(event) => { event.currentTarget.src = PRODUCT_PLACEHOLDER; }} alt={product.name} className="w-full h-full object-cover" />
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
              {currentBadge && <span className="inline-block font-[var(--font-mono)] text-[10px] font-[500] px-2.5 py-1 rounded-sm bg-[var(--color-navy)] text-white mb-3">{currentBadge}</span>}
              <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] leading-snug mb-3">{product.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <Rating value={product.rating} count={product.rating_count} />
                <span className="text-xs text-[var(--color-ink-muted)]">·</span>
                <span className="text-xs text-[var(--color-ink-muted)]">{product.sold_count.toLocaleString()} sold</span>
              </div>
              {currentPrice !== null && Number.isFinite(currentPrice)
                ? <Price amount={currentPrice} original={currentOriginalPrice ?? undefined} size="lg" />
                : <p className="text-sm text-[var(--color-red)]">Price unavailable</p>}
              {currentIsDeal && product.promotion && new Date(product.promotion.ends_at).getTime() > dealNow && <p className="mt-1.5 text-xs font-[var(--font-mono)] text-[var(--color-red)]" aria-label={`Deal ends at ${new Date(product.promotion.ends_at).toLocaleString()}`}>Today's Deal ends in {dealTimeLeft(product.promotion.ends_at, dealNow)}</p>}
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
                  <Minus size={12} />
                </button>
                <div className="w-10 h-9 flex items-center justify-center"><span className="text-sm font-[600] text-[var(--color-ink)]">{qty}</span></div>
                <button onClick={() => setQty(q => Math.min(product.track_inventory ? currentStock : 99, q + 1))} disabled={!currentInStock || (product.track_inventory && qty >= currentStock)} className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors cursor-pointer disabled:opacity-40">
                  <Plus size={12} />
                </button>
              </div>
              <span className="text-xs text-[var(--color-ink-muted)] ml-3">{currentInStock ? (product.track_inventory ? `${currentStock} in stock` : "In stock") : "Out of stock"}</span>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => void handleAddToCart()} disabled={cartBusy || !currentInStock} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer disabled:opacity-60">
                <IconCart size={15} />
                {cartBusy ? "Adding..." : "Add to Cart"}
              </button>
              <button onClick={() => void toggleWishlist()} disabled={wishlistBusy} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} className={`w-12 h-12 flex items-center justify-center border rounded-sm transition-all cursor-pointer disabled:opacity-60 ${wished ? "border-[var(--color-red-border)] bg-[var(--color-red-light)] text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-red-border)] hover:text-[var(--color-red)]"}`}>
                <IconHeart size={16} fill={wished ? "currentColor" : "none"} />
              </button>
            </div>
            <button onClick={() => void handleBuyNow()} disabled={cartBusy || !currentInStock} className="w-full py-3 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-amber-hover)] transition-colors cursor-pointer disabled:opacity-60 mb-5">
              Buy Now — {currentPrice !== null && Number.isFinite(currentPrice) ? `₱${(currentPrice * qty).toLocaleString()}` : "Price unavailable"}
            </button>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 mb-4 space-y-3">
              {[
                { icon: <Truck size={14} />, label: "Shipping", value: product.shipping_policy },
                { icon: <RotateCcw size={14} />, label: "Returns", value: product.return_policy },
                { icon: <Clock3 size={14} />, label: "Delivery", value: product.delivery_estimate },
              ].map(({ icon, label, value }) => value ? (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="text-[var(--color-ink-muted)] mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <span className="text-xs font-[600] text-[var(--color-ink)]">{label}: </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{value}</span>
                  </div>
                </div>
              ) : null)}
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                {seller?.logo ? <img src={seller.logo} alt="" className="w-10 h-10 rounded object-cover shrink-0" /> : <div className="w-10 h-10 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0"><span className="font-[var(--font-display)] text-base text-white">{sellerInitials}</span></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-[600] text-[var(--color-ink)] truncate">{sellerName}</p>
                    {seller?.verified && <BadgeCheck size={14} className="text-[var(--color-green)] shrink-0" />}
                  </div>
                  {seller && <p className="text-xs text-[var(--color-ink-muted)] mt-1">{seller.rating.toFixed(1)} from {seller.rating_count} review{seller.rating_count === 1 ? "" : "s"}{seller.fulfilled_order_count !== null ? ` · ${seller.fulfilled_order_count} fulfilled` : ""}</p>}
                </div>
              </div>
              <button onClick={() => onNavigate("seller", { slug: product.seller_slug ?? "" })} className="w-full flex items-center justify-center gap-1.5 py-2 border border-[var(--color-border)] rounded-sm text-xs font-[500] text-[var(--color-navy)] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
                <IconStore size={13} />
                Visit Seller Store
              </button>
              <button onClick={() => void handleMessageSeller()} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border border-[var(--color-border)] rounded-sm text-xs font-[500] text-[var(--color-navy)] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer"><MessageSquare size={13} />Message seller</button>
              <button onClick={() => user ? setReportOpen(true) : onNavigate("login")} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer"><Flag size={13} />Report product</button>
            </div>
          </div>
        </div>

        <div className="mt-10 bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] flex">
            {PRODUCT_TAB_OPTIONS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3.5 text-sm font-[500] border-b-2 transition-all cursor-pointer ${activeTab === tab.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === "description" && (
              <div className="max-w-2xl">
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-4 leading-snug">
                  {product.description || "No description provided."}
                </p>
              </div>
            )}

            {activeTab === "specs" && (
              <div className="max-w-lg">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["SKU", selectedVariant?.sku ?? product.sku ?? "—"],
                      ["Stock", product.track_inventory ? currentStock.toString() : "Not tracked"],
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
                    <p className="font-[var(--font-display)] text-5xl font-[300] text-[var(--color-ink)]">{reviewSummary.average_rating.toFixed(1)}</p>
                    <div className="flex justify-center my-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < Math.round(reviewSummary.average_rating) ? "#B8782A" : "#DDD9CE"} strokeWidth={0} />
                      ))}
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{reviewSummary.review_count} review{reviewSummary.review_count === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = reviewSummary.rating_distribution[String(stars) as "1" | "2" | "3" | "4" | "5"] ?? 0;
                      const width = reviewSummary.review_count > 0 ? (count / reviewSummary.review_count) * 100 : 0;
                      return (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)] w-4 text-right">{stars}</span>
                        <Star size={11} fill="#B8782A" strokeWidth={0} />
                        <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-amber)] rounded-full" style={{ width: `${width}%` }} />
                        </div>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] w-6">{count}</span>
                      </div>
                    );})}
                  </div>
                </div>
                {reviewsLoading && <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">Loading reviews...</p>}
                {!reviewsLoading && reviewsError && <p className="py-8 text-center text-sm text-[var(--color-red)]">{reviewsError}</p>}
                {!reviewsLoading && !reviewsError && reviews.length === 0 && <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">No reviews yet.</p>}
                {!reviewsLoading && !reviewsError && <div>{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>}
                {reviewLastPage > 1 && <div className="flex justify-center items-center gap-3 pt-6"><button onClick={() => setReviewPage((page) => Math.max(1, page - 1))} disabled={reviewPage === 1 || reviewsLoading} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs disabled:opacity-40">Previous</button><span className="text-xs text-[var(--color-ink-muted)]">Page {reviewPage} of {reviewLastPage}</span><button onClick={() => setReviewPage((page) => Math.min(reviewLastPage, page + 1))} disabled={reviewPage === reviewLastPage || reviewsLoading} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs disabled:opacity-40">Next</button></div>}
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
                    <img src={p.image || PRODUCT_PLACEHOLDER} onError={(event) => { event.currentTarget.src = PRODUCT_PLACEHOLDER; }} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
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
      {reportOpen && <ReportDialog targetType="product" targetId={product.id} targetName={product.name} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
