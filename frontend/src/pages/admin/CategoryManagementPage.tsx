import { useState } from "react";
import { CATEGORIES as CANONICAL_CATEGORIES } from "../pub/data";

type Category = {
  id: string; name: string; slug: string; icon: string;
  active: boolean; productCount: number; order: number;
  children?: Category[];
};

const CATEGORY_ICONS = ["🐾", "🔌", "👗", "👔", "🧸", "🏡", "⚽", "📚", "🍴", "💎", "🪑", "💄"];

const subSlug = (parent: string, sub: string) =>
  `${parent}-${sub.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const INITIAL_CATEGORIES: Category[] = CANONICAL_CATEGORIES.map((c, i) => ({
  id: `cat-${i + 1}`,
  name: c.label,
  slug: c.slug,
  icon: CATEGORY_ICONS[i] ?? "📦",
  active: true,
  productCount: c.count,
  order: i + 1,
  children: c.subs.map((sub, j) => ({
    id: `cat-${i + 1}-${j + 1}`,
    name: sub,
    slug: subSlug(c.slug, sub),
    icon: "•",
    active: true,
    productCount: Math.round(c.count / c.subs.length),
    order: j + 1,
  })),
}));

type EditingCategory = { id: string; name: string; slug: string; icon: string } | null;

function CategoryRow({ cat, depth = 0, onToggle, onEdit, onMoveUp, onMoveDown }: { cat: Category; depth?: number; onToggle: (id: string) => void; onEdit: (cat: Category) => void; onMoveUp: (id: string) => void; onMoveDown: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = cat.children && cat.children.length > 0;

  return (
    <>
      <tr className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] group transition-colors">
        <td className="px-4 py-3" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="w-4 h-4 flex items-center justify-center text-[var(--color-ink-muted)] cursor-pointer">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={expanded ? "M2 4l3 3 3-3" : "M3 2l3 3-3 3"} /></svg>
              </button>
            ) : <span className="w-4 h-4" />}
            <span className="text-base">{cat.icon}</span>
            <div>
              <p className="text-sm font-[500] text-[var(--color-ink)]">{cat.name}</p>
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{cat.slug}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{cat.productCount.toLocaleString()}</td>
        <td className="px-4 py-3">
          <span className={`font-[var(--font-mono)] text-[9px] px-2 py-1 rounded ${cat.active ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-surface)] text-[var(--color-ink-disabled)] border border-[var(--color-border)]"}`}>{cat.active ? "Active" : "Inactive"}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(cat)} className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded cursor-pointer">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9.5 2.5l2 2-7.5 7.5H2V9.5L9.5 2.5z" /></svg>
            </button>
            <button onClick={() => onToggle(cat.id)} className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer text-[10px] ${cat.active ? "text-[var(--color-amber)] hover:bg-[var(--color-amber-light)]" : "text-[var(--color-green)] hover:bg-[var(--color-green-light)]"}`}>
              {cat.active ? "⊘" : "✓"}
            </button>
            <button onClick={() => onMoveUp(cat.id)} className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded cursor-pointer">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7l3-4 3 4" /></svg>
            </button>
            <button onClick={() => onMoveDown(cat.id)} className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded cursor-pointer">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3l3 4 3-4" /></svg>
            </button>
          </div>
        </td>
      </tr>
      {expanded && hasChildren && cat.children!.map(child => (
        <CategoryRow key={child.id} cat={child} depth={depth + 1} onToggle={onToggle} onEdit={onEdit} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      ))}
    </>
  );
}

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [editing, setEditing] = useState<EditingCategory>(null);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", slug: "", icon: "🏷️" });

  const toggleActive = (id: string) => {
    const toggle = (cats: Category[]): Category[] =>
      cats.map(c => c.id === id ? { ...c, active: !c.active } : { ...c, children: c.children ? toggle(c.children) : undefined });
    setCategories(toggle(categories));
  };

  const moveUp = (id: string) => {
    const move = (cats: Category[]): Category[] => {
      const idx = cats.findIndex(c => c.id === id);
      if (idx > 0) { const copy = [...cats]; [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]]; return copy; }
      return cats.map(c => ({ ...c, children: c.children ? move(c.children) : undefined }));
    };
    setCategories(move(categories));
  };

  const moveDown = (id: string) => {
    const move = (cats: Category[]): Category[] => {
      const idx = cats.findIndex(c => c.id === id);
      if (idx >= 0 && idx < cats.length - 1) { const copy = [...cats]; [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]]; return copy; }
      return cats.map(c => ({ ...c, children: c.children ? move(c.children) : undefined }));
    };
    setCategories(move(categories));
  };

  const saveEdit = () => {
    if (!editing) return;
    const update = (cats: Category[]): Category[] =>
      cats.map(c => c.id === editing.id ? { ...c, name: editing.name, slug: editing.slug, icon: editing.icon } : { ...c, children: c.children ? update(c.children) : undefined });
    setCategories(update(categories));
    setEditing(null);
  };

  const addCategory = () => {
    const id = `cat-${Date.now()}`;
    setCategories(prev => [...prev, { id, name: newCat.name, slug: newCat.slug, icon: newCat.icon, active: true, productCount: 0, order: prev.length + 1 }]);
    setNewCat({ name: "", slug: "", icon: "🏷️" });
    setAdding(false);
  };

  const INPUT = "w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]";

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Category management</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{categories.length} top-level categories · {categories.filter(c => c.active).length} active</p>
        </div>
        <button onClick={() => setAdding(true)} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">+ Add category</button>
      </div>

      {/* Add category form */}
      {adding && (
        <div className="bg-white border border-[var(--color-navy)]/20 rounded-sm p-5 mb-5 shadow-sm">
          <h2 className="text-sm font-[600] text-[var(--color-ink)] mb-4">New top-level category</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Emoji icon</label>
              <input type="text" value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} className={INPUT} maxLength={2} />
            </div>
            <div>
              <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Category name</label>
              <input type="text" value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} placeholder="e.g. Automotive" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Slug</label>
              <input type="text" value={newCat.slug} onChange={e => setNewCat(p => ({ ...p, slug: e.target.value }))} placeholder="e.g. automotive" className={INPUT + " font-[var(--font-mono)] text-xs"} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-2 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Cancel</button>
            <button onClick={addCategory} disabled={!newCat.name} className="px-4 py-2 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm cursor-pointer disabled:opacity-50">Add category</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Category</th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Products</th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <CategoryRow key={cat.id} cat={cat} onToggle={toggleActive} onEdit={(c) => setEditing({ id: c.id, name: c.name, slug: c.slug, icon: c.icon })} onMoveUp={moveUp} onMoveDown={moveDown} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-[600] text-[var(--color-ink)] mb-4">Edit category</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Icon</label>
                <input type="text" value={editing.icon} onChange={e => setEditing(p => p ? { ...p, icon: e.target.value } : p)} className={INPUT} maxLength={2} />
              </div>
              <div>
                <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Name</label>
                <input type="text" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-[500] text-[var(--color-ink)] mb-1.5">Slug</label>
                <input type="text" value={editing.slug} onChange={e => setEditing(p => p ? { ...p, slug: e.target.value } : p)} className={INPUT + " font-[var(--font-mono)] text-xs"} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
