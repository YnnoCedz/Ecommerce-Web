import { createBrowserRouter, Navigate, Outlet, useParams, useSearchParams } from "react-router";
import { lazy } from "react";

// ── Layouts ───────────────────────────────────────────────────
import PublicLayout, { useNav } from "./layouts/PublicLayout";
const SellerLayout = lazy(() => import("./layouts/SellerLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
import SpecLayout from "./layouts/SpecLayout";

// ── Public pages ──────────────────────────────────────────────
const HomePage = lazy(() => import("./pages/pub/HomePage"));
const CategoryPage = lazy(() => import("./pages/pub/CategoryPage"));
const SearchPage = lazy(() => import("./pages/pub/SearchPage"));
const ProductPage = lazy(() => import("./pages/pub/ProductPage"));
const SellerStorePage = lazy(() => import("./pages/pub/SellerStorePage"));

// ── Auth pages ────────────────────────────────────────────────
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const EmailVerifiedPage = lazy(() => import("./pages/auth/EmailVerifiedPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const TwoFactorPage = lazy(() => import("./pages/auth/TwoFactorPage"));

// ── Buyer / account pages ─────────────────────────────────────
const CartPage = lazy(() => import("./pages/buyer/CartPage"));
const WishlistPage = lazy(() => import("./pages/buyer/WishlistPage"));
const BuyerDashboardPage = lazy(() => import("./pages/buyer/BuyerDashboardPage"));
const CheckoutFlow = lazy(() => import("./pages/checkout/CheckoutFlow"));
const OrderHistoryPage = lazy(() => import("./pages/orders/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("./pages/orders/OrderDetailPage"));
const MessagingPage = lazy(() => import("./pages/messaging/MessagingPage"));
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"));
const ProfilePage = lazy(() => import("./pages/account/ProfilePage"));
const SecurityPage = lazy(() => import("./pages/account/SecurityPage"));
const AddressesPage = lazy(() => import("./pages/account/AddressesPage"));
const PreferencesPage = lazy(() => import("./pages/account/PreferencesPage"));
import { useAuth } from "./auth/AuthContext";
import type { AccountUser } from "./pages/account/AccountLayout";

// ── Seller pages ──────────────────────────────────────────────
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const ProductListPage = lazy(() => import("./pages/seller/ProductListPage"));
const ProductCreationPage = lazy(() => import("./pages/seller/ProductCreationPage"));
const InventoryPage = lazy(() => import("./pages/seller/InventoryPage"));
const SellerOrdersPage = lazy(() => import("./pages/seller/SellerOrdersPage"));
const CustomersPage = lazy(() => import("./pages/seller/CustomersPage"));
const PromotionsPage = lazy(() => import("./pages/seller/PromotionsPage"));
const AnalyticsPage = lazy(() => import("./pages/seller/AnalyticsPage"));
const StoreManagementPage = lazy(() => import("./pages/seller/StoreManagementPage"));
const SellerSettingsPage = lazy(() => import("./pages/seller/SellerSettingsPage"));
const SellerOnboarding = lazy(() => import("./pages/seller/onboarding/SellerOnboarding"));

// ── Admin pages ───────────────────────────────────────────────
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagementPage = lazy(() => import("./pages/admin/UserManagementPage"));
const SellerManagementPage = lazy(() => import("./pages/admin/SellerManagementPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const CategoryManagementPage = lazy(() => import("./pages/admin/CategoryManagementPage"));
const ReportsModerationPage = lazy(() => import("./pages/admin/ReportsModerationPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));

// ── Route bridge components ───────────────────────────────────
// These bridge existing onNavigate-based pages into the React Router context.
// All components here must be inside a PublicLayout route so they can call useNav().

function HomeRoute() {
  const nav = useNav();
  return <HomePage onNavigate={nav} />;
}

function CategoryRoute() {
  const nav = useNav();
  const { slug } = useParams<{ slug: string }>();
  return <CategoryPage catSlug={slug ?? "all"} onNavigate={nav} />;
}

function SearchRoute() {
  const nav = useNav();
  const [searchParams] = useSearchParams();
  return <SearchPage query={searchParams.get("q") ?? ""} onNavigate={nav} />;
}

function ProductRoute() {
  const nav = useNav();
  const { id } = useParams<{ id: string }>();
  return <ProductPage slug={id ?? ""} onNavigate={nav} />;
}

function SellerStoreRoute() {
  const nav = useNav();
  const { id } = useParams<{ id: string }>();
  return <SellerStorePage sellerSlug={id ?? ""} onNavigate={nav} />;
}

function LoginRoute() {
  const nav = useNav();
  return <LoginPage onNavigate={nav} />;
}

function RegisterRoute() {
  const nav = useNav();
  return <RegisterPage onNavigate={nav} />;
}

function ForgotPasswordRoute() {
  const nav = useNav();
  return <ForgotPasswordPage onNavigate={nav} />;
}

function VerifyEmailRoute() {
  const nav = useNav();
  return <VerifyEmailPage onNavigate={nav} />;
}

function EmailVerifiedRoute() {
  return <EmailVerifiedPage />;
}

function RequireVerifiedAccount() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-10 text-sm text-[var(--color-ink-muted)]">
        Loading your account...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!user.email_verified_at) {
    return <Navigate to={`/auth/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }

  return <Outlet />;
}

function ResetPasswordRoute() {
  const nav = useNav();
  return <ResetPasswordPage onNavigate={nav} />;
}

function TwoFactorRoute() {
  return <TwoFactorPage />;
}

function OrderDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <OrderDetailPage deliveryState={id === "in-transit" ? "in-transit" : "delivered"} />;
}

function OrderHistoryRoute() {
  const nav = useNav();
  return <OrderHistoryPage onViewDetail={(id) => nav("order-detail", { id })} />;
}

function ProfileRoute() {
  const nav = useNav();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-10 text-sm text-[var(--color-ink-muted)]">
        Loading your account...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const accountUser: AccountUser = {
    firstName: user.first_name ?? user.display_name.split(" ")[0] ?? "User",
    lastName: user.last_name ?? user.display_name.split(" ").slice(1).join(" ") ?? "",
    email: user.email,
    phone: user.phone ?? user.mobile ?? "",
    avatar: null,
    status:
      user.email_verified_at
        ? user.status === "active"
          ? "verified"
          : user.status === "pending"
            ? "pending"
            : user.status === "restricted"
              ? "restricted"
              : user.status === "suspended"
                ? "suspended"
                : "unverified"
        : "unverified",
    joinedDate: user.joined_at ? new Date(user.joined_at).toLocaleString("en-US", { month: "long", year: "numeric" }) : "New member",
    orderCount: user.order_count ?? 0,
    wishlistCount: user.wishlist_count ?? 0,
  };

  return (
    <ProfilePage
      user={accountUser}
      onNavigate={nav}
      onPageChange={(page) => nav(page)}
    />
  );
}

// ── Not found ─────────────────────────────────────────────────
function NotFoundRoute() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-ground)] text-center px-6">
      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-4">404 · Page not found</p>
      <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-ink)] font-[400] mb-4">This page doesn't exist.</h1>
      <p className="text-sm text-[var(--color-ink-muted)] mb-8 max-w-sm">The URL may have been mistyped or the page may have been moved.</p>
      <a href="/" className="bg-[var(--color-navy)] text-white text-sm font-[500] px-6 py-3 rounded-sm hover:opacity-90 transition-opacity">Back to Home</a>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────
export const router = createBrowserRouter([

  // ── Design Spec viewer ─────────────────────────────────────
  {
    path: "/spec",
    children: [
      { index: true, element: <Navigate to="/spec/01" replace /> },
      { path: ":partId", Component: SpecLayout },
    ],
  },

  // ── Checkout (no nav shell — clean funnel) ─────────────────
  { path: "/checkout", element: <CheckoutFlow /> },
  { path: "/checkout/confirmation", element: <CheckoutFlow simulatePayment="success" /> },

  // ── Seller application (standalone — no seller sidebar shell) ─
  { path: "/seller-center/onboarding", Component: SellerOnboarding },
  { path: "/seller-center/onboarding/status", element: <SellerOnboarding view="status" /> },

  // ── Seller Center ──────────────────────────────────────────
  {
    path: "/seller-center",
    Component: SellerLayout,
    children: [
      { index: true, Component: SellerDashboard },
      { path: "products", Component: ProductListPage },
      { path: "products/new", Component: ProductCreationPage },
      { path: "products/:id/edit", Component: ProductCreationPage },
      { path: "inventory", Component: InventoryPage },
      { path: "orders", Component: SellerOrdersPage },
      { path: "customers", Component: CustomersPage },
      { path: "promotions", Component: PromotionsPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "store", Component: StoreManagementPage },
      { path: "messages", Component: MessagingPage },
      { path: "notifications", Component: NotificationCenter },
      { path: "settings", Component: SellerSettingsPage },
    ],
  },

  // ── Admin ──────────────────────────────────────────────────
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "users", Component: UserManagementPage },
      { path: "sellers", Component: SellerManagementPage },
      { path: "products", Component: AdminProductsPage },
      { path: "orders", Component: AdminOrdersPage },
      { path: "categories", Component: CategoryManagementPage },
      { path: "reports", Component: ReportsModerationPage },
      { path: "moderation", element: <Navigate to="/admin/reports" replace /> },
      { path: "analytics", Component: AdminAnalyticsPage },
      { path: "settings", Component: AdminSettingsPage },
    ],
  },

  // ── Public storefront — all routes inside PublicLayout ─────
  // Auth routes are nested here so they share the NavCtx from PublicLayout
  {
    path: "/",
    Component: PublicLayout,
    children: [
      // Storefront
      { index: true, Component: HomeRoute },
      { path: "search", Component: SearchRoute },
      { path: "c/:slug", Component: CategoryRoute },
      { path: "p/:id", Component: ProductRoute },
      { path: "s/:id", Component: SellerStoreRoute },
      { path: "cart", Component: CartPage },

      // Buyer account
      {
        path: "account",
        element: <RequireVerifiedAccount />,
        children: [
          { index: true, element: <Navigate to="/account/dashboard" replace /> },
          { path: "dashboard", Component: BuyerDashboardPage },
          { path: "orders", Component: OrderHistoryRoute },
          { path: "orders/:id", Component: OrderDetailRoute },
          { path: "wishlist", Component: WishlistPage },
          { path: "messages", Component: MessagingPage },
          { path: "notifications", Component: NotificationCenter },
          { path: "profile", Component: ProfileRoute },
          { path: "security", Component: SecurityPage },
          { path: "addresses", Component: AddressesPage },
          { path: "preferences", Component: PreferencesPage },
        ],
      },

      // Auth — nested under PublicLayout so NavCtx is available
      {
        path: "auth",
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          { path: "login", Component: LoginRoute },
          { path: "two-factor", Component: TwoFactorRoute },
          { path: "register", Component: RegisterRoute },
          { path: "forgot-password", Component: ForgotPasswordRoute },
          { path: "verify-email", Component: VerifyEmailRoute },
          { path: "email-verified", Component: EmailVerifiedRoute },
          { path: "reset-password", Component: ResetPasswordRoute },
        ],
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────
  { path: "*", Component: NotFoundRoute },
]);
