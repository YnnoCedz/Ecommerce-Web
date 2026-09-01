import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { fetchAccountAddresses, fetchCheckoutPreview, storeAccountAddress, submitCheckout, type BuyerAddress, type CheckoutPreview, type CheckoutResult } from "../../api/buyer";
import { useToast } from "../../components/ToastProvider";
import PhilippineAddressSelector, { EMPTY_PHILIPPINE_ADDRESS } from "../../components/PhilippineAddressSelector";
import PhilippinePhoneField from "../../components/PhilippinePhoneField";
import { useAuth } from "../../auth/AuthContext";

type Step = 1 | 2 | 3 | 4;
type PaymentMethod = "cod" | "gcash" | "maya" | "card";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: "cod", label: "Cash on Delivery", desc: "Pay when your order is delivered" },
  { id: "gcash", label: "GCash", desc: "Demo mobile-wallet transaction" },
  { id: "maya", label: "Maya", desc: "Demo mobile-wallet transaction" },
  { id: "card", label: "Card", desc: "Sandbox card transaction; no sensitive details are stored" },
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const selectedItemIds = useMemo(() => [...new Set((searchParams.get("items") ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0))], [searchParams]);
  const [step, setStep] = useState<Step>(initialStep);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cod");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [order, setOrder] = useState<CheckoutResult | null>(null);
  const [mobileNumber, setMobileNumber] = useState("+63");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    line1: "",
    line2: "",
    ...EMPTY_PHILIPPINE_ADDRESS,
    is_default: false,
  });

  useEffect(() => {
    if (user) setNewAddress((current) => ({ ...current, phone: current.phone || user.phone || user.mobile || "", recipient_name: current.recipient_name || user.name }));
  }, [user]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (selectedItemIds.length === 0) {
        setError("No products were selected for checkout.");
        setLoading(false);
        return;
      }

      try {
        const [previewResponse, addressResponse] = await Promise.all([fetchCheckoutPreview(selectedItemIds), fetchAccountAddresses()]);
        if (!active) return;

        setPreview(previewResponse.data);
        setVoucherInput(previewResponse.data.promo_code ?? "");
        setAddresses(addressResponse.data);
        setSelectedAddressId(addressResponse.data.find((address) => address.is_default)?.id ?? addressResponse.data[0]?.id ?? null);
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
  }, [searchParams]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const lineItems = preview?.sellers ?? [];
  const totals = {
    merchandise: preview?.merchandise_total ?? preview?.subtotal ?? 0,
    productPromotionDiscount: preview?.product_promotion_discount_total ?? 0,
    voucherDiscount: preview?.voucher_discount_total ?? preview?.discount_total ?? 0,
    shipping: preview?.shipping_total ?? 0,
    grandTotal: preview?.grand_total ?? 0,
  };
  const itemCount = preview?.item_count ?? 0;

  const recalculateVoucher = async (voucherCode: string | null) => {
    if (applyingVoucher || selectedItemIds.length === 0) return;
    setApplyingVoucher(true);
    setVoucherError(null);
    try {
      const response = await fetchCheckoutPreview(selectedItemIds, voucherCode);
      setPreview(response.data);
      setVoucherInput(response.data.promo_code ?? "");
    } catch (cause) {
      setVoucherError(cause instanceof Error ? cause.message : "Unable to apply this voucher.");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const saveAddress = async () => {
    setSubmitting(true);
    try {
      const response = await storeAccountAddress({
        label: newAddress.label, recipient_name: newAddress.recipient_name, phone: newAddress.phone,
        line1: newAddress.line1, line2: newAddress.line2 || null,
        region_code: newAddress.region_code, province_code: newAddress.province_code || null,
        city_code: newAddress.city_code, barangay_code: newAddress.barangay_code,
        postal_code: newAddress.postal_code, is_default: newAddress.is_default,
      });
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

      if ((selectedPayment === "gcash" || selectedPayment === "maya") && !/^\+639\d{9}$/.test(mobileNumber)) {
        setError("Enter a valid Philippine mobile number for the demo wallet payment.");
        return;
      }
      const cardDigits = cardNumber.replace(/\D/g, "");
      if (selectedPayment === "card" && (!cardholderName.trim() || cardDigits.length !== 16 || !/^\d{2}\/\d{2}$/.test(cardExpiry) || !/^\d{3,4}$/.test(cardCvv))) {
        setError("Complete the demo card details using a 16-digit card number, MM/YY expiry, and CVV.");
        return;
      }

      const response = await submitCheckout({
        address_id: selectedAddressId,
        payment_method: selectedPayment,
        cart_item_ids: preview?.cart_item_ids ?? [],
        voucher_code: preview?.promo_code ?? null,
        payment_details: selectedPayment === "card" ? {
          cardholder_name: cardholderName.trim(),
          card_last4: cardDigits.slice(-4),
          card_brand: cardDigits.startsWith("4") ? "Visa" : cardDigits.startsWith("5") ? "Mastercard" : "Demo card",
        } : selectedPayment === "gcash" || selectedPayment === "maya" ? { mobile_number: mobileNumber } : undefined,
      });
      setOrder(response.data);
      setNotice(response.message);
      setStep(4);
      setError(null);
      showToast(response.data.payment_status === "failed"
        ? { kind: "error", title: "Payment not completed", message: "Payment couldn't be completed." }
        : { title: response.data.payment_status === "paid" ? "Demo payment successful" : "Order placed", message: "Order placed successfully." });
      navigate(`/account/orders/${encodeURIComponent(response.data.order_number)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit checkout.");
      try {
        if (selectedItemIds.length > 0) {
          const refreshed = await fetchCheckoutPreview(selectedItemIds, preview?.promo_code ?? null);
          setPreview(refreshed.data);
        }
      } catch {
        // Preserve the checkout error; the buyer can still return to the cart.
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8 text-sm text-[var(--color-ink-muted)]">Loading checkout...</div>;
  }

  if (error && !preview) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-6">
          <p className="text-sm text-[var(--color-red)] mb-3">{error}</p>
          <button onClick={() => navigate("/cart")} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm">
            Return to cart
          </button>
        </div>
      </div>
    );
  }

  if ((!preview || lineItems.length === 0) && !order) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-10 text-center">
          <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">No products selected</p>
          <p className="text-sm text-[var(--color-ink-muted)] mb-4">Return to your cart and choose at least one product to check out.</p>
          <button onClick={() => navigate("/cart")} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm">Return to cart</button>
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
                      <PhilippinePhoneField value={newAddress.phone} onChange={phone => setNewAddress(current => ({ ...current, phone }))} disabled={submitting} />
                    </div>
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Label" value={newAddress.label} onChange={(e) => setNewAddress((current) => ({ ...current, label: e.target.value }))} />
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Address line 1" value={newAddress.line1} onChange={(e) => setNewAddress((current) => ({ ...current, line1: e.target.value }))} />
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Address line 2" value={newAddress.line2} onChange={(e) => setNewAddress((current) => ({ ...current, line2: e.target.value }))} />
                    <PhilippineAddressSelector value={newAddress} onChange={location => setNewAddress(current => ({ ...current, ...location }))} disabled={submitting} />
                    <input className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm" placeholder="Postal code" value={newAddress.postal_code} onChange={(e) => setNewAddress((current) => ({ ...current, postal_code: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                    <div className="flex gap-2">
                      <button onClick={saveAddress} disabled={submitting || !newAddress.region_code || !newAddress.city_code || !newAddress.barangay_code || !newAddress.postal_code} className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm disabled:opacity-60">
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
                {(selectedPayment === "gcash" || selectedPayment === "maya") && (
                  <div className="mt-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <label className="text-xs font-[500] text-[var(--color-ink)]">Demo mobile number</label>
                    <input value={mobileNumber} onChange={(event) => setMobileNumber(`+63${event.target.value.replace(/\D/g, "").replace(/^63/, "").slice(0, 10)}`)} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" placeholder="+639XXXXXXXXX" />
                    <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Sandbox only. No wallet is charged.</p>
                  </div>
                )}
                {selectedPayment === "card" && (
                  <div className="mt-3 grid gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
                    <label className="sm:col-span-2 text-xs font-[500] text-[var(--color-ink)]">Cardholder name<input value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} maxLength={120} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" /></label>
                    <label className="sm:col-span-2 text-xs font-[500] text-[var(--color-ink)]">Demo card number<input value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} inputMode="numeric" className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" placeholder="4242 4242 4242 4242" /></label>
                    <label className="text-xs font-[500] text-[var(--color-ink)]">Expiry<input value={cardExpiry} onChange={(event) => { const digits = event.target.value.replace(/\D/g, "").slice(0, 4); setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} inputMode="numeric" className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" placeholder="MM/YY" /></label>
                    <label className="text-xs font-[500] text-[var(--color-ink)]">CVV<input value={cardCvv} onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" placeholder="123" /></label>
                    <p className="sm:col-span-2 text-xs text-[var(--color-ink-muted)]">CVV, expiry, and full card number never leave this page and are never stored.</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Order summary">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Items</span><span className="text-[var(--color-ink)]">{itemCount}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Merchandise</span><span className="text-[var(--color-ink)]">{currency(totals.merchandise)}</span></div>
                {totals.productPromotionDiscount > 0 && <div className="flex justify-between"><span className="text-[var(--color-green)]">Product promotions</span><span className="text-[var(--color-green)]">-{currency(totals.productPromotionDiscount)}</span></div>}
                {totals.voucherDiscount > 0 && <div className="flex justify-between"><span className="text-[var(--color-green)]">Voucher {preview?.voucher?.code}</span><span className="text-[var(--color-green)]">-{currency(totals.voucherDiscount)}</span></div>}
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Shipping</span><span className="text-[var(--color-ink)]">{totals.shipping === 0 ? "Free" : currency(totals.shipping)}</span></div>
                <div className="border-t border-[var(--color-border)] pt-3 flex justify-between font-[600]">
                  <span className="text-[var(--color-ink)]">Total</span>
                  <span className="text-[var(--color-ink)]">{currency(totals.grandTotal)}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Discounts">
              <div className="space-y-4">
                {preview?.sellers.some(seller => seller.items.some(item => item.automatic_promotion)) && (
                  <div className="space-y-2">
                    <p className="text-xs font-[600] text-[var(--color-ink)]">Automatic promotions</p>
                    {preview.sellers.flatMap(seller => seller.items).filter(item => item.automatic_promotion).map(item => (
                      <div key={item.id} className="rounded-sm bg-[var(--color-green-light)] p-3 text-xs">
                        <div className="flex items-center justify-between gap-3"><span className="font-[600] text-[var(--color-green)]">Timed Deal · {item.automatic_promotion?.name}</span><span className="text-[var(--color-green)]">-{currency(item.automatic_promotion?.discount ?? 0)}</span></div>
                        <p className="mt-1 text-[var(--color-ink-muted)]">{item.product_name}: {currency(item.regular_unit_price)} → {currency(item.unit_price)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label htmlFor="checkout-voucher" className="text-xs font-[600] text-[var(--color-ink)]">Voucher / promo code</label>
                  {preview?.voucher ? (
                    <div className="mt-2 flex items-center justify-between rounded-sm border border-[var(--color-green)] bg-[var(--color-green-light)] px-3 py-2.5 text-sm">
                      <span className="font-[600] text-[var(--color-green)]">✓ {preview.voucher.code} · {currency(preview.voucher.discount)} applied</span>
                      <button type="button" disabled={applyingVoucher} onClick={() => void recalculateVoucher(null)} className="text-xs text-[var(--color-navy)] underline disabled:opacity-50">{applyingVoucher ? "Removing..." : "Remove"}</button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input id="checkout-voucher" value={voucherInput} onChange={event => { setVoucherInput(event.target.value.toUpperCase()); setVoucherError(null); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (voucherInput.trim()) void recalculateVoucher(voucherInput.trim()); } }} maxLength={50} placeholder="Enter voucher code" className="min-w-0 flex-1 rounded-sm border border-[var(--color-border)] px-3 py-2.5 text-sm" />
                      <button type="button" disabled={applyingVoucher || !voucherInput.trim()} onClick={() => void recalculateVoucher(voucherInput.trim())} className="rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm text-white disabled:opacity-50">{applyingVoucher ? "Applying..." : "Apply"}</button>
                    </div>
                  )}
                  {voucherError && <p role="alert" className="mt-2 text-xs text-[var(--color-red)]">{voucherError}</p>}
                </div>
              </div>
            </SectionCard>

            <button
              onClick={placeOrder}
              disabled={!selectedAddress || submitting}
              className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm disabled:opacity-60">
              {submitting ? (selectedPayment === "cod" ? "Placing order..." : "Processing demo payment...") : "Place order"}
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
