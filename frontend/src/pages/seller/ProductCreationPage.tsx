import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { CATEGORY_LABELS } from "../pub/data";

const CATEGORIES = CATEGORY_LABELS;

type Variant = { id: string; name: string; options: string[] };
type DeliveryType = "standard" | "express" | "both" | "pickup-only";

const DEF_VARIANTS: Variant[] = [
  { id: "v1", name: "Size", options: ["30ml", "50ml", "100ml"] },
];

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm">
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

const INPUT = "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";

export default function ProductCreationPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [charCount, setCharCount] = useState(0);
  const [price, setPrice] = useState("1450");
  const [salePrice, setSalePrice] = useState("");
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=160&h=160&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=160&h=160&fit=crop&auto=format",
  ]);
  const [variants, setVariants] = useState<Variant[]>(DEF_VARIANTS);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard");
  const [hasVariants, setHasVariants] = useState(true);
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const isEditing = !!id;

  const discountPct = price && salePrice && parseFloat(salePrice) < parseFloat(price)
    ? Math.round((1 - parseFloat(salePrice) / parseFloat(price)) * 100)
    : 0;

  const finishCreation = () => navigate("/seller-center/products");
  const openImagePicker = () => imageInputRef.current?.click();
  const handleImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const remaining = 8 - images.length;
    if (remaining <= 0) {
      e.target.value = "";
      return;
    }

    const urls = await Promise.all(
      picked.slice(0, remaining).map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.readAsDataURL(file);
      })),
    );

    setImages(prev => [...prev, ...urls]);
    e.target.value = "";
  };

  const addVariantOption = (variantId: string) => {
    const val = (newOption[variantId] ?? "").trim();
    if (!val) return;
    setVariants(vs => vs.map(v => v.id === variantId ? { ...v, options: [...v.options, val] } : v));
    setNewOption(prev => ({ ...prev, [variantId]: "" }));
  };

  const removeVariantOption = (variantId: string, opt: string) =>
    setVariants(vs => vs.map(v => v.id === variantId ? { ...v, options: v.options.filter(o => o !== opt) } : v));

  const addVariant = () => {
    const id = `v${Date.now()}`;
    setVariants(vs => [...vs, { id, name: "Variant", options: [] }]);
  };

  const removeVariant = (id: string) => setVariants(vs => vs.filter(v => v.id !== id));

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/seller-center/products")} className="text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">{isEditing ? "Edit product" : "Add new product"}</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">{isEditing ? "Update the details below and save your listing changes." : "Fill in the details below to create your listing."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={finishCreation} className="px-4 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer transition-colors">{isEditing ? "Save changes" : "Save draft"}</button>
          <button onClick={finishCreation} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">{isEditing ? "Update listing" : "Publish"}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT COLUMN (main form) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Basic info */}
          <SectionCard title="Product information">
            <div className="mb-4">
              <label className={LABEL}>Product name <span className="text-[var(--color-red)]">*</span></label>
              <input type="text" placeholder="e.g. Organic Lavender Serum 30ml" className={INPUT} defaultValue="Organic Lavender Serum" />
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <label className={LABEL.replace("mb-1.5", "")}>Description <span className="text-[var(--color-red)]">*</span></label>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{charCount}/5000</span>
              </div>
              <textarea
                rows={6}
                placeholder="Describe your product — include ingredients, benefits, usage instructions, and any other relevant details buyers should know..."
                className={INPUT + " resize-none"}
                maxLength={5000}
                onChange={e => setCharCount(e.target.value.length)}
                defaultValue="Our Organic Lavender Serum is crafted with pure lavender essential oil and hyaluronic acid. Gently hydrates and calms sensitive skin overnight."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Category <span className="text-[var(--color-red)]">*</span></label>
                <select className={INPUT + " cursor-pointer"} defaultValue="Skincare">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Tags</label>
                <input type="text" placeholder="lavender, serum, hydrating (comma-separated)" className={INPUT} />
              </div>
            </div>
          </SectionCard>

          {/* Images */}
          <SectionCard title="Product images" subtitle="Upload up to 8 images. The first image will be your listing thumbnail.">
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <div className="grid grid-cols-4 gap-3 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-square rounded-sm overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 font-[var(--font-mono)] text-[8px] bg-[var(--color-navy)] text-white px-1.5 py-0.5 rounded">MAIN</span>}
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-sm items-center justify-center hidden group-hover:flex cursor-pointer">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2L2 8" /></svg>
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <button onClick={openImagePicker} className="aspect-square rounded-sm border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
                  <span className="text-[10px] text-[var(--color-ink-muted)]">Add photo</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--color-ink-disabled)]">Drag to reorder. Recommended: 800×800px, JPEG or PNG, max 5MB each.</p>
          </SectionCard>

          {/* Pricing */}
          <SectionCard title="Pricing & discounts">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={LABEL}>Base price <span className="text-[var(--color-red)]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className={INPUT + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Sale price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="Optional" className={INPUT + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Discount</label>
                <div className={`${INPUT} flex items-center justify-between ${discountPct > 0 ? "border-[var(--color-red)] bg-[var(--color-red-light)]" : ""}`}>
                  <span className={`font-[var(--font-mono)] text-sm ${discountPct > 0 ? "text-[var(--color-red)] font-[600]" : "text-[var(--color-ink-disabled)]"}`}>
                    {discountPct > 0 ? `${discountPct}% OFF` : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Cost per item</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="number" placeholder="Your production cost (not shown to buyers)" className={INPUT + " pl-7"} />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                  <span className="text-xs text-[var(--color-green)]">Margin: <span className="font-[500]">~58%</span></span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Inventory */}
          <SectionCard title="Inventory & SKU">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LABEL}>SKU <span className="text-[var(--color-red)]">*</span></label>
                <input type="text" placeholder="e.g. VB-SRM-001" className={INPUT} defaultValue="VB-SRM-001" />
              </div>
              <div>
                <label className={LABEL}>Barcode / ISBN</label>
                <input type="text" placeholder="Optional" className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LABEL}>Quantity in stock <span className="text-[var(--color-red)]">*</span></label>
                <input type="number" defaultValue="24" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Low stock threshold</label>
                <input type="number" defaultValue="10" className={INPUT} />
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Alert when stock falls below this number</p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="accent-[var(--color-navy)]" />
              <span className="text-sm text-[var(--color-ink-muted)]">Track inventory for this product</span>
            </label>
          </SectionCard>

          {/* Variants */}
          <SectionCard title="Variants" subtitle="Add size, color, or other options. Each combination will have its own stock and SKU.">
            <label className="flex items-center gap-2.5 cursor-pointer mb-5">
              <div onClick={() => setHasVariants(!hasVariants)} className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${hasVariants ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${hasVariants ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-sm text-[var(--color-ink-muted)]">This product has variants</span>
            </label>

            {hasVariants && (
              <div className="space-y-4">
                {variants.map(v => (
                  <div key={v.id} className="border border-[var(--color-border)] rounded-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        value={v.name}
                        onChange={e => setVariants(vs => vs.map(x => x.id === v.id ? { ...x, name: e.target.value } : x))}
                        className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]"
                        placeholder="Variant name (e.g. Size)"
                      />
                      <button onClick={() => removeVariant(v.id)} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-red)] cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {v.options.map(opt => (
                        <span key={opt} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs rounded border border-[var(--color-navy)]/20">
                          {opt}
                          <button onClick={() => removeVariantOption(v.id, opt)} className="text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOption[v.id] ?? ""}
                        onChange={e => setNewOption(prev => ({ ...prev, [v.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVariantOption(v.id); } }}
                        placeholder={`Add ${v.name.toLowerCase()} option`}
                        className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]"
                      />
                      <button onClick={() => addVariantOption(v.id)} className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-sm rounded-sm hover:bg-[var(--color-border)] cursor-pointer">Add</button>
                    </div>
                  </div>
                ))}
                <button onClick={addVariant} className="flex items-center gap-2 text-sm text-[var(--color-navy)] hover:underline cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10" /></svg>
                  Add another variant
                </button>
              </div>
            )}
          </SectionCard>

          {/* Shipping */}
          <SectionCard title="Delivery & shipping">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LABEL}>Weight (grams)</label>
                <input type="number" placeholder="e.g. 120" className={INPUT} defaultValue="120" />
              </div>
              <div>
                <label className={LABEL}>Dimensions (cm)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input type="number" placeholder="L" className={INPUT} defaultValue="8" />
                  <input type="number" placeholder="W" className={INPUT} defaultValue="8" />
                  <input type="number" placeholder="H" className={INPUT} defaultValue="12" />
                </div>
              </div>
            </div>
            <div>
              <label className={LABEL}>Delivery options available</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "standard", label: "Standard delivery", desc: "3–7 business days" },
                  { id: "express",  label: "Express delivery",  desc: "1–2 business days" },
                  { id: "both",     label: "Both options",      desc: "Buyer's choice" },
                  { id: "pickup-only", label: "Pickup only",   desc: "No courier delivery" },
                ] as const).map(opt => (
                  <label key={opt.id} className={`flex gap-2.5 p-3 rounded-sm border cursor-pointer transition-all ${deliveryType === opt.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
                    <input type="radio" name="delivery" value={opt.id} checked={deliveryType === opt.id} onChange={() => setDeliveryType(opt.id)} className="mt-0.5 accent-[var(--color-navy)]" />
                    <div>
                      <p className={`text-sm font-[500] ${deliveryType === opt.id ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{opt.label}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT COLUMN (sidebar) ── */}
        <div className="space-y-5">
          {/* Status */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Product status</h2>
            <div className="space-y-2">
              {(["draft", "active"] as const).map(s => (
                <label key={s} className={`flex items-center gap-2.5 p-3 rounded-sm border cursor-pointer transition-all ${status === s ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
                  <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-[var(--color-navy)]" />
                  <div>
                    <p className={`text-sm font-[500] ${status === s ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{s === "draft" ? "Save as draft" : "Publish now"}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{s === "draft" ? "Not visible to buyers" : "Visible to all buyers"}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Listing preview</h2>
            </div>
            <div className="p-4">
              <div className="aspect-square rounded-sm overflow-hidden bg-[var(--color-surface)] mb-3">
                {images[0] && <img src={images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-sm font-[500] text-[var(--color-ink)] mb-1">Organic Lavender Serum</p>
              <p className="font-[var(--font-mono)] text-base text-[var(--color-ink)] mb-1">
                {salePrice && parseFloat(salePrice) < parseFloat(price) ? (
                  <><span className="text-[var(--color-red)]">₱{parseFloat(salePrice).toLocaleString()}</span> <span className="text-[var(--color-ink-disabled)] line-through text-sm">₱{parseFloat(price).toLocaleString()}</span></>
                ) : `₱${parseFloat(price || "0").toLocaleString()}`}
              </p>
              <p className="text-xs text-[var(--color-ink-disabled)]">Verde Botanics · ★ 4.8</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3">Listing completeness</h2>
            <div className="space-y-2">
              {[
                { label: "Product name", done: true },
                { label: "Description", done: true },
                { label: "Category", done: true },
                { label: "At least 1 image", done: images.length > 0 },
                { label: "Base price", done: !!price },
                { label: "SKU assigned", done: true },
                { label: "Inventory quantity", done: true },
                { label: "Shipping info", done: true },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-[var(--color-green)]" : "border border-[var(--color-border)]"}`}>
                    {item.done && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
                  </div>
                  <span className={`text-xs ${item.done ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={finishCreation} className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">{isEditing ? "Update product" : "Publish product"}</button>
            <button onClick={finishCreation} className="w-full py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer transition-colors">{isEditing ? "Save changes" : "Save as draft"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
