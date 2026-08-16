import { useState } from "react";

type ColorOption = { id: string; label: string; hex: string };
type SizeOption = { id: string; label: string; available: boolean };

const PRODUCT = {
  id: "watch-001",
  name: "Minimalist Chronograph Watch",
  seller: { name: "Atelier Manila", slug: "atelier-manila", rating: 4.9, reviews: 312, location: "Makati, NCR" },
  description: "A precisely crafted timepiece for the discerning professional. Swiss-inspired movement, sapphire-coated mineral glass, and a hand-stitched leather strap that ages beautifully with wear.",
  price: 4200,
  originalPrice: 5500,
  images: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&h=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1617077644557-64be144aa306?w=600&h=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=600&h=600&fit=crop&auto=format",
  ],
  colors: [
    { id: "silver-black", label: "Silver / Black dial", hex: "#9E9E9E" },
    { id: "gold-white", label: "Gold / White dial", hex: "#C9A84C" },
    { id: "rose-cream", label: "Rose Gold / Cream", hex: "#C89B8B" },
  ] as ColorOption[],
  sizes: [
    { id: "38mm", label: "38mm", available: true },
    { id: "40mm", label: "40mm", available: true },
    { id: "42mm", label: "42mm", available: false },
  ] as SizeOption[],
  stock: 7,
  rating: 4.8,
  reviewCount: 142,
  features: ["Swiss quartz movement", "Sapphire-coated mineral glass", "Hand-stitched leather strap", "30m water resistance", "2-year warranty"],
};

function StarRating({ rating, interactive = false, value = 0, onChange }: {
  rating?: number;
  interactive?: boolean;
  value?: number;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = interactive ? (hover || value) : (rating ?? 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          width="14" height="14" viewBox="0 0 10 10"
          fill={i <= display ? "var(--color-amber)" : interactive ? "var(--color-border)" : "var(--color-border)"}
          className={interactive ? "cursor-pointer transition-colors" : ""}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(i)}>
          <path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductInteractionPage() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PRODUCT.colors[0].id);
  const [selectedSize, setSelectedSize] = useState(PRODUCT.sizes[0].id);
  const [qty, setQty] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const colorLabel = PRODUCT.colors.find(c => c.id === selectedColor)?.label ?? "";
  const discount = Math.round((1 - PRODUCT.price / PRODUCT.originalPrice) * 100);

  const handleAddToCart = () => {
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2500);
  };

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Watches</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)] truncate max-w-[200px]">{PRODUCT.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">

          {/* ── LEFT: Image gallery ──────────────────────────── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square">
              <img
                src={PRODUCT.images[selectedImage]}
                alt={PRODUCT.name}
                className="w-full h-full object-cover"
              />
              {/* Discount badge */}
              <div className="absolute top-3 left-3">
                <span className="font-[var(--font-mono)] text-[10px] px-2 py-0.5 bg-[var(--color-red)] text-white rounded">−{discount}%</span>
              </div>
              {/* Share button */}
              <div className="absolute top-3 right-3 relative">
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-white cursor-pointer shadow-sm transition-colors">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="14" cy="4" r="2" />
                    <circle cx="4" cy="9" r="2" />
                    <circle cx="14" cy="14" r="2" />
                    <path d="M6 8l6-3M6 10l6 3" />
                  </svg>
                </button>
                {shareOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-20 p-3">
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">Share this product</p>
                    <div className="flex gap-1.5 mb-2">
                      {["Facebook", "Twitter", "Viber"].map(s => (
                        <button key={s} className="flex-1 text-[10px] font-[var(--font-mono)] py-1.5 border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] rounded-sm cursor-pointer transition-colors">{s}</button>
                      ))}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="w-full text-[10px] font-[var(--font-mono)] py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm cursor-pointer hover:bg-[var(--color-border)] transition-colors">
                      {copied ? "✓ Link copied!" : "Copy link"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {PRODUCT.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`aspect-square bg-[var(--color-surface)] rounded-sm overflow-hidden border-2 transition-colors cursor-pointer ${i === selectedImage ? "border-[var(--color-navy)]" : "border-transparent hover:border-[var(--color-border-strong)]"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Product info + interaction ───────────── */}
          <div className="space-y-5">

            {/* Seller attribution */}
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2 group cursor-pointer">
                <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                  <span className="text-white font-[var(--font-display)] text-xs">A</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-[500] text-[var(--color-ink)] group-hover:text-[var(--color-navy)] transition-colors">{PRODUCT.seller.name}</span>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{PRODUCT.seller.location}</p>
                </div>
              </button>
              <div className="flex items-center gap-1.5">
                <StarRating rating={PRODUCT.seller.rating} />
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{PRODUCT.seller.rating} ({PRODUCT.seller.reviews} reviews)</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="font-[var(--font-display)] text-2xl md:text-3xl font-[400] text-[var(--color-ink)] leading-tight mb-2">
                {PRODUCT.name}
              </h1>
              <div className="flex items-center gap-3">
                <StarRating rating={PRODUCT.rating} />
                <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">{PRODUCT.rating} ({PRODUCT.reviewCount} reviews)</span>
                <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-navy)] hover:underline cursor-pointer">Read reviews</button>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-[var(--font-display)] text-3xl font-[400] text-[var(--color-ink)]">₱{PRODUCT.price.toLocaleString()}</span>
              <span className="text-sm text-[var(--color-ink-disabled)] line-through">₱{PRODUCT.originalPrice.toLocaleString()}</span>
              <span className="font-[var(--font-mono)] text-[11px] px-1.5 py-0.5 bg-[var(--color-red-light)] text-[var(--color-red)] rounded">{discount}% OFF</span>
            </div>

            <div className="border-t border-[var(--color-border-subtle)] pt-5 space-y-5">

              {/* Color selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide">Colour</p>
                  <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{colorLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  {PRODUCT.colors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      title={color.label}
                      className={`relative w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${selectedColor === color.id ? "border-[var(--color-navy)] scale-110" : "border-transparent hover:border-[var(--color-border-strong)]"}`}
                      style={{ backgroundColor: color.hex }}>
                      {selectedColor === color.id && (
                        <div className="absolute inset-0 rounded-full ring-1 ring-[var(--color-navy)] ring-offset-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide">Case size</p>
                  <button className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer">Size guide</button>
                </div>
                <div className="flex items-center gap-2">
                  {PRODUCT.sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => size.available && setSelectedSize(size.id)}
                      disabled={!size.available}
                      className={`relative px-4 py-2 text-xs font-[500] rounded-sm border transition-all cursor-pointer ${
                        !size.available
                          ? "border-[var(--color-border-subtle)] text-[var(--color-ink-disabled)] cursor-not-allowed line-through"
                          : selectedSize === size.id
                          ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                          : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)]"
                      }`}>
                      {size.label}
                      {!size.available && (
                        <span className="absolute -top-px -right-px -bottom-px -left-px rounded-sm overflow-hidden pointer-events-none">
                          <span className="absolute inset-0 border border-[var(--color-border-subtle)] rounded-sm" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-2">Quantity</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-[var(--color-border)] rounded-sm overflow-hidden">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors cursor-pointer">
                      −
                    </button>
                    <span className="w-10 text-center font-[var(--font-mono)] text-sm text-[var(--color-ink)] select-none">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(PRODUCT.stock, q + 1))}
                      disabled={qty >= PRODUCT.stock}
                      className="w-9 h-9 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors cursor-pointer">
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
                    <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-green)]">{PRODUCT.stock} in stock</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <button
                  onClick={handleAddToCart}
                  className={`py-3 text-sm font-[500] rounded-sm transition-colors cursor-pointer ${
                    cartAdded
                      ? "bg-[var(--color-green)] text-white"
                      : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
                  }`}>
                  {cartAdded ? "✓ Added to cart" : "Add to cart"}
                </button>
                <button
                  onClick={() => setInWishlist(w => !w)}
                  className={`w-12 flex items-center justify-center rounded-sm border transition-colors cursor-pointer ${
                    inWishlist
                      ? "border-[var(--color-red)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                      : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
                  }`}
                  aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <path d="M9 15s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9-1 0-2 0-2 0z" />
                  </svg>
                </button>
              </div>

              <button className="w-full py-3 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-amber-hover)] transition-colors cursor-pointer">
                Buy Now
              </button>
            </div>

            {/* Features */}
            <div className="border-t border-[var(--color-border-subtle)] pt-4">
              <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-3">Highlights</p>
              <ul className="space-y-1.5">
                {PRODUCT.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-ink-secondary)]">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Seller store link */}
            <div className="border border-[var(--color-border)] rounded-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                <span className="text-white font-[var(--font-display)] text-base">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-[600] text-[var(--color-ink)]">{PRODUCT.seller.name}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{PRODUCT.seller.location} · {PRODUCT.seller.reviews} reviews</p>
              </div>
              <button className="text-xs font-[500] px-3 py-1.5 border border-[var(--color-navy)] text-[var(--color-navy)] rounded-sm hover:bg-[var(--color-navy)] hover:text-white transition-colors cursor-pointer whitespace-nowrap">
                Visit Store →
              </button>
            </div>

            {/* Delivery + returns */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🚚", title: "Standard delivery", desc: "3–5 business days" },
                { icon: "↩", title: "7-day returns", desc: "Hassle-free returns" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-2.5 p-3 bg-[var(--color-surface)] rounded-sm border border-[var(--color-border-subtle)]">
                  <span className="text-base shrink-0">{icon}</span>
                  <div>
                    <p className="text-xs font-[600] text-[var(--color-ink)]">{title}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
