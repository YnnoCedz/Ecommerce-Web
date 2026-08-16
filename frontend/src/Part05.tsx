import { useState } from "react";
import PublicShell from "./shells/PublicShell";
import HomePage from "./pages/pub/HomePage";
import CategoryPage from "./pages/pub/CategoryPage";
import SearchPage from "./pages/pub/SearchPage";
import ProductPage from "./pages/pub/ProductPage";
import SellerStorePage from "./pages/pub/SellerStorePage";

type Page =
  | { id: "home" }
  | { id: "category"; cat: string }
  | { id: "search"; q: string }
  | { id: "product"; slug: string }
  | { id: "seller"; slug: string };

export default function Part05() {
  const [page, setPage] = useState<Page>({ id: "home" });
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = (pageId: string, params?: Record<string, string>) => {
    if (pageId === "home") setPage({ id: "home" });
    else if (pageId === "category") setPage({ id: "category", cat: params?.cat ?? "fashion" });
    else if (pageId === "search") setPage({ id: "search", q: params?.q ?? "" });
    else if (pageId === "product") setPage({ id: "product", slug: params?.slug ?? "" });
    else if (pageId === "seller") setPage({ id: "seller", slug: params?.slug ?? "" });
  };

  const pageLabel: Record<string, string> = {
    home: "Home",
    category: "Category",
    search: "Search",
    product: "Product Detail",
    seller: "Seller Store",
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-ground)]">

      {/* ── DEMO CONTROL STRIP ──────────────────────────────── */}
      <div className="shrink-0 bg-[#0F2030] border-b border-white/10 flex items-center gap-4 px-4 py-2.5 overflow-x-auto">
        <span className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest shrink-0">PART 05 — PUBLIC STOREFRONT</span>

        {/* Page nav pills */}
        <div className="flex items-center gap-1.5">
          {([
            { id: "home", label: "Home", params: undefined },
            { id: "category", label: "Category", params: { cat: "fashion" } as Record<string, string> },
            { id: "search", label: "Search", params: { q: "leather" } as Record<string, string> },
            { id: "product", label: "Product", params: { slug: "minimalist-chronograph-watch" } as Record<string, string> },
            { id: "seller", label: "Seller Store", params: { slug: "artisan-goods" } as Record<string, string> },
          ] as { id: string; label: string; params: Record<string, string> | undefined }[]).map(p => (
            <button
              key={p.id}
              onClick={() => navigate(p.id, p.params)}
              className={`shrink-0 font-[var(--font-mono)] text-[10px] px-3 py-1 rounded-sm transition-colors cursor-pointer ${page.id === p.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {/* Login toggle */}
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setIsLoggedIn(l => !l)}>
            <div className={`w-7 h-3.5 rounded-full relative transition-colors ${isLoggedIn ? "bg-[var(--color-amber)]" : "bg-white/20"}`}>
              <span className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-all ${isLoggedIn ? "left-3.5" : "left-0.5"}`} />
            </div>
            <span className="font-[var(--font-mono)] text-[10px] text-white/50">{isLoggedIn ? "Logged In" : "Guest"}</span>
          </label>

          {/* Current page indicator */}
          <div className="font-[var(--font-mono)] text-[9px] text-white/30 bg-white/5 px-2.5 py-1 rounded-sm">
            /{pageLabel[page.id] ?? page.id}
          </div>
        </div>
      </div>

      {/* ── SHELL + PAGE CONTENT ────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <PublicShell
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          isLoggedIn={isLoggedIn}>
          {page.id === "home" && (
            <HomePage onNavigate={navigate} />
          )}
          {page.id === "category" && (
            <CategoryPage catSlug={page.cat} onNavigate={navigate} />
          )}
          {page.id === "search" && (
            <SearchPage query={page.q} onNavigate={navigate} />
          )}
          {page.id === "product" && (
            <ProductPage slug={page.slug} onNavigate={navigate} />
          )}
          {page.id === "seller" && (
            <SellerStorePage sellerSlug={page.slug} onNavigate={navigate} />
          )}
        </PublicShell>
      </div>
    </div>
  );
}
