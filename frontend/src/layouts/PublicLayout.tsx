import { createContext, useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import PublicShell from "../shells/PublicShell";
import { fetchCart } from "../api/cart";

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
      case "buyer-dashboard":return navigate("/account/profile");
      case "security":       return navigate("/account/security");
      case "addresses":      return navigate("/account/addresses");
      case "notifications":  return navigate("/account/notifications");
      default:               return navigate("/");
    }
  };
}

export default function PublicLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const navFn = buildNavFn(navigate);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setCartCount(0);
      return () => {
        cancelled = true;
      };
    }

    void fetchCart()
      .then((response) => {
        if (cancelled) {
          return;
        }

        const count = response.data.sellers.reduce(
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
      <PublicShell cartCount={cartCount} wishlistCount={user?.wishlist_count ?? 0} isLoggedIn={Boolean(user)}>
        <Outlet />
      </PublicShell>
    </NavCtx.Provider>
  );
}
