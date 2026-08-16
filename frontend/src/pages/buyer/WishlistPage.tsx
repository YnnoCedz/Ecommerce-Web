import { useState } from "react";

type WishlistItem = {
  id: string;
  product: string;
  seller: string;
  sellerSlug: string;
  price: number;
  originalPrice?: number;
  image: string;
  inStock: boolean;
  stockCount?: number;
  rating: number;
  reviewCount: number;
  dateAdded: string;
};

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: "w1",
    product: "Minimalist Chronograph Watch",
    seller: "Atelier Manila",
    sellerSlug: "atelier-manila",
    price: 4200,
    originalPrice: 5500,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format",
    inStock: true,
    rating: 4.8,
    reviewCount: 142,
    dateAdded: "Aug 10, 2026",
  },
  {
    id: "w2",
    product: "Hand-thrown Ceramic Mug Set",
    seller: "Clay & Co.",
    sellerSlug: "clay-co",
    price: 960,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop&auto=format",
    inStock: true,
    stockCount: 3,
    rating: 4.9,
    reviewCount: 87,
    dateAdded: "Aug 8, 2026",
  },
  {
    id: "w3",
    product: "Linen Throw Blanket — Natural",
    seller: "Habi Textiles",
    sellerSlug: "habi-textiles",
    price: 1800,
    image: "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=400&h=400&fit=crop&auto=format",
    inStock: false,
    rating: 4.6,
    reviewCount: 53,
    dateAdded: "Aug 3, 2026",
  },
  {
    id: "w4",
    product: "Natural Botanical Skincare Set",
    seller: "Verde Botanics",
    sellerSlug: "verde-botanics",
    price: 1200,
    originalPrice: 1600,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&auto=format",
    inStock: true,
    rating: 4.7,
    reviewCount: 211,
    dateAdded: "Jul 28, 2026",
  },
  {
    id: "w5",
    product: "Rattan Accent Chair",
    seller: "Form & Weave",
    sellerSlug: "form-weave",
    price: 8500,
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=400&fit=crop&auto=format",
    inStock: true,
    rating: 4.5,
    reviewCount: 28,
    dateAdded: "Jul 20, 2026",
  },
  {
    id: "w6",
    product: "Pressed Flower Art Print — A3",
    seller: "Bloom Studio",
    sellerSlug: "bloom-studio",
    price: 650,
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=400&fit=crop&auto=format",
    inStock: false,
    rating: 5.0,
    reviewCount: 44,
    dateAdded: "Jul 15, 2026",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill={i <= Math.round(rating) ? "var(--color-amber)" : "var(--color-border)"}>
          <path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" />
        </svg>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>(INITIAL_WISHLIST);
  const [cartAdded, setCartAdded] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"date" | "price-low" | "price-high" | "rating">("date");

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const addToCart = (id: string) => {
    setCartAdded(prev => new Set(prev).add(id));
    setTimeout(() => setCartAdded(prev => { const next = new Set(prev); next.delete(id); return next; }), 2000);
  };

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Wishlist</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">My Wishlist</h1>
            {items.length > 0 && (
              <p className="text-sm text-[var(--color-ink-muted)] mt-1">{items.length} saved {items.length === 1 ? "item" : "items"}</p>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Sort:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs bg-white border border-[var(--color-border)] rounded-sm px-2.5 py-1.5 text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] cursor-pointer">
                <option value="date">Date added</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-16 text-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mx-auto mb-4 text-[var(--color-ink-disabled)]">
              <path d="M24 40s-17-10-17-22a10 10 0 0120 0 10 10 0 0120 0c0 12-17 22-17 22-1 0-5 0-6 0z" />
            </svg>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Your wishlist is empty</p>
            <p className="text-sm text-[var(--color-ink-muted)] mb-6">Save products you love and come back to them anytime.</p>
            <button className="px-6 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {sorted.map(item => {
              const added = cartAdded.has(item.id);
              const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : null;
              return (
                <div key={item.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden group">
                  {/* Image */}
                  <div className="relative bg-[var(--color-surface)] aspect-square overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.product}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {!item.inStock && (
                        <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-ink)] text-white rounded">Out of stock</span>
                      )}
                      {discount && item.inStock && (
                        <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-red)] text-white rounded">−{discount}%</span>
                      )}
                      {item.stockCount && item.stockCount <= 3 && item.inStock && (
                        <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning-border)] rounded">
                          {item.stockCount} left
                        </span>
                      )}
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[var(--color-red)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer shadow-sm"
                      aria-label="Remove from wishlist">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2 2l10 10M12 2L2 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <button className="text-sm font-[500] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors text-left leading-snug line-clamp-2 mb-1 w-full">
                      {item.product}
                    </button>
                    <button className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer block mb-2">
                      {item.seller}
                    </button>

                    <div className="flex items-center gap-1.5 mb-2">
                      <StarRating rating={item.rating} />
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">({item.reviewCount})</span>
                    </div>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-sm font-[600] text-[var(--color-ink)]">₱{item.price.toLocaleString()}</span>
                      {item.originalPrice && (
                        <span className="text-xs text-[var(--color-ink-disabled)] line-through">₱{item.originalPrice.toLocaleString()}</span>
                      )}
                    </div>

                    {/* Availability */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.inStock ? "bg-[var(--color-green)]" : "bg-[var(--color-border-strong)]"}`} />
                      <span className={`font-[var(--font-mono)] text-[10px] ${item.inStock ? "text-[var(--color-green)]" : "text-[var(--color-ink-muted)]"}`}>
                        {item.inStock ? (item.stockCount ? `${item.stockCount} in stock` : "In stock") : "Out of stock"}
                      </span>
                    </div>

                    <button
                      onClick={() => item.inStock && addToCart(item.id)}
                      disabled={!item.inStock}
                      className={`w-full py-2 text-xs font-[500] rounded-sm transition-colors cursor-pointer ${
                        !item.inStock
                          ? "bg-[var(--color-surface)] text-[var(--color-ink-disabled)] cursor-not-allowed"
                          : added
                          ? "bg-[var(--color-green)] text-white"
                          : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
                      }`}>
                      {added ? "✓ Added to cart" : item.inStock ? "Add to cart" : "Notify me"}
                    </button>

                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] mt-2 text-center">Saved {item.dateAdded}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
