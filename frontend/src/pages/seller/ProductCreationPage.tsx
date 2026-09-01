import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchCatalogCategories, type CatalogCategory } from "../../api/catalog";
import { ApiError } from "../../api/client";
import {
  buildSellerProductFormData,
  createSellerProduct,
  fetchSellerProduct,
  updateSellerProduct,
  type SellerProduct,
  type SellerProductSubmission,
} from "../../api/seller";
import {
  synchronizeVariantCombinations,
  type VariantCombinationDraft,
  type VariantOptionGroup,
} from "./productVariantCombinations";

type DeliveryType = "standard" | "express" | "both" | "pickup-only";
type ProductStatus = "draft" | "active" | "archived";

const PRODUCT_STATUS_ACTION_LABELS: Record<ProductStatus, { idle: string; loading: string }> = {
  draft: { idle: "Save Draft", loading: "Saving Draft..." },
  active: { idle: "Publish Product", loading: "Publishing..." },
  archived: { idle: "Archive Listing", loading: "Archiving..." },
};

const MAX_PRODUCT_IMAGES = 8;
const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024;

type ProductImageDraft = {
  localId: string;
  id?: number;
  url: string;
  file?: File;
  isPrimary: boolean;
};

type ProductVariantDraftState = VariantCombinationDraft;

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
const EMPTY_VARIANT_GROUPS: VariantOptionGroup[] = [];

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function appendUniqueTags(current: string[], values: string[]): string[] {
  const next = [...current];
  const existing = new Set(current.map((tag) => tag.toLocaleLowerCase()));

  values.forEach((value) => {
    const tag = value.trim().replace(/,+$/, "").trim();
    const normalized = tag.toLocaleLowerCase();
    if (!tag || existing.has(normalized)) return;

    existing.add(normalized);
    next.push(tag);
  });

  return next;
}

function formatPriceInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function sanitizeCurrencyInput(value: string): string {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [integer = "", ...decimalParts] = cleaned.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");

  return decimalParts.length > 0
    ? `${normalizedInteger}.${decimalParts.join("")}`
    : normalizedInteger;
}

function formatCurrencyInput(value: string): string {
  if (value === "") return "";

  const [integer = "", decimal] = value.split(".");
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
}

export default function ProductCreationPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const saveInFlightRef = useRef(false);
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<ProductStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("0");
  const [freeShipping, setFreeShipping] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("both");
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [weightGrams, setWeightGrams] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [images, setImages] = useState<ProductImageDraft[]>(EMPTY_IMAGES);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantOptionGroup[]>(EMPTY_VARIANT_GROUPS);
  const [variants, setVariants] = useState<ProductVariantDraftState[]>(EMPTY_VARIANTS);
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const charCount = description.length;
  const saleAsNumber = Number(salePrice || 0);
  const priceAsNumber = Number(price || 0);
  const discountPct = saleAsNumber > 0 && saleAsNumber < priceAsNumber
    ? Math.round((1 - saleAsNumber / priceAsNumber) * 100)
    : 0;
  const variantStockTotal = variants
    .filter((variant) => variant.active)
    .reduce((total, variant) => total + Number(variant.stock_quantity || 0), 0);
  const duplicateVariantSkus = new Set(
    variants
      .map((variant) => variant.sku?.trim().toLocaleLowerCase() ?? "")
      .filter((candidate, index, all) => candidate !== "" && all.indexOf(candidate) !== index),
  );
  const variantsAreValid = !hasVariants || (
    variants.length > 0 && variants.every((variant) =>
      variant.sku?.trim() !== "" &&
      !duplicateVariantSkus.has(variant.sku.trim().toLocaleLowerCase()) &&
      variant.price_override !== "" &&
      Number(variant.price_override) >= 0 &&
      Number(variant.stock_quantity) >= 0
    )
  );

  const canSubmit =
    name.trim() !== "" &&
    categoryId !== "" &&
    (hasVariants || sku.trim() !== "") &&
    price !== "" &&
    variantsAreValid &&
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
    setTags([]);
    setTagInput("");
    setSku("");
    setBarcode("");
    setPrice("");
    setSalePrice("");
    setCostPrice("");
    setStockQuantity("0");
    setLowStockThreshold("0");
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
    setVariantGroups([]);
    setVariants([]);
    setNewOption({});
    setBulkPrice("");
    setBulkStock("");
  }

  function hydrateFromProduct(product: SellerProduct) {
    setCategoryId(String(product.category?.id ?? ""));
    setName(product.name ?? "");
    setDescription(product.description ?? "");
    setTags(appendUniqueTags([], Array.isArray(product.tags) ? product.tags : parseTags(String(product.tags ?? ""))));
    setTagInput("");
    setSku(product.sku ?? "");
    setBarcode(product.barcode ?? "");
    setPrice(String(product.price ?? ""));
    setSalePrice(formatPriceInput(product.sale_price));
    setCostPrice(formatPriceInput(product.cost_price));
    setStockQuantity(String(product.stock_quantity ?? 0));
    setLowStockThreshold(String(product.low_stock_threshold ?? 0));
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
    const activeVariants = (product.variants ?? []).filter((variant) => variant.active);
    const hasStructuredOptions = activeVariants.length > 0 && activeVariants.every((variant) =>
      Array.isArray(variant.option_values) && variant.option_values.length > 0,
    );
    const loadedGroups: VariantOptionGroup[] = [];

    if (hasStructuredOptions) {
      const groupIndex = new Map<string, VariantOptionGroup>();
      activeVariants.forEach((variant) => {
        variant.option_values.forEach((option) => {
          const normalizedOptionName = option.name.trim().toLocaleLowerCase();
          let group = groupIndex.get(normalizedOptionName);
          if (!group) {
            group = { localId: createLocalId(), name: option.name, options: [] };
            groupIndex.set(normalizedOptionName, group);
            loadedGroups.push(group);
          }
          if (!group.options.includes(option.value)) group.options.push(option.value);
        });
      });
    } else {
      activeVariants.forEach((variant) => {
        loadedGroups.push({
          localId: createLocalId(),
          name: variant.name,
          options: variant.options ?? [],
        });
      });
    }

    const persistedVariants: ProductVariantDraftState[] = hasStructuredOptions
      ? activeVariants.map((variant) => ({
          localId: `variant-${variant.id}`,
          server_id: variant.id,
          name: variant.name,
          sku: variant.sku ?? "",
          barcode: variant.barcode ?? "",
          options: variant.options ?? [],
          option_values: variant.option_values,
          price_override: formatPriceInput(variant.price_override ?? product.price),
          sale_price_override: formatPriceInput(variant.sale_price_override),
          stock_quantity: String(variant.stock_quantity ?? 0),
          low_stock_threshold: String(variant.low_stock_threshold ?? 0),
          active: variant.active,
        }))
      : [];
    const loadedVariants = synchronizeVariantCombinations(
      loadedGroups,
      persistedVariants,
      String(product.price ?? ""),
      String(product.low_stock_threshold ?? 0),
      createLocalId,
    );

    setHasVariants(loadedGroups.length > 0);
    setVariantGroups(loadedGroups);
    setVariants(loadedVariants);
    setNewOption({});
    setBulkPrice("");
    setBulkStock("");
  }

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  function addTags(values: string[]) {
    setTags((current) => appendUniqueTags(current, values));
  }

  function commitTagInput() {
    if (tagInput.trim()) addTags([tagInput]);
    setTagInput("");
  }

  function removeTag(index: number) {
    setTags((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - images.length);
    const selectedFiles = files.slice(0, availableSlots);
    const acceptedFiles = selectedFiles.filter((file) => file.size <= MAX_PRODUCT_IMAGE_BYTES);

    if (files.length > availableSlots || acceptedFiles.length !== selectedFiles.length) {
      setNotice(`Unable to add every image. Use up to ${MAX_PRODUCT_IMAGES} images with a maximum size of 15MB each.`);
    } else {
      setNotice(null);
    }

    if (acceptedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const previews = await Promise.all(
      acceptedFiles.map(
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
      ...acceptedFiles.map((file, index) => ({
        localId: createLocalId(),
        file,
        url: previews[index],
        isPrimary: current.length === 0 && index === 0,
      })),
    ]);

    event.target.value = "";
  }

  function reorderImage(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    setImages((current) => {
      const sourceIndex = current.findIndex((image) => image.localId === sourceId);
      const targetIndex = current.findIndex((image) => image.localId === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((image, index) => ({ ...image, isPrimary: index === 0 }));
    });
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggedImageId || event.dataTransfer.getData("text/plain");
    if (sourceId) reorderImage(sourceId, targetId);
    setDraggedImageId(null);
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
    setVariantGroups((current) => [
      ...current,
      { localId: createLocalId(), name: current.length === 0 ? "Color" : "Option", options: [] },
    ]);
    setHasVariants(true);
  }

  function removeVariant(localId: string) {
    setVariantGroups((currentGroups) => {
      const nextGroups = currentGroups.filter((group) => group.localId !== localId);
      setVariants((current) => synchronizeVariantCombinations(nextGroups, current, price, lowStockThreshold, createLocalId));
      return nextGroups;
    });
  }

  function addVariantOption(localId: string) {
    const value = (newOption[localId] ?? "").trim();
    if (!value) return;

    setVariantGroups((currentGroups) => {
      const nextGroups = currentGroups.map((group) => {
        if (group.localId !== localId || group.options.some((option) => option.toLocaleLowerCase() === value.toLocaleLowerCase())) {
          return group;
        }
        return { ...group, options: [...group.options, value] };
      });
      setVariants((current) => synchronizeVariantCombinations(nextGroups, current, price, lowStockThreshold, createLocalId));
      return nextGroups;
    });
    setNewOption((current) => ({ ...current, [localId]: "" }));
  }

  function removeVariantOption(localId: string, option: string) {
    setVariantGroups((currentGroups) => {
      const nextGroups = currentGroups.map((group) =>
        group.localId === localId
          ? { ...group, options: group.options.filter((item) => item !== option) }
          : group,
      );
      setVariants((current) => synchronizeVariantCombinations(nextGroups, current, price, lowStockThreshold, createLocalId));
      return nextGroups;
    });
  }

  function renameVariantGroup(localId: string, nextName: string) {
    setVariantGroups((currentGroups) => {
      const groupIndex = currentGroups.findIndex((group) => group.localId === localId);
      if (groupIndex < 0) return currentGroups;

      const previousName = currentGroups[groupIndex].name;
      const nextGroups = currentGroups.map((group) => group.localId === localId ? { ...group, name: nextName } : group);
      setVariants((current) => synchronizeVariantCombinations(
        nextGroups,
        current.map((variant) => ({
          ...variant,
          option_values: variant.option_values.map((option) =>
            option.name === previousName ? { ...option, name: nextName } : option,
          ),
        })),
        price,
        lowStockThreshold,
        createLocalId,
      ));
      return nextGroups;
    });
  }

  function updateVariantRow(localId: string, changes: Partial<ProductVariantDraftState>) {
    setVariants((current) => current.map((variant) => variant.localId === localId ? { ...variant, ...changes } : variant));
  }

  async function handleSave(nextStatus: ProductStatus) {
    if (!canSubmit || saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;

    const payload: SellerProductSubmission = {
      name,
      description: description || null,
      category_id: Number(categoryId),
      tags: appendUniqueTags(tags, tagInput.trim() ? [tagInput] : []),
      sku,
      barcode: barcode || null,
      price: Number(price),
      sale_price: salePrice ? Number(salePrice) : null,
      cost_price: costPrice ? Number(costPrice) : null,
      status: nextStatus,
      delivery_type: deliveryType,
      track_inventory: true,
      stock_quantity: hasVariants ? variantStockTotal : Number(stockQuantity || 0),
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
            option_values: variant.option_values,
            price_override: Number(variant.price_override),
            sale_price_override: variant.sale_price_override ? Number(variant.sale_price_override) : null,
            stock_quantity: Number(variant.stock_quantity || 0),
            low_stock_threshold: Number(variant.low_stock_threshold || 0),
            active: variant.active,
          }))
        : [],
      keep_image_ids: images.filter((image) => image.id && !image.file).map((image) => image.id as number),
      image_files: images.filter((image) => image.file).map((image) => image.file as File),
    };

    setSavingStatus(nextStatus);
    setNotice(null);
    setValidationErrors({});

    try {
      if (isEditing && id) {
        await updateSellerProduct(Number(id), payload);
      } else {
        await createSellerProduct(payload);
      }

      navigate("/seller-center/products");
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setValidationErrors(error.errors);
        setNotice([...new Set(Object.values(error.errors).flat())].join(" "));
      } else {
        setNotice(error instanceof Error ? error.message : "Unable to save the product right now.");
      }
    } finally {
      saveInFlightRef.current = false;
      setSavingStatus(null);
    }
  }

  const primaryImage = images[0]?.url;
  const fieldError = (field: string) => validationErrors[field]?.[0];
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-5">
          <SectionCard title="Product information">
            <div className="mb-4">
              <label className={LABEL}>Product name <span className="text-[var(--color-red)]">*</span></label>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Organic Lavender Serum 30ml" className={`${INPUT} ${fieldError("name") ? "border-[var(--color-red)]" : ""}`} aria-invalid={Boolean(fieldError("name"))} />
              {fieldError("name") && <p className="mt-1 text-xs text-[var(--color-red)]">{fieldError("name")}</p>}
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
                <select className={`${INPUT} cursor-pointer ${fieldError("category_id") ? "border-[var(--color-red)]" : ""}`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-invalid={Boolean(fieldError("category_id"))}>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
                {fieldError("category_id") && <p className="mt-1 text-xs text-[var(--color-red)]">{fieldError("category_id")}</p>}
              </div>
              <div>
                <label htmlFor="product-tags" className={LABEL}>Tags</label>
                <div
                  onClick={() => tagInputRef.current?.focus()}
                  className="w-full min-h-[42px] px-3 py-2 border border-[var(--color-border)] rounded-sm bg-white flex flex-wrap items-center gap-2 focus-within:border-[var(--color-navy)] transition-colors cursor-text"
                >
                  {tags.map((tag, index) => (
                    <span key={`${tag}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--color-navy-surface)] px-2.5 py-1 text-xs text-[var(--color-navy)]">
                      <span className="truncate">{tag}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeTag(index);
                        }}
                        aria-label={`Remove ${tag} tag`}
                        className="shrink-0 rounded-full text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    id="product-tags"
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        commitTagInput();
                      } else if (event.key === "Backspace" && tagInput === "") {
                        setTags((current) => current.slice(0, -1));
                      }
                    }}
                    onPaste={(event) => {
                      const pasted = event.clipboardData.getData("text");
                      if (!pasted.includes(",")) return;

                      event.preventDefault();
                      addTags(pasted.split(","));
                      setTagInput("");
                    }}
                    onBlur={commitTagInput}
                    placeholder={tags.length === 0 ? "Type a tag..." : "Add another tag..."}
                    className="min-w-[8rem] flex-1 border-0 bg-transparent p-0 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] focus:outline-none font-[var(--font-body)]"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Product images" subtitle="Upload up to 8 images. The first image will be your listing thumbnail.">
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <div className="grid grid-cols-4 gap-3 mb-3">
              {images.map((image, index) => (
                <div
                  key={image.localId}
                  draggable={images.length > 1}
                  onDragStart={(event) => {
                    setDraggedImageId(image.localId);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", image.localId);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => handleImageDrop(event, image.localId)}
                  onDragEnd={() => setDraggedImageId(null)}
                  className={`relative group aspect-square rounded-sm overflow-hidden bg-[var(--color-surface)] border cursor-grab active:cursor-grabbing transition-opacity ${draggedImageId === image.localId ? "opacity-50 border-[var(--color-navy)]" : "border-[var(--color-border)]"}`}
                >
                  <img src={image.url} alt="" className="w-full h-full object-cover" />
                  {index === 0 && <span className="absolute top-1 left-1 font-[var(--font-mono)] text-[8px] bg-[var(--color-navy)] text-white px-1.5 py-0.5 rounded">MAIN</span>}
                  <button onClick={() => removeImage(image.localId)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-sm items-center justify-center hidden group-hover:flex cursor-pointer">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2L2 8" /></svg>
                  </button>
                </div>
              ))}
              {images.length < MAX_PRODUCT_IMAGES && (
                <button onClick={openImagePicker} className="aspect-square rounded-sm border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
                  <span className="text-[10px] text-[var(--color-ink-muted)]">Add photo</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--color-ink-disabled)]">Drag to reorder. Recommended: 800×800px, JPEG or PNG, max 15MB each.</p>
          </SectionCard>

          <SectionCard title="Pricing & discounts">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={LABEL}>Base price <span className="text-[var(--color-red)]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="text" inputMode="decimal" value={formatCurrencyInput(price)} onChange={(event) => setPrice(sanitizeCurrencyInput(event.target.value))} className={`${INPUT} pl-7 ${fieldError("price") ? "border-[var(--color-red)]" : ""}`} aria-invalid={Boolean(fieldError("price"))} />
                </div>
                {fieldError("price") && <p className="mt-1 text-xs text-[var(--color-red)]">{fieldError("price")}</p>}
              </div>
              <div>
                <label className={LABEL}>Sale price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₱</span>
                  <input type="text" inputMode="decimal" value={formatCurrencyInput(salePrice)} onChange={(event) => setSalePrice(sanitizeCurrencyInput(event.target.value))} placeholder="Optional" className={INPUT + " pl-7"} />
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
                  <input type="text" inputMode="decimal" value={formatCurrencyInput(costPrice)} onChange={(event) => setCostPrice(sanitizeCurrencyInput(event.target.value))} placeholder="Your production cost" className={INPUT + " pl-7"} />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                  <span className="text-xs text-[var(--color-green)]">Margin: <span className="font-[500]">Estimated from your pricing</span></span>
                </div>
              </div>
            </div>
          </SectionCard>

          {!hasVariants && (
            <SectionCard title="Inventory & SKU">
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={LABEL}>SKU <span className="text-[var(--color-red)]">*</span></label>
                    <input type="text" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="e.g. VB-SRM-001" className={`${INPUT} ${fieldError("sku") ? "border-[var(--color-red)]" : ""}`} aria-invalid={Boolean(fieldError("sku"))} />
                    {fieldError("sku") && <p className="mt-1 text-xs text-[var(--color-red)]">{fieldError("sku")}</p>}
                  </div>
                  <div>
                    <label className={LABEL}>Barcode / ISBN (optional)</label>
                    <input type="text" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Optional" className={INPUT} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={LABEL}>Quantity in stock <span className="text-[var(--color-red)]">*</span></label>
                    <input type="number" min="0" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} className={`${INPUT} ${fieldError("stock_quantity") ? "border-[var(--color-red)]" : ""}`} aria-invalid={Boolean(fieldError("stock_quantity"))} />
                    {fieldError("stock_quantity") && <p className="mt-1 text-xs text-[var(--color-red)]">{fieldError("stock_quantity")}</p>}
                  </div>
                  <div>
                    <label className={LABEL}>Low stock threshold</label>
                    <input type="number" min="0" value={lowStockThreshold} onChange={(event) => setLowStockThreshold(event.target.value)} className={INPUT} />
                    <p className="text-xs text-[var(--color-ink-muted)] mt-1">Alert when stock falls below this number</p>
                  </div>
                </div>
              </>
            </SectionCard>
          )}

          <SectionCard title="Variants" subtitle="Add size, color, or other options. Each combination can have its own stock and SKU.">
            <label className="flex items-center gap-2.5 cursor-pointer mb-5">
              <div
                onClick={() => {
                  if (hasVariants) {
                    setHasVariants(false);
                  } else {
                    setHasVariants(true);
                    if (variantGroups.length === 0) setVariantGroups([{ localId: createLocalId(), name: "Color", options: [] }]);
                  }
                }}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${hasVariants ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${hasVariants ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-sm text-[var(--color-ink-muted)]">This product has variants</span>
            </label>

            {hasVariants && (
              <div className="space-y-4">
                {variantGroups.map((group) => (
                  <div key={group.localId} className="border border-[var(--color-border)] rounded-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(event) => renameVariantGroup(group.localId, event.target.value)}
                        className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]"
                        placeholder="Option name (e.g. Color)"
                      />
                      <button onClick={() => removeVariant(group.localId)} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-red)] cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {group.options.map((option) => (
                        <span key={option} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs rounded border border-[var(--color-navy)]/20">
                          {option}
                          <button onClick={() => removeVariantOption(group.localId, option)} className="text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOption[group.localId] ?? ""}
                        onChange={(event) => setNewOption((current) => ({ ...current, [group.localId]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addVariantOption(group.localId);
                          }
                        }}
                        placeholder={`Add ${group.name.toLowerCase()} option`}
                        className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]"
                      />
                      <button onClick={() => addVariantOption(group.localId)} className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-sm rounded-sm hover:bg-[var(--color-border)] cursor-pointer">Add</button>
                    </div>
                  </div>
                ))}
                <button onClick={addVariant} className="flex items-center gap-2 text-sm text-[var(--color-navy)] hover:underline cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10" /></svg>
                  Add option group
                </button>

                {variants.length > 0 && (
                  <div className="space-y-3 border-t border-[var(--color-border)] pt-5">
                    <div className="grid grid-cols-1 gap-3 rounded-sm bg-[var(--color-surface)] p-3 sm:grid-cols-2 xl:grid-cols-[1fr_auto_1fr_auto] xl:items-end">
                      <div>
                        <label className={LABEL}>Set price for all</label>
                        <input type="text" inputMode="decimal" value={formatCurrencyInput(bulkPrice)} onChange={(event) => setBulkPrice(sanitizeCurrencyInput(event.target.value))} placeholder="0.00" className={INPUT} />
                      </div>
                      <button type="button" onClick={() => bulkPrice !== "" && setVariants((current) => current.map((variant) => ({ ...variant, price_override: bulkPrice })))} className="px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm hover:bg-white cursor-pointer">Apply price</button>
                      <div>
                        <label className={LABEL}>Set stock for all</label>
                        <input type="number" min="0" value={bulkStock} onChange={(event) => setBulkStock(event.target.value)} placeholder="0" className={INPUT} />
                      </div>
                      <button type="button" onClick={() => bulkStock !== "" && Number(bulkStock) >= 0 && setVariants((current) => current.map((variant) => ({ ...variant, stock_quantity: bulkStock })))} className="px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm hover:bg-white cursor-pointer">Apply stock</button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-[600] text-[var(--color-ink)]">Generated combinations</h3>
                      <span className="text-xs text-[var(--color-ink-muted)]">{variants.length} variants · Total stock: {variantStockTotal}</span>
                    </div>
                    <div className="space-y-3">
                      {variants.map((variant, variantIndex) => {
                        const normalizedSku = variant.sku?.trim().toLocaleLowerCase() ?? "";
                        const hasDuplicateSku = normalizedSku !== "" && duplicateVariantSkus.has(normalizedSku);
                        const variantPriceError = fieldError(`variants.${variantIndex}.price_override`);
                        const variantStockError = fieldError(`variants.${variantIndex}.stock_quantity`);
                        const variantSkuError = fieldError(`variants.${variantIndex}.sku`);

                        return (
                          <div key={variant.localId} className="rounded-sm border border-[var(--color-border)] p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-[600] text-[var(--color-ink)]">{variant.name}</p>
                              <label className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                                <input type="checkbox" checked={variant.active} onChange={(event) => updateVariantRow(variant.localId, { active: event.target.checked })} className="accent-[var(--color-navy)]" /> Available
                              </label>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <div>
                                <label className={LABEL}>Price <span className="text-[var(--color-red)]">*</span></label>
                                <input type="text" inputMode="decimal" value={formatCurrencyInput(variant.price_override)} onChange={(event) => updateVariantRow(variant.localId, { price_override: sanitizeCurrencyInput(event.target.value) })} className={`${INPUT} ${variantPriceError ? "border-[var(--color-red)]" : ""}`} aria-invalid={Boolean(variantPriceError)} />
                                {variantPriceError && <p className="mt-1 text-xs text-[var(--color-red)]">{variantPriceError}</p>}
                              </div>
                              <div>
                                <label className={LABEL}>Sale price</label>
                                <input type="text" inputMode="decimal" value={formatCurrencyInput(variant.sale_price_override)} onChange={(event) => updateVariantRow(variant.localId, { sale_price_override: sanitizeCurrencyInput(event.target.value) })} placeholder="Optional" className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Stock <span className="text-[var(--color-red)]">*</span></label>
                                <input type="number" min="0" value={variant.stock_quantity} onChange={(event) => updateVariantRow(variant.localId, { stock_quantity: event.target.value })} className={`${INPUT} ${variantStockError ? "border-[var(--color-red)]" : ""}`} aria-invalid={Boolean(variantStockError)} />
                                {variantStockError && <p className="mt-1 text-xs text-[var(--color-red)]">{variantStockError}</p>}
                              </div>
                              <div>
                                <label className={LABEL}>SKU <span className="text-[var(--color-red)]">*</span></label>
                                <input type="text" value={variant.sku ?? ""} onChange={(event) => updateVariantRow(variant.localId, { sku: event.target.value })} className={`${INPUT} ${hasDuplicateSku || variantSkuError ? "border-[var(--color-red)]" : ""}`} aria-invalid={hasDuplicateSku || Boolean(variantSkuError)} />
                                {(hasDuplicateSku || variantSkuError) && <p className="mt-1 text-xs text-[var(--color-red)]">{variantSkuError ?? "SKU already used by another variant."}</p>}
                              </div>
                              <div>
                                <label className={LABEL}>Barcode / ISBN</label>
                                <input type="text" value={variant.barcode ?? ""} onChange={(event) => updateVariantRow(variant.localId, { barcode: event.target.value })} placeholder="Optional" className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Low stock threshold</label>
                                <input type="number" min="0" value={variant.low_stock_threshold} onChange={(event) => updateVariantRow(variant.localId, { low_stock_threshold: event.target.value })} className={INPUT} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {variantGroups.length > 0 && variants.length === 0 && (
                  <p className="rounded-sm border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-ink-muted)]">Add at least one value to every option group to generate sellable combinations.</p>
                )}
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

        <div className="space-y-5 lg:col-start-3 lg:row-start-1 lg:space-y-1.5 lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 lg:p-2.5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4 lg:mb-2">Product status</h2>
            <div className="space-y-2 lg:space-y-1">
              {(["draft", "active", "archived"] as const).map((item) => (
                <label key={item} className={`flex items-center gap-2.5 p-3 lg:px-2 lg:py-1.5 rounded-sm border cursor-pointer transition-all ${status === item ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"}`}>
                  <input type="radio" name="status" value={item} checked={status === item} onChange={() => setStatus(item)} className="accent-[var(--color-navy)]" />
                  <p className={`text-sm font-[500] ${status === item ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>
                    {item === "draft" ? "Save as draft" : item === "active" ? "Publish now" : "Archive listing"}
                    <span className="block text-xs font-[400] text-[var(--color-ink-muted)] lg:inline lg:ml-1 lg:text-[10px]">· {item === "draft" ? "Not visible to buyers" : item === "active" ? "Visible to all buyers" : "Hidden from buyers"}</span>
                  </p>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 lg:px-2.5 lg:py-1.5 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-[600] text-[var(--color-ink)]">Listing preview</h2>
            </div>
            <div className="p-4 lg:p-2.5">
              <div className="relative aspect-square lg:aspect-[4/3] rounded-sm overflow-hidden bg-[var(--color-surface)] mb-3 lg:mb-2 flex items-center justify-center">
                {primaryImage ? <img src={primaryImage} alt={name || "Product preview"} className="absolute inset-0 block w-full h-full object-cover object-center" /> : <span className="text-xs text-[var(--color-ink-disabled)]">No image yet</span>}
              </div>
              <p className="text-sm font-[500] text-[var(--color-ink)] mb-1 lg:mb-0.5">{name || "Your product"}</p>
              <p className="font-[var(--font-mono)] text-base text-[var(--color-ink)] mb-1 lg:mb-0.5">
                {salePrice && saleAsNumber > 0 && saleAsNumber < priceAsNumber ? (
                  <><span className="text-[var(--color-red)]">₱{formatCurrencyInput(salePrice)}</span> <span className="text-[var(--color-ink-disabled)] line-through text-sm">₱{formatCurrencyInput(price)}</span></>
                ) : `₱${formatCurrencyInput(price) || "0"}`}
              </p>
              <p className="text-xs text-[var(--color-ink-disabled)]">{categoryLabel} · ★ 4.8</p>
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 lg:p-2.5">
            <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-3 lg:mb-2">Listing completeness</h2>
            <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-2 lg:gap-y-1">
              {[
                { label: "Product name", done: name.trim().length > 0 },
                { label: "Description", done: description.trim().length > 0 },
                { label: "Category", done: categoryId !== "" },
                { label: "At least 1 image", done: images.length > 0 },
                { label: "Base price", done: price !== "" },
                { label: "SKU assigned", done: hasVariants ? variants.length > 0 && variants.every((variant) => variant.sku?.trim()) : sku.trim().length > 0 },
                { label: "Inventory quantity", done: hasVariants ? variants.length > 0 : stockQuantity !== "" },
                { label: "Shipping info", done: deliveryType.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 lg:gap-1.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-[var(--color-green)]" : "border border-[var(--color-border)]"}`}>
                    {item.done && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
                  </div>
                  <span className={`text-xs ${item.done ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {!isEditing && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => void handleSave("draft")}
                disabled={!canSubmit || savingStatus !== null}
                className={`px-4 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-surface)] cursor-pointer"}`}
              >
                {savingStatus === "draft" ? PRODUCT_STATUS_ACTION_LABELS.draft.loading : PRODUCT_STATUS_ACTION_LABELS.draft.idle}
              </button>
              <button
                onClick={() => void handleSave("active")}
                disabled={!canSubmit || savingStatus !== null}
                className={`px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}
              >
                {savingStatus === "active" ? PRODUCT_STATUS_ACTION_LABELS.active.loading : PRODUCT_STATUS_ACTION_LABELS.active.idle}
              </button>
            </div>
          )}

          {isEditing && (
            <button
              onClick={() => void handleSave(status)}
              disabled={!canSubmit || savingStatus !== null}
              className={`w-full px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${!canSubmit || savingStatus !== null ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}
            >
              {PRODUCT_STATUS_ACTION_LABELS[savingStatus ?? status][savingStatus ? "loading" : "idle"]}
            </button>
          )}

          {notice && (
            <p className={`text-sm ${Object.keys(validationErrors).length > 0 || notice.toLowerCase().includes("unable") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{notice}</p>
          )}
        </div>
      </div>
    </div>
  );
}
