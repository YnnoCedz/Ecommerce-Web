import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Pencil, Plus, Search, Trash2, ChevronDown } from "lucide-react";
import { deleteSellerProduct, fetchSellerProducts, updateSellerProduct, type SellerProduct, type SellerProductSubmission } from "../../api/seller";
import { useUrlTab } from "../../hooks/useUrlTab";

type ProductStatus = "active" | "draft" | "archived" | "out-of-stock";
type BulkAction = "publish" | "archive" | "delete";
type ProductTab = ProductStatus | "all";

const PRODUCT_TABS: readonly ProductTab[] = ["all", "active", "draft", "out-of-stock", "archived"];

const STATUS_CFG: Record<ProductStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "var(--color-green)", bg: "var(--color-green-light)" },
  draft: { label: "Draft", color: "var(--color-ink-muted)", bg: "var(--color-surface)" },
  archived: { label: "Archived", color: "var(--color-ink-disabled)", bg: "var(--color-surface)" },
  "out-of-stock": { label: "Out of stock", color: "var(--color-red)", bg: "var(--color-red-light)" },
};

function normalizeStatus(status: string, stockQuantity: number): ProductStatus {
  if (status === "draft" || status === "archived") {
    return status;
  }

  return stockQuantity <= 0 ? "out-of-stock" : "active";
}

function formatPrice(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { activeTab: statusFilter, setActiveTab: setStatusFilter } = useUrlTab(PRODUCT_TABS, "all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

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

  const categories = useMemo(() => {
    const names = products.map((product) => product.category?.name).filter((name): name is string => Boolean(name));
    return ["all", ...Array.from(new Set(names))];
  }, [products]);

  const filtered = useMemo(() => {
    return products
      .filter((product) => {
        const status = normalizeStatus(product.status, product.stock_quantity);
        if (search && !product.name.toLowerCase().includes(search.toLowerCase()) && !product.sku?.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (statusFilter !== "all" && status !== statusFilter) {
          return false;
        }
        if (categoryFilter !== "all" && product.category?.name !== categoryFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "stock") return a.stock_quantity - b.stock_quantity;
        return new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime();
      });
  }, [products, search, statusFilter, categoryFilter, sort]);

  const selectedSet = new Set(selected);

  const buildSubmission = (product: SellerProduct, nextStatus: SellerProduct["status"]): SellerProductSubmission => ({
    name: product.name,
    description: product.description ?? null,
    category_id: product.category?.id ?? 0,
    tags: product.tags ?? [],
    sku: product.sku ?? "",
    barcode: product.barcode ?? null,
    price: product.price,
    sale_price: product.sale_price,
    cost_price: product.cost_price,
    status: nextStatus as "draft" | "active" | "archived",
    delivery_type: (product.delivery_type ?? "both") as SellerProductSubmission["delivery_type"],
    track_inventory: product.track_inventory,
    stock_quantity: product.stock_quantity,
    low_stock_threshold: product.low_stock_threshold,
    weight_grams: product.weight_grams ?? null,
    length_cm: product.dimensions?.length_cm ?? null,
    width_cm: product.dimensions?.width_cm ?? null,
    height_cm: product.dimensions?.height_cm ?? null,
    free_shipping: product.free_shipping,
    variants: product.variants.map((variant) => ({
      server_id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      options: variant.options ?? [],
      price_override: variant.price_override ?? null,
      sale_price_override: variant.sale_price_override ?? null,
      stock_quantity: variant.stock_quantity,
      low_stock_threshold: variant.low_stock_threshold,
      active: variant.active,
    })),
    keep_image_ids: product.images.map((image) => image.id),
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map((product) => product.id));
  };

  const handleBulkAction = async (action: BulkAction) => {
    setShowBulkMenu(false);
    setSavingId(null);

    try {
      if (action === "delete") {
        for (const productId of selected) {
          await deleteSellerProduct(productId);
        }
        setProducts((prev) => prev.filter((product) => !selectedSet.has(product.id)));
      } else {
        const nextStatus = action === "archive" ? "archived" : "active";
        for (const productId of selected) {
          const product = products.find((item) => item.id === productId);
          if (!product) continue;
          setSavingId(productId);
          const response = await updateSellerProduct(productId, buildSubmission(product, nextStatus));
          setProducts((prev) => prev.map((item) => (item.id === productId ? response.data : item)));
        }
      }
      setSelected([]);
    } finally {
      setSavingId(null);
    }
  };

  const deleteOne = async (id: number) => {
    setSavingId(id);
    try {
      await deleteSellerProduct(id);
      setProducts((prev) => prev.filter((product) => product.id !== id));
    } finally {
      setSavingId(null);
      setConfirmDelete(null);
    }
  };

  const statusCounts: Record<string, number> = { all: products.length };
  products.forEach((product) => {
    const status = normalizeStatus(product.status, product.stock_quantity);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  });

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading products...</div>;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Products</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{statusCounts.active ?? 0} active listings</p>
        </div>
        <button
          onClick={() => navigate("/seller-center/products/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
          <Plus size={13} strokeWidth={1.9} />
          Add product
        </button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-[var(--color-border)]">
        {PRODUCT_TABS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-[500] border-b-2 -mb-px transition-colors cursor-pointer capitalize ${
              statusFilter === status
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}>
            {status === "all" ? "All" : STATUS_CFG[status].label}
            <span className="ml-1.5 font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">({statusCounts[status] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-48 max-w-72 border border-[var(--color-border)] rounded-sm bg-white px-3 py-2 focus-within:border-[var(--color-navy)] transition-colors">
          <Search size={13} strokeWidth={1.5} className="text-[var(--color-ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or SKU" className="text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent w-full font-[var(--font-body)]" />
        </div>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] cursor-pointer font-[var(--font-body)]">
          {categories.map((category) => {
            const label = typeof category === "string" ? category : (category as { label?: string; name?: string }).label ?? (category as { label?: string; name?: string }).name ?? "Unknown";
            return <option key={label} value={label}>{label === "all" ? "All categories" : label}</option>;
          })}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] cursor-pointer font-[var(--font-body)]">
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="stock">Lowest stock</option>
        </select>
        {selected.length > 0 && (
          <div className="relative ml-auto">
            <button onClick={() => setShowBulkMenu((value) => !value)} className="flex items-center gap-2 px-3 py-2 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer transition-all">
              {selected.length} selected
              <ChevronDown size={10} strokeWidth={1.5} />
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-20">
                <button onClick={() => void handleBulkAction("publish")} className="w-full px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] text-left cursor-pointer">Publish selected</button>
                <button onClick={() => void handleBulkAction("archive")} className="w-full px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] text-left cursor-pointer">Archive selected</button>
                <div className="border-t border-[var(--color-border)]">
                  <button onClick={() => void handleBulkAction("delete")} className="w-full px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] text-left cursor-pointer">Delete selected</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[var(--color-navy)]" />
              </th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Product</th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest hidden lg:table-cell">SKU</th>
              <th className="px-4 py-3 text-right font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Price</th>
              <th className="px-4 py-3 text-right font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest hidden md:table-cell">Stock</th>
              <th className="px-4 py-3 text-right font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest hidden md:table-cell">Variants</th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const status = normalizeStatus(product.status, product.stock_quantity);
              const cfg = STATUS_CFG[status];
              const isSelected = selectedSet.has(product.id);

              return (
                <tr key={product.id} className={`border-b border-[var(--color-border-subtle)] last:border-0 transition-colors ${isSelected ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)} className="accent-[var(--color-navy)]" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-[500] text-[var(--color-ink)] truncate max-w-48">{product.name}</p>
                        <p className="text-xs text-[var(--color-ink-disabled)]">{product.category?.name ?? "Uncategorized"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{product.sku ?? "N/A"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.sale_price ? (
                      <div>
                        <span className="font-[var(--font-mono)] text-sm text-[var(--color-red)]">{formatPrice(product.sale_price)}</span>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] line-through ml-1">{formatPrice(product.price)}</span>
                      </div>
                    ) : (
                      <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">{formatPrice(product.price)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className={`font-[var(--font-mono)] text-sm ${product.stock_quantity === 0 ? "text-[var(--color-red)]" : product.stock_quantity <= product.low_stock_threshold ? "text-[var(--color-amber)]" : "text-[var(--color-ink)]"}`}>{product.stock_quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)]">{product.variants.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/seller-center/products/${product.id}/edit`)} className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors" title="Edit">
                        <Pencil size={12} strokeWidth={1.6} />
                      </button>
                      <button onClick={() => setConfirmDelete(product.id)} className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-light)] rounded-sm cursor-pointer transition-colors" title="Delete">
                        <Trash2 size={12} strokeWidth={1.6} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">No products found</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Try adjusting your search or filters.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-ink-muted)]">Showing {filtered.length} of {products.length} products</span>
            <div className="flex gap-1">
              {[1].map((page) => (
                <button key={page} className="w-7 h-7 text-xs font-[var(--font-mono)] bg-[var(--color-navy)] text-white rounded-sm cursor-pointer">{page}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-sm border border-[var(--color-border)] shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-[600] text-[var(--color-ink)] mb-2">Delete product?</h3>
            <p className="text-sm text-[var(--color-ink-muted)] mb-5">This will remove the product from the current view. Connect a delete endpoint before using this in production.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
              <button onClick={() => void deleteOne(confirmDelete)} className="flex-1 py-2.5 bg-[var(--color-red)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
