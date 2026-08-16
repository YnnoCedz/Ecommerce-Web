import { useState } from "react";

type ProdStatus = "active" | "draft" | "archived" | "flagged" | "under-review" | "removed";
type ModerationAction = "approve" | "remove" | "flag" | "warn-seller" | "none";

type AdminProduct = {
  id: string; name: string; seller: string; sellerId: string;
  category: string; price: number; stock: number; sales: number;
  status: ProdStatus; flagReason?: string; reportCount: number;
  image: string; createdAt: string; updatedAt: string;
};

const STATUS_CFG: Record<ProdStatus, { label: string; color: string; bg: string }> = {
  "active":       { label: "Active",        color: "var(--color-green)",      bg: "var(--color-green-light)"  },
  "draft":        { label: "Draft",         color: "var(--color-ink-muted)",  bg: "var(--color-surface)"      },
  "archived":     { label: "Archived",      color: "var(--color-ink-disabled)", bg: "var(--color-surface)"    },
  "flagged":      { label: "Flagged",       color: "var(--color-amber)",      bg: "var(--color-amber-light)"  },
  "under-review": { label: "Under review",  color: "var(--color-navy)",       bg: "var(--color-navy-surface)" },
  "removed":      { label: "Removed",       color: "var(--color-red)",        bg: "var(--color-red-light)"    },
};

const PRODUCTS: AdminProduct[] = [
  { id: "P001", name: "Organic Lavender Serum 30ml",    seller: "Verde Botanics",    sellerId: "s001", category: "Health and Beauty",     price: 1450, stock: 18,  sales: 284, status: "active",       reportCount: 0, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=48&h=48&fit=crop&auto=format", createdAt: "Jan 15, 2026", updatedAt: "Aug 10, 2026" },
  { id: "P002", name: "Minimalist Chronograph Watch",   seller: "Atelier Manila",    sellerId: "s002", category: "Jewelry and Watches",      price: 8500, stock: 12,  sales: 91,  status: "active",       reportCount: 0, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=48&h=48&fit=crop&auto=format", createdAt: "Mar 2, 2026",  updatedAt: "Aug 12, 2026" },
  { id: "P003", name: "Unbranded USB-C Hub (Counterfeit?)",seller: "Quick Deals", sellerId: "s006", category: "Electronics and Gadgets",  price: 380,  stock: 120, sales: 42,  status: "flagged",      flagReason: "Suspected counterfeit — reported by 3 buyers", reportCount: 3, image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=48&h=48&fit=crop&auto=format", createdAt: "Jul 5, 2026",  updatedAt: "Aug 14, 2026" },
  { id: "P004", name: "Rose Hip Face Oil 50ml",          seller: "Verde Botanics",   sellerId: "s001", category: "Health and Beauty",     price: 1890, stock: 1,   sales: 197, status: "active",       reportCount: 0, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=48&h=48&fit=crop&auto=format", createdAt: "Mar 5, 2026",  updatedAt: "Aug 8, 2026"  },
  { id: "P005", name: "Imported Designer Bag (Replica)", seller: "Homecraft Goods",  sellerId: "s004", category: "Women's Apparel",      price: 1200, stock: 50,  sales: 28,  status: "under-review", flagReason: "Misleading listing — 'designer' branding without trademark", reportCount: 5, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=48&h=48&fit=crop&auto=format", createdAt: "Apr 20, 2026", updatedAt: "Aug 15, 2026" },
  { id: "P006", name: "SPF 50 Mineral Sunscreen",        seller: "Verde Botanics",   sellerId: "s001", category: "Health and Beauty",     price: 1200, stock: 67,  sales: 229, status: "active",       reportCount: 0, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=48&h=48&fit=crop&auto=format", createdAt: "May 10, 2026", updatedAt: "Aug 1, 2026"  },
  { id: "P007", name: "Restricted Health Supplement",    seller: "Homecraft Goods",  sellerId: "s004", category: "Health and Beauty",       price: 2100, stock: 30,  sales: 15,  status: "removed",      flagReason: "FDA non-compliant health claim — removed Aug 14", reportCount: 8, image: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=48&h=48&fit=crop&auto=format", createdAt: "Jun 8, 2026",  updatedAt: "Aug 14, 2026" },
  { id: "P008", name: "Bamboo Charcoal Soap Bar",        seller: "Verde Botanics",   sellerId: "s001", category: "Health and Beauty",    price: 320,  stock: 5,   sales: 521, status: "active",       reportCount: 0, image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=48&h=48&fit=crop&auto=format", createdAt: "Nov 5, 2025",  updatedAt: "Aug 12, 2026" },
];

function ProductDetailPanel({ product, onClose }: { product: AdminProduct; onClose: () => void }) {
  const [action, setAction] = useState<ModerationAction>("none");
  const [note, setNote] = useState("");
  const cfg = STATUS_CFG[product.status];

  const ACTION_BTNS: { id: ModerationAction; label: string; color: string; bg: string; show: boolean }[] = [
    { id: "approve",     label: "Approve",       color: "var(--color-green)", bg: "var(--color-green-light)", show: product.status === "flagged" || product.status === "under-review" },
    { id: "remove",      label: "Remove listing", color: "var(--color-red)",   bg: "var(--color-red-light)",   show: product.status !== "removed" },
    { id: "flag",        label: "Flag for review",color: "var(--color-amber)", bg: "var(--color-amber-light)", show: product.status === "active" },
    { id: "warn-seller", label: "Warn seller",    color: "var(--color-navy)",  bg: "var(--color-navy-surface)",show: true },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-start justify-between shrink-0">
        <div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] mb-0.5">{product.id}</p>
          <p className="text-sm font-[600] text-[var(--color-ink)] leading-snug max-w-52">{product.name}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">{product.seller}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-2">
          <div className="aspect-square w-full max-w-xs mx-auto rounded-sm overflow-hidden bg-[var(--color-surface)] mb-4">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
            {product.reportCount > 0 && <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded bg-[var(--color-red-light)] text-[var(--color-red)]">{product.reportCount} reports</span>}
          </div>
        </div>
        <div className="px-5 pb-4 space-y-2 border-b border-[var(--color-border-subtle)]">
          {[
            ["Category", product.category],
            ["Price", `₱${product.price.toLocaleString()}`],
            ["Stock", `${product.stock}`],
            ["Total sales", `${product.sales}`],
            ["Created", product.createdAt],
            ["Updated", product.updatedAt],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1 border-b border-[var(--color-border-subtle)] last:border-0">
              <span className="text-xs text-[var(--color-ink-muted)]">{l}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{v}</span>
            </div>
          ))}
        </div>
        {product.flagReason && (
          <div className="mx-5 my-4 px-3 py-3 bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] rounded-sm">
            <p className="text-xs font-[500] text-[var(--color-amber)] mb-1">Flag reason</p>
            <p className="text-xs text-[var(--color-ink)]">{product.flagReason}</p>
          </div>
        )}
        <div className="px-5 py-4 border-t border-[var(--color-border-subtle)]">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Moderation</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {ACTION_BTNS.filter(b => b.show).map(b => (
              <button key={b.id} onClick={() => setAction(b.id)} className="py-2 text-xs font-[500] border rounded-sm cursor-pointer transition-colors" style={{ color: b.color, borderColor: b.color + "40", background: action === b.id ? b.bg : "transparent" }}>{b.label}</button>
            ))}
          </div>
          {action !== "none" && (
            <div className="space-y-2">
              <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={`Reason for ${action.replace("-", " ")}...`} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] resize-none font-[var(--font-body)]" />
              <div className="flex gap-2">
                <button onClick={() => setAction("none")} className="flex-1 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Cancel</button>
                <button className="flex-1 py-1.5 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm cursor-pointer">Confirm</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProdStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<AdminProduct | null>(null);

  const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  const filtered = PRODUCTS.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.seller.toLowerCase().includes(search.toLowerCase()) && !p.id.includes(search)) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    return true;
  });

  const flaggedCount = PRODUCTS.filter(p => p.status === "flagged" || p.status === "under-review").length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex flex-col ${selected ? "hidden lg:flex lg:flex-1" : "flex-1"} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">
              Products
              {flaggedCount > 0 && <span className="ml-2 font-[var(--font-mono)] text-xs bg-[var(--color-amber-light)] text-[var(--color-amber)] px-2 py-0.5 rounded">{flaggedCount} need review</span>}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-48 border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-navy)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, seller, or ID" className="text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent flex-1 font-[var(--font-body)]" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ProdStatus | "all")} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
              <option value="all">All statuses</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
              {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
              <tr>
                {["Product", "Seller", "Category", "Price", "Stock", "Sales", "Reports", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const cfg = STATUS_CFG[p.status];
                return (
                  <tr key={p.id} onClick={() => setSelected(p)} className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${selected?.id === p.id ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-[500] text-[var(--color-ink)] truncate max-w-36">{p.name}</p>
                          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{p.seller}</td>
                    <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{p.category}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink)]">₱{p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{p.stock}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{p.sales}</td>
                    <td className="px-4 py-3">
                      {p.reportCount > 0 && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1.5 py-0.5 rounded">{p.reportCount}</span>}
                    </td>
                    <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                    <td className="px-4 py-3"><button className="text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer">View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col overflow-hidden">
          <ProductDetailPanel product={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
