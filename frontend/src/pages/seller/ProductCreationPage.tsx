import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchCatalogCategories, type CatalogCategory } from "../../api/catalog";
import {
  buildSellerProductFormData,
  createSellerProduct,
  fetchSellerProduct,
  updateSellerProduct,
  type SellerProduct,
  type SellerProductSubmission,
  type SellerProductVariantDraft,
} from "../../api/seller";

type DeliveryType = "standard" | "express" | "both" | "pickup-only";
type ProductStatus = "draft" | "active" | "archived";

type ProductImageDraft = {
  localId: string;
  id?: number;
  url: string;
  file?: File;
  isPrimary: boolean;
};

type ProductVariantDraftState = SellerProductVariantDraft & {
  localId: string;
};

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

const INPUT = "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";

const EMPTY_IMAGES: ProductImageDraft[] = [];
const EMPTY_VARIANTS: ProductVariantDraftState[] = [];

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatPriceInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

export default function ProductCreationPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<ProductStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("0");
  const [trackInventory, setTrackInventory] = useState(true);
  const [freeShipping, setFreeShipping] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("both");
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [weightGrams, setWeightGrams] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [images, setImages] = useState<ProductImageDraft[]>(EMPTY_IMAGES);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariantDraftState[]>(EMPTY_VARIANTS);
  const [newOption, setNewOption] = useState<Record<string, string>>({});

  const charCount = description.length;
  const saleAsNumber = Number(salePrice || 0);
  const priceAsNumber = Number(price || 0);
  const discountPct = saleAsNumber > 0 && saleAsNumber < priceAsNumber
    ? Math.round((1 - saleAsNumber / priceAsNumber) * 100)
    : 0;

  const canSubmit =
    name.trim() !== "" &&
    categoryId !== "" &&
    sku.trim() !== "" &&
    price !== "" &&
    !savingStatus &&
    !loading;

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [categoryResponse, productResponse] = await Promise.all([
          fetchCatalogCategories(),
          isEditing && id ? fetchSellerProduct(Number(id)) : Promise.resolve(null),
        ]);

        if (!active) return;

        setCategories(categoryResponse.data);

        if (productResponse?.data) {
          hydrateFromProduct(productResponse.data);
        } else {
          resetBlankForm();
        }
      } catch (error) {
        if (active) {
          setNotice(error instanceof Error ? error.message : "Unable to load the product form.");
          resetBlankForm();
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  function resetBlankForm() {
    setCategoryId("");
    setName("");
    setDescription("");
    setTags("");
    setSku("");
    setBarcode("");
    setPrice("");
    setSalePrice("");
    setCostPrice("");
    setStockQuantity("0");
    setLowStockThreshold("0");
    setTrackInventory(true);
    setFreeShipping(false);
    setDeliveryType("both");
    setStatus("draft");
    setWeightGrams("");
    setLengthCm("");
    setWidthCm("");
    setHeightCm("");
    setImages([]);
    setRemovedImageIds([]);
    setHasVariants(false);
    setVariants([]);
    setNewOption({});
  }

  function hydrateFromProduct(product: SellerProduct) {
    setCategoryId(String(product.category?.id ?? ""));
    setName(product.name ?? "");
    setDescription(product.description ?? "");
    setTags((product.tags ?? []).join(", "));
    setSku(product.sku ?? "");
    setBarcode(product.barcode ?? "");
    setPrice(String(product.price ?? ""));
    setSalePrice(formatPriceInput(product.sale_price));
    setCostPrice(formatPriceInput(product.cost_price));
    setStockQuantity(String(product.stock_quantity ?? 0));
    setLowStockThreshold(String(product.low_stock_threshold ?? 0));
    setTrackInventory(Boolean(product.track_inventory));
    setFreeShipping(Boolean(product.free_shipping));
    setDeliveryType((product.delivery_type as DeliveryType) ?? "both");
    setStatus((product.status as ProductStatus) ?? "draft");
    setWeightGrams(formatPriceInput(product.weight_grams));
    setLengthCm(formatPriceInput(product.dimensions?.length_cm));
    setWidthCm(formatPriceInput(product.dimensions?.width_cm));
    setHeightCm(formatPriceInput(product.dimensions?.height_cm));
    setImages(
      (product.images ?? []).map((image, index) => ({
        localId: `image-${image.id}`,
        id: image.id,
        url: image.url,
        isPrimary: image.is_primary || index === 0,
      })),
    );
    setRemovedImageIds([]);
    setHasVariants((product.variants ?? []).length > 0);
    setVariants(
      (product.variants ?? []).map((variant) => ({
        localId: `variant-${variant.id}`,
        server_id: variant.id,
        name: variant.name,
        sku: variant.sku ?? "",
        barcode: variant.barcode ?? "",
        options: variant.options ?? [],
        price_override: variant.price_override ?? null,
        sale_price_override: variant.sale_price_override ?? null,
        stock_quantity: variant.stock_quantity,
        low_stock_threshold: variant.low_stock_threshold,
        active: variant.active,
      })),
    );
    setNewOption({});
  }

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const previews = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          }),
      ),
    );

    setImages((current) => [
      ...current,
      ...files.map((file, index) => ({
        localId: createLocalId(),
        file,
        url: previews[index],
        isPrimary: current.length === 0 && index === 0,
      })),
    ]);

    event.target.value = "";
  }

  function removeImage(localId: string) {
    setImages((current) => {
      const target = current.find((image) => image.localId === localId);
      if (target?.id) {
        setRemovedImageIds((existing) => [...existing, target.id as number]);
      }

      const next = current.filter((image) => image.localId !== localId);
      return next.map((image, index) => ({ ...image, isPrimary: index === 0 }));
    });
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        localId: createLocalId(),
        name: "Variant",
        sku: "",
        barcode: "",
        options: [],
        price_override: null,
        sale_price_override: null,
        stock_quantity: Number(stockQuantity || 0),
        low_stock_threshold: Number(lowStockThreshold || 0),
        active: true,
      },
    ]);
    setHasVariants(true);
  }

  function removeVariant(localId: string) {
    setVariants((current) => current.filter((variant) => variant.localId !== localId));
  }

  function addVariantOption(localId: string) {
    const value = (newOption[localId] ?? "").trim();
    if (!value) return;

    setVariants((current) =>
      current.map((variant) =>
        variant.localId === localId ? { ...variant, options: [...variant.options, value] } : variant,
      ),
    );
    setNewOption((current) => ({ ...current, [localId]: "" }));
  }

  function removeVariantOption(localId: string, option: string) {
    setVariants((current) =>
      current.map((variant) =>
        variant.localId === localId ? { ...variant, options: variant.options.filter((item) => item !== option) } : variant,
      ),
    );
  }

  async function handleSave(nextStatus: ProductStatus) {
    if (!canSubmit) {
      return;
    }

    const payload: SellerProductSubmission = {
      name,
      description: description || null,
      category_id: Number(categoryId),
      tags: parseTags(tags),
      sku,
      barcode: barcode || null,
      price: Number(price),
      sale_price: salePrice ? Number(salePrice) : null,
      cost_price: costPrice ? Number(costPrice) : null,
      status: nextStatus,
      delivery_type: deliveryType,
      track_inventory: trackInventory,
      stock_quantity: Number(stockQuantity || 0),
      low_stock_threshold: Number(lowStockThreshold || 0),
      weight_grams: weightGrams ? Number(weightGrams) : null,
      length_cm: lengthCm ? Number(lengthCm) : null,
      width_cm: widthCm ? Number(widthCm) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      free_shipping: freeShipping,
      variants: hasVariants
        ? variants.map((variant) => ({
            server_id: variant.server_id,
            name: variant.name,
            sku: variant.sku || null,
            barcode: variant.barcode || null,
            options: variant.options,
            price_override: variant.price_override ?? null,
            sale_price_override: variant.sale_price_override ?? null,
            stock_quantity: variant.stock_quantity,
            low_stock_threshold: variant.low_stock_threshold,
            active: variant.active,
          }))
        : [],
      keep_image_ids: images.filter((image) => image.id && !image.file).map((image) => image.id as number),
      image_files: images.filter((image) => image.file).map((image) => image.file as File),
    };

    setSavingStatus(nextStatus);
    setNotice(null);

    try {
      if (isEditing && id) {
        await updateSellerProduct(Number(id), payload);
      } else {
        await createSellerProduct(payload);
      }

      navigate("/seller-center/products");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save the product right now.");
    } finally {
      setSavingStatus(null);
    }
  }

  const primaryImage = images[0]?.url;
  const discountLabel = discountPct > 0 ? `${discountPct}% OFF` : "—";
  const categoryLabel = useMemo(() => {
    const match = categories.find((item) => String(item.id) === categoryId);
    return match?.label ?? "Your product";
  }, [categories, categoryId]);

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading product form...</div>;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
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
          <button
            onClick={() => void handleSave("draft")}
            disabled={!canSubmit || savingStatus !== null}
            className={`px-4 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-surface)] cursor-pointer"}`}
          >
            {savingStatus === "draft" ? "Saving..." : isEditing ? "Save changes" : "Save draft"}
          </button>
          <button
            onClick={() => void handleSave("active")}
            disabled={!canSubmit || savingStatus !== null}
            className={`px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}
          >
            {savingStatus === "active" ? "Publishing..." : isEditing ? "Update listing" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title="Product information">
            <div className="mb-4">
              <label className={LABEL}>Product name <span className="text-[var(--color-red)]">*</span></label>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Organic Lavender Serum 30ml" className={INPUT} />
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <label className={LABEL.replace("mb-1.5", "")}>Description</label>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{charCount}/5000</span>
              </div>
              <textarea
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, 5000))}
                placeholder="Describe your product, ingredients, benefits, usage instructions, and other useful details..."
                className={INPUT + " resize-none"}
                maxLength={5000}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Category <span className="text-[var(--color-red)]">*</span></label>
                <select className={INPUT + " cursor-pointer"} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Tags</label>
                <input type="text" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="lavender, serum, hydrating" className={INPUT} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Product images" subtitle="Upload up to 8 images. The first image will be your listing thumbnail.">
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <div className="grid grid-cols-4 gap-3 mb-3">
              {images.map((image, index) => (
                <div key={image.localId} className="relative group aspect-square rounded-sm overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <img src={image.url} alt="" className="w-full h-full object-cover" />
                  {index === 0 && <span className="absolute top-1 left-1 font-[var(--font-mono)] text-[8px] bg-[var(--color-navy)] text-white px-1.5 py-0.5 rounded">MAIN</span>}
                  <button onClick={() => removeImage(image.localId)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-sm items-center justify-center hidden group-hover:flex cursor-pointer">
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

          <SectionCard title="Pricing & discounts">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={LABEL}>Base price <span className="text-[var(--color-red)]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} className={INPUT + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Sale price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="number" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} placeholder="Optional" className={INPUT + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Discount</label>
                <div className={`${INPUT} flex items-center justify-between ${discountPct > 0 ? "border-[var(--color-red)] bg-[var(--color-red-light)]" : ""}`}>
                  <span className={`font-[var(--font-mono)] text-sm ${discountPct > 0 ? "text-[var(--color-red)] font-[600]" : "text-[var(--color-ink-disabled)]"}`}>
                    {discountLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Cost per item</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="number" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} placeholder="Your production cost" className={INPUT + " pl-7"} />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                  <span className="text-xs text-[var(--color-green)]">Margin: <span className="font-[500]">Estimated from your pricing</span></span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Inventory & SKU">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LABEL}>SKU <span className="text-[var(--color-red)]">*</span></label>
                <input type="text" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="e.g. VB-SRM-001" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Barcode / ISBN</label>
                <input type="text" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Optional" className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LABEL}>Quantity in stock <span className="text-[var(--color-red)]">*</span></label>
                <input type="number" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Low stock threshold</label>
                <input type="number" value={lowStockThreshold} onChange={(event) => setLowStockThreshold(event.target.value)} className={INPUT} />
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Alert when stock falls below this number</p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={trackInventory} onChange={(event) => setTrackInventory(event.target.checked)} className="accent-[var(--color-navy)]" />
              <span className="text-sm text-[var(--color-ink-muted)]">Track inventory for this product</span>
            </label>
          </SectionCard>

          <SectionCard title="Variants" subtitle="Add size, color, or other options. Each combination can have its own stock and SKU.">
            <label className="flex items-center gap-2.5 cursor-pointer mb-5">
              <div onClick={() => setHasVariants(!hasVariants)} className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${hasVariants ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${hasVariants ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-sm text-[var(--color-ink-muted)]">This product has variants</span>
            </label>

            {hasVariants && (
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div key={variant.localId} className="border border-[var(--color-border)] rounded-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(event) => setVariants((current) => current.map((item) => item.localId === variant.localId ? { ...item, name: event.target.value } : item))}
                        className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]"
                        placeholder="Variant name (e.g. Size)"
                      />
                      <button onClick={() => removeVariant(variant.localId)} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-red)] cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {variant.options.map((option) => (
                        <span key={option} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs rounded border border-[var(--color-navy)]/20">
                          {option}
                          <button onClick={() => removeVariantOption(variant.localId, option)} className="text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOption[variant.localId] ?? ""}
                        onChange={(event) => setNewOption((current) => ({ ...current, [variant.localId]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addVariantOption(variant.localId);
                          }
                        }}
                        placeholder={`Add ${variant.name.toLowerCase()} option`}
                        className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]"
                      />
                      <button onClick={() => addVariantOption(variant.localId)} className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-sm rounded-sm hover:bg-[var(--color-border)] cursor-pointer">Add</button>
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

          <SectionCard title="Delivery & shipping">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LABEL}>Weight (grams)</label>
                <input type="number" value={weightGrams} onChange={(event) => setWeightGrams(event.target.value)} placeholder="e.g. 120" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Dimensions (cm)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input type="number" value={lengthCm} onChange={(event) => setLengthCm(event.target.value)} placeholder="L" className={INPUT} />
                  <input type="number" value={widthCm} onChange={(event) => setWidthCm(event.target.value)} placeholder="W" className={INPUT} />
                  <input type="number" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="H" className={INPUT} />
                </div>
              </div>
            </div>
            <div>
              <label className={LABEL}>Delivery options available</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "standard", label: "Standard delivery", desc: "3-7 business days" },
                  { id: "express", label: "Express delivery", desc: "1-2 business days" },
                  { id: "both", label: "Both options", desc: "Buyer's choice" },
                  { id: "pickup-only", label: "Pickup only", desc: "No courier delivery" },
                ] as const).map((opt) => (
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
            <label className="mt-4 flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={freeShipping} onChange={(event) => setFreeShipping(event.target.checked)} className="accent-[var(--color-navy)]" />
              <span className="text-sm text-[var(--color-ink-muted)]">Offer free shipping</span>
            </label>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">Product status</h2>
            <div className="space-y-2">
              {(["draft", "active", "archived"] as const).map((item) => (
                <label key={item} className={`flex items-center gap-2.5 p-3 rounded-sm border cursor-pointer transition-all ${status === item ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
                  <input type="radio" name="status" value={item} checked={status === item} onChange={() => setStatus(item)} className="accent-[var(--color-navy)]" />
                  <div>
                    <p className={`text-sm font-[500] ${status === item ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{item === "draft" ? "Save as draft" : item === "active" ? "Publish now" : "Archive listing"}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{item === "draft" ? "Not visible to buyers" : item === "active" ? "Visible to all buyers" : "Hidden from buyers"}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Listing preview</h2>
            </div>
            <div className="p-4">
              <div className="aspect-square rounded-sm overflow-hidden bg-[var(--color-surface)] mb-3 flex items-center justify-center">
                {primaryImage ? <img src={primaryImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-[var(--color-ink-disabled)]">No image yet</span>}
              </div>
              <p className="text-sm font-[500] text-[var(--color-ink)] mb-1">{name || "Your product"}</p>
              <p className="font-[var(--font-mono)] text-base text-[var(--color-ink)] mb-1">
                {salePrice && saleAsNumber > 0 && saleAsNumber < priceAsNumber ? (
                  <><span className="text-[var(--color-red)]">₱{saleAsNumber.toLocaleString()}</span> <span className="text-[var(--color-ink-disabled)] line-through text-sm">₱{priceAsNumber.toLocaleString()}</span></>
                ) : `₱${priceAsNumber.toLocaleString()}`}
              </p>
              <p className="text-xs text-[var(--color-ink-disabled)]">{categoryLabel} · ★ 4.8</p>
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3">Listing completeness</h2>
            <div className="space-y-2">
              {[
                { label: "Product name", done: name.trim().length > 0 },
                { label: "Description", done: description.trim().length > 0 },
                { label: "Category", done: categoryId !== "" },
                { label: "At least 1 image", done: images.length > 0 },
                { label: "Base price", done: price !== "" },
                { label: "SKU assigned", done: sku.trim().length > 0 },
                { label: "Inventory quantity", done: stockQuantity !== "" },
                { label: "Shipping info", done: deliveryType.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-[var(--color-green)]" : "border border-[var(--color-border)]"}`}>
                    {item.done && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
                  </div>
                  <span className={`text-xs ${item.done ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => void handleSave("active")} disabled={!canSubmit || savingStatus !== null} className={`w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}>
              {savingStatus === "active" ? "Publishing..." : isEditing ? "Update product" : "Publish product"}
            </button>
            <button onClick={() => void handleSave("draft")} disabled={!canSubmit || savingStatus !== null} className={`w-full py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-surface)] cursor-pointer"}`}>
              {savingStatus === "draft" ? "Saving..." : isEditing ? "Save changes" : "Save as draft"}
            </button>
          </div>
          {notice && (
            <p className={`text-sm ${notice.toLowerCase().includes("unable") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{notice}</p>
          )}
        </div>
      </div>
    </div>
  );
}
