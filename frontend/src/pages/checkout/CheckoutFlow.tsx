import { useState } from "react";

// ── Types ────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5 | 6;
type PaymentMethod = "card" | "gcash" | "maya" | "cod" | "bank";
type DeliveryOption = "standard" | "express" | "sameday";
type PaymentState = "idle" | "processing" | "success" | "failed";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  zip: string;
  isDefault: boolean;
}

// ── Demo data ────────────────────────────────────────────
const SAVED_ADDRESSES: Address[] = [
  { id: "a1", label: "Home", name: "Ana Reyes", phone: "+63 917 555 0182", line1: "24B Sampaguita St., Salcedo Village", city: "Makati", province: "Metro Manila", zip: "1227", isDefault: true },
  { id: "a2", label: "Work", name: "Ana Reyes", phone: "+63 917 555 0182", line1: "32F BGC Corporate Center, 30th St.", city: "Taguig", province: "Metro Manila", zip: "1634", isDefault: false },
];

const CART_SELLERS = [
  {
    slug: "atelier-manila",
    name: "Atelier Manila",
    rating: 4.9,
    items: [
      { id: "i1", product: "Minimalist Chronograph Watch", variant: "Silver / Black dial", qty: 1, price: 4200, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=120&fit=crop&auto=format" },
      { id: "i2", product: "Genuine Leather Strap — 20mm", variant: "Tan / Silver buckle", qty: 2, price: 580, image: "https://images.unsplash.com/photo-1617077644557-64be144aa306?w=120&h=120&fit=crop&auto=format" },
    ],
    deliveryOptions: [
      { id: "standard", label: "Standard delivery", desc: "3–5 business days", fee: 0 },
      { id: "express", label: "Express delivery", desc: "1–2 business days", fee: 180 },
      { id: "sameday", label: "Same-day delivery", desc: "By 10 PM today (orders before 12 PM)", fee: 350 },
    ] as { id: DeliveryOption; label: string; desc: string; fee: number }[],
  },
  {
    slug: "verde-botanics",
    name: "Verde Botanics",
    rating: 4.7,
    items: [
      { id: "i3", product: "Natural Botanical Skincare Set", variant: "Dry skin / Lavender", qty: 1, price: 1200, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120&h=120&fit=crop&auto=format" },
    ],
    deliveryOptions: [
      { id: "standard", label: "Standard delivery", desc: "3–5 business days", fee: 80 },
      { id: "express", label: "Express delivery", desc: "1–2 business days", fee: 220 },
    ] as { id: DeliveryOption; label: string; desc: string; fee: number }[],
  },
];

const STEPS = [
  { num: 1, label: "Cart review" },
  { num: 2, label: "Address" },
  { num: 3, label: "Delivery" },
  { num: 4, label: "Payment" },
  { num: 5, label: "Review" },
  { num: 6, label: "Confirm" },
];

const PAYMENT_METHODS = [
  { id: "card",  label: "Credit / Debit Card",    desc: "Visa, Mastercard, JCB",   icon: "💳" },
  { id: "gcash", label: "GCash",                  desc: "Pay via GCash e-wallet",  icon: "📱" },
  { id: "maya",  label: "Maya",                   desc: "Pay via Maya e-wallet",   icon: "📲" },
  { id: "cod",   label: "Cash on Delivery",        desc: "Pay when package arrives",icon: "💵" },
  { id: "bank",  label: "Bank Transfer",           desc: "Direct bank deposit",     icon: "🏦" },
] as { id: PaymentMethod; label: string; desc: string; icon: string }[];

// ── Helpers ──────────────────────────────────────────────
function sellerSubtotal(seller: typeof CART_SELLERS[0]) {
  return seller.items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

// ── Sub-components ───────────────────────────────────────
function StepProgress({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done = step.num < current;
        const active = step.num === current;
        return (
          <div key={step.num} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-[600] transition-all ${
                done ? "bg-[var(--color-green)] text-white" :
                active ? "bg-[var(--color-navy)] text-white" :
                "bg-[var(--color-border)] text-[var(--color-ink-muted)]"
              }`}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
                ) : step.num}
              </div>
              <span className={`font-[var(--font-mono)] text-[9px] mt-1 whitespace-nowrap ${active ? "text-[var(--color-navy)] font-[600]" : done ? "text-[var(--color-green)]" : "text-[var(--color-ink-disabled)]"}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-12px] transition-colors ${done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderSummaryPanel({ selectedDelivery, promoDiscount = 0 }: { selectedDelivery: Record<string, DeliveryOption>; promoDiscount?: number }) {
  const merchandise = CART_SELLERS.reduce((sum, s) => sum + sellerSubtotal(s), 0);
  const shipping = CART_SELLERS.reduce((sum, s) => {
    const method = s.deliveryOptions.find(o => o.id === (selectedDelivery[s.slug] ?? "standard"));
    return sum + (method?.fee ?? 0);
  }, 0);
  const total = merchandise + shipping - promoDiscount;

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">Order Summary</h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        {CART_SELLERS.map(seller => {
          const method = seller.deliveryOptions.find(o => o.id === (selectedDelivery[seller.slug] ?? "standard"));
          const sub = sellerSubtotal(seller);
          return (
            <div key={seller.slug}>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">{seller.name}</p>
              {seller.items.map(it => (
                <div key={it.id} className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                    <img src={it.image} alt={it.product} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-ink)] truncate leading-snug">{it.product}</p>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{it.variant} × {it.qty}</p>
                  </div>
                  <span className="text-xs font-[600] text-[var(--color-ink)] shrink-0">₱{(it.price * it.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-[var(--color-ink-muted)] mt-1">
                <span>{method?.label ?? "Standard delivery"}</span>
                <span className={method?.fee === 0 ? "text-[var(--color-green)]" : ""}>{method?.fee === 0 ? "Free" : `₱${method?.fee}`}</span>
              </div>
            </div>
          );
        })}
        <div className="border-t border-[var(--color-border)] pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--color-ink)]">
            <span>Merchandise</span><span>₱{merchandise.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-[var(--color-ink)]">
            <span>Shipping</span>
            <span className={shipping === 0 ? "text-[var(--color-green)]" : ""}>{shipping === 0 ? "Free" : `₱${shipping}`}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-xs text-[var(--color-green)]">
              <span>Promo discount</span><span>−₱{promoDiscount.toLocaleString()}</span>
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
      <div className="px-5 pb-4 pt-1 flex items-center gap-2">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2L3 5v5c0 3.5 2.6 6.8 6 7.5C13.4 16.8 16 13.5 16 10V5L9 2z" /></svg>
        <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Protected by Marketo Buyer Guarantee</p>
      </div>
    </div>
  );
}

// ── Step content ─────────────────────────────────────────
function Step1CartReview({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-5">Review Your Cart</h2>
      <div className="space-y-4">
        {CART_SELLERS.map(seller => (
          <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                <span className="text-white font-[var(--font-display)] text-xs">{seller.name[0]}</span>
              </div>
              <p className="text-sm font-[600] text-[var(--color-ink)]">{seller.name}</p>
              <div className="flex items-center gap-1 ml-auto">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--color-amber)"><path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" /></svg>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{seller.rating}</span>
              </div>
            </div>
            {seller.items.map((item, idx) => (
              <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                <div className="w-16 h-16 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                  <img src={item.image} alt={item.product} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{item.product}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{item.variant}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">₱{(item.price * item.qty).toLocaleString()}</p>
              </div>
            ))}
            <div className="px-5 py-3 border-t border-[var(--color-border-subtle)] flex justify-between">
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Seller subtotal</span>
              <span className="text-sm font-[600] text-[var(--color-ink)]">₱{sellerSubtotal(seller).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <button onClick={onNext} className="px-8 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
          Continue to Address →
        </button>
      </div>
    </div>
  );
}

function Step2Address({ onNext, onBack, selectedId, onSelect }: { onNext: () => void; onBack: () => void; selectedId: string; onSelect: (id: string) => void }) {
  const [addingNew, setAddingNew] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: "", phone: "", line1: "", city: "", province: "", zip: "" });

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-5">Delivery Address</h2>
      <div className="space-y-3 mb-5">
        {SAVED_ADDRESSES.map(addr => (
          <button
            key={addr.id}
            onClick={() => onSelect(addr.id)}
            className={`w-full text-left flex items-start gap-4 p-4 bg-white border-2 rounded-sm transition-colors cursor-pointer ${selectedId === addr.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy-border)]"}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedId === addr.id ? "border-[var(--color-navy)]" : "border-[var(--color-border-strong)]"}`}>
              {selectedId === addr.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-navy)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-[600] text-[var(--color-ink)]">{addr.name}</span>
                <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-ink-muted)]">{addr.label}</span>
                {addr.isDefault && <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 bg-[var(--color-navy-surface)] text-[var(--color-navy)] rounded">Default</span>}
              </div>
              <p className="text-sm text-[var(--color-ink-secondary)]">{addr.line1}</p>
              <p className="text-sm text-[var(--color-ink-secondary)]">{addr.city}, {addr.province} {addr.zip}</p>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{addr.phone}</p>
            </div>
          </button>
        ))}

        {!addingNew && (
          <button onClick={() => setAddingNew(true)} className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 4v10M4 9h10" /></svg>
            <span className="text-sm font-[500]">Add new address</span>
          </button>
        )}

        {addingNew && (
          <div className="bg-white border-2 border-[var(--color-navy-border)] rounded-sm p-5 space-y-3">
            <p className="text-sm font-[600] text-[var(--color-ink)] mb-2">New Address</p>
            <div className="grid grid-cols-2 gap-3">
              {([["Full name", "name"], ["Phone number", "phone"]] as [string, string][]).map(([label, key]) => (
                <div key={key}>
                  <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">{label}</label>
                  <input value={newAddr[key as keyof typeof newAddr]} onChange={e => setNewAddr(p => ({ ...p, [key]: e.target.value }))} className="w-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] transition-colors" />
                </div>
              ))}
            </div>
            <div>
              <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">Street address / unit</label>
              <input value={newAddr.line1} onChange={e => setNewAddr(p => ({ ...p, line1: e.target.value }))} className="w-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([["City", "city"], ["Province", "province"], ["ZIP", "zip"]] as [string, string][]).map(([label, key]) => (
                <div key={key}>
                  <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">{label}</label>
                  <input value={newAddr[key as keyof typeof newAddr]} onChange={e => setNewAddr(p => ({ ...p, [key]: e.target.value }))} className="w-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] transition-colors" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer hover:bg-[var(--color-navy-hover)] transition-colors">Save address</button>
              <button onClick={() => setAddingNew(false)} className="px-4 py-2 text-sm text-[var(--color-ink-muted)] cursor-pointer hover:text-[var(--color-ink)] transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-5 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">← Back</button>
        <button onClick={onNext} className="px-8 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
          Continue to Delivery →
        </button>
      </div>
    </div>
  );
}

function Step3Delivery({ onNext, onBack, selected, onSelect }: { onNext: () => void; onBack: () => void; selected: Record<string, DeliveryOption>; onSelect: (slug: string, opt: DeliveryOption) => void }) {
  return (
    <div>
      <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-5">Delivery Method</h2>
      <div className="space-y-5 mb-6">
        {CART_SELLERS.map(seller => (
          <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="w-6 h-6 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
                <span className="text-white font-[var(--font-display)] text-xs">{seller.name[0]}</span>
              </div>
              <p className="text-sm font-[600] text-[var(--color-ink)]">{seller.name}</p>
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {seller.deliveryOptions.map(opt => {
                const active = (selected[seller.slug] ?? "standard") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelect(seller.slug, opt.id)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors cursor-pointer ${active ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-[var(--color-navy)]" : "border-[var(--color-border-strong)]"}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-[var(--color-navy)]" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-[500] ${active ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{opt.label}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{opt.desc}</p>
                    </div>
                    <span className={`text-sm font-[600] shrink-0 ${opt.fee === 0 ? "text-[var(--color-green)]" : active ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>
                      {opt.fee === 0 ? "Free" : `₱${opt.fee}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-5 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">← Back</button>
        <button onClick={onNext} className="px-8 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}

function Step4Payment({ onNext, onBack, selected, onSelect }: { onNext: () => void; onBack: () => void; selected: PaymentMethod; onSelect: (m: PaymentMethod) => void }) {
  const [cardNum, setCardNum] = useState("4242");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("ANA REYES");
  const [saveCard, setSaveCard] = useState(true);

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-5">Payment Method</h2>

      <div className="space-y-2 mb-5">
        {PAYMENT_METHODS.map(pm => {
          const active = selected === pm.id;
          return (
            <div key={pm.id}>
              <button
                onClick={() => onSelect(pm.id)}
                className={`w-full flex items-center gap-4 p-4 bg-white border-2 rounded-sm text-left transition-colors cursor-pointer ${active ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy-border)]"}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-[var(--color-navy)]" : "border-[var(--color-border-strong)]"}`}>
                  {active && <div className="w-2 h-2 rounded-full bg-[var(--color-navy)]" />}
                </div>
                <span className="text-xl shrink-0">{pm.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-[600] ${active ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{pm.label}</p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{pm.desc}</p>
                </div>
              </button>

              {active && pm.id === "card" && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-navy-border)] border-t-0 rounded-b-sm px-5 py-4 space-y-3">
                  <div>
                    <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">Card number</label>
                    <div className="flex items-center bg-white border border-[var(--color-border)] rounded-sm px-3 py-2 gap-2 focus-within:border-[var(--color-navy)] transition-colors">
                      <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">•••• •••• •••• {cardNum}</span>
                      <span className="ml-auto font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">Visa</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">Expiry</label>
                      <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="w-full font-[var(--font-mono)] text-sm bg-white border border-[var(--color-border)] rounded-sm px-3 py-2 outline-none focus:border-[var(--color-navy)] transition-colors" placeholder="MM/YY" />
                    </div>
                    <div>
                      <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">CVV</label>
                      <input value={cardCvv} onChange={e => setCardCvv(e.target.value)} maxLength={4} className="w-full font-[var(--font-mono)] text-sm bg-white border border-[var(--color-border)] rounded-sm px-3 py-2 outline-none focus:border-[var(--color-navy)] transition-colors" placeholder="•••" type="password" />
                    </div>
                  </div>
                  <div>
                    <label className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide block mb-1">Name on card</label>
                    <input value={cardName} onChange={e => setCardName(e.target.value)} className="w-full font-[var(--font-mono)] text-sm bg-white border border-[var(--color-border)] rounded-sm px-3 py-2 outline-none focus:border-[var(--color-navy)] transition-colors uppercase" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} className="rounded" />
                    <span className="text-xs text-[var(--color-ink-muted)]">Save this card for future purchases</span>
                  </label>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-disabled)]">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2L3 5v5c0 3.5 2.6 6.8 6 7.5C13.4 16.8 16 13.5 16 10V5L9 2z" /></svg>
                    <span>Secured with 256-bit TLS encryption. CVV is never stored.</span>
                  </div>
                </div>
              )}

              {active && (pm.id === "gcash" || pm.id === "maya") && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-navy-border)] border-t-0 rounded-b-sm px-5 py-4">
                  <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                    After confirming your order, you will be redirected to the {pm.label} payment page to complete your transaction securely.
                  </p>
                </div>
              )}

              {active && pm.id === "cod" && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-navy-border)] border-t-0 rounded-b-sm px-5 py-4">
                  <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                    Please prepare the exact amount when your package arrives. Cash payment only — no change provided by couriers.
                  </p>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-warning)] mt-2">COD is not available for orders exceeding ₱10,000.</p>
                </div>
              )}

              {active && pm.id === "bank" && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-navy-border)] border-t-0 rounded-b-sm px-5 py-4 space-y-2">
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Bank transfer details</p>
                  {[["Bank", "BDO Unibank"], ["Account name", "Marketo Inc."], ["Account number", "•••• •••• 4481"], ["Reference format", "Your order number"]].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-[var(--color-ink-muted)]">{label}</span>
                      <span className="font-[var(--font-mono)] text-[var(--color-ink)]">{value}</span>
                    </div>
                  ))}
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-warning)] pt-1">Upload proof of payment after checkout to confirm your order.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-5 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">← Back</button>
        <button onClick={onNext} className="px-8 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
          Review Order →
        </button>
      </div>
    </div>
  );
}

function Step5Review({ onNext, onBack, address, delivery, payment }: {
  onNext: () => void; onBack: () => void;
  address: Address; delivery: Record<string, DeliveryOption>; payment: PaymentMethod;
}) {
  const pm = PAYMENT_METHODS.find(p => p.id === payment)!;
  const merchandise = CART_SELLERS.reduce((sum, s) => sum + sellerSubtotal(s), 0);
  const shipping = CART_SELLERS.reduce((sum, s) => {
    const method = s.deliveryOptions.find(o => o.id === (delivery[s.slug] ?? "standard"));
    return sum + (method?.fee ?? 0);
  }, 0);

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-5">Review Your Order</h2>

      <div className="space-y-4 mb-6">
        {/* Delivery address */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide">Delivery Address</p>
            <button onClick={() => {}} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Change</button>
          </div>
          <p className="text-sm font-[500] text-[var(--color-ink)]">{address.name} <span className="font-[400] text-[var(--color-ink-muted)]">· {address.phone}</span></p>
          <p className="text-sm text-[var(--color-ink-secondary)] mt-0.5">{address.line1}</p>
          <p className="text-sm text-[var(--color-ink-secondary)]">{address.city}, {address.province} {address.zip}</p>
        </div>

        {/* Payment */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide">Payment Method</p>
            <button onClick={() => {}} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Change</button>
          </div>
          <p className="text-sm text-[var(--color-ink)] flex items-center gap-2"><span>{pm.icon}</span> {pm.label}</p>
          {payment === "card" && <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">Visa •••• 4242</p>}
        </div>

        {/* Order items by seller */}
        {CART_SELLERS.map(seller => {
          const method = seller.deliveryOptions.find(o => o.id === (delivery[seller.slug] ?? "standard"));
          return (
            <div key={seller.slug} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-sm font-[600] text-[var(--color-ink)]">{seller.name}</span>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] ml-auto">{method?.label} — {method?.fee === 0 ? "Free" : `₱${method?.fee}`}</span>
              </div>
              {seller.items.map((item, idx) => (
                <div key={item.id} className={`flex gap-4 px-5 py-3 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                  <div className="w-12 h-12 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                    <img src={item.image} alt={item.product} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-[500] text-[var(--color-ink)] truncate">{item.product}</p>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{item.variant} × {item.qty}</p>
                  </div>
                  <p className="text-sm font-[600] text-[var(--color-ink)] shrink-0">₱{(item.price * item.qty).toLocaleString()}</p>
                </div>
              ))}
            </div>
          );
        })}

        {/* Price breakdown */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 space-y-2">
          <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide mb-3">Order Total</p>
          <div className="flex justify-between text-sm text-[var(--color-ink)]"><span>Merchandise</span><span>₱{merchandise.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm text-[var(--color-ink)]"><span>Shipping</span><span className={shipping === 0 ? "text-[var(--color-green)]" : ""}>{shipping === 0 ? "Free" : `₱${shipping}`}</span></div>
          <div className="border-t border-[var(--color-border)] pt-2 flex justify-between">
            <span className="font-[600] text-[var(--color-ink)]">Total</span>
            <span className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">₱{(merchandise + shipping).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] mb-4 leading-relaxed">
        By placing this order you agree to Marketo's <span className="text-[var(--color-navy)] cursor-pointer hover:underline">Terms of Service</span> and <span className="text-[var(--color-navy)] cursor-pointer hover:underline">Return Policy</span>.
      </p>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-5 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">← Back</button>
        <button onClick={onNext} className="px-8 py-3 bg-[var(--color-amber)] text-white text-sm font-[600] rounded-sm hover:bg-[var(--color-amber-hover)] transition-colors cursor-pointer">
          Place Order ₱{(merchandise + shipping).toLocaleString()}
        </button>
      </div>
    </div>
  );
}

function PaymentProcessing({ outcome, onRetry }: { outcome: "processing" | "success" | "failed"; onRetry: () => void }) {
  if (outcome === "processing") {
    return (
      <div className="py-16 flex flex-col items-center gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--color-border)]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--color-navy)] animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-1">Processing payment…</p>
          <p className="text-sm text-[var(--color-ink-muted)]">Please do not close this window or press the back button.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2L3 5v5c0 3.5 2.6 6.8 6 7.5C13.4 16.8 16 13.5 16 10V5L9 2z" /></svg>
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Secured with 256-bit TLS encryption</span>
        </div>
      </div>
    );
  }

  if (outcome === "failed") {
    return (
      <div className="py-12 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[var(--color-red-light)] border-2 border-[var(--color-red-border)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round"><path d="M8 8l16 16M24 8L8 24" /></svg>
        </div>
        <div className="text-center">
          <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Payment failed</p>
          <p className="text-sm text-[var(--color-ink-muted)] mb-1">We could not process your payment. No charge was made.</p>
          <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-red)]">Reason: Insufficient funds (Code: 4012)</p>
        </div>
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <button onClick={onRetry} className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
            Try again with a different card
          </button>
          <button className="w-full py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] transition-colors cursor-pointer">
            Try another payment method
          </button>
          <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Contact payment support</button>
        </div>
      </div>
    );
  }

  return null;
}

function Step6Confirmation({ orderId }: { orderId: string }) {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[var(--color-green-light)] border-2 border-[var(--color-green-border)] flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round"><path d="M6 16l7 7 13-13" /></svg>
        </div>
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Order confirmed</p>
        <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-1">Thank you, Ana!</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">Your order has been placed and is being reviewed by the seller.</p>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 mb-5 max-w-md mx-auto">
        <div className="text-center mb-4">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Order reference</p>
          <p className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-navy)] mt-1">{orderId}</p>
        </div>
        <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
          {[
            ["Estimated delivery", "Aug 18–22, 2026"],
            ["Payment", "Visa •••• 4242"],
            ["Confirmation sent to", "ana.reyes@example.com"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-[var(--color-ink-muted)]">{label}</span>
              <span className="font-[500] text-[var(--color-ink)]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
        <button className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
          Track my order
        </button>
        <button className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] transition-colors cursor-pointer">
          Continue shopping
        </button>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────
interface CheckoutFlowProps {
  initialStep?: Step;
  simulatePayment?: "success" | "failed";
}

export default function CheckoutFlow({ initialStep = 1, simulatePayment = "success" }: CheckoutFlowProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [selectedAddressId, setSelectedAddressId] = useState("a1");
  const [selectedDelivery, setSelectedDelivery] = useState<Record<string, DeliveryOption>>({ "atelier-manila": "standard", "verde-botanics": "standard" });
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("card");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [orderId] = useState(() => `ORD-${Math.floor(3000 + Math.random() * 999)}`);

  const selectedAddress = SAVED_ADDRESSES.find(a => a.id === selectedAddressId)!;

  const placeOrder = () => {
    setPaymentState("processing");
    setTimeout(() => {
      if (simulatePayment === "success") {
        setPaymentState("idle");
        setStep(6);
      } else {
        setPaymentState("failed");
      }
    }, 2200);
  };

  // Payment processing overlay
  if (paymentState === "processing" || paymentState === "failed") {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="max-w-lg mx-auto">
          <PaymentProcessing outcome={paymentState} onRetry={() => { setPaymentState("idle"); setStep(4); }} />
        </div>
      </div>
    );
  }

  // Step 6: confirmation (no sidebar)
  if (step === 6) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <Step6Confirmation orderId={orderId} />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <StepProgress current={step} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div>
            {step === 1 && <Step1CartReview onNext={() => setStep(2)} />}
            {step === 2 && <Step2Address onNext={() => setStep(3)} onBack={() => setStep(1)} selectedId={selectedAddressId} onSelect={setSelectedAddressId} />}
            {step === 3 && <Step3Delivery onNext={() => setStep(4)} onBack={() => setStep(2)} selected={selectedDelivery} onSelect={(slug, opt) => setSelectedDelivery(p => ({ ...p, [slug]: opt }))} />}
            {step === 4 && <Step4Payment onNext={() => setStep(5)} onBack={() => setStep(3)} selected={selectedPayment} onSelect={setSelectedPayment} />}
            {step === 5 && <Step5Review onNext={placeOrder} onBack={() => setStep(4)} address={selectedAddress} delivery={selectedDelivery} payment={selectedPayment} />}
          </div>
          <div>
            <OrderSummaryPanel selectedDelivery={selectedDelivery} />
          </div>
        </div>
      </div>
    </div>
  );
}
