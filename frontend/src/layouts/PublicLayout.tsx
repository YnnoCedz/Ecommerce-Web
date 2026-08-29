import { createContext, useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import PublicShell from "../shells/PublicShell";
import { fetchCart } from "../api/cart";
import { useWishlist } from "../wishlist/WishlistContext";

// ── NavFn context ──────────────────────────────────────────────
// Bridges the existing onNavigate(page, params) pattern to React Router
type NavFn = (page: string, params?: Record<string, string>) => void;

const NavCtx = createContext<NavFn>(() => {});
export const useNav = (): NavFn => useContext(NavCtx);

function buildNavFn(navigate: ReturnType<typeof useNavigate>): NavFn {
  return (page, params) => {
    switch (page) {
      case "home":           return navigate("/");
      case "category":       return navigate(`/c/${params?.cat ?? params?.slug ?? "all"}`);
      case "search":         return navigate(`/search?q=${encodeURIComponent(params?.q ?? "")}`);
      case "product":        return navigate(`/p/${params?.slug ?? params?.id ?? ""}`);
      case "seller":         return navigate(`/s/${params?.slug ?? params?.id ?? ""}`);
      case "cart":           return navigate("/cart");
      case "checkout":       return navigate(params?.items ? `/checkout?items=${encodeURIComponent(params.items)}` : "/checkout");
      case "login":          return navigate("/auth/login");
      case "register":       return navigate("/auth/register");
      case "forgot-password":return navigate("/auth/forgot-password");
      case "verify-email":   return navigate("/auth/verify-email");
      case "email-verified": return navigate("/auth/email-verified");
      case "orders":         return navigate("/account/orders");
      case "order-detail":   return navigate(`/account/orders/${params?.id ?? ""}`);
      case "wishlist":       return navigate("/account/wishlist");
      case "messages":       return navigate("/account/messages");
      case "profile":        return navigate("/account/profile");
      case "personal-info":  return navigate("/account/personal-info");
      case "buyer-dashboard":return navigate("/account/profile");
      case "security":       return navigate("/account/security");
      case "addresses":      return navigate("/account/addresses");
      case "notifications":  return navigate("/account/notifications");
      case "preferences":    return navigate("/account/preferences");
      case "reviews":        return navigate("/account/reviews");
      default:               return navigate("/");
    }
  };
}

function PublicLayoutContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const navFn = buildNavFn(navigate);
  const [cartCount, setCartCount] = useState(0);
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    let cancelled = false;

    if (!user || user.role !== "buyer") {
      setCartCount(0);
      return () => {
        cancelled = true;
      };
    }

    void fetchCart()
      .then((cartResponse) => {
        if (cancelled) {
          return;
        }

        const count = cartResponse.data.sellers.reduce(
          (sum, seller) => sum + seller.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0,
        );

        setCartCount(count);
      })
      .catch(() => {
        if (!cancelled) {
          setCartCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <NavCtx.Provider value={navFn}>
      <PublicShell cartCount={cartCount} wishlistCount={wishlistCount} isLoggedIn={Boolean(user)}>
        <Outlet />
      </PublicShell>
    </NavCtx.Provider>
  );
}

export default function PublicLayout() {
  return <PublicLayoutContent />;
}
