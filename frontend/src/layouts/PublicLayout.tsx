import { createContext, useContext } from "react";
import { Outlet, useNavigate } from "react-router";
import PublicShell from "../shells/PublicShell";

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
      case "checkout":       return navigate("/checkout");
      case "login":          return navigate("/auth/login");
      case "register":       return navigate("/auth/register");
      case "forgot-password":return navigate("/auth/forgot-password");
      case "verify-email":   return navigate("/auth/verify-email");
      case "orders":         return navigate("/account/orders");
      case "order-detail":   return navigate(`/account/orders/${params?.id ?? ""}`);
      case "wishlist":       return navigate("/account/wishlist");
      case "messages":       return navigate("/account/messages");
      case "profile":        return navigate("/account/profile");
      case "buyer-dashboard":return navigate("/account/dashboard");
      case "security":       return navigate("/account/security");
      case "addresses":      return navigate("/account/addresses");
      case "notifications":  return navigate("/account/notifications");
      default:               return navigate("/");
    }
  };
}

export default function PublicLayout() {
  const navigate = useNavigate();
  const navFn = buildNavFn(navigate);

  return (
    <NavCtx.Provider value={navFn}>
      <PublicShell cartCount={3} wishlistCount={2} isLoggedIn={true}>
        <Outlet />
      </PublicShell>
    </NavCtx.Provider>
  );
}
