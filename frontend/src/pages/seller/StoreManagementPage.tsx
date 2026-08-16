import { useState } from "react";
import { CATEGORY_LABELS } from "../pub/data";

type StoreTab = "profile" | "branding" | "policies" | "preview";

const INPUT = "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";

function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm mb-5">
      <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ProfileTab() {
  const [storeCats, setStoreCats] = useState<string[]>(["Health and Beauty", "Home and Garden", "Jewelry and Watches"]);
  const [addingCat, setAddingCat] = useState(false);
  const available = CATEGORY_LABELS.filter(c => !storeCats.includes(c));
  return (
    <div>
      <SectionCard title="Store identity">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Store name <span className="text-[var(--color-red)]">*</span></label>
            <input type="text" defaultValue="Verde Botanics" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Store URL slug <span className="text-[var(--color-red)]">*</span></label>
            <div className="flex items-center border border-[var(--color-border)] rounded-sm bg-white focus-within:border-[var(--color-navy)] overflow-hidden">
              <span className="px-3 py-2.5 text-xs text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border-r border-[var(--color-border)] whitespace-nowrap">marketo.ph/store/</span>
              <input type="text" defaultValue="verde-botanics" className="flex-1 px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none bg-white font-[var(--font-body)]" />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className={LABEL}>Tagline</label>
          <input type="text" defaultValue="Naturally rooted, beautifully made." className={INPUT} maxLength={80} />
        </div>
        <div>
          <label className={LABEL}>Store description</label>
          <textarea rows={5} defaultValue="Verde Botanics is a Manila-based skincare brand crafting small-batch, botanical formulas from ethically sourced ingredients. Every product is free of harsh sulfates, parabens, and synthetic fragrance." className={INPUT + " resize-none"} maxLength={1000} />
          <p className="text-xs text-[var(--color-ink-disabled)] mt-1">Shown on your public store page. Max 1000 characters.</p>
        </div>
      </SectionCard>

      <SectionCard title="Categories & specializations">
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">Selected categories appear in search filters and help buyers discover your store.</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {storeCats.map(c => (
            <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs rounded border border-[var(--color-navy)]/20">
              {c}
              <button onClick={() => setStoreCats(prev => prev.filter(x => x !== c))} className="text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] cursor-pointer">×</button>
            </span>
          ))}
          {addingCat && available.length > 0 ? (
            <select autoFocus value="" onChange={e => { if (e.target.value) { setStoreCats(prev => [...prev, e.target.value]); setAddingCat(false); } }}
              onBlur={() => setAddingCat(false)}
              className="px-3 py-1.5 border border-[var(--color-navy)] text-xs text-[var(--color-ink)] rounded bg-white cursor-pointer focus:outline-none">
              <option value="" disabled>Select category…</option>
              {available.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            available.length > 0 && (
              <button onClick={() => setAddingCat(true)} className="px-3 py-1.5 border border-dashed border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer">+ Add category</button>
            )
          )}
        </div>
      </SectionCard>

      <SectionCard title="Contact & location">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Public email</label>
            <input type="email" defaultValue="hello@verdebotanics.com" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Public phone / Viber</label>
            <input type="tel" defaultValue="+63 917 000 0000" className={INPUT} />
          </div>
        </div>
        <div className="mb-4">
          <label className={LABEL}>Business address</label>
          <input type="text" defaultValue="Unit 4B, Emerald Building, Emerald Ave., Ortigas Center, Pasig, Metro Manila" className={INPUT} />
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">Shown on your store page. Only include information you are comfortable making public.</p>
        </div>
      </SectionCard>

      <SectionCard title="Operating hours" subtitle="Helps buyers know when to expect replies and updates.">
        <div className="space-y-2">
          {[["Monday – Friday", "9:00 AM – 6:00 PM"], ["Saturday", "10:00 AM – 4:00 PM"], ["Sunday", "Closed"]].map(([day, hours]) => (
            <div key={day} className="flex items-center gap-4">
              <span className="w-36 text-sm text-[var(--color-ink-muted)] shrink-0">{day}</span>
              <input type="text" defaultValue={hours} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Save changes</button>
      </div>
    </div>
  );
}

function BrandingTab() {
  return (
    <div>
      <SectionCard title="Store logo" subtitle="Shown in search results, your store page header, and order confirmations. Recommended: 400×400px, PNG or SVG.">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-sm bg-[var(--color-navy)] flex items-center justify-center shrink-0">
            <span className="font-[var(--font-display)] text-4xl text-white font-[400]">VB</span>
          </div>
          <div className="space-y-2">
            <button className="block px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors">Upload new logo</button>
            <button className="block text-xs text-[var(--color-red)] hover:underline cursor-pointer">Remove</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Store banner" subtitle="Displayed at the top of your store page. Recommended: 1200×400px, JPEG or PNG.">
        <div className="rounded-sm overflow-hidden bg-[var(--color-navy)] h-32 mb-3 relative">
          <img src="https://images.unsplash.com/photo-1545231027-637d2f6210f8?w=1200&h=400&fit=crop&auto=format" alt="Store banner" className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="px-4 py-2 bg-white/90 text-[var(--color-navy)] text-sm font-[500] rounded-sm hover:bg-white cursor-pointer transition-colors">Change banner</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Upload new banner</button>
          <button className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Remove banner</button>
        </div>
      </SectionCard>

      <SectionCard title="Brand colors" subtitle="Used for subtle accent elements on your store page.">
        <div className="flex items-center gap-4">
          {["#2D6A4F", "#B8782A", "#1A3550"].map(color => (
            <div key={color} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-sm border border-[var(--color-border)] cursor-pointer" style={{ background: color }} />
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{color}</span>
            </div>
          ))}
          <button className="w-8 h-8 border-2 border-dashed border-[var(--color-border)] rounded-sm flex items-center justify-center text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] cursor-pointer text-lg">+</button>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save branding</button>
      </div>
    </div>
  );
}

function PoliciesTab() {
  return (
    <div className="space-y-5">
      {[
        { title: "Return & refund policy", placeholder: "Describe your return window, conditions for returns, and how refunds are processed...", default: "We accept returns within 7 days of delivery for items in original, unopened condition. To initiate a return, message us through Marketo. Refunds are processed within 3–5 business days after we receive the item." },
        { title: "Shipping policy", placeholder: "Describe your shipping carriers, estimated delivery times, cutoff times for same-day processing...", default: "Orders are processed within 1–2 business days. Standard delivery takes 3–7 business days via J&T Express or LBC. Free shipping on orders over ₱800. We ship nationwide." },
        { title: "Privacy policy", placeholder: "Describe how you handle buyer information (optional, for sellers with advanced data practices)...", default: "" },
      ].map(p => (
        <div key={p.title} className="bg-white border border-[var(--color-border)] rounded-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">{p.title}</h2>
          </div>
          <div className="px-6 py-5">
            <textarea rows={5} defaultValue={p.default} placeholder={p.placeholder} className={INPUT + " resize-none"} maxLength={2000} />
            <p className="text-xs text-[var(--color-ink-disabled)] mt-1">Shown to buyers on your store page and at checkout.</p>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save policies</button>
      </div>
    </div>
  );
}

function PreviewTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-ink-muted)]">This is how your store appears to buyers on Marketo.</p>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M5.5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-2.5M8.5 2H12V5.5M12 2l-6 6" /></svg>
          Open live store
        </button>
      </div>
      <div className="border border-[var(--color-border)] rounded-sm overflow-hidden bg-white">
        {/* Banner */}
        <div className="h-36 bg-[var(--color-navy)] relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1545231027-637d2f6210f8?w=1200&h=300&fit=crop&auto=format" alt="Store banner" className="w-full h-full object-cover opacity-60" />
        </div>
        {/* Store header */}
        <div className="px-6 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-sm bg-[var(--color-navy)] flex items-center justify-center border-4 border-white shadow shrink-0">
              <span className="font-[var(--font-display)] text-3xl text-white font-[400]">VB</span>
            </div>
            <div className="pb-1">
              <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Verde Botanics</h2>
              <p className="text-sm text-[var(--color-ink-muted)]">Naturally rooted, beautifully made.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-ink-muted)]">
            <span>★ 4.8 · 214 reviews</span>
            <span>📦 1,240 orders fulfilled</span>
            <span>📍 Ortigas, Pasig</span>
            <span>🕐 Usually replies within 2 hours</span>
          </div>
        </div>
        {/* Product grid sample */}
        <div className="p-5">
          <p className="text-xs font-[var(--font-mono)] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Featured products</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: "Organic Lavender Serum", price: "₱1,450", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&fit=crop&auto=format" },
              { name: "Rose Hip Face Oil", price: "₱1,490", img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&h=200&fit=crop&auto=format" },
              { name: "Botanical Skincare Set", price: "₱3,200", img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200&h=200&fit=crop&auto=format" },
              { name: "Bamboo Charcoal Soap", price: "₱320", img: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=200&h=200&fit=crop&auto=format" },
            ].map(p => (
              <div key={p.name} className="border border-[var(--color-border)] rounded-sm overflow-hidden">
                <div className="aspect-square bg-[var(--color-surface)] overflow-hidden">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-xs font-[500] text-[var(--color-ink)] truncate">{p.name}</p>
                  <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreManagementPage() {
  const [tab, setTab] = useState<StoreTab>("profile");

  const TABS: { id: StoreTab; label: string }[] = [
    { id: "profile",  label: "Store profile" },
    { id: "branding", label: "Branding" },
    { id: "policies", label: "Policies" },
    { id: "preview",  label: "Public preview" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Store management</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Customize your store's public presence on Marketo</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px cursor-pointer transition-colors ${tab === t.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile"  && <ProfileTab />}
      {tab === "branding" && <BrandingTab />}
      {tab === "policies" && <PoliciesTab />}
      {tab === "preview"  && <PreviewTab />}
    </div>
  );
}
