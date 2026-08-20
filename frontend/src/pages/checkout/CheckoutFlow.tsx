import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { fetchCart, type CartData } from "../../api/cart";
import { fetchAccountAddresses, storeAccountAddress, submitCheckout, type BuyerAddress, type CheckoutResult } from "../../api/buyer";

type Step = 1 | 2 | 3 | 4;
type PaymentMethod = "cod";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: "cod", label: "Cash on Delivery", desc: "Pay when your order is delivered" },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function currency(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

export default function CheckoutFlow({ initialStep = 1 }: { initialStep?: Step }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(initialStep);
  const [cart, setCart] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cod");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [order, setOrder] = useState<CheckoutResult | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    province: "",
    postal_code: "",
    is_default: false,
  });

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [cartResponse, addressResponse] = await Promise.all([fetchCart(), fetchAccountAddresses()]);
        if (!active) return;

        setCart(cartResponse.data);
        setAddresses(addressResponse.data);
        setSelectedAddressId(addressResponse.data.find((address) => address.is_default)?.id ?? null);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load checkout data.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const selectedItemIds = useMemo(() => {
    const ids = (searchParams.get("items") ?? "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    return new Set(ids);
  }, [searchParams]);

  const lineItems = useMemo(() => (cart?.sellers ?? [])
    .map((seller) => {
      const items = selectedItemIds.size > 0
        ? seller.items.filter((item) => selectedItemIds.has(item.id))
        : seller.items;
      const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
      return {
        ...seller,
        items,
        subtotal,
        shipping: subtotal > 0 && subtotal < seller.freeShippingThreshold ? seller.shippingFee : 0,
      };
    })
    .filter((seller) => seller.items.length > 0), [cart, selectedItemIds]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, seller) => sum + seller.subtotal, 0);
    const shipping = lineItems.reduce((sum, seller) => sum + seller.shipping, 0);
    const discount = cart?.promo_code === "WELCOME10" ? Math.round(subtotal * 10) / 100 : 0;
    return { subtotal, shipping, discount, grandTotal: Math.max(0, subtotal + shipping - discount) };
  }, [cart?.promo_code, lineItems]);

  const itemCount = lineItems.reduce((sum, seller) => sum + seller.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  const saveAddress = async () => {
    setSubmitting(true);
    try {
      const response = await storeAccountAddress(newAddress);
      setAddresses((current) => [
        ...current.map((address) => response.data.is_default ? { ...address, is_default: false } : address),
        response.data,
      ]);
      setSelectedAddressId(response.data.id);
      setAddingAddress(false);
      setNotice("Address saved in the backend.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save address.");
    } finally {
      setSubmitting(false);
    }
  };

  const placeOrder = async () => {
    setSubmitting(true);
    try {
      if (!selectedAddressId) {
        setError("Select a delivery address before placing your order.");
        return;
      }

      const response = await submitCheckout({
        address_id: selectedAddressId,
        payment_method: selectedPayment,
        cart_item_ids: selectedItemIds.size > 0 ? [...selectedItemIds] : undefined,
      });
      setOrder(response.data);
      setNotice(response.message);
      setStep(4);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8 text-sm text-[var(--color-ink-muted)]">Loading checkout...</div>;
  }

  if (error && !cart) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-6">
          <p className="text-sm text-[var(--color-red)] mb-3">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if ((!cart || lineItems.length === 0) && !order) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-10 text-center">
          <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Your cart is empty</p>
          <p className="text-sm text-[var(--color-ink-muted)]">Add items in the backend cart first, then return here to check out.</p>
        </div>
      </div>
    );
  }

  if (step === 4 && order) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-8 text-center max-w-xl mx-auto">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Checkout status</p>
          <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">Order placed successfully</h2>
          <p className="text-sm text-[var(--color-ink-muted)] mb-5">
            Order <strong>{order.order_number}</strong> was saved. Payment remains pending until Cash on Delivery is completed.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="border border-[var(--color-border)] rounded-sm p-3 text-left">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">Items</p>
              <p className="text-sm font-[600] text-[var(--color-ink)]">{order.item_count}</p>
            </div>
            <div className="border border-[var(--color-border)] rounded-sm p-3 text-left">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">Total</p>
              <p className="text-sm font-[600] text-[var(--color-ink)]">{currency(order.grand_total)}</p>
            </div>
          </div>
          <button onClick={() => navigate(`/account/orders/${order.order_number}`)} className="mt-5 px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm">
            View order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">Cart</span>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">/</span>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Checkout</span>
        </div>

        {notice && (
          <div className="mb-5 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-green)]">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-5 bg-[var(--color-red-light)] border border-[var(--color-red-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-red)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            <SectionCard title="Cart review">
              <div className="space-y-4">
                {lineItems.map((seller) => (
                  <div key={seller.slug ?? seller.name} className="border border-[var(--color-border)] rounded-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <p className="text-sm font-[600] text-[var(--color-ink)]">{seller.name}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{seller.items.length} item(s)</p>
                    </div>
                    {seller.items.map((item) => (
                      <div key={item.id} className="flex gap-3 px-4 py-3 border-t border-[var(--color-border-subtle)] first:border-0">
                        <div className="w-14 h-14 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                          {item.image ? <img src={item.image} alt={item.product_name ?? ""} className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{item.product_name}</p>
                          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{item.variant_name ?? "Default"} × {item.quantity}</p>
                        </div>
                        <p className="text-sm font-[600] text-[var(--color-ink)]">{currency(item.line_total)}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Delivery address">
              <div className="space-y-3">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`w-full text-left p-4 rounded-sm border transition-colors ${selectedAddressId === address.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-[600] text-[var(--color-ink)]">{address.recipient_name}</span>
                      <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-ink-muted)]">{address.label}</span>
                      {address.is_default && <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-navy-surface)] text-[var(--color-navy)]">Default</span>}
                    </div>
                    <p className="text-sm text-[var(--color-ink-secondary)]">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                    <p className="text-sm text-[var(--color-ink-secondary)]">{address.city}, {address.province} {address.postal_code}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{address.phone}</p>
                  </button>
                ))}

                {addresses.length === 0 && !addingAddress && (
                  <p className="text-sm text-[var(--color-ink-muted)]">No saved address. Add one to continue.</p>
                )}

                {!addingAddress ? (
                  <button onClick={() => setAddingAddress(true)} className="w-full py-3 border border-dashed border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]">
                    Add new address
                  </button>
                ) : (
                  <div className="border border-[var(--color-border)] rounded-sm p-4 space-y-3">
                    <p className="text-sm font-[600] text-[var(--color-ink)]">New address</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Recipient name" value={newAddress.recipient_name} onChange={(e) => setNewAddress((current) => ({ ...current, recipient_name: e.target.value }))} />
                      <input className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Phone" value={newAddress.phone} onChange={(e) => setNewAddress((current) => ({ ...current, phone: e.target.value }))} />
                    </div>
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Label" value={newAddress.label} onChange={(e) => setNewAddress((current) => ({ ...current, label: e.target.value }))} />
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Address line 1" value={newAddress.line1} onChange={(e) => setNewAddress((current) => ({ ...current, line1: e.target.value }))} />
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Address line 2" value={newAddress.line2} onChange={(e) => setNewAddress((current) => ({ ...current, line2: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-3">
                      <input className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((current) => ({ ...current, city: e.target.value }))} />
                      <input className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Province" value={newAddress.province} onChange={(e) => setNewAddress((current) => ({ ...current, province: e.target.value }))} />
                      <input className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Postal code" value={newAddress.postal_code} onChange={(e) => setNewAddress((current) => ({ ...current, postal_code: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveAddress} disabled={submitting} className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm disabled:opacity-60">
                        Save address
                      </button>
                      <button onClick={() => setAddingAddress(false)} className="px-4 py-2 text-sm text-[var(--color-ink-muted)]">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Payment method">
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`w-full text-left p-4 rounded-sm border transition-colors ${selectedPayment === method.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
                    <p className="text-sm font-[600] text-[var(--color-ink)]">{method.label}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{method.desc}</p>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Order summary">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Items</span><span className="text-[var(--color-ink)]">{itemCount}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Merchandise</span><span className="text-[var(--color-ink)]">{currency(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Shipping</span><span className="text-[var(--color-ink)]">{totals.shipping === 0 ? "Free" : currency(totals.shipping)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Discount</span><span className="text-[var(--color-ink)]">-{currency(totals.discount)}</span></div>
                <div className="border-t border-[var(--color-border)] pt-3 flex justify-between font-[600]">
                  <span className="text-[var(--color-ink)]">Total</span>
                  <span className="text-[var(--color-ink)]">{currency(totals.grandTotal)}</span>
                </div>
              </div>
            </SectionCard>

            <button
              onClick={placeOrder}
              disabled={!selectedAddress || submitting}
              className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm disabled:opacity-60">
              {submitting ? "Placing order..." : "Place order"}
            </button>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Your price, inventory, address ownership, and seller totals are validated again by Maketo before the order is saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
