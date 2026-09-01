import { Outlet, useLocation, useNavigate } from "react-router";
import AdminShell from "../shells/AdminShell";

const NAV_ROUTES: Record<string, string> = {
  dashboard:  "/admin",
  users:      "/admin/users",
  sellers:    "/admin/sellers",
  products:   "/admin/products",
  orders:     "/admin/orders",
  categories: "/admin/categories",
  reports:    "/admin/reports",
  disputes:   "/admin/disputes",
  moderation: "/admin/moderation",
  analytics:  "/admin/analytics",
  payouts:    "/admin/payouts",
  settings:   "/admin/settings",
};

function getActiveNav(pathname: string): string {
  const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  if (seg === "activity") return "analytics";
  return seg || "dashboard";
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleNavChange = (id: string) => {
    const route = NAV_ROUTES[id];
    if (route) navigate(route);
  };

  return (
    <AdminShell
      activeNav={getActiveNav(pathname)}
      onNavChange={handleNavChange}
    >
      <Outlet />
    </AdminShell>
  );
}
