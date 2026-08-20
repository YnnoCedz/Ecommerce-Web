import { useState } from "react";
import PublicShell from "./shells/PublicShell";
import CartPage from "./pages/buyer/CartPage";
import WishlistPage from "./pages/buyer/WishlistPage";
import ProductInteractionPage from "./pages/buyer/ProductInteractionPage";
import ProfilePage from "./pages/account/ProfilePage";
import ReviewsPage from "./pages/buyer/ReviewsPage";

type BuyerSection = "cart" | "wishlist" | "product" | "profile" | "reviews";

const SECTIONS: { id: BuyerSection; label: string; sublabel: string }[] = [
  { id: "cart", label: "Cart", sublabel: "Multi-seller · Promo · Summary" },
  { id: "wishlist", label: "Wishlist", sublabel: "Grid · Availability · Add to cart" },
  { id: "product", label: "Product", sublabel: "Variants · Qty · Wishlist · Share" },
  { id: "profile", label: "Profile", sublabel: "Account details · security · addresses" },
  { id: "reviews", label: "Reviews", sublabel: "Rating · Create · Edit · Status" },
];

export default function Part07() {
  const [section, setSection] = useState<BuyerSection>("profile");

  const renderSection = () => {
    const shell = (children: React.ReactNode, cart = 3, wishlist = 34) => (
      <PublicShell isLoggedIn={true} cartCount={cart} wishlistCount={wishlist}>
        {children}
      </PublicShell>
    );

    switch (section) {
      case "cart": return shell(<CartPage />, 3, 34);
      case "wishlist": return shell(<WishlistPage />, 3, 34);
      case "product": return shell(<ProductInteractionPage />, 3, 34);
      case "profile": return shell(<ProfilePage />, 3, 34);
      case "reviews": return shell(<ReviewsPage />, 3, 34);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-ground)]">
      <div className="shrink-0 bg-[#0F2030] border-b border-white/10 flex items-center gap-3 px-4 py-2 overflow-x-auto">
        <span className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest shrink-0">PART 07 — BUYER EXPERIENCE</span>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`shrink-0 flex items-center gap-2 font-[var(--font-mono)] text-[10px] px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                section === s.id
                  ? "bg-[var(--color-amber)] text-white"
                  : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"
              }`}
            >
              <span>{s.label}</span>
              <span className={`text-[9px] hidden md:inline ${section === s.id ? "text-white/70" : "text-white/30"}`}>
                — {s.sublabel}
              </span>
            </button>
          ))}
        </div>

        <div className="ml-auto shrink-0">
          <div className="font-[var(--font-mono)] text-[9px] text-white/30 bg-white/5 px-2.5 py-1 rounded-sm whitespace-nowrap">
            Buyer: Ana Reyes
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderSection()}
      </div>
    </div>
  );
}
