import { useState } from "react";

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

type InventoryItem = {
  id: string; productId: string; productName: string;
  sku: string; variant?: string; category: string;
  quantity: number; threshold: number; committed: number;
  image: string;
};

const ITEMS: InventoryItem[] = [
  { id: "i01", productId: "p01", productName: "Organic Lavender Serum", sku: "VB-SRM-001-30ML", variant: "30ml", category: "Skincare", quantity: 3, threshold: 10, committed: 2, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=48&h=48&fit=crop&auto=format" },
  { id: "i02", productId: "p01", productName: "Organic Lavender Serum", sku: "VB-SRM-001-50ML", variant: "50ml", category: "Skincare", quantity: 18, threshold: 8, committed: 1, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=48&h=48&fit=crop&auto=format" },
  { id: "i03", productId: "p02", productName: "Rose Hip Face Oil", sku: "VB-OIL-003",     category: "Skincare", quantity: 1, threshold: 8, committed: 1, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=48&h=48&fit=crop&auto=format" },
  { id: "i04", productId: "p03", productName: "Natural Botanical Skincare Set", sku: "VB-SET-002", category: "Skincare Sets", quantity: 18, threshold: 5, committed: 3, image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=48&h=48&fit=crop&auto=format" },
  { id: "i05", productId: "p04", productName: "Bamboo Charcoal Soap Bar", sku: "VB-SOP-007", category: "Body Care", quantity: 5, threshold: 15, committed: 0, image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=48&h=48&fit=crop&auto=format" },
  { id: "i06", productId: "p05", productName: "Aloe Vera Gel Moisturizer", sku: "VB-ALO-005", category: "Skincare", quantity: 44, threshold: 10, committed: 5, image: "https://images.unsplash.com/photo-1556228720-da76e7f25ea6?w=48&h=48&fit=crop&auto=format" },
  { id: "i07", productId: "p06", productName: "Green Tea Facial Mist", sku: "VB-MIS-010", category: "Skincare", quantity: 0, threshold: 10, committed: 0, image: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=48&h=48&fit=crop&auto=format" },
  { id: "i08", productId: "p07", productName: "Tinted Botanical Lip Balm — Coral", sku: "VB-LIP-014-COR", variant: "Coral", category: "Lip Care", quantity: 8, threshold: 10, committed: 0, image: "https://images.unsplash.com/photo-1586495777744-4e6232bf2176?w=48&h=48&fit=crop&auto=format" },
  { id: "i09", productId: "p07", productName: "Tinted Botanical Lip Balm — Berry", sku: "VB-LIP-014-BRY", variant: "Berry", category: "Lip Care", quantity: 14, threshold: 10, committed: 2, image: "https://images.unsplash.com/photo-1586495777744-4e6232bf2176?w=48&h=48&fit=crop&auto=format" },
  { id: "i10", productId: "p10", productName: "SPF 50 Mineral Sunscreen", sku: "VB-SUN-030", category: "Sun Care", quantity: 67, threshold: 20, committed: 4, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=48&h=48&fit=crop&auto=format" },
];

function getStatus(item: InventoryItem): StockStatus {
  if (item.quantity === 0) return "out-of-stock";
  if (item.quantity <= item.threshold) return "low-stock";
  return "in-stock";
}

const STATUS_CFG: Record<StockStatus, { label: string; color: string; bg: string }> = {
  "in-stock":     { label: "In stock",     color: "var(--color-green)", bg: "var(--color-green-light)" },
  "low-stock":    { label: "Low stock",    color: "var(--color-amber)", bg: "var(--color-amber-light)" },
  "out-of-stock": { label: "Out of stock", color: "var(--color-red)",   bg: "var(--color-red-light)"   },
};

type AdjustMode = "add" | "subtract" | "set";

function AdjustDialog({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (id: string, newQty: number, reason: string) => void }) {
  const [mode, setMode] = useState<AdjustMode>("add");
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");

  const preview = () => {
    const n = parseInt(amount) || 0;
    if (mode === "add") return item.quantity + n;
    if (mode === "subtract") return Math.max(0, item.quantity - n);
    return n;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-xl p-6 max-w-md w-full">
        <h3 className="font-[600] text-[var(--color-ink)] mb-1">Adjust inventory</h3>
        <p className="text-sm text-[var(--color-ink-muted)] mb-4">{item.productName} {item.variant ? `· ${item.variant}` : ""} <span className="font-[var(--font-mono)] text-xs">({item.sku})</span></p>

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
          {(["add", "subtract", "set"] as AdjustMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 text-sm font-[500] rounded-sm border cursor-pointer capitalize transition-colors ${mode === m ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>{m}</button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">
            {mode === "add" ? "Add quantity" : mode === "subtract" ? "Remove quantity" : "Set quantity to"}
          </label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">Reason <span className="text-xs text-[var(--color-ink-muted)] font-[400]">(optional)</span></label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] cursor-pointer font-[var(--font-body)]">
            <option value="">Select reason</option>
            <option>New stock received</option>
            <option>Stock count correction</option>
            <option>Damaged/expired goods</option>
            <option>Returned from buyer</option>
            <option>Reserved for offline order</option>
            <option>Other</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
          <button onClick={() => onSave(item.id, preview(), reason)} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save adjustment</button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(ITEMS);
  const [filter, setFilter] = useState<StockStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);

  const filtered = items.filter(item => {
    if (filter !== "all" && getStatus(item) !== filter) return false;
    if (search && !item.productName.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: items.length,
    "in-stock": items.filter(i => getStatus(i) === "in-stock").length,
    "low-stock": items.filter(i => getStatus(i) === "low-stock").length,
    "out-of-stock": items.filter(i => getStatus(i) === "out-of-stock").length,
  };

  const handleSave = (id: string, newQty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    setAdjustTarget(null);
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Inventory</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Track and adjust stock across all your products</p>
        </div>
        <button className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Bulk adjust</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total SKUs", value: items.length, sub: "across all products" },
          { label: "In stock", value: counts["in-stock"], sub: "ready to ship", color: "var(--color-green)" },
          { label: "Low stock", value: counts["low-stock"], sub: "reorder needed", color: "var(--color-amber)" },
          { label: "Out of stock", value: counts["out-of-stock"], sub: "unavailable to buyers", color: "var(--color-red)" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{s.label}</p>
            <p className="font-[var(--font-display)] text-2xl font-[400]" style={{ color: s.color ?? "var(--color-ink)" }}>{s.value}</p>
            <p className="text-xs text-[var(--color-ink-disabled)]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {(["all", "in-stock", "low-stock", "out-of-stock"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-[var(--font-mono)] text-[10px] px-3 py-1.5 rounded-sm border cursor-pointer transition-colors ${filter === f ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white" : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
              {f === "all" ? "All" : STATUS_CFG[f].label} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-sm bg-white px-3 py-2 ml-auto min-w-48 focus-within:border-[var(--color-navy)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or product" className="text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent w-full font-[var(--font-body)]" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {["Product / SKU", "Category", "Available", "Committed", "Total", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const st = getStatus(item);
              const cfg = STATUS_CFG[st];
              const pct = Math.min(100, (item.quantity / (item.threshold * 2)) * 100);
              return (
                <tr key={item.id} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm overflow-hidden bg-[var(--color-surface)] shrink-0">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-[500] text-[var(--color-ink)] truncate max-w-44">{item.productName}{item.variant ? ` — ${item.variant}` : ""}</p>
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)]">{item.category}</td>
                  <td className="px-4 py-3.5">
                    <div>
                      <span className={`font-[var(--font-mono)] text-base font-[600] ${st === "out-of-stock" ? "text-[var(--color-red)]" : st === "low-stock" ? "text-[var(--color-amber)]" : "text-[var(--color-ink)]"}`}>{item.quantity}</span>
                      <div className="mt-1 h-1 w-20 bg-[var(--color-surface)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)]">{item.committed}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink)]">{item.quantity + item.committed}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    {st === "low-stock" && (
                      <p className="text-[10px] text-[var(--color-amber)] mt-0.5">Min: {item.threshold}</p>
                    )}
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
