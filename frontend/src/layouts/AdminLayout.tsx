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
  moderation: "/admin/moderation",
  analytics:  "/admin/analytics",
  settings:   "/admin/settings",
};

function getActiveNav(pathname: string): string {
  const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0];
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
