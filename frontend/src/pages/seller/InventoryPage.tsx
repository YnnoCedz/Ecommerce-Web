import { useEffect, useMemo, useState } from "react";
import { fetchSellerProducts, updateSellerInventory, type SellerProduct } from "../../api/seller";

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

type InventoryItem = {
  id: string;
  productId: number;
  productName: string;
  sku: string;
  variant: string | null;
  category: string;
  quantity: number;
  threshold: number;
  image: string;
};

function getStatus(item: InventoryItem): StockStatus {
  if (item.quantity <= 0) return "out-of-stock";
  if (item.quantity <= item.threshold) return "low-stock";
  return "in-stock";
}

const STATUS_CFG: Record<StockStatus, { label: string; color: string; bg: string }> = {
  "in-stock": { label: "In stock", color: "var(--color-green)", bg: "var(--color-green-light)" },
  "low-stock": { label: "Low stock", color: "var(--color-amber)", bg: "var(--color-amber-light)" },
  "out-of-stock": { label: "Out of stock", color: "var(--color-red)", bg: "var(--color-red-light)" },
};

function buildItems(products: SellerProduct[]): InventoryItem[] {
  const rows: InventoryItem[] = [];

  products.forEach((product) => {
    if (product.variants.length > 0) {
      product.variants.forEach((variant) => {
        rows.push({
          id: `${product.id}-${variant.id}`,
          productId: product.id,
          productName: product.name,
          sku: variant.sku ?? product.sku ?? `PRODUCT-${product.id}`,
          variant: variant.name,
          category: product.category?.name ?? "Uncategorized",
          quantity: variant.stock_quantity,
          threshold: variant.low_stock_threshold,
          image: product.image,
        });
      });
      return;
    }

    rows.push({
      id: String(product.id),
      productId: product.id,
      productName: product.name,
      sku: product.sku ?? `PRODUCT-${product.id}`,
      variant: null,
      category: product.category?.name ?? "Uncategorized",
      quantity: product.stock_quantity,
      threshold: product.low_stock_threshold,
      image: product.image,
    });
  });

  return rows;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StockStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchSellerProducts();
        if (!active) return;
        setProducts(response.data);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => buildItems(products), [products]);

  const filtered = items.filter((item) => {
    if (filter !== "all" && getStatus(item) !== filter) return false;
    if (search && !item.productName.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: items.length,
    "in-stock": items.filter((item) => getStatus(item) === "in-stock").length,
    "low-stock": items.filter((item) => getStatus(item) === "low-stock").length,
    "out-of-stock": items.filter((item) => getStatus(item) === "out-of-stock").length,
  };

  const handleSave = async (item: InventoryItem, newQty: number) => {
    setSavingId(item.id);

    try {
      const response = await updateSellerInventory(item.productId, {
        quantity: newQty,
        variant_id: item.variant ? Number(item.id.split("-").slice(-1)[0]) : null,
        low_stock_threshold: item.threshold,
      });

      setProducts((prev) =>
        prev.map((product) => {
          const productVariant = product.variants.find((variant) => `${product.id}-${variant.id}` === item.id);
          if (productVariant) {
            return {
              ...product,
              variants: product.variants.map((variant) => (variant.id === productVariant.id ? { ...variant, stock_quantity: response.data.quantity } : variant)),
              stock_quantity: product.variants
                .map((variant) => (variant.id === productVariant.id ? response.data.quantity : variant.stock_quantity))
                .reduce((sum, qty) => sum + qty, 0),
            };
          }

          if (String(product.id) === item.id) {
            return { ...product, stock_quantity: response.data.quantity };
          }

          return product;
        }),
      );
      setAdjustTarget(null);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading inventory...</div>;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Inventory</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Track and adjust stock across all your products</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total SKUs", value: items.length, sub: "across all products" },
          { label: "In stock", value: counts["in-stock"], sub: "ready to ship", color: "var(--color-green)" },
          { label: "Low stock", value: counts["low-stock"], sub: "reorder needed", color: "var(--color-amber)" },
          { label: "Out of stock", value: counts["out-of-stock"], sub: "unavailable to buyers", color: "var(--color-red)" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{card.label}</p>
            <p className="font-[var(--font-display)] text-2xl font-[400]" style={{ color: card.color ?? "var(--color-ink)" }}>{card.value}</p>
            <p className="text-xs text-[var(--color-ink-disabled)]">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {(["all", "in-stock", "low-stock", "out-of-stock"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`font-[var(--font-mono)] text-[10px] px-3 py-1.5 rounded-sm border cursor-pointer transition-colors ${
                filter === status
                  ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white"
                  : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"
              }`}>
              {status === "all" ? "All" : STATUS_CFG[status].label} ({counts[status]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-sm bg-white px-3 py-2 ml-auto min-w-48 focus-within:border-[var(--color-navy)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search SKU or product" className="text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent w-full font-[var(--font-body)]" />
        </div>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {["Product / SKU", "Category", "Available", "Status", ""].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const status = getStatus(item);
              const cfg = STATUS_CFG[status];
              const pct = Math.min(100, (item.quantity / Math.max(1, item.threshold * 2)) * 100);

              return (
                <tr key={item.id} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-[500] text-[var(--color-ink)] truncate max-w-44">{item.productName}{item.variant ? ` - ${item.variant}` : ""}</p>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)]">{item.category}</td>
                  <td className="px-4 py-3.5">
                    <div>
                      <span className={`font-[var(--font-mono)] text-base font-[600] ${status === "out-of-stock" ? "text-[var(--color-red)]" : status === "low-stock" ? "text-[var(--color-amber)]" : "text-[var(--color-ink)]"}`}>{item.quantity}</span>
                      <div className="mt-1 h-1 w-20 bg-[var(--color-surface)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    {status === "low-stock" && <p className="text-[10px] text-[var(--color-amber)] mt-0.5">Min: {item.threshold}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => setAdjustTarget(item)} className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer whitespace-nowrap">Adjust</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">No items found</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Adjust your filters or search term.</p>
          </div>
        )}
      </div>

      {adjustTarget && (
        <AdjustDialog item={adjustTarget} onClose={() => setAdjustTarget(null)} onSave={handleSave} />
      )}
    </div>
  );
}

function AdjustDialog({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (id: string, newQty: number) => void }) {
  const [mode, setMode] = useState<"add" | "subtract" | "set">("add");
  const [amount, setAmount] = useState("10");

  const preview = () => {
    const value = Number.parseInt(amount, 10) || 0;
    if (mode === "add") return item.quantity + value;
    if (mode === "subtract") return Math.max(0, item.quantity - value);
    return value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-xl p-6 max-w-md w-full">
        <h3 className="font-[600] text-[var(--color-ink)] mb-1">Adjust inventory</h3>
        <p className="text-sm text-[var(--color-ink-muted)] mb-4">{item.productName}{item.variant ? ` - ${item.variant}` : ""} <span className="font-[var(--font-mono)] text-xs">({item.sku})</span></p>

        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
          <div>
            <p className="text-xs text-[var(--color-ink-muted)]">Current stock</p>
            <p className="font-[var(--font-mono)] text-xl text-[var(--color-ink)]">{item.quantity}</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-ink-disabled)" strokeWidth="1.5" strokeLinecap="round"><path d="M4 10h12M12 6l4 4-4 4" /></svg>
          <div>
            <p className="text-xs text-[var(--color-ink-muted)]">New stock</p>
            <p className={`font-[var(--font-mono)] text-xl font-[600] ${preview() === 0 ? "text-[var(--color-red)]" : preview() <= item.threshold ? "text-[var(--color-amber)]" : "text-[var(--color-green)]"}`}>{preview()}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(["add", "subtract", "set"] as const).map((value) => (
            <button key={value} onClick={() => setMode(value)} className={`flex-1 py-2 text-sm font-[500] rounded-sm border cursor-pointer capitalize transition-colors ${mode === value ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>{value}</button>
          ))}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">
            {mode === "add" ? "Add quantity" : mode === "subtract" ? "Remove quantity" : "Set quantity to"}
          </label>
          <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} min="0" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
          <button onClick={() => void onSave(item, preview())} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Preview adjustment</button>
        </div>
      </div>
    </div>
  );
}
