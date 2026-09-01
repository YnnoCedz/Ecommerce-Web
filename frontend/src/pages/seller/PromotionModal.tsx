import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { ApiError } from "../../api/client";
import {
  createSellerPromotion,
  fetchSellerProducts,
  updateSellerPromotion,
  type SellerProduct,
  type SellerPromotion,
  type TimedPromotionPayload,
} from "../../api/seller";

type ScheduleMode = "exact" | "duration";
type DiscountType = "percentage" | "fixed-price";

const INPUT =
  "w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm focus:border-[var(--color-navy)] focus:outline-none";
const formatMoney = (value: number) =>
  `PHP ${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const localParts = (date: Date) => ({
  date: new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10),
  time: date.toTimeString().slice(0, 5),
});
const fromLocal = (date: string, time: string) => new Date(`${date}T${time}`);

function defaultWindow() {
  const start = new Date(Date.now() + 5 * 60_000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { start: localParts(start), end: localParts(end) };
}

function ProductRow({
  product,
  active,
  onSelect,
}: {
  product: SellerProduct;
  active: boolean;
  onSelect: () => void;
}) {
  const price = product.sale_price ?? product.price;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-[var(--color-border-subtle)] p-3 text-left last:border-0 hover:bg-[var(--color-surface)] ${active ? "bg-[var(--color-navy-surface)]" : ""}`}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-[var(--color-surface)]">
        {product.image ? (
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-ink-disabled)]">
            No image
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-[600]">{product.name}</p>
        <p className="truncate text-xs text-[var(--color-ink-muted)]">
          SKU: {product.sku || "Not assigned"}
        </p>
        <p className="mt-1 text-xs sm:hidden">
          {formatMoney(price)} · {product.stock_quantity} stock
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-[600]">{formatMoney(price)}</p>
        <p className="text-xs text-[var(--color-ink-muted)]">
          {product.stock_quantity} in stock
        </p>
      </div>
    </button>
  );
}

export default function PromotionModal({
  onClose,
  onSaved,
  promotion,
}: {
  onClose: () => void;
  onSaved: (promotion: SellerPromotion) => void;
  promotion?: SellerPromotion | null;
}) {
  const initial = useMemo(defaultWindow, []);
  const initialStart = promotion?.starts_at
    ? localParts(new Date(promotion.starts_at))
    : initial.start;
  const initialEnd = promotion?.ends_at
    ? localParts(new Date(promotion.ends_at))
    : initial.end;
  const [selected, setSelected] = useState<SellerProduct | null>(null);
  const [query, setQuery] = useState(promotion?.product?.name ?? "");
  const [results, setResults] = useState<SellerProduct[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [name, setName] = useState(promotion?.name ?? "");
  const [type, setType] = useState<DiscountType>(
    promotion?.type === "percentage" ? "percentage" : "fixed-price",
  );
  const [value, setValue] = useState(promotion ? String(promotion.value) : "");
  const [limitTotal, setLimitTotal] = useState(
    promotion?.usage_limit !== null && promotion?.usage_limit !== undefined,
  );
  const [usageLimit, setUsageLimit] = useState(
    String(promotion?.usage_limit ?? 20),
  );
  const [limitBuyer, setLimitBuyer] = useState(
    promotion?.per_buyer_limit !== null &&
      promotion?.per_buyer_limit !== undefined,
  );
  const [buyerLimit, setBuyerLimit] = useState(
    String(promotion?.per_buyer_limit ?? 1),
  );
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(
    promotion ? "exact" : "duration",
  );
  const [duration, setDuration] = useState(60);
  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);

  const loadProducts = (search: string, targetPage = 1, append = false) => {
    const controller = new AbortController();
    const requestId = ++searchRequestRef.current;
    setSearching(true);
    setSearchError("");
    void fetchSellerProducts({
      search: search.trim(),
      page: targetPage,
      per_page: 12,
      signal: controller.signal,
    })
      .then((response) => {
        if (requestId !== searchRequestRef.current) return;
        const active = response.data.filter(
          (product) => product.status === "active",
        );
        setResults((current) => (append ? [...current, ...active] : active));
        setPage(response.meta?.current_page ?? targetPage);
        setLastPage(response.meta?.last_page ?? 1);
        if (!selected && promotion?.product?.id)
          setSelected(
            active.find((product) => product.id === promotion.product?.id) ??
              null,
          );
      })
      .catch((cause) => {
        if (requestId !== searchRequestRef.current) return;
        if (!(cause instanceof DOMException && cause.name === "AbortError"))
          setSearchError("Unable to load products.");
      })
      .finally(() => {
        if (requestId === searchRequestRef.current) setSearching(false);
      });
    return controller;
  };

  useEffect(() => {
    let controller: AbortController | undefined;
    const timer = window.setTimeout(() => {
      controller = loadProducts(query, 1);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [query]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        pickerOpen ? setPickerOpen(false) : onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, pickerOpen, saving]);

  const normalPrice = selected ? (selected.sale_price ?? selected.price) : 0;
  const hasVariants = Boolean(
    selected?.variants.some((variant) => variant.active),
  );
  const numericValue = Number(value);
  const promotionPrice =
    type === "percentage"
      ? normalPrice * (1 - numericValue / 100)
      : numericValue;
  const validDiscount =
    normalPrice > 0 &&
    numericValue > 0 &&
    promotionPrice > 0 &&
    promotionPrice < normalPrice &&
    (type !== "percentage" || numericValue < 100);
  const starts =
    scheduleMode === "duration" ? new Date() : fromLocal(startDate, startTime);
  const ends =
    scheduleMode === "duration"
      ? new Date(starts.getTime() + duration * 60_000)
      : fromLocal(endDate, endTime);
  const validSchedule =
    Number.isFinite(starts.getTime()) &&
    Number.isFinite(ends.getTime()) &&
    ends > starts;
  const validUsage =
    !limitTotal ||
    (Number.isInteger(Number(usageLimit)) && Number(usageLimit) >= 1);
  const validBuyer =
    !limitBuyer ||
    (Number.isInteger(Number(buyerLimit)) &&
      Number(buyerLimit) >= 1 &&
      (!limitTotal || Number(buyerLimit) <= Number(usageLimit)));
  const canSubmit = Boolean(
    selected &&
    name.trim() &&
    name.trim().length <= 120 &&
    validDiscount &&
    validSchedule &&
    validUsage &&
    validBuyer &&
    !(hasVariants && type === "fixed-price"),
  );

  const selectProduct = (product: SellerProduct) => {
    setSelected(product);
    setQuery(product.name);
    setPickerOpen(false);
    if (product.variants.some((variant) => variant.active))
      setType("percentage");
  };
  const setUntil = (hour: number) => {
    const start = new Date();
    const end = new Date(start);
    end.setHours(hour, 0, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    const minutes = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 60_000),
    );
    setDuration(minutes);
    setScheduleMode("duration");
  };
  const submit = async () => {
    if (!selected || !canSubmit || saving) return;
    setSaving(true);
    setError("");
    setFieldErrors({});
    const payload: TimedPromotionPayload = {
      product_id: selected.id,
      name: name.trim(),
      type,
      value: numericValue,
      deal_price: type === "fixed-price" ? numericValue : null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      usage_limit: limitTotal ? Number(usageLimit) : null,
      per_buyer_limit: limitBuyer ? Number(buyerLimit) : null,
    };
    try {
      const response = promotion
        ? await updateSellerPromotion(promotion.id, payload)
        : await createSellerPromotion(payload);
      onSaved(response.data);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError) setFieldErrors(cause.errors ?? {});
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the promotion.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-modal-title"
        className="flex max-h-[96vh] w-full flex-col rounded-t-sm bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-[900px] sm:rounded-sm"
      >
        <header className="sticky top-0 z-20 flex items-start justify-between border-b border-[var(--color-border)] bg-white px-5 py-4 sm:px-6">
          <div>
            <h2
              id="promotion-modal-title"
              className="font-[var(--font-display)] text-xl"
            >
              {promotion ? "Edit scheduled promotion" : "Create promotion"}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Create a timed or limited promotion for one of your products.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close promotion modal"
            disabled={saving}
            onClick={onClose}
            className="rounded-sm p-2 hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-6">
            <section>
              <label className="mb-2 block text-xs font-[700]">Product</label>
              {selected && !pickerOpen ? (
                <div className="flex items-center gap-3 rounded-sm border border-[var(--color-border)] p-3">
                  <ProductRow
                    product={selected}
                    active={false}
                    onSelect={() => {}}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(true);
                      setQuery("");
                    }}
                    className="shrink-0 text-xs text-[var(--color-navy)]"
                  >
                    Change product
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
                    />
                    <input
                      ref={searchRef}
                      role="combobox"
                      aria-expanded={pickerOpen}
                      aria-controls="promotion-product-results"
                      aria-autocomplete="list"
                      value={query}
                      onFocus={() => setPickerOpen(true)}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPickerOpen(true);
                        setHighlighted(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setHighlighted((value) =>
                            Math.min(results.length - 1, value + 1),
                          );
                        }
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setHighlighted((value) => Math.max(0, value - 1));
                        }
                        if (event.key === "Enter" && results[highlighted]) {
                          event.preventDefault();
                          selectProduct(results[highlighted]);
                        }
                      }}
                      placeholder="Search products by name or SKU..."
                      className={`${INPUT} pl-9 pr-9`}
                    />
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
                    />
                  </div>
                  {pickerOpen && (
                    <div
                      id="promotion-product-results"
                      role="listbox"
                      className="mt-1 max-h-72 overflow-y-auto rounded-sm border border-[var(--color-border)] bg-white shadow-lg"
                    >
                      {searching && !results.length ? (
                        <div className="flex items-center justify-center gap-2 p-6 text-sm text-[var(--color-ink-muted)]">
                          <LoaderCircle size={16} className="animate-spin" />
                          Searching products...
                        </div>
                      ) : searchError ? (
                        <div className="p-5 text-center text-sm text-[var(--color-red)]">
                          <p>{searchError}</p>
                          <button
                            type="button"
                            onClick={() => loadProducts(query)}
                            className="mt-2 text-[var(--color-navy)] underline"
                          >
                            Retry
                          </button>
                        </div>
                      ) : !results.length ? (
                        <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">
                          No products found{query ? ` for “${query}”` : ""}.
                        </p>
                      ) : (
                        <>
                          {results.map((product, index) => (
                            <ProductRow
                              key={product.id}
                              product={product}
                              active={index === highlighted}
                              onSelect={() => selectProduct(product)}
                            />
                          ))}
                          {page < lastPage && (
                            <button
                              type="button"
                              disabled={searching}
                              onClick={() =>
                                loadProducts(query, page + 1, true)
                              }
                              className="w-full p-3 text-sm text-[var(--color-navy)] disabled:opacity-50"
                            >
                              {searching ? "Loading..." : "Load more"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {fieldErrors.product_id?.[0] && (
                <p className="mt-1 text-xs text-[var(--color-red)]">
                  {fieldErrors.product_id[0]}
                </p>
              )}
            </section>

            <section className="border-t border-[var(--color-border)] pt-5">
              <h3 className="mb-3 text-sm font-[700]">Promotion details</h3>
              <div className="space-y-4">
                <label className="block text-xs font-[600]">
                  Promotion name
                  <input
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={`${INPUT} mt-1`}
                    placeholder="Weekend Flash Sale"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-[600]">
                    Discount
                    <select
                      value={type}
                      onChange={(event) => {
                        setType(event.target.value as DiscountType);
                        setValue("");
                      }}
                      className={`${INPUT} mt-1`}
                    >
                      <option value="percentage">Percentage off</option>
                      <option value="fixed-price" disabled={hasVariants}>
                        Deal price
                      </option>
                    </select>
                  </label>
                  <label className="block text-xs font-[600]">
                    Value
                    <div className="relative mt-1">
                      {type === "fixed-price" && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-muted)]">
                          PHP
                        </span>
                      )}
                      <input
                        type="number"
                        min="0.01"
                        max={type === "percentage" ? 99.99 : undefined}
                        step="0.01"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        className={`${INPUT} ${type === "fixed-price" ? "pl-11" : "pr-8"}`}
                      />
                      {type === "percentage" && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                          %
                        </span>
                      )}
                    </div>
                  </label>
                </div>
                {hasVariants && (
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    This discount will be calculated from each variant’s current
                    price.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 rounded-sm bg-[var(--color-surface)] p-3 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-[var(--color-ink-muted)]">
                      Current price
                    </span>
                    <p className="font-[600]">{formatMoney(normalPrice)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-ink-muted)]">
                      Discount
                    </span>
                    <p className="font-[600]">
                      {type === "percentage"
                        ? `${numericValue || 0}%`
                        : formatMoney(
                            Math.max(0, normalPrice - promotionPrice),
                          )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--color-ink-muted)]">
                      Promotion price
                    </span>
                    <p className="font-[600] text-[var(--color-green)]">
                      {formatMoney(Math.max(0, promotionPrice || 0))}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--color-ink-muted)]">
                      You save
                    </span>
                    <p className="font-[600]">
                      {formatMoney(
                        Math.max(0, normalPrice - promotionPrice || 0),
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-[var(--color-border)] pt-5">
              <h3 className="mb-3 text-sm font-[700]">Usage limit</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    <b>Limit total redemptions</b>
                    <small className="block text-[var(--color-ink-muted)]">
                      Stops after this many successful qualifying orders.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={limitTotal}
                    onChange={(event) => setLimitTotal(event.target.checked)}
                    className="h-5 w-5 accent-[var(--color-navy)]"
                  />
                </label>
                {limitTotal && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {[10, 20, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setUsageLimit(String(amount))}
                          className={`rounded-sm border px-3 py-2 text-xs ${Number(usageLimit) === amount ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)] text-[var(--color-navy)]" : "border-[var(--color-border)]"}`}
                        >
                          {amount} uses
                        </button>
                      ))}
                    </div>
                    <label className="mt-3 block max-w-xs text-xs font-[600]">
                      Custom total uses
                      <input
                        type="number"
                        min="1"
                        value={usageLimit}
                        onChange={(event) => setUsageLimit(event.target.value)}
                        className={`${INPUT} mt-1`}
                      />
                    </label>
                  </div>
                )}
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    <b>Limit uses per buyer</b>
                    <small className="block text-[var(--color-ink-muted)]">
                      Counts successful qualifying orders for each buyer.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={limitBuyer}
                    onChange={(event) => setLimitBuyer(event.target.checked)}
                    className="h-5 w-5 accent-[var(--color-navy)]"
                  />
                </label>
                {limitBuyer && (
                  <label className="block max-w-xs text-xs font-[600]">
                    Uses per buyer
                    <input
                      type="number"
                      min="1"
                      value={buyerLimit}
                      onChange={(event) => setBuyerLimit(event.target.value)}
                      className={`${INPUT} mt-1`}
                    />
                  </label>
                )}
              </div>
            </section>

            <section className="border-t border-[var(--color-border)] pt-5">
              <h3 className="mb-3 text-sm font-[700]">Schedule</h3>
              <div className="mb-3 flex rounded-sm border border-[var(--color-border)] p-1">
                {(["exact", "duration"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setScheduleMode(mode)}
                    className={`flex-1 rounded-sm px-3 py-2 text-xs font-[600] ${scheduleMode === mode ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)]"}`}
                  >
                    {mode === "exact" ? "Exact schedule" : "Duration"}
                  </button>
                ))}
              </div>
              {scheduleMode === "duration" ? (
                <div>
                  <p className="mb-2 text-xs text-[var(--color-ink-muted)]">
                    Starts immediately after the promotion is created.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      [5, "5 mins"],
                      [15, "15 mins"],
                      [30, "30 mins"],
                      [60, "1 hour"],
                      [180, "3 hours"],
                      [1440, "24 hours"],
                    ].map(([minutes, label]) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setDuration(Number(minutes))}
                        className={`rounded-sm border px-3 py-2 text-xs ${duration === Number(minutes) ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)] text-[var(--color-navy)]" : "border-[var(--color-border)]"}`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUntil(8)}
                      className="rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs"
                    >
                      Until 8:00 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setUntil(20)}
                      className="rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs"
                    >
                      Until 8:00 PM
                    </button>
                  </div>
                  <label className="mt-3 block max-w-xs text-xs font-[600]">
                    Custom duration (minutes)
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(event) =>
                        setDuration(Math.max(1, Number(event.target.value)))
                      }
                      className={`${INPUT} mt-1`}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <fieldset>
                    <legend className="mb-1 text-xs font-[600]">Starts</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        aria-label="Start date"
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className={INPUT}
                      />
                      <input
                        aria-label="Start time"
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="mb-1 text-xs font-[600]">Ends</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        aria-label="End date"
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className={INPUT}
                      />
                      <input
                        aria-label="End time"
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </fieldset>
                </div>
              )}
            </section>

            <section className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="mb-3 text-[10px] font-[700] uppercase tracking-widest text-[var(--color-ink-muted)]">
                Promotion summary
              </h3>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Product
                  </span>
                  {selected?.name ?? "Select a product"}
                </p>
                <p>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Regular price
                  </span>
                  {formatMoney(normalPrice)}
                </p>
                <p>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Promotion
                  </span>
                  {type === "percentage"
                    ? `${numericValue || 0}% off`
                    : `Deal price ${formatMoney(numericValue || 0)}`}
                </p>
                <p>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Deal price
                  </span>
                  {formatMoney(Math.max(0, promotionPrice || 0))}
                </p>
                <p>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Usage
                  </span>
                  {limitTotal
                    ? `Maximum ${usageLimit} redemptions`
                    : "Unlimited redemptions"}
                  {limitBuyer ? ` · ${buyerLimit} per buyer` : ""}
                </p>
                <p>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    Schedule
                  </span>
                  {scheduleMode === "duration"
                    ? `${duration} minutes from creation`
                    : `${starts.toLocaleString()} – ${ends.toLocaleString()}`}
                </p>
              </div>
            </section>
            {error && (
              <p
                role="alert"
                className="rounded-sm bg-[var(--color-red-light)] p-3 text-sm text-[var(--color-red)]"
              >
                {error}
              </p>
            )}
          </div>
        </div>
        <footer className="sticky bottom-0 z-20 flex gap-3 border-t border-[var(--color-border)] bg-white px-5 py-4 sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 rounded-sm border border-[var(--color-border)] px-5 py-2.5 text-sm sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || saving}
            onClick={() => void submit()}
            className="flex-1 rounded-sm bg-[var(--color-navy)] px-5 py-2.5 text-sm font-[600] text-white disabled:opacity-50 sm:flex-none"
          >
            {saving
              ? "Creating..."
              : promotion
                ? "Save changes"
                : "Create promotion"}
          </button>
        </footer>
      </div>
    </div>
  );
}
