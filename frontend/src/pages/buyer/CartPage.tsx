import { useState } from "react";

type CartItem = {
  id: string;
  product: string;
  seller: string;
  sellerSlug: string;
  variant: string;
  image: string;
  qty: number;
  price: number;
  stock: number;
  savedForLater?: boolean;
};

type CartSeller = {
  slug: string;
  name: string;
  rating: number;
  freeShippingThreshold: number;
  shippingFee: number;
  items: CartItem[];
};

const INITIAL_SELLERS: CartSeller[] = [
  {
    slug: "atelier-manila",
    name: "Atelier Manila",
    rating: 4.9,
    freeShippingThreshold: 2000,
    shippingFee: 120,
    items: [
      {
        id: "c1",
        product: "Minimalist Chronograph Watch",
        seller: "Atelier Manila",
        sellerSlug: "atelier-manila",
        variant: "Silver / Black dial",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop&auto=format",
        qty: 1,
        price: 4200,
        stock: 5,
      },
      {
        id: "c2",
        product: "Genuine Leather Strap — 20mm",
        seller: "Atelier Manila",
        sellerSlug: "atelier-manila",
        variant: "Tan / Silver buckle",
        image: "https://images.unsplash.com/photo-1617077644557-64be144aa306?w=200&h=200&fit=crop&auto=format",
        qty: 2,
        price: 580,
        stock: 12,
      },
    ],
  },
  {
    slug: "verde-botanics",
    name: "Verde Botanics",
    rating: 4.7,
    freeShippingThreshold: 1500,
    shippingFee: 80,
    items: [
      {
        id: "c3",
        product: "Natural Botanical Skincare Set",
        seller: "Verde Botanics",
        sellerSlug: "verde-botanics",
        variant: "Dry skin / Lavender",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&auto=format",
        qty: 1,
        price: 1200,
        stock: 8,
      },
    ],
  },
];

const SAVED_ITEMS: CartItem[] = [
  {
    id: "s1",
    product: "Hand-thrown Ceramic Mug",
    seller: "Clay & Co.",
    sellerSlug: "clay-co",
    variant: "Sage / 300ml",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=200&h=200&fit=crop&auto=format",
    qty: 1,
    price: 480,
    stock: 3,
    savedForLater: true,
  },
];

function QuantityStepper({ qty, max, onChange }: { qty: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center border border-[var(--color-border)] rounded-sm overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        disabled={qty <= 1}
        className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors cursor-pointer text-sm">
        −
      </button>
      <span className="w-8 text-center font-[var(--font-mono)] text-[12px] text-[var(--color-ink)] select-none">{qty}</span>
      <button
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={qty >= max}
        className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors cursor-pointer text-sm">
        +
      </button>
    </div>
  );
}

function DeliveryInfo({ seller, subtotal }: { seller: CartSeller; subtotal: number }) {
  const freeShipping = subtotal >= seller.freeShippingThreshold;
  const remaining = seller.freeShippingThreshold - subtotal;

  return (
    <div className="mt-3 px-3 py-2.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
      <div className="flex items-start gap-2">
        <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={`shrink-0 mt-0.5 ${freeShipping ? "text-[var(--color-green)]" : "text-[var(--color-ink-muted)]"}`}>
          <path d="M2 8h10V4H2v4zM12 8l4 2v4h-2M4 14a2 2 0 100-4 2 2 0 000 4zM14 14a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
        {freeShipping ? (
          <p className="text-xs text-[var(--color-green)] font-[500]">Free standard delivery from {seller.name}</p>
        ) : (
          <p className="text-xs text-[var(--color-ink-muted)]">
            Add <span className="font-[600] text-[var(--color-ink)]">₱{remaining.toLocaleString()}</span> more for free delivery · Standard: ₱{seller.shippingFee}
          </p>
        )}
      </div>
      {!freeShipping && (
        <div className="mt-1.5 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-amber)] rounded-full transition-all"
            style={{ width: `${Math.min(100, (subtotal / seller.freeShippingThreshold) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  const [sellers, setSellers] = useState<CartSeller[]>(INITIAL_SELLERS);
  const [saved, setSaved] = useState<CartItem[]>(SAVED_ITEMS);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const updateQty = (sellerId: string, itemId: string, qty: number) => {
    setSellers(s => s.map(sel => sel.slug === sellerId
      ? { ...sel, items: sel.items.map(it => it.id === itemId ? { ...it, qty } : it) }
      : sel
    ));
  };

  const removeItem = (sellerId: string, itemId: string) => {
    setRemovedIds(s => new Set(s).add(itemId));
    setSellers(s => s.map(sel => sel.slug === sellerId
      ? { ...sel, items: sel.items.filter(it => it.id !== itemId) }
      : sel
    ).filter(sel => sel.items.length > 0));
  };

  const saveForLater = (sellerId: string, item: CartItem) => {
    removeItem(sellerId, item.id);
    setSaved(s => [...s, { ...item, savedForLater: true }]);
  };

  const moveToCart = (item: CartItem) => {
    setSaved(s => s.filter(i => i.id !== item.id));
    const sellerMatch = sellers.find(s => s.slug === item.sellerSlug);
    if (sellerMatch) {
      setSellers(s => s.map(sel => sel.slug === item.sellerSlug
        ? { ...sel, items: [...sel.items, item] }
        : sel
      ));
    } else {
      setSellers(s => [...s, {
        slug: item.sellerSlug,
        name: item.seller,
        rating: 4.8,
        freeShippingThreshold: 1500,
        shippingFee: 100,
        items: [item],
      }]);
    }
  };

  const removeSaved = (id: string) => setSaved(s => s.filter(i => i.id !== id));

  const sellerSubtotals = sellers.map(sel => ({
    slug: sel.slug,
    subtotal: sel.items.reduce((sum, it) => sum + it.price * it.qty, 0),
    shipping: sel.items.reduce((sum, it) => sum + it.price * it.qty, 0) >= sel.freeShippingThreshold ? 0 : sel.shippingFee,
  }));

  const merchandise = sellerSubtotals.reduce((sum, s) => sum + s.subtotal, 0);
  const shipping = sellerSubtotals.reduce((sum, s) => sum + s.shipping, 0);
  const discount = promoApplied ? Math.round(merchandise * 0.1) : 0;
  const total = merchandise + shipping - discount;
  const totalItems = sellers.reduce((sum, sel) => sum + sel.items.reduce((s, it) => s + it.qty, 0), 0);

  const isEmpty = sellers.length === 0;

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Shopping Cart</span>
          {!isEmpty && <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">({totalItems} {totalItems === 1 ? "item" : "items"})</span>}
        </div>

        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-6">Shopping Cart</h1>

        {isEmpty ? (
          /* Empty state */
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-16 text-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mx-auto mb-4 text-[var(--color-ink-disabled)]">
              <path d="M6 8h4l5.5 22h19L39 16H14" />
              <circle cx="19" cy="38" r="2.5" />
              <circle cx="33" cy="38" r="2.5" />
            </svg>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Your cart is empty</p>
            <p className="text-sm text-[var(--color-ink-muted)] mb-6">Start adding products from your favourite sellers.</p>
            <button className="px-6 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

            {/* ── LEFT: Cart items ─────────────────────────────── */}
            <div className="space-y-5">
              {sellers.map(seller => {
                const sellerData = sellerSubtotals.find(s => s.slug === seller.slug)!;
                return (
                  <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                    {/* Seller header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                        <span className="text-white font-[var(--font-display)] text-xs">{seller.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <button className="text-sm font-[600] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
                          {seller.name}
                        </button>
                        <div className="flex items-center gap-1 mt-0.5">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--color-amber)"><path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" /></svg>
                          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{seller.rating}</span>
                          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">· Visit store →</span>
                        </div>
                      </div>
                      <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">
                        Subtotal: <span className="text-[var(--color-ink)] font-[600]">₱{sellerData.subtotal.toLocaleString()}</span>
                      </span>
                    </div>

                    {/* Items */}
                    {seller.items.map((item, idx) => (
                      <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                        {/* Image */}
                        <div className="w-20 h-20 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                          <img src={item.image} alt={item.product} className="w-full h-full object-cover" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button className="text-sm font-[500] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors text-left leading-snug line-clamp-2">
                                {item.product}
                              </button>
                              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{item.variant}</p>
                              {item.stock <= 3 && (
                                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-red)] mt-1">Only {item.stock} left in stock</p>
                              )}
                            </div>
                            <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">
                              ₱{(item.price * item.qty).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <QuantityStepper qty={item.qty} max={item.stock} onChange={qty => updateQty(seller.slug, item.id, qty)} />
                            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">₱{item.price.toLocaleString()} ea.</span>
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={() => saveForLater(seller.slug, item)}
                                className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer transition-colors whitespace-nowrap">
                                Save for later
                              </button>
                              <span className="text-[var(--color-border-strong)]">·</span>
                              <button
                                onClick={() => removeItem(seller.slug, item.id)}
                                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer transition-colors">
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Delivery info per seller */}
                    <div className="px-5 pb-4">
                      <DeliveryInfo seller={seller} subtotal={sellerData.subtotal} />
                    </div>
                  </div>
                );
              })}

              {/* Saved for later */}
              {saved.length > 0 && (
                <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <h3 className="text-sm font-[600] text-[var(--color-ink)]">Saved for Later ({saved.length})</h3>
                  </div>
                  {saved.map((item, idx) => (
                    <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                      <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                        <img src={item.image} alt={item.product} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{item.product}</p>
                            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{item.seller} · {item.variant}</p>
                          </div>
                          <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">₱{item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => moveToCart(item)}
                            className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer">
                            Move to cart
                          </button>
                          <span className="text-[var(--color-border-strong)]">·</span>
                          <button
                            onClick={() => removeSaved(item.id)}
                            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Order summary ─────────────────────────── */}
            <div className="space-y-4">
              <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden sticky top-4">
                <div className="px-5 py-4 border-b border-[var(--color-border)]">
                  <h3 className="text-sm font-[600] text-[var(--color-ink)]">Order Summary</h3>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Per-seller breakdown */}
                  {sellerSubtotals.map(s => {
                    const seller = sellers.find(sel => sel.slug === s.slug)!;
                    return (
                      <div key={s.slug}>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1">{seller.name}</p>
                        <div className="flex justify-between text-xs text-[var(--color-ink)]">
                          <span>Subtotal</span>
                          <span>₱{s.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--color-ink-muted)]">Shipping</span>
                          <span className={s.shipping === 0 ? "text-[var(--color-green)] font-[500]" : "text-[var(--color-ink)]"}>
                            {s.shipping === 0 ? "Free" : `₱${s.shipping}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t border-[var(--color-border-subtle)] pt-3 space-y-2">
                    <div className="flex justify-between text-xs text-[var(--color-ink)]">
                      <span>Merchandise total</span>
                      <span>₱{merchandise.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-ink)]">
                      <span>Shipping total</span>
                      <span>{shipping === 0 ? <span className="text-[var(--color-green)] font-[500]">Free</span> : `₱${shipping}`}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-xs text-[var(--color-green)]">
                        <span>Promo WELCOME10</span>
                        <span>−₱{discount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-[600] text-[var(--color-ink)]">Total</span>
                      <div className="text-right">
                        <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">₱{total.toLocaleString()}</p>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">VAT included</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promo code */}
                <div className="px-5 pb-4">
                  {promoApplied ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
                      <span className="text-xs text-[var(--color-green)] font-[500] flex-1">WELCOME10 applied — 10% off</span>
                      <button onClick={() => setPromoApplied(false)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">×</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Promo code"
                        className="flex-1 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] font-[var(--font-mono)]"
                      />
                      <button
                        onClick={() => { if (promoCode === "WELCOME10") setPromoApplied(true); }}
                        className="text-xs px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] rounded-sm hover:bg-[var(--color-border)] cursor-pointer transition-colors whitespace-nowrap">
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="px-5 pb-5 space-y-2">
                  <button className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
                    Proceed to Checkout
                  </button>
                  <button className="w-full py-2.5 bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-[var(--color-amber)] text-sm font-[500] rounded-sm hover:bg-[var(--color-amber)] hover:text-white transition-colors cursor-pointer">
                    Continue Shopping
                  </button>
                </div>

                {/* Trust badges */}
                <div className="border-t border-[var(--color-border)] px-5 py-4 grid grid-cols-3 gap-2">
                  {[
                    { icon: "🔒", label: "Secure checkout" },
                    { icon: "↩", label: "Easy returns" },
                    { icon: "✓", label: "Buyer protection" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1 text-center">
                      <span className="text-base">{icon}</span>
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
