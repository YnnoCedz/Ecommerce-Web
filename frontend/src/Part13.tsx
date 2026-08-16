import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────
type ViewportId = "mobile" | "tablet" | "desktop" | "fluid";
type SectionId = "storefront" | "buyer" | "seller" | "admin" | "patterns";

// ── Viewport config ───────────────────────────────────────────
const VIEWPORTS: { id: ViewportId; label: string; px: number | null; desc: string }[] = [
  { id: "mobile",  label: "Mobile",  px: 375,  desc: "375 px · iOS/Android" },
  { id: "tablet",  label: "Tablet",  px: 768,  desc: "768 px · iPad portrait" },
  { id: "desktop", label: "Desktop", px: 1280, desc: "1280 px · Laptop" },
  { id: "fluid",   label: "Fluid",   px: null, desc: "Full container width" },
];

// ── Shared mini-primitives ────────────────────────────────────
function Tag13({ children, color = "navy" }: { children: React.ReactNode; color?: string }) {
  const cols: Record<string, string> = {
    navy:   "bg-[var(--color-navy-surface)] text-[var(--color-navy)]",
    amber:  "bg-[var(--color-amber-light)] text-[var(--color-amber)]",
    green:  "bg-[var(--color-green-light)] text-[var(--color-green)]",
    red:    "bg-[var(--color-red-light)] text-[var(--color-red)]",
    muted:  "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    violet: "bg-[var(--color-violet-light)] text-[var(--color-violet)]",
  };
  return (
    <span className={`font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide ${cols[color] ?? cols.navy}`}>
      {children}
    </span>
  );
}

function BpBadge({ vp }: { vp: ViewportId }) {
  const map: Record<ViewportId, { label: string; color: string }> = {
    mobile:  { label: "xs — base styles",     color: "bg-[var(--color-violet-light)] text-[var(--color-violet)]" },
    tablet:  { label: "@md — tablet layout",  color: "bg-[var(--color-amber-light)] text-[var(--color-amber)]" },
    desktop: { label: "@lg — desktop layout", color: "bg-[var(--color-green-light)] text-[var(--color-green)]" },
    fluid:   { label: "@xl — large screen",   color: "bg-[var(--color-navy-surface)] text-[var(--color-navy)]" },
  };
  const { label, color } = map[vp];
  return (
    <span className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}

// ── Stars ─────────────────────────────────────────────────────
function Stars({ n = 5 }: { n?: number }) {
  return (
    <span className="text-[var(--color-amber)] text-xs">
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

// ── Public Homepage ───────────────────────────────────────────
function ResponsiveHomepage() {
  const categories = ["Ceramics","Textiles","Jewellery","Leather","Glass","Candles","Paper","Wood"];
  const products = [
    { name: "Stoneware Mug Set", seller: "Clay & Co.", price: "₱ 1,200", tag: "Bestseller" },
    { name: "Handwoven Table Runner", seller: "Loom Studio", price: "₱ 2,400", tag: "New" },
    { name: "Silver Hoop Earrings", seller: "Forge & Fire", price: "₱ 980", tag: undefined },
    { name: "Leather Card Holder", seller: "Tan & Stitch", price: "₱ 750", tag: undefined },
    { name: "Blown Glass Vase", seller: "Molten Arts", price: "₱ 3,200", tag: "Limited" },
    { name: "Soy Pillar Candle", seller: "Wick Works", price: "₱ 460", tag: undefined },
    { name: "Risograph Print", seller: "Press & Fold", price: "₱ 580", tag: "New" },
    { name: "Oak Serving Board", seller: "Grain Workshop", price: "₱ 1,800", tag: undefined },
  ];

  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen">
      {/* Nav */}
      <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center shrink-0">
            <span className="text-white font-[var(--font-display)] text-sm">M</span>
          </div>
          <span className="font-[var(--font-mono)] text-xs text-[var(--color-navy)] tracking-wider font-[500] hidden @sm:block">MARKETPLACE</span>
          <div className="flex-1 @sm:mx-4">
            <div className="bg-[var(--color-surface)] rounded px-3 py-1.5 flex items-center gap-2 max-w-xl">
              <svg className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span className="text-xs text-[var(--color-ink-muted)]">Search handmade goods…</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button className="hidden @md:flex w-8 h-8 items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] rounded relative">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--color-amber)] text-white text-[8px] font-[var(--font-mono)] rounded-full flex items-center justify-center">3</span>
            </button>
            <button className="w-8 h-8 rounded-full bg-[var(--color-navy)] flex items-center justify-center">
              <span className="text-white text-[10px] font-[500]">M</span>
            </button>
          </div>
        </div>
        {/* Category bar — hidden on mobile */}
        <div className="hidden @md:flex border-t border-[var(--color-border)] overflow-x-auto">
          {categories.map(c => (
            <button key={c} className="px-4 py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] whitespace-nowrap cursor-pointer">{c}</button>
          ))}
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[var(--color-navy)] px-4 py-8 @md:py-14 @lg:py-20">
        <div className="max-w-4xl mx-auto flex flex-col @md:flex-row items-center gap-6 @md:gap-10">
          <div className="text-center @md:text-left flex-1">
            <p className="font-[var(--font-mono)] text-[10px] text-white/50 tracking-widest uppercase mb-2">Curated Handmade Goods</p>
            <h1 className="font-[var(--font-display)] text-2xl @md:text-4xl @lg:text-5xl text-white font-[400] leading-tight mb-4">
              Craft that<br className="hidden @md:block" /> tells a story
            </h1>
            <p className="text-sm @md:text-base text-white/60 mb-6 max-w-sm mx-auto @md:mx-0">Discover one-of-a-kind pieces from artisans across the Philippines.</p>
            <div className="flex gap-3 justify-center @md:justify-start flex-wrap">
              <button className="bg-[var(--color-amber)] text-white text-sm px-5 py-2.5 rounded font-[500] cursor-pointer">Shop Now</button>
              <button className="border border-white/30 text-white text-sm px-5 py-2.5 rounded cursor-pointer">Sell on Marketplace</button>
            </div>
          </div>
          <div className="w-full @md:w-80 @lg:w-96 h-48 @md:h-64 bg-white/10 rounded-lg shrink-0 flex items-center justify-center">
            <span className="text-white/20 text-4xl">🏺</span>
          </div>
        </div>
      </div>

      {/* Category pills — horizontal scroll on mobile, grid on tablet+ */}
      <div className="px-4 py-6">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Browse Categories</p>
        <div className="flex gap-2 overflow-x-auto pb-1 @md:grid @md:grid-cols-4 @lg:grid-cols-8">
          {categories.map(c => (
            <button key={c} className="shrink-0 @md:shrink px-4 py-2 bg-white border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] hover:border-[var(--color-navy)] cursor-pointer whitespace-nowrap">{c}</button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="px-4 pb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="font-[var(--font-display)] text-lg @md:text-xl text-[var(--color-ink)] font-[400]">Featured Items</p>
          <button className="text-xs text-[var(--color-navy)] font-[500] cursor-pointer">View all →</button>
        </div>
        <div className="grid grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 gap-3 @md:gap-4">
          {products.map(p => (
            <div key={p.name} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden cursor-pointer hover:shadow-[0_2px_12px_rgba(28,27,24,0.08)] transition-shadow">
              <div className="aspect-square bg-[var(--color-surface)] relative">
                {p.tag && (
                  <span className="absolute top-2 left-2 font-[var(--font-mono)] text-[8px] px-1.5 py-0.5 bg-[var(--color-amber)] text-white rounded uppercase">{p.tag}</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-[500] text-[var(--color-ink)] leading-snug mb-0.5 line-clamp-2">{p.name}</p>
                <p className="text-[10px] text-[var(--color-ink-muted)] mb-2">{p.seller}</p>
                <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink)] font-[500]">{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Product Detail ────────────────────────────────────────────
function ResponsiveProductDetail() {
  const [tab, setTab] = useState("desc");
  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen">
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-white">
        <nav className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)] flex gap-1.5 items-center flex-wrap">
          <span className="cursor-pointer hover:text-[var(--color-navy)]">Home</span>
          <span>/</span><span className="cursor-pointer hover:text-[var(--color-navy)]">Ceramics</span>
          <span>/</span><span className="text-[var(--color-ink)]">Stoneware Mug Set</span>
        </nav>
      </div>

      {/* Main: stacked on mobile, side-by-side on tablet+ */}
      <div className="flex flex-col @md:flex-row gap-0 @md:gap-8 px-4 @md:px-6 @lg:px-10 py-6 max-w-5xl mx-auto">
        {/* Image gallery */}
        <div className="w-full @md:w-1/2 @lg:w-[480px] shrink-0 space-y-2">
          <div className="aspect-square @md:aspect-[4/3] @lg:aspect-square bg-[var(--color-surface)] rounded-sm flex items-center justify-center">
            <span className="text-6xl">🏺</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className={`aspect-square bg-[var(--color-surface)] rounded-sm cursor-pointer ${i === 1 ? "ring-2 ring-[var(--color-navy)]" : ""}`} />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-4 @md:pt-0">
          <div className="flex items-start gap-2 mb-2">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-1">Clay &amp; Co.</p>
              <h1 className="font-[var(--font-display)] text-xl @md:text-2xl @lg:text-3xl text-[var(--color-ink)] font-[400] leading-tight">Stoneware Mug Set of 4</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Stars n={4} />
            <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)]">4.3 (128 reviews)</span>
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="font-[var(--font-mono)] text-2xl @md:text-3xl text-[var(--color-ink)] font-[500]">₱ 1,200</p>
            <p className="font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)] line-through">₱ 1,500</p>
            <Tag13 color="red">-20%</Tag13>
          </div>

          {/* Variant selectors — always full-width */}
          <div className="mb-4">
            <p className="text-xs font-[500] text-[var(--color-ink)] mb-2">Color: <span className="font-[400] text-[var(--color-ink-muted)]">Natural</span></p>
            <div className="flex gap-2 flex-wrap">
              {["Natural","Charcoal","Cream","Sage"].map(c => (
                <button key={c} className={`px-3 py-1.5 text-xs border rounded cursor-pointer ${c === "Natural" ? "border-[var(--color-navy)] text-[var(--color-navy)] font-[500]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)]"}`}>{c}</button>
              ))}
            </div>
          </div>

          {/* CTA — full width on mobile, inline on desktop */}
          <div className="flex flex-col @sm:flex-row gap-3 mb-6">
            <button className="flex-1 bg-[var(--color-navy)] text-white text-sm py-3 rounded font-[500] cursor-pointer">Add to Cart</button>
            <button className="@sm:w-12 border border-[var(--color-border)] text-[var(--color-ink-muted)] py-3 @sm:py-0 rounded cursor-pointer flex items-center justify-center gap-2 @sm:gap-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="@sm:hidden text-sm">Save to Wishlist</span>
            </button>
          </div>

          {/* Meta grid: 2-col on tablet+ */}
          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2 text-xs border-t border-[var(--color-border)] pt-4">
            {[
              ["Ships in", "2–5 business days"],
              ["Made in", "Metro Manila, PH"],
              ["Material", "Stoneware clay"],
              ["Care", "Microwave safe"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-[var(--color-ink-muted)] shrink-0 w-16">{k}</span>
                <span className="text-[var(--color-ink)] font-[500]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description tabs */}
      <div className="border-t border-[var(--color-border)] bg-white">
        <div className="max-w-5xl mx-auto px-4 @md:px-6 @lg:px-10">
          <div className="flex gap-0 border-b border-[var(--color-border)] overflow-x-auto">
            {[["desc","Description"],["reviews","Reviews (128)"],["shipping","Shipping"],["seller","About Seller"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-5 py-3.5 text-xs whitespace-nowrap border-b-2 transition-colors cursor-pointer ${tab === id ? "border-[var(--color-navy)] text-[var(--color-navy)] font-[600]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{label}</button>
            ))}
          </div>
          <div className="py-6 text-sm text-[var(--color-ink-secondary)] leading-relaxed max-w-2xl">
            Handcrafted from locally-sourced stoneware clay, this mug set embodies the beauty of imperfection. Each piece is wheel-thrown and glazed individually, meaning no two mugs are exactly alike. The warm, matte glaze feels smooth to the touch and holds heat beautifully.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category / Filters ────────────────────────────────────────
function ResponsiveCategoryPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const products = Array.from({ length: 9 }, (_, i) => ({
    name: ["Ceramic Bowl","Linen Tote","Silver Ring","Rattan Mat","Glass Jar","Soy Candle","Woven Basket","Oak Shelf","Clay Pot"][i],
    price: [980,1200,760,3400,540,460,1800,4200,620][i],
    seller: ["Clay","Loom","Forge","Weave","Glass","Wick","Basket","Grain","Earth"][i] + " Studio",
  }));

  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 @md:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">Category</p>
            <h1 className="font-[var(--font-display)] text-xl @md:text-2xl text-[var(--color-ink)] font-[400]">Ceramics</h1>
          </div>
          {/* Filter button — visible on mobile only */}
          <button
            onClick={() => setFilterOpen(true)}
            className="@md:hidden flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Filters
          </button>
          <div className="hidden @md:flex items-center gap-3">
            <span className="text-xs text-[var(--color-ink-muted)]">324 products</span>
            <select className="text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-white text-[var(--color-ink)] cursor-pointer">
              <option>Sort: Featured</option>
            </select>
          </div>
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex">
        {/* Sidebar — hidden on mobile, shown on md+ */}
        <aside className="hidden @md:block w-56 @lg:w-64 shrink-0 bg-white border-r border-[var(--color-border)] min-h-[calc(100vh-120px)]">
          <div className="p-4 space-y-5">
            {[
              { label: "Price Range", content: (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" className="w-full text-xs border border-[var(--color-border)] rounded px-2 py-1.5" />
                    <input type="number" placeholder="Max" className="w-full text-xs border border-[var(--color-border)] rounded px-2 py-1.5" />
                  </div>
                </div>
              )},
              { label: "Material", content: (
                <div className="space-y-1.5">
                  {["Stoneware","Earthenware","Porcelain","Terracotta"].map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-xs text-[var(--color-ink)]">{m}</span>
                    </label>
                  ))}
                </div>
              )},
              { label: "Rating", content: (
                <div className="space-y-1">
                  {[5,4,3].map(n => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="rating" />
                      <Stars n={n} />
                      <span className="text-xs text-[var(--color-ink-muted)]">&amp; up</span>
                    </label>
                  ))}
                </div>
              )},
            ].map(section => (
              <div key={section.label}>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">{section.label}</p>
                {section.content}
              </div>
            ))}
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 @md:grid-cols-2 @lg:grid-cols-3 gap-3">
            {products.map(p => (
              <div key={p.name} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden cursor-pointer hover:shadow-[0_2px_12px_rgba(28,27,24,0.08)] transition-shadow">
                <div className="aspect-square bg-[var(--color-surface)]" />
                <div className="p-3">
                  <p className="text-xs font-[500] text-[var(--color-ink)] leading-snug mb-0.5">{p.name}</p>
                  <p className="text-[10px] text-[var(--color-ink-muted)] mb-1.5">{p.seller}</p>
                  <p className="font-[var(--font-mono)] text-xs font-[500]">₱ {p.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {filterOpen && (
        <div className="@md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[var(--color-ink)]/50" onClick={() => setFilterOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-[0_-8px_32px_rgba(28,27,24,0.15)] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
              <p className="text-sm font-[600] text-[var(--color-ink)]">Filters</p>
              <button onClick={() => setFilterOpen(false)} className="text-[var(--color-ink-muted)] cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Material</p>
                <div className="flex flex-wrap gap-2">
                  {["Stoneware","Earthenware","Porcelain","Terracotta","Raku"].map(m => (
                    <button key={m} className="px-3 py-1.5 border border-[var(--color-border)] rounded-full text-xs cursor-pointer">{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Price Range</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min ₱" className="flex-1 text-xs border border-[var(--color-border)] rounded px-3 py-2" />
                  <input type="number" placeholder="Max ₱" className="flex-1 text-xs border border-[var(--color-border)] rounded px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-4 pb-6">
              <button className="flex-1 border border-[var(--color-border)] text-sm py-3 rounded cursor-pointer">Reset</button>
              <button onClick={() => setFilterOpen(false)} className="flex-1 bg-[var(--color-navy)] text-white text-sm py-3 rounded font-[500] cursor-pointer">Show 324 results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cart Page ─────────────────────────────────────────────────
function ResponsiveCartPage() {
  const items = [
    { name: "Stoneware Mug Set", seller: "Clay & Co.", price: 1200, qty: 1, img: "🏺" },
    { name: "Handwoven Table Runner", seller: "Loom Studio", price: 2400, qty: 2, img: "🧶" },
    { name: "Silver Hoop Earrings", seller: "Forge & Fire", price: 980, qty: 1, img: "💍" },
  ];
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen">
      <div className="bg-white border-b border-[var(--color-border)] px-4 @md:px-6 py-4">
        <h1 className="font-[var(--font-display)] text-xl @md:text-2xl text-[var(--color-ink)] font-[400]">Your Cart <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink-muted)] font-[400]">(3 items)</span></h1>
      </div>

      {/* Layout: stacked on mobile, side-by-side on lg+ */}
      <div className="flex flex-col @lg:flex-row gap-6 p-4 @md:p-6 max-w-5xl mx-auto">
        {/* Items */}
        <div className="flex-1 space-y-3">
          {items.map(item => (
            <div key={item.name} className="bg-white border border-[var(--color-border)] rounded-sm p-3 @md:p-4 flex gap-3">
              <div className="w-16 h-16 @md:w-20 @md:h-20 bg-[var(--color-surface)] rounded shrink-0 flex items-center justify-center text-2xl">{item.img}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs @md:text-sm font-[500] text-[var(--color-ink)] leading-snug">{item.name}</p>
                <p className="text-[10px] text-[var(--color-ink-muted)] mb-2">{item.seller}</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center border border-[var(--color-border)] rounded overflow-hidden">
                    <button className="w-7 h-7 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] text-sm cursor-pointer">−</button>
                    <span className="w-8 text-center text-xs font-[var(--font-mono)]">{item.qty}</span>
                    <button className="w-7 h-7 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] text-sm cursor-pointer">+</button>
                  </div>
                  <p className="font-[var(--font-mono)] text-xs font-[500]">₱ {(item.price * item.qty).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary — fixed bottom on mobile, sidebar on desktop */}
        <div className="@lg:w-80 @lg:shrink-0">
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-4 @lg:sticky @lg:top-4">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Order Summary</p>
            <div className="space-y-2 text-xs mb-4">
              {[["Subtotal","₱ " + subtotal.toLocaleString()],["Shipping","₱ 120"],["Total","₱ " + (subtotal + 120).toLocaleString()]].map(([k,v], i) => (
                <div key={k} className={`flex justify-between ${i === 2 ? "font-[600] text-sm border-t border-[var(--color-border)] pt-2 mt-2" : "text-[var(--color-ink-muted)]"}`}>
                  <span className={i === 2 ? "text-[var(--color-ink)]" : ""}>{k}</span>
                  <span className={i === 2 ? "font-[var(--font-mono)] text-[var(--color-ink)]" : "font-[var(--font-mono)]"}>{v}</span>
                </div>
              ))}
            </div>
            <button className="w-full bg-[var(--color-navy)] text-white text-sm py-3 rounded font-[500] cursor-pointer">Proceed to Checkout</button>
            <div className="mt-3 flex gap-2 items-center">
              <input type="text" placeholder="Promo code" className="flex-1 text-xs border border-[var(--color-border)] rounded px-3 py-2" />
              <button className="text-xs text-[var(--color-navy)] font-[500] cursor-pointer px-3 py-2 border border-[var(--color-navy)] rounded">Apply</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Seller Dashboard ──────────────────────────────────────────
function ResponsiveSellerDashboard() {
  const kpis = [
    { label: "Total Revenue", value: "₱ 48,320", delta: "+12.4%", up: true },
    { label: "Orders This Month", value: "184", delta: "+8.1%", up: true },
    { label: "Avg. Order Value", value: "₱ 1,260", delta: "-2.3%", up: false },
    { label: "Active Products", value: "42", delta: "+5", up: true },
  ];
  const orders = [
    { id: "#ORD-0091", item: "Mug Set", buyer: "Ana R.", total: "₱ 1,200", status: "Processing" },
    { id: "#ORD-0090", item: "Table Runner", buyer: "Ben C.", total: "₱ 4,800", status: "Delivered" },
    { id: "#ORD-0089", item: "Earrings", buyer: "Cara M.", total: "₱ 980", status: "Pending" },
    { id: "#ORD-0088", item: "Vase (x2)", buyer: "Dan P.", total: "₱ 6,400", status: "Shipped" },
  ];
  const statusColor: Record<string, string> = {
    Processing: "amber", Delivered: "green", Pending: "muted", Shipped: "navy",
  };

  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen p-4 @md:p-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">Seller Center</p>
          <h1 className="font-[var(--font-display)] text-xl @md:text-2xl text-[var(--color-ink)] font-[400]">Good morning, Maria</h1>
        </div>
        <button className="shrink-0 bg-[var(--color-navy)] text-white text-xs px-4 py-2 rounded cursor-pointer font-[500]">+ New Product</button>
      </div>

      {/* KPI cards: 1 → 2 → 4 cols */}
      <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-sm p-4">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">{k.label}</p>
            <p className="font-[var(--font-display)] text-2xl @lg:text-3xl text-[var(--color-ink)] font-[400] mb-1">{k.value}</p>
            <span className={`font-[var(--font-mono)] text-[10px] ${k.up ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>{k.delta} vs last month</span>
          </div>
        ))}
      </div>

      {/* Charts: stacked on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-4 mb-6">
        <div className="@lg:col-span-2 bg-white border border-[var(--color-border)] rounded-sm p-4">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Revenue — Last 30 Days</p>
          <div className="h-40 @md:h-48 flex items-end gap-1">
            {Array.from({ length: 30 }, (_, i) => Math.random() * 100 + 20).map((h, i) => (
              <div key={i} className="flex-1 bg-[var(--color-navy-surface)] hover:bg-[var(--color-navy)] transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-4">Top Categories</p>
          <div className="space-y-3">
            {[["Mugs", 42], ["Bowls", 28], ["Vases", 18], ["Plates", 12]].map(([name, pct]) => (
              <div key={name as string}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-ink)]">{name}</span>
                  <span className="font-[var(--font-mono)] text-[var(--color-ink-muted)]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-navy)] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders: cards on mobile, table on desktop */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <p className="text-sm font-[600] text-[var(--color-ink)]">Recent Orders</p>
          <button className="text-xs text-[var(--color-navy)] font-[500] cursor-pointer">View all</button>
        </div>
        {/* Card layout (mobile) */}
        <div className="@md:hidden divide-y divide-[var(--color-border-subtle)]">
          {orders.map(o => (
            <div key={o.id} className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-0.5">{o.id}</p>
                <p className="text-xs font-[500] text-[var(--color-ink)] mb-0.5">{o.item}</p>
                <p className="text-[10px] text-[var(--color-ink-muted)]">{o.buyer}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-[var(--font-mono)] text-xs font-[500] mb-1">{o.total}</p>
                <Tag13 color={statusColor[o.status]}>{o.status}</Tag13>
              </div>
            </div>
          ))}
        </div>
        {/* Table layout (tablet+) */}
        <table className="hidden @md:table w-full">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              {["Order","Item","Buyer","Total","Status"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-[var(--color-surface)] cursor-pointer">
                <td className="px-4 py-3 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{o.id}</td>
                <td className="px-4 py-3 text-xs font-[500] text-[var(--color-ink)]">{o.item}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-ink-muted)]">{o.buyer}</td>
                <td className="px-4 py-3 font-[var(--font-mono)] text-xs">{o.total}</td>
                <td className="px-4 py-3"><Tag13 color={statusColor[o.status]}>{o.status}</Tag13></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Admin Users Table ─────────────────────────────────────────
function ResponsiveAdminUsers() {
  const users = [
    { name: "Maria Santos", email: "maria@email.com", role: "Seller", status: "Active", joined: "Jan 12, 2025", orders: 48 },
    { name: "Ben Cruz", email: "ben@email.com", role: "Buyer", status: "Active", joined: "Mar 4, 2025", orders: 12 },
    { name: "Cara Mendez", email: "cara@email.com", role: "Buyer", status: "Restricted", joined: "Feb 19, 2025", orders: 3 },
    { name: "Dan Pascual", email: "dan@email.com", role: "Seller", status: "Pending", joined: "Jul 1, 2025", orders: 0 },
    { name: "Elena Reyes", email: "elena@email.com", role: "Buyer", status: "Active", joined: "Nov 22, 2024", orders: 31 },
  ];
  const statusColor: Record<string, string> = { Active: "green", Restricted: "red", Pending: "amber" };
  const roleColor: Record<string, string> = { Seller: "violet", Buyer: "navy" };

  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 @md:px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-[var(--font-display)] text-xl @md:text-2xl text-[var(--color-ink)] font-[400]">Users</h1>
          <div className="flex items-center gap-2">
            <div className="bg-[var(--color-surface)] rounded px-3 py-1.5 flex items-center gap-2">
              <svg className="w-3 h-3 text-[var(--color-ink-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search users…" className="text-xs bg-transparent outline-none text-[var(--color-ink)] w-32 @md:w-48" />
            </div>
            <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] rounded text-[var(--color-ink)] cursor-pointer hidden @sm:flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filter
            </button>
            <button className="text-xs px-3 py-1.5 bg-[var(--color-navy)] text-white rounded cursor-pointer font-[500]">+ Invite</button>
          </div>
        </div>
      </div>

      {/* Card layout (mobile) */}
      <div className="@md:hidden p-4 space-y-3">
        {users.map(u => (
          <div key={u.email} className="bg-white border border-[var(--color-border)] rounded-sm p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-[500]">{u.name.split(" ").map(n => n[0]).join("")}</span>
                </div>
                <div>
                  <p className="text-sm font-[500] text-[var(--color-ink)]">{u.name}</p>
                  <p className="text-[10px] text-[var(--color-ink-muted)]">{u.email}</p>
                </div>
              </div>
              <button className="text-[var(--color-ink-muted)] cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5">
                <Tag13 color={roleColor[u.role]}>{u.role}</Tag13>
                <Tag13 color={statusColor[u.status]}>{u.status}</Tag13>
              </div>
              <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Joined {u.joined}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table layout (tablet+) */}
      <div className="hidden @md:block p-4 @md:p-6">
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <tr>
                {["User","Role","Status","Joined","Orders",""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {users.map(u => (
                <tr key={u.email} className="hover:bg-[var(--color-surface)] cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-[500]">{u.name.split(" ").map(n => n[0]).join("")}</span>
                      </div>
                      <div>
                        <p className="text-xs font-[500] text-[var(--color-ink)]">{u.name}</p>
                        <p className="text-[10px] text-[var(--color-ink-muted)]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Tag13 color={roleColor[u.role]}>{u.role}</Tag13></td>
                  <td className="px-4 py-3"><Tag13 color={statusColor[u.status]}>{u.status}</Tag13></td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{u.joined}</td>
                  <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{u.orders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="text-xs text-[var(--color-navy)] px-2 py-1 hover:bg-[var(--color-navy-surface)] rounded cursor-pointer">View</button>
                      <button className="text-xs text-[var(--color-ink-muted)] px-2 py-1 hover:bg-[var(--color-surface)] rounded cursor-pointer">…</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Order History (Buyer) ─────────────────────────────────────
function ResponsiveOrderHistory() {
  const orders = [
    { id: "#ORD-0091", date: "Aug 10, 2025", seller: "Clay & Co.", items: 4, total: "₱ 4,800", status: "Delivered", progress: 100 },
    { id: "#ORD-0088", date: "Aug 3, 2025",  seller: "Loom Studio", items: 2, total: "₱ 4,800", status: "In Transit", progress: 65 },
    { id: "#ORD-0085", date: "Jul 29, 2025", seller: "Forge & Fire", items: 1, total: "₱ 980",   status: "Processing", progress: 30 },
    { id: "#ORD-0081", date: "Jul 18, 2025", seller: "Wick Works", items: 3, total: "₱ 1,380",  status: "Completed", progress: 100 },
  ];
  const statusColor: Record<string, string> = { Delivered: "green", "In Transit": "navy", Processing: "amber", Completed: "muted" };

  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen">
      <div className="bg-white border-b border-[var(--color-border)] px-4 @md:px-6 py-4">
        <h1 className="font-[var(--font-display)] text-xl @md:text-2xl text-[var(--color-ink)] font-[400]">My Orders</h1>
      </div>

      {/* Filter strip — scrollable on mobile */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 @md:px-6">
        <div className="flex gap-0 overflow-x-auto">
          {["All","Active","Completed","Cancelled"].map((f, i) => (
            <button key={f} className={`px-4 py-3 text-xs whitespace-nowrap border-b-2 transition-colors cursor-pointer ${i === 0 ? "border-[var(--color-navy)] text-[var(--color-navy)] font-[600]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="p-4 @md:p-6 max-w-3xl mx-auto space-y-3">
        {orders.map(o => (
          <div key={o.id} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden cursor-pointer hover:shadow-[0_2px_8px_rgba(28,27,24,0.06)] transition-shadow">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{o.id}</span>
                <span className="text-[10px] text-[var(--color-ink-muted)]">{o.date}</span>
                <span className="text-[10px] text-[var(--color-ink-muted)]">via {o.seller}</span>
              </div>
              <Tag13 color={statusColor[o.status]}>{o.status}</Tag13>
            </div>
            {/* Body */}
            <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap @sm:flex-nowrap">
              {/* Items preview */}
              <div className="flex gap-2">
                {Array.from({ length: Math.min(o.items, 3) }, (_, i) => (
                  <div key={i} className="w-12 h-12 @md:w-14 @md:h-14 bg-[var(--color-surface)] rounded-sm" />
                ))}
                {o.items > 3 && (
                  <div className="w-12 h-12 @md:w-14 @md:h-14 bg-[var(--color-surface)] rounded-sm flex items-center justify-center">
                    <span className="text-[10px] text-[var(--color-ink-muted)]">+{o.items - 3}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-[var(--color-ink-muted)] mb-0.5">{o.items} item{o.items > 1 ? "s" : ""}</p>
                  <p className="font-[var(--font-mono)] text-sm font-[500]">{o.total}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {o.status === "Delivered" && <button className="text-xs px-3 py-1.5 bg-[var(--color-navy)] text-white rounded cursor-pointer font-[500]">Review</button>}
                  <button className="text-xs px-3 py-1.5 border border-[var(--color-border)] rounded text-[var(--color-ink)] cursor-pointer">Details</button>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {o.status !== "Completed" && o.status !== "Delivered" && (
              <div className="px-4 pb-3">
                <div className="h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-navy)] rounded-full transition-all" style={{ width: `${o.progress}%` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pattern: Navigation ───────────────────────────────────────
function PatternNavigation() {
  return (
    <div className="@container bg-[var(--color-ground)] min-h-screen p-4 @md:p-8">
      <div className="mb-6">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-1">Navigation Patterns</p>
        <h2 className="font-[var(--font-display)] text-xl @md:text-2xl text-[var(--color-ink)] font-[400]">Adaptive Navigation System</h2>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">Three navigation strategies for three breakpoints — each optimized for the interaction model of its context.</p>
      </div>

      <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
        {/* Mobile bottom bar */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="bg-[var(--color-violet-light)] px-4 py-2 border-b border-[var(--color-border)]">
            <Tag13 color="violet">Mobile · &lt;768px</Tag13>
          </div>
          <div className="p-4">
            <p className="text-xs font-[500] text-[var(--color-ink)] mb-1">Bottom Tab Bar</p>
            <p className="text-[10px] text-[var(--color-ink-muted)] mb-4">5 primary tabs always visible. Thumb-reachable zone. Badge counts on key items.</p>
            {/* Mini bottom bar demo */}
            <div className="border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="h-20 bg-[var(--color-surface)] relative flex items-center justify-center">
                <span className="text-[10px] text-[var(--color-ink-muted)]">Page content</span>
              </div>
              <div className="flex border-t border-[var(--color-border)] bg-white">
                {[
                  { label: "Home", active: true },
                  { label: "Products", active: false },
                  { label: "Orders", active: false, badge: true },
                  { label: "Analytics", active: false },
                  { label: "More", active: false },
                ].map(t => (
                  <div key={t.label} className={`flex-1 flex flex-col items-center justify-center py-2 relative ${t.active ? "text-[var(--color-navy)]" : "text-[var(--color-ink-muted)]"}`}>
                    {t.active && <div className="absolute top-0 inset-x-0 h-0.5 bg-[var(--color-navy)]" />}
                    <div className={`w-4 h-4 rounded-sm mb-0.5 ${t.active ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"} relative`}>
                      {t.badge && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--color-red)] rounded-full" />}
                    </div>
                    <span className="text-[7px]">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tablet hamburger drawer */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="bg-[var(--color-amber-light)] px-4 py-2 border-b border-[var(--color-border)]">
            <Tag13 color="amber">Tablet · 768–1023px</Tag13>
          </div>
          <div className="p-4">
            <p className="text-xs font-[500] text-[var(--color-ink)] mb-1">Hamburger + Slide Drawer</p>
            <p className="text-[10px] text-[var(--color-ink-muted)] mb-4">Full nav accessible via slide-in overlay. Closes on backdrop tap or explicit close.</p>
            <div className="border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="h-8 bg-[var(--color-navy)] flex items-center px-3 gap-2">
                <div className="space-y-0.5">
                  <div className="w-3 h-0.5 bg-white/60" />
                  <div className="w-3 h-0.5 bg-white/60" />
                  <div className="w-3 h-0.5 bg-white/60" />
                </div>
                <div className="w-12 h-1.5 bg-white/20 rounded-full ml-2" />
              </div>
              <div className="flex h-28">
                <div className="w-24 bg-[var(--color-navy)] p-2 space-y-1">
                  {["Dashboard","Products","Orders","Analytics","Settings"].map((l, i) => (
                    <div key={l} className={`px-2 py-1 rounded-sm text-[7px] ${i === 0 ? "bg-[var(--color-amber-light)] text-[var(--color-amber)]" : "text-white/50"}`}>{l}</div>
                  ))}
                </div>
                <div className="flex-1 bg-[var(--color-surface)] flex items-center justify-center">
                  <span className="text-[8px] text-[var(--color-ink-muted)]">Page content</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop persistent sidebar */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="bg-[var(--color-green-light)] px-4 py-2 border-b border-[var(--color-border)]">
            <Tag13 color="green">Desktop · 1024px+</Tag13>
          </div>
          <div className="p-4">
            <p className="text-xs font-[500] text-[var(--color-ink)] mb-1">Persistent Collapsible Sidebar</p>
            <p className="text-[10px] text-[var(--color-ink-muted)] mb-4">Always visible. Collapses to icon-only mode. Labels + badges in expanded state.</p>
            <div className="border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="flex h-36">
                <div className="w-28 bg-[var(--color-navy)] p-2 space-y-1">
                  <div className="text-[6px] text-white/30 uppercase tracking-wider px-2 mb-1">Management</div>
                  {["Dashboard","Products","Orders","Customers","Analytics"].map((l, i) => (
                    <div key={l} className={`flex items-center gap-1.5 px-2 py-1 rounded-sm ${i === 0 ? "bg-[var(--color-amber-light)]" : ""}`}>
                      <div className={`w-2 h-2 rounded-sm shrink-0 ${i === 0 ? "bg-[var(--color-amber)]" : "bg-white/20"}`} />
                      <span className={`text-[6px] ${i === 0 ? "text-[var(--color-amber)]" : "text-white/50"}`}>{l}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-[var(--color-surface)] flex items-center justify-center">
                  <span className="text-[8px] text-[var(--color-ink-muted)]">Page content</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pattern: Filters */}
      <div className="mt-8 mb-4">
        <p className="font-[var(--font-display)] text-lg text-[var(--color-ink)] font-[400]">Filter Patterns</p>
      </div>
      <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag13 color="violet">Mobile</Tag13>
            <p className="text-xs font-[500] text-[var(--color-ink)]">Bottom Sheet Drawer</p>
          </div>
          <p className="text-[10px] text-[var(--color-ink-muted)] mb-3">Filters hidden behind a button. Presented as a modal bottom sheet with clear apply/reset actions.</p>
          <div className="border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] h-24 relative overflow-hidden flex items-end">
            <div className="w-full bg-white rounded-t-xl border-t border-[var(--color-border)] p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-[600]">Filters</span>
                <div className="w-4 h-0.5 bg-[var(--color-border)] mx-auto rounded-full" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {["Stoneware","Porcelain","Raku"].map(f => (
                  <span key={f} className="px-2 py-0.5 border border-[var(--color-border)] rounded-full text-[7px]">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag13 color="green">Desktop</Tag13>
            <p className="text-xs font-[500] text-[var(--color-ink)]">Inline Sidebar Panel</p>
          </div>
          <p className="text-[10px] text-[var(--color-ink-muted)] mb-3">Filters always visible in a persistent left panel. No overlay needed. Instant feedback on filter changes.</p>
          <div className="border border-[var(--color-border)] rounded-sm overflow-hidden flex h-24">
            <div className="w-24 bg-white border-r border-[var(--color-border)] p-2 space-y-1.5">
              <span className="text-[7px] font-[var(--font-mono)] text-[var(--color-ink-muted)] uppercase">Material</span>
              {["Stoneware","Earthenware","Porcelain"].map(f => (
                <div key={f} className="flex items-center gap-1">
                  <div className="w-2 h-2 border border-[var(--color-border)] rounded-sm" />
                  <span className="text-[7px] text-[var(--color-ink)]">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 bg-[var(--color-surface)] grid grid-cols-2 gap-1 p-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-white rounded-sm aspect-square" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pattern: Tables */}
      <div className="mt-8 mb-4">
        <p className="font-[var(--font-display)] text-lg text-[var(--color-ink)] font-[400]">Table Patterns</p>
      </div>
      <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
        {[
          {
            label: "Card Rows",
            vp: "mobile",
            color: "violet",
            desc: "Each row becomes a card with primary info prominent. Actions remain accessible via overflow menu.",
          },
          {
            label: "Horizontal Scroll",
            vp: "tablet",
            color: "amber",
            desc: "Table scrolls horizontally with first column sticky. Swipe hint on first render.",
          },
          {
            label: "Full Table",
            vp: "desktop",
            color: "green",
            desc: "All columns visible. Sortable headers. Row hover reveals inline action buttons.",
          },
        ].map(p => (
          <div key={p.label} className="bg-white border border-[var(--color-border)] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag13 color={p.color as string}>{p.label}</Tag13>
            </div>
            <p className="text-[10px] text-[var(--color-ink-muted)] mb-3">{p.desc}</p>
            <div className="border border-[var(--color-border)] rounded-sm overflow-hidden">
              {p.vp === "mobile" ? (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {["Row A","Row B","Row C"].map(r => (
                    <div key={r} className="flex items-center justify-between p-2">
                      <div>
                        <div className="w-16 h-2 bg-[var(--color-border)] rounded mb-1" />
                        <div className="w-10 h-1.5 bg-[var(--color-border-subtle)] rounded" />
                      </div>
                      <div className="w-8 h-4 bg-[var(--color-navy-surface)] rounded-sm" />
                    </div>
                  ))}
                </div>
              ) : p.vp === "tablet" ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[300px]">
                    <div className="flex bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                      {["Name","Status","Date","Total"].map(h => (
                        <div key={h} className="flex-1 px-2 py-1.5 text-[7px] font-[var(--font-mono)] text-[var(--color-ink-muted)] uppercase">{h}</div>
                      ))}
                    </div>
                    {["A","B","C"].map(r => (
                      <div key={r} className="flex border-b border-[var(--color-border-subtle)]">
                        {[1,2,3,4].map(c => (
                          <div key={c} className="flex-1 px-2 py-1.5">
                            <div className="h-1.5 bg-[var(--color-border-subtle)] rounded w-full" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                    {["Name","Role","Status","Date","Actions"].map(h => (
                      <div key={h} className="flex-1 px-2 py-1.5 text-[7px] font-[var(--font-mono)] text-[var(--color-ink-muted)] uppercase">{h}</div>
                    ))}
                  </div>
                  {["A","B","C"].map(r => (
                    <div key={r} className="flex border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] group">
                      {[1,2,3,4].map(c => (
                        <div key={c} className="flex-1 px-2 py-1.5">
                          <div className="h-1.5 bg-[var(--color-border-subtle)] rounded w-full" />
                        </div>
                      ))}
                      <div className="flex-1 px-2 py-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-3 bg-[var(--color-navy-surface)] rounded-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section + Variant registry ────────────────────────────────
type Variant = { id: string; label: string; desc: string; component: React.ReactNode };
type Section = { id: SectionId; label: string; sublabel: string; variants: Variant[] };

const SECTIONS: Section[] = [
  {
    id: "storefront",
    label: "Public Storefront",
    sublabel: "Homepage, Product, Filters",
    variants: [
      { id: "homepage",   label: "Homepage",        desc: "Hero · categories · product grid · footer",    component: <ResponsiveHomepage /> },
      { id: "product",    label: "Product Detail",   desc: "Images · info · variants · description tabs", component: <ResponsiveProductDetail /> },
      { id: "category",   label: "Category & Filters", desc: "Sidebar filters · bottom sheet on mobile",  component: <ResponsiveCategoryPage /> },
    ],
  },
  {
    id: "buyer",
    label: "Buyer",
    sublabel: "Cart, Orders, Dashboard",
    variants: [
      { id: "cart",    label: "Cart",          desc: "Items · order summary · promo code",    component: <ResponsiveCartPage /> },
      { id: "orders",  label: "Order History", desc: "Filter tabs · order cards with progress", component: <ResponsiveOrderHistory /> },
    ],
  },
  {
    id: "seller",
    label: "Seller",
    sublabel: "Dashboard, Products, Orders",
    variants: [
      { id: "dashboard", label: "Dashboard", desc: "KPI 1→2→4 cols · charts · orders table→cards", component: <ResponsiveSellerDashboard /> },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    sublabel: "Tables, Users, Analytics",
    variants: [
      { id: "users", label: "User Management", desc: "Cards on mobile · full table on desktop",  component: <ResponsiveAdminUsers /> },
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    sublabel: "Nav · Filters · Tables",
    variants: [
      { id: "nav", label: "Navigation & Patterns", desc: "Bottom bar · drawer · sidebar · filter patterns · table modes", component: <PatternNavigation /> },
    ],
  },
];

// ── Breakpoint indicator ──────────────────────────────────────
function BreakpointIndicator({ width }: { width: number | null }) {
  if (!width) return null;
  const bp = width < 640 ? { label: "base", color: "bg-[var(--color-violet)] text-white" }
           : width < 768 ? { label: "@sm ≥640", color: "bg-[var(--color-amber)] text-white" }
           : width < 1024 ? { label: "@md ≥768", color: "bg-[var(--color-amber)] text-white" }
           : width < 1280 ? { label: "@lg ≥1024", color: "bg-[var(--color-green)] text-white" }
           : { label: "@xl ≥1280", color: "bg-[var(--color-navy)] text-white" };
  return (
    <span className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-full ${bp.color}`}>
      {bp.label}
    </span>
  );
}

// ── Part13 controller ─────────────────────────────────────────
export default function Part13() {
  const [sectionId, setSectionId] = useState<SectionId>("storefront");
  const [variantId, setVariantId] = useState("homepage");
  const [viewportId, setViewportId] = useState<ViewportId>("mobile");

  const section = SECTIONS.find(s => s.id === sectionId)!;
  const variants = section.variants;
  const variant = variants.find(v => v.id === variantId) ?? variants[0];
  const vp = VIEWPORTS.find(v => v.id === viewportId)!;

  const handleSectionChange = (id: SectionId) => {
    setSectionId(id);
    const sec = SECTIONS.find(s => s.id === id)!;
    setVariantId(sec.variants[0].id);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-ground)] overflow-hidden">

      {/* ── Top control bar ──────────────────────────────── */}
      <div className="bg-[var(--color-navy)] text-white shrink-0">
        {/* Section tabs */}
        <div className="flex items-center px-4 gap-1 border-b border-white/10 overflow-x-auto">
          <span className="font-[var(--font-mono)] text-[9px] text-white/30 mr-2 uppercase tracking-widest shrink-0">Part 13</span>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs transition-colors whitespace-nowrap border-b-2 cursor-pointer ${sectionId === s.id ? "border-white text-white font-[500]" : "border-transparent text-white/50 hover:text-white/80 hover:border-white/30"}`}
            >
              {s.label}
              <span className="text-[9px] text-white/30 hidden md:inline">— {s.sublabel}</span>
            </button>
          ))}
        </div>

        {/* Viewport selector */}
        <div className="flex items-center px-4 py-2 gap-3 overflow-x-auto">
          <span className="font-[var(--font-mono)] text-[9px] text-white/30 uppercase tracking-widest shrink-0">Viewport</span>
          <div className="flex gap-1">
            {VIEWPORTS.map(v => (
              <button
                key={v.id}
                onClick={() => setViewportId(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors ${viewportId === v.id ? "bg-white/15 text-white font-[500]" : "text-white/50 hover:text-white hover:bg-white/8"}`}
              >
                {v.label}
                <span className="font-[var(--font-mono)] text-[9px] text-white/30">{v.px ? `${v.px}px` : "fluid"}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <BreakpointIndicator width={vp.px} />
            <BpBadge vp={viewportId} />
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar — variants */}
        <div className="w-48 shrink-0 bg-white border-r border-[var(--color-border)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{section.label}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {variants.map(v => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${variantId === v.id ? "bg-[var(--color-surface)] border-l-2 border-l-[var(--color-navy)]" : "hover:bg-[var(--color-ground)]"}`}
              >
                <p className={`text-xs font-[500] leading-snug mb-1 ${variantId === v.id ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{v.label}</p>
                <p className="text-[10px] text-[var(--color-ink-muted)] leading-snug">{v.desc}</p>
              </button>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Container queries active</p>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-ground)]">
          {/* Info bar */}
          <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
            <p className="text-xs font-[500] text-[var(--color-ink)]">{variant.label}</p>
            <span className="text-[10px] text-[var(--color-ink-muted)]">—</span>
            <p className="text-[10px] text-[var(--color-ink-muted)]">{variant.desc}</p>
            <span className="ml-auto font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{vp.desc}</span>
          </div>

          {/* Scrollable frame wrapper */}
          <div className="flex-1 overflow-auto p-4 @md:p-6 flex justify-center" key={`${sectionId}-${variantId}-${viewportId}`}>
            {/* Device frame */}
            <div
              className="@container bg-white shadow-[0_4px_32px_rgba(28,27,24,0.12)] rounded-sm overflow-hidden relative"
              style={{
                width: vp.px ? `${vp.px}px` : "100%",
                minWidth: vp.px ? `${vp.px}px` : undefined,
                minHeight: "600px",
              }}
            >
              {/* Frame label */}
              <div className="absolute top-2 right-2 z-20 pointer-events-none">
                <span className="font-[var(--font-mono)] text-[8px] bg-[var(--color-ink)]/70 text-white px-1.5 py-0.5 rounded-full">
                  {vp.px ? `${vp.px}px` : "fluid"}
                </span>
              </div>
              {/* Scrollable page content */}
              <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: "calc(100vh - 200px)" }}>
                {variant.component}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
