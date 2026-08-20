import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { addCartItem } from "../../api/cart";
import { fetchWishlistItems, removeWishlistItem, type WishlistItemRecord } from "../../api/buyer";
import { useToast } from "../../components/ToastProvider";

type WishlistItem = {
  id: number;
  productId: number;
  product: string;
  seller: string;
  slug: string;
  price: number;
  image: string;
  inStock: boolean;
  dateAdded: string;
};

function mapWishlist(items: WishlistItemRecord[]): WishlistItem[] {
  return items
    .map((item) => {
      const product = item.product;
      if (!product) return null;

      const image = product.images?.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.file_path ?? "";
      const seller = product.seller?.trade_name ?? product.seller?.business_name ?? "Seller";

      return {
        id: item.id,
        productId: product.id,
        product: product.name,
        seller,
        slug: product.slug,
        price: product.sale_price ?? product.price,
        image,
        inStock: product.status === "active" && product.stock_quantity > 0,
        dateAdded: item.added_at ? new Date(item.added_at).toLocaleDateString() : "Recently",
      };
    })
    .filter((item): item is WishlistItem => Boolean(item));
}

function currency(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

export default function WishlistPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "price-low" | "price-high">("date");
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchWishlistItems();
        if (!active) return;
        setItems(mapWishlist(response.data));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load your wishlist.");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return 0;
    });
  }, [items, sortBy]);

  const removeItem = async (item: WishlistItem) => {
    setBusyProductId(item.productId);
    setError(null);
    try {
      await removeWishlistItem(item.productId);
      setItems((current) => current.filter((entry) => entry.productId !== item.productId));
      showToast({ kind: "wishlist", title: "Removed from wishlist", message: `${item.product} was removed.` });
    } catch (err) {
      showToast({
        kind: "error",
        title: "Could not update wishlist",
        message: err instanceof Error ? err.message : "Unable to remove this wishlist item.",
      });
    } finally {
      setBusyProductId(null);
    }
  };

  const addToCart = async (item: WishlistItem) => {
    setBusyProductId(item.productId);
    setError(null);
    try {
      await addCartItem({ product_id: item.productId, quantity: 1 });
      await removeWishlistItem(item.productId);
      setItems((current) => current.filter((entry) => entry.productId !== item.productId));
      showToast({ kind: "cart", title: "Moved to cart", message: `${item.product} was added to your cart.` });
      navigate("/cart");
    } catch (err) {
      showToast({
        kind: "error",
        title: "Could not move item",
        message: err instanceof Error ? err.message : "Unable to move this item to your cart.",
      });
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate("/")} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Wishlist</span>
        </div>

        {error && (
          <div className="mb-4 bg-[var(--color-red-light)] border border-[var(--color-red-border)] text-[var(--color-red)] text-sm rounded-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">My Wishlist</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">{items.length} saved {items.length === 1 ? "item" : "items"}</p>
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
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-sm text-[var(--color-ink-muted)]">Loading wishlist...</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-16 text-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mx-auto mb-4 text-[var(--color-ink-disabled)]">
              <path d="M24 40s-17-10-17-22a10 10 0 0120 0 10 10 0 0120 0c0 12-17 22-17 22-1 0-5 0-6 0z" />
            </svg>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Your wishlist is empty</p>
            <p className="text-sm text-[var(--color-ink-muted)] mb-6">Save products from the live catalog to keep track of them here.</p>
            <button onClick={() => navigate("/search")} className="px-6 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((item) => (
              <article key={item.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden group text-left">
                <button type="button" onClick={() => navigate(`/p/${item.slug}`)} className="block w-full text-left">
                  <div className="relative bg-[var(--color-surface)] aspect-square overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.product} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : null}
                  {!item.inStock && (
                    <span className="absolute top-2 left-2 font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-ink)] text-white rounded">Out of stock</span>
                  )}
                  </div>
                  <div className="p-3 pb-2">
                  <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug line-clamp-2 mb-1">{item.product}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-1">{item.seller}</p>
                  <p className="text-sm font-[600] text-[var(--color-ink)]">{currency(item.price)}</p>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] mt-1">Saved {item.dateAdded}</p>
                  </div>
                </button>
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <button type="button" onClick={() => void addToCart(item)} disabled={!item.inStock || busyProductId === item.productId} className="py-2 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm disabled:opacity-50">
                    Add to cart
                  </button>
                  <button type="button" onClick={() => void removeItem(item)} disabled={busyProductId === item.productId} className="py-2 border border-[var(--color-border)] text-[var(--color-ink-muted)] text-xs font-[500] rounded-sm disabled:opacity-50">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
