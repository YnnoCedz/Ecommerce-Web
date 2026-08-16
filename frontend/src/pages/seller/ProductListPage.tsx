import { useState } from "react";
import { useNavigate } from "react-router";

type ProductStatus = "active" | "draft" | "archived" | "out-of-stock";

type Product = {
  id: string; sku: string; name: string; category: string;
  price: number; salePrice?: number; stock: number;
  status: ProductStatus; image: string; sales: number; createdAt: string;
};

const STATUS_CFG: Record<ProductStatus, { label: string; color: string; bg: string }> = {
  "active":       { label: "Active",        color: "var(--color-green)",  bg: "var(--color-green-light)"  },
  "draft":        { label: "Draft",         color: "var(--color-ink-muted)", bg: "var(--color-surface)"   },
  "archived":     { label: "Archived",      color: "var(--color-ink-disabled)", bg: "var(--color-surface)" },
  "out-of-stock": { label: "Out of stock",  color: "var(--color-red)",    bg: "var(--color-red-light)"    },
};

const PRODUCTS: Product[] = [
  { id: "p01", sku: "VB-SRM-001", name: "Organic Lavender Serum 30ml", category: "Health and Beauty", price: 1450, stock: 3, status: "active", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=60&h=60&fit=crop&auto=format", sales: 284, createdAt: "Mar 2026" },
  { id: "p02", sku: "VB-OIL-003", name: "Rose Hip Face Oil 50ml", category: "Health and Beauty", price: 1890, salePrice: 1490, stock: 1, status: "active", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=60&h=60&fit=crop&auto=format", sales: 197, createdAt: "Mar 2026" },
  { id: "p03", sku: "VB-SET-002", name: "Natural Botanical Skincare Set", category: "Health and Beauty", price: 3200, stock: 18, status: "active", image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=60&h=60&fit=crop&auto=format", sales: 312, createdAt: "Jan 2026" },
  { id: "p04", sku: "VB-SOP-007", name: "Bamboo Charcoal Soap Bar", category: "Health and Beauty", price: 320, stock: 5, status: "active", image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=60&h=60&fit=crop&auto=format", sales: 521, createdAt: "Nov 2025" },
  { id: "p05", sku: "VB-ALO-005", name: "Aloe Vera Gel Moisturizer 100g", category: "Health and Beauty", price: 580, stock: 44, status: "active", image: "https://images.unsplash.com/photo-1556228720-da76e7f25ea6?w=60&h=60&fit=crop&auto=format", sales: 408, createdAt: "Oct 2025" },
  { id: "p06", sku: "VB-MIS-010", name: "Green Tea Facial Mist", category: "Health and Beauty", price: 680, stock: 0, status: "out-of-stock", image: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=60&h=60&fit=crop&auto=format", sales: 143, createdAt: "Sep 2025" },
  { id: "p07", sku: "VB-LIP-014", name: "Tinted Botanical Lip Balm (Set of 3)", category: "Health and Beauty", price: 450, salePrice: 380, stock: 22, status: "active", image: "https://images.unsplash.com/photo-1586495777744-4e6232bf2176?w=60&h=60&fit=crop&auto=format", sales: 671, createdAt: "Aug 2025" },
  { id: "p08", sku: "VB-DFT-018", name: "Peppermint Body Scrub [DRAFT]", category: "Health and Beauty", price: 720, stock: 0, status: "draft", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=60&h=60&fit=crop&auto=format", sales: 0, createdAt: "Aug 2026" },
  { id: "p09", sku: "VB-OLD-022", name: "Tea Tree Toner 120ml", category: "Health and Beauty", price: 580, stock: 0, status: "archived", image: "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=60&h=60&fit=crop&auto=format", sales: 88, createdAt: "Jan 2025" },
  { id: "p10", sku: "VB-SUN-030", name: "SPF 50 Mineral Sunscreen", category: "Health and Beauty", price: 1200, stock: 67, status: "active", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=60&h=60&fit=crop&auto=format", sales: 229, createdAt: "May 2026" },
];

type BulkAction = "publish" | "archive" | "delete";

export default function ProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "sales") return b.sales - a.sales;
    if (sort === "stock") return a.stock - b.stock;
    return 0;
  });

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(p => p.id));

  const handleBulkAction = (action: BulkAction) => {
    if (action === "delete") {
      setProducts(prev => prev.filter(p => !selected.includes(p.id)));
    } else if (action === "archive") {
      setProducts(prev => prev.map(p => selected.includes(p.id) ? { ...p, status: "archived" as ProductStatus } : p));
    } else if (action === "publish") {
      setProducts(prev => prev.map(p => selected.includes(p.id) ? { ...p, status: "active" as ProductStatus } : p));
    }
    setSelected([]);
    setShowBulkMenu(false);
  };

  const deleteOne = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
  };

  const statusCounts: Record<string, number> = { all: products.length };
  products.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1; });

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Products</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{products.filter(p => p.status === "active").length} active listings</p>
        </div>
        <button
          onClick={() => navigate("/seller-center/products/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10" /></svg>
          Add product
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--color-border)]">
        {(["all", "active", "draft", "out-of-stock", "archived"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-[500] border-b-2 -mb-px transition-colors cursor-pointer capitalize ${statusFilter === s ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
            {s === "all" ? "All" : STATUS_CFG[s].label}
            <span className="ml-1.5 font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">({statusCounts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-48 max-w-72 border border-[var(--color-border)] rounded-sm bg-white px-3 py-2 focus-within:border-[var(--color-navy)] transition-colors">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU" className="text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent w-full font-[var(--font-body)]" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] cursor-pointer font-[var(--font-body)]">
          {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] cursor-pointer font-[var(--font-body)]">
          <option value="newest">Newest first</option>
          <option value="sales">Top selling</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="stock">Lowest stock</option>
        </select>
        {selected.length > 0 && (
          <div className="relative ml-auto">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} className="flex items-center gap-2 px-3 py-2 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer transition-all">
              {selected.length} selected
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5"><path d="M2 4l3 3 3-3" /></svg>
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-20">
                <button onClick={() => handleBulkAction("publish")} className="w-full px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] text-left cursor-pointer">Publish selected</button>
                <button onClick={() => handleBulkAction("archive")} className="w-full px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] text-left cursor-pointer">Archive selected</button>
                <div className="border-t border-[var(--color-border)]">
                  <button onClick={() => handleBulkAction("delete")} className="w-full px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] text-left cursor-pointer">Delete selected</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
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
              <th className="px-4 py-3 text-right font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest hidden md:table-cell">Sales</th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const cfg = STATUS_CFG[p.status];
              const isSel = selected.includes(p.id);
              return (
                <tr key={p.id} className={`border-b border-[var(--color-border-subtle)] last:border-0 transition-colors ${isSel ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} className="accent-[var(--color-navy)]" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-[500] text-[var(--color-ink)] truncate max-w-48">{p.name}</p>
                        <p className="text-xs text-[var(--color-ink-disabled)]">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{p.sku}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.salePrice ? (
                      <div>
                        <span className="font-[var(--font-mono)] text-sm text-[var(--color-red)]">₱{p.salePrice.toLocaleString()}</span>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] line-through ml-1">₱{p.price.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">₱{p.price.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className={`font-[var(--font-mono)] text-sm ${p.stock === 0 ? "text-[var(--color-red)]" : p.stock <= 5 ? "text-[var(--color-amber)]" : "text-[var(--color-ink)]"}`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)]">{p.sales}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/seller-center/products/${p.id}/edit`)} className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors" title="Edit">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9.5 2.5l2 2-7.5 7.5H2V9.5L9.5 2.5z" /></svg>
                      </button>
                      <button onClick={() => setConfirmDelete(p.id)} className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-light)] rounded-sm cursor-pointer transition-colors" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h10M5 4V2h4v2M5 6v5M9 6v5" /></svg>
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
              {[1].map(pg => (
                <button key={pg} className="w-7 h-7 text-xs font-[var(--font-mono)] bg-[var(--color-navy)] text-white rounded-sm cursor-pointer">{pg}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-sm border border-[var(--color-border)] shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-[600] text-[var(--color-ink)] mb-2">Delete product?</h3>
            <p className="text-sm text-[var(--color-ink-muted)] mb-5">This will permanently remove the product and all its data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
              <button onClick={() => deleteOne(confirmDelete)} className="flex-1 py-2.5 bg-[var(--color-red)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
