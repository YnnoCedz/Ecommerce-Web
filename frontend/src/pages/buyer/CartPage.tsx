import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  fetchCart,
  removeCartItem,
  updateCartItem,
  updateCartPromo,
  type CartData,
  type CartItem,
  type CartSellerGroup,
} from "../../api/cart";

function QuantityStepper({ qty, max, onChange, disabled = false }: { qty: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center border border-[var(--color-border)] rounded-sm overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        disabled={disabled || qty <= 1}
        className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors cursor-pointer text-sm">
        -
      </button>
      <span className="w-8 text-center font-[var(--font-mono)] text-[12px] text-[var(--color-ink)] select-none">{qty}</span>
      <button
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={disabled || qty >= max}
        className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors cursor-pointer text-sm">
        +
      </button>
    </div>
  );
}

function DeliveryInfo({ seller, subtotal }: { seller: CartSellerGroup; subtotal: number }) {
  const freeShipping = subtotal >= seller.freeShippingThreshold;
  const remaining = Math.max(0, seller.freeShippingThreshold - subtotal);

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
            Add <span className="font-[600] text-[var(--color-ink)]">PHP {remaining.toLocaleString()}</span> more for free delivery · Standard: PHP {seller.shippingFee}
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
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const loadCart = async () => {
    setLoading(true);
    try {
      const response = await fetchCart();
      setCart(response.data);
      setPromoCode(response.data.promo_code ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCart();
  }, []);

  const sellers = cart?.sellers ?? [];
  const savedItems = cart?.saved_items ?? [];

  const totalItems = useMemo(
    () => sellers.reduce((sum, seller) => sum + seller.items.reduce((count, item) => count + item.quantity, 0), 0),
    [sellers]
  );

  const handleItemAction = async (itemId: number, action: () => Promise<unknown>) => {
    setActionBusyId(itemId);
    try {
      await action();
      await loadCart();
    } finally {
      setActionBusyId(null);
    }
  };

  const handleApplyPromo = async () => {
    setPromoBusy(true);
    try {
      const response = await updateCartPromo({ promo_code: promoCode });
      setCart(response.data);
      setPromoCode(response.data.promo_code ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply promo code.");
    } finally {
      setPromoBusy(false);
    }
  };

  const handleClearPromo = async () => {
    setPromoBusy(true);
    try {
      const response = await updateCartPromo({ promo_code: null });
      setCart(response.data);
      setPromoCode("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove promo code.");
    } finally {
      setPromoBusy(false);
    }
  };

  const handleAddSavedToCart = async (item: CartItem) => {
    await handleItemAction(item.id, () =>
      updateCartItem(item.id, { saved_for_later: false, quantity: item.quantity })
    );
  };

  const isEmpty = sellers.length === 0 && savedItems.length === 0;

  if (loading) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-12 text-sm text-[var(--color-ink-muted)]">
          Loading your cart...
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="bg-[var(--color-ground)] min-h-full">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-12">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-6">
            <p className="text-sm text-[var(--color-red)] mb-3">{error}</p>
            <button onClick={loadCart} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate("/")} className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Shopping Cart</span>
          {!isEmpty && <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">({totalItems} {totalItems === 1 ? "item" : "items"})</span>}
        </div>

        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Shopping Cart</h1>
          <button onClick={() => navigate("/c/all")} className="text-sm text-[var(--color-navy)] hover:underline cursor-pointer">Continue shopping</button>
        </div>

        {error && (
          <div className="mb-5 bg-[var(--color-red-light)] border border-[var(--color-red-border)] text-[var(--color-red)] text-sm rounded-sm px-4 py-3">
            {error}
          </div>
        )}

        {isEmpty ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-16 text-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mx-auto mb-4 text-[var(--color-ink-disabled)]">
              <path d="M6 8h4l5.5 22h19L39 16H14" />
              <circle cx="19" cy="38" r="2.5" />
              <circle cx="33" cy="38" r="2.5" />
            </svg>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Your cart is empty</p>
            <p className="text-sm text-[var(--color-ink-muted)] mb-6">Start adding products from your favourite sellers.</p>
            <button onClick={() => navigate("/c/all")} className="px-6 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-5">
              {sellers.map((seller) => (
                <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                      <span className="text-white font-[var(--font-display)] text-xs">{seller.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => navigate(`/s/${seller.slug}`)} className="text-sm font-[600] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
                        {seller.name}
                      </button>
                      <div className="flex items-center gap-1 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--color-amber)"><path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" /></svg>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{seller.rating.toFixed(1)}</span>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">· Visit store →</span>
                      </div>
                    </div>
                    <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">
                      Subtotal: <span className="text-[var(--color-ink)] font-[600]">PHP {seller.subtotal.toLocaleString()}</span>
                    </span>
                  </div>

                  {seller.items.map((item, idx) => (
                    <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                      <div className="w-20 h-20 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                        <img src={item.image ?? ""} alt={item.product_name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button onClick={() => navigate(`/p/${item.product_slug}`)} className="text-sm font-[500] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors text-left leading-snug line-clamp-2">
                              {item.product_name}
                            </button>
                            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{item.variant_name ?? "Default"}</p>
                            {item.stock <= 3 && (
                              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-red)] mt-1">Only {item.stock} left in stock</p>
                            )}
                          </div>
                          <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">
                            PHP {(item.unit_price * item.quantity).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <QuantityStepper
                            qty={item.quantity}
                            max={item.stock}
                            disabled={actionBusyId === item.id}
                            onChange={(qty) => handleItemAction(item.id, () => updateCartItem(item.id, { quantity: qty }))}
                          />
                          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">PHP {item.unit_price.toLocaleString()} ea.</span>
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => handleItemAction(item.id, () => updateCartItem(item.id, { saved_for_later: true }))}
                              disabled={actionBusyId === item.id}
                              className="text-xs text-[var(--color-navy)] hover:underline disabled:opacity-50 cursor-pointer transition-colors whitespace-nowrap">
                              Save for later
                            </button>
                            <span className="text-[var(--color-border-strong)]">·</span>
                            <button
                              onClick={() => handleItemAction(item.id, () => removeCartItem(item.id))}
                              disabled={actionBusyId === item.id}
                              className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] disabled:opacity-50 cursor-pointer transition-colors">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="px-5 pb-4">
                    <DeliveryInfo seller={seller} subtotal={seller.subtotal} />
                  </div>
                </div>
              ))}

              {savedItems.length > 0 && (
                <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <h3 className="text-sm font-[600] text-[var(--color-ink)]">Saved for Later ({savedItems.length})</h3>
                  </div>
                  {savedItems.map((item, idx) => (
                    <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                      <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                        <img src={item.image ?? ""} alt={item.product_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{item.product_name}</p>
                            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{item.seller_name} · {item.variant_name ?? "Default"}</p>
                          </div>
                          <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">PHP {item.unit_price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleAddSavedToCart(item)}
                            disabled={actionBusyId === item.id}
                            className="text-xs font-[500] text-[var(--color-navy)] hover:underline disabled:opacity-50 cursor-pointer">
                            Move to cart
                          </button>
                          <span className="text-[var(--color-border-strong)]">·</span>
                          <button
                            onClick={() => handleItemAction(item.id, () => removeCartItem(item.id))}
                            disabled={actionBusyId === item.id}
                            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] disabled:opacity-50 cursor-pointer">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden sticky top-4">
                <div className="px-5 py-4 border-b border-[var(--color-border)]">
                  <h3 className="text-sm font-[600] text-[var(--color-ink)]">Order Summary</h3>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {sellers.map((seller) => (
                    <div key={seller.slug}>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1">{seller.name}</p>
                      <div className="flex justify-between text-xs text-[var(--color-ink)]">
                        <span>Subtotal</span>
                        <span>PHP {seller.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--color-ink-muted)]">Shipping</span>
                        <span className={seller.shipping === 0 ? "text-[var(--color-green)] font-[500]" : "text-[var(--color-ink)]"}>
                          {seller.shipping === 0 ? "Free" : `PHP ${seller.shipping.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-[var(--color-border-subtle)] pt-3 space-y-2">
                    <div className="flex justify-between text-xs text-[var(--color-ink)]">
                      <span>Merchandise total</span>
                      <span>PHP {(cart?.subtotal ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-ink)]">
                      <span>Shipping total</span>
                      <span>{(cart?.shipping_total ?? 0) === 0 ? <span className="text-[var(--color-green)] font-[500]">Free</span> : `PHP ${(cart?.shipping_total ?? 0).toLocaleString()}`}</span>
                    </div>
                    {(cart?.discount_total ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-[var(--color-green)]">
                        <span>Promo {cart?.promo_code}</span>
                        <span>-PHP {(cart?.discount_total ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-[600] text-[var(--color-ink)]">Total</span>
                      <div className="text-right">
                        <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">PHP {(cart?.grand_total ?? 0).toLocaleString()}</p>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">VAT included</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  {cart?.promo_code ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
                      <span className="text-xs text-[var(--color-green)] font-[500] flex-1">{cart.promo_code} applied</span>
                      <button onClick={handleClearPromo} disabled={promoBusy} className="text-[var(--color-green)] hover:opacity-70 disabled:opacity-50 cursor-pointer text-xs">x</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Promo code"
                        className="flex-1 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] font-[var(--font-mono)]"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={promoBusy}
                        className="text-xs px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] rounded-sm hover:bg-[var(--color-border)] disabled:opacity-50 cursor-pointer transition-colors whitespace-nowrap">
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5 space-y-2">
                  <button
                    onClick={() => navigate("/checkout")}
                    className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
                    Proceed to Checkout
                  </button>
                  <button
                    onClick={() => navigate("/c/all")}
                    className="w-full py-2.5 bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] text-[var(--color-amber)] text-sm font-[500] rounded-sm hover:bg-[var(--color-amber)] hover:text-white transition-colors cursor-pointer">
                    Continue Shopping
                  </button>
                </div>

                <div className="border-t border-[var(--color-border)] px-5 py-4 grid grid-cols-3 gap-2">
                  {[
                    { icon: "lock", label: "Secure checkout" },
                    { icon: "return", label: "Easy returns" },
                    { icon: "check", label: "Buyer protection" },
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
