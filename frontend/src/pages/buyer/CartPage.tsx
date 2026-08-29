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
import { useToast, type ToastInput } from "../../components/ToastProvider";
import { mapErrorToMessage } from "../../utils/errorMapper";

const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

function ProductThumbnail({ item }: { item: CartItem }) {
  return (
    <div className="w-20 h-20 min-w-20 sm:w-24 sm:h-24 sm:min-w-24 bg-[#f5f5f5] rounded-[6px] overflow-hidden shrink-0">
      <img
        src={item.image || PRODUCT_PLACEHOLDER}
        alt={item.product_name ?? "Product"}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = PRODUCT_PLACEHOLDER;
        }}
        className="block w-full h-full object-contain"
      />
    </div>
  );
}

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
  const { showToast } = useToast();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number> | null>(null);

  const applyCartResponse = (data: CartData) => {
    const activeIds = new Set(data.items.map((item) => item.id));
    setCart(data);
    setPromoCode(data.promo_code ?? "");
    setSelectedItemIds((current) => current === null
      ? activeIds
      : new Set([...current].filter((id) => activeIds.has(id))));
  };

  const loadCart = async () => {
    setLoading(true);
    try {
      const response = await fetchCart();
      applyCartResponse(response.data);
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
  const selectedIds = selectedItemIds ?? new Set<number>();
  const selectedSellers = useMemo(() => sellers.map((seller) => {
    const items = seller.items.filter((item) => selectedIds.has(item.id));
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    return {
      ...seller,
      items,
      subtotal,
      shipping: items.length > 0 && subtotal < seller.freeShippingThreshold ? seller.shippingFee : 0,
    };
  }).filter((seller) => seller.items.length > 0), [sellers, selectedItemIds]);
  const allSelected = cart !== null && cart.items.length > 0 && selectedIds.size === cart.items.length;
  const selectedCount = selectedIds.size;
  const selectedSubtotal = selectedSellers.reduce((sum, seller) => sum + seller.subtotal, 0);
  const selectedShipping = selectedSellers.reduce((sum, seller) => sum + seller.shipping, 0);
  const selectedDiscount = cart?.promo_code === "WELCOME10" ? Math.round(selectedSubtotal * 10) / 100 : 0;
  const selectedTotal = Math.max(0, selectedSubtotal + selectedShipping - selectedDiscount);

  const totalItems = useMemo(
    () => sellers.reduce((sum, seller) => sum + seller.items.reduce((count, item) => count + item.quantity, 0), 0),
    [sellers]
  );

  const handleItemAction = async (
    itemId: number,
    action: () => Promise<{ data: CartData }>,
    successToast: ToastInput,
  ) => {
    setActionBusyId(itemId);
    try {
      const response = await action();
      applyCartResponse(response.data);
      setError(null);
      showToast(successToast);
    } catch (err) {
      const message = mapErrorToMessage(err, { context: "cart", fallback: "We couldn't update your cart. Please try again.", log: false });
      setError(message);
      showToast({ kind: "error", title: "Could not update cart", error: err, errorContext: "cart" });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleApplyPromo = async () => {
    setPromoBusy(true);
    try {
      const response = await updateCartPromo({ promo_code: promoCode });
      applyCartResponse(response.data);
      setError(null);
      showToast({ kind: "success", title: "Promo applied", message: `${response.data.promo_code} was applied to your cart.` });
    } catch (err) {
      const message = mapErrorToMessage(err, { context: "cart", fallback: "We couldn't apply that promo code. Please try again.", log: false });
      setError(message);
      showToast({ kind: "error", title: "Could not apply promo", error: err, errorContext: "cart", fallbackMessage: message });
    } finally {
      setPromoBusy(false);
    }
  };

  const handleClearPromo = async () => {
    setPromoBusy(true);
    try {
      const response = await updateCartPromo({ promo_code: null });
      applyCartResponse(response.data);
      setError(null);
      showToast({ kind: "success", title: "Promo removed", message: "The promo code was removed from your cart." });
    } catch (err) {
      const message = mapErrorToMessage(err, { context: "cart", fallback: "We couldn't remove that promo code. Please try again.", log: false });
      setError(message);
      showToast({ kind: "error", title: "Could not remove promo", error: err, errorContext: "cart", fallbackMessage: message });
    } finally {
      setPromoBusy(false);
    }
  };

  const isEmpty = sellers.length === 0;

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
              <label className="flex items-center gap-3 bg-white border border-[var(--color-border)] rounded-sm px-5 py-3.5 text-sm font-[500] text-[var(--color-ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setSelectedItemIds(event.target.checked ? new Set(cart?.items.map((item) => item.id) ?? []) : new Set())}
                  className="h-4 w-4 accent-[var(--color-navy)]"
                />
                Select all products ({cart?.items.length ?? 0})
              </label>
              {sellers.map((seller) => (
                <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
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
                    <span className="w-full sm:w-auto sm:ml-auto font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] whitespace-nowrap">
                      Subtotal: <span className="text-[var(--color-ink)] font-[600]">PHP {seller.subtotal.toLocaleString()}</span>
                    </span>
                  </div>

                  {seller.items.map((item, idx) => (
                    <div key={item.id} className={`flex gap-3 sm:gap-4 px-3 sm:px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.product_name ?? "product"}`}
                        checked={selectedIds.has(item.id)}
                        onChange={(event) => setSelectedItemIds((current) => {
                          const next = new Set(current ?? []);
                          if (event.target.checked) next.add(item.id); else next.delete(item.id);
                          return next;
                        })}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-navy)]"
                      />
                      <ProductThumbnail item={item} />

                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_max-content] items-start gap-2 md:gap-3">
                          <div className="min-w-0">
                            <button onClick={() => navigate(`/p/${item.product_slug}`)} className="text-sm font-[500] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors text-left leading-snug line-clamp-2">
                              {item.product_name}
                            </button>
                            {item.variant_name && <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{item.variant_name}</p>}
                            {item.stock <= 3 && (
                              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-red)] mt-1">Only {item.stock} left in stock</p>
                            )}
                          </div>
                          <p className="text-sm font-[600] text-[var(--color-ink)] whitespace-nowrap md:text-right">
                            PHP {(item.unit_price * item.quantity).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <QuantityStepper
                            qty={item.quantity}
                            max={item.stock}
                            disabled={actionBusyId === item.id}
                            onChange={(qty) => void handleItemAction(
                              item.id,
                              () => updateCartItem(item.id, { quantity: qty }),
                              { kind: "cart", title: "Cart updated", message: `${item.product_name ?? "Item"} quantity is now ${qty}.` },
                            )}
                          />
                          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">PHP {item.unit_price.toLocaleString()} ea.{item.original_unit_price !== null && <><span className="ml-1 line-through">PHP {item.original_unit_price.toLocaleString()}</span>{item.pricing_source === "promotion" && <span className="ml-1 text-[var(--color-red)]">DEAL</span>}</>}</span>
                          <div className="w-full sm:w-auto flex items-center gap-2 sm:ml-auto">
                            <button
                              onClick={() => void handleItemAction(
                                item.id,
                                () => removeCartItem(item.id),
                                { kind: "cart", title: "Removed from cart", message: `${item.product_name ?? "Item"} was removed.` },
                              )}
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
                    {seller.items.some((item) => selectedIds.has(item.id)) && (
                      <DeliveryInfo seller={seller} subtotal={seller.items.filter((item) => selectedIds.has(item.id)).reduce((sum, item) => sum + item.line_total, 0)} />
                    )}
                  </div>
                </div>
              ))}

            </div>

            <div className="space-y-4">
              <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden sticky top-4">
                <div className="px-5 py-4 border-b border-[var(--color-border)]">
                  <h3 className="text-sm font-[600] text-[var(--color-ink)]">Order Summary</h3>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {selectedSellers.map((seller) => (
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
                      <span>PHP {selectedSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-ink)]">
                      <span>Shipping total</span>
                      <span>{selectedShipping === 0 ? <span className="text-[var(--color-green)] font-[500]">Free</span> : `PHP ${selectedShipping.toLocaleString()}`}</span>
                    </div>
                    {selectedDiscount > 0 && (
                      <div className="flex justify-between text-xs text-[var(--color-green)]">
                        <span>Promo {cart?.promo_code}</span>
                        <span>-PHP {selectedDiscount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-[600] text-[var(--color-ink)]">Total</span>
                      <div className="text-right">
                        <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">PHP {selectedTotal.toLocaleString()}</p>
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
                    onClick={() => navigate(`/checkout?items=${[...selectedIds].join(",")}`)}
                    disabled={selectedCount === 0}
                    className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    Checkout ({selectedCount})
                  </button>
                  {selectedCount === 0 && <p className="text-xs text-[var(--color-ink-muted)] text-center">Select at least one product to continue.</p>}
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
