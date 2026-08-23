import { Outlet, useLocation, useNavigate } from "react-router";
import SellerShell from "../shells/SellerShell";

const NAV_ROUTES: Record<string, string> = {
  dashboard:     "/seller-center",
  products:      "/seller-center/products",
  inventory:     "/seller-center/inventory",
  orders:        "/seller-center/orders",
  returns:       "/seller-center/returns",
  reviews:       "/seller-center/reviews",
  customers:     "/seller-center/customers",
  promotions:    "/seller-center/promotions",
  analytics:     "/seller-center/analytics",
  messages:      "/seller-center/messages",
  notifications: "/seller-center/notifications",
  store:         "/seller-center/store",
  settings:      "/seller-center/settings",
};

function getActiveNav(pathname: string): string {
  const seg = pathname.replace(/^\/seller-center\/?/, "").split("/")[0];
  return seg || "dashboard";
}

export default function SellerLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleNavChange = (id: string) => {
    const route = NAV_ROUTES[id];
    if (route) navigate(route);
  };

  return (
    <SellerShell
      activeNav={getActiveNav(pathname)}
      onNavChange={handleNavChange}
    >
      <Outlet />
    </SellerShell>
  );
}
