import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams, useSearchParams } from "react-router";

import { useAuth } from "./auth/AuthContext";
import type { AccountUser } from "./pages/account/AccountLayout";
import PublicLayout, { useNav } from "./layouts/PublicLayout";
import SpecLayout from "./layouts/SpecLayout";
import RouteErrorPage from "./pages/errors/RouteErrorPage";

const SellerLayout = lazy(() => import("./layouts/SellerLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));

const HomePage = lazy(() => import("./pages/pub/HomePage"));
const CategoryPage = lazy(() => import("./pages/pub/CategoryPage"));
const SearchPage = lazy(() => import("./pages/pub/SearchPage"));
const ProductPage = lazy(() => import("./pages/pub/ProductPage"));
const SellerStorePage = lazy(() => import("./pages/pub/SellerStorePage"));

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const EmailVerifiedPage = lazy(() => import("./pages/auth/EmailVerifiedPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const TwoFactorPage = lazy(() => import("./pages/auth/TwoFactorPage"));

const CartPage = lazy(() => import("./pages/buyer/CartPage"));
const WishlistPage = lazy(() => import("./pages/buyer/WishlistPage"));
const CheckoutFlow = lazy(() => import("./pages/checkout/CheckoutFlow"));
const OrderHistoryPage = lazy(() => import("./pages/orders/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("./pages/orders/OrderDetailPage"));
const MessagingPage = lazy(() => import("./pages/messaging/MessagingPage"));
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"));
const ProfilePage = lazy(() => import("./pages/account/ProfilePage"));
const SecurityPage = lazy(() => import("./pages/account/SecurityPage"));
const AddressesPage = lazy(() => import("./pages/account/AddressesPage"));
const PreferencesPage = lazy(() => import("./pages/account/PreferencesPage"));
const PersonalInfoPage = lazy(() => import("./pages/account/PersonalInfoPage"));
const ReviewsPage = lazy(() => import("./pages/buyer/ReviewsPage"));
const AccountRouteLayout = lazy(() => import("./layouts/AccountRouteLayout"));

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
const SellerReviewsPage = lazy(() => import("./pages/seller/SellerReviewsPage"));
const SellerReturnsPage = lazy(() => import("./pages/seller/SellerReturnsPage"));
const SellerOnboarding = lazy(() => import("./pages/seller/onboarding/SellerOnboarding"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagementPage = lazy(() => import("./pages/admin/UserManagementPage"));
const SellerManagementPage = lazy(() => import("./pages/admin/SellerManagementPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const CategoryManagementPage = lazy(() => import("./pages/admin/CategoryManagementPage"));
const ReportsModerationPage = lazy(() => import("./pages/admin/ReportsModerationPage"));
const AdminDisputesPage = lazy(() => import("./pages/admin/AdminDisputesPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));

const ForbiddenPage = lazy(() => import("./pages/errors/ForbiddenPage"));

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

function ResetPasswordRoute() {
  const nav = useNav();
  return <ResetPasswordPage onNavigate={nav} />;
}

function TwoFactorRoute() {
  return <TwoFactorPage />;
}

function OrderDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <OrderDetailPage orderNumber={id ?? ""} />;
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
    avatar: user.avatar_url,
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
    emailVerifiedAt: user.email_verified_at,
    twoFactorEnabled: user.two_factor_enabled,
    lastActiveAt: user.last_active_at,
  };

  return <ProfilePage user={accountUser} onNavigate={nav} onPageChange={(page) => nav(page)} />;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-10 text-sm text-[var(--color-ink-muted)]">
      {label}
    </div>
  );
}

function SessionVerificationFailure() {
  const { error, refreshUser } = useAuth();

  return (
    <div className="px-4 md:px-8 lg:px-12 max-w-screen-xl mx-auto py-10 text-sm text-[var(--color-ink-muted)]">
      <p>{error ?? "Unable to verify your session."}</p>
      <button
        type="button"
        className="mt-4 text-[var(--color-navy)] underline underline-offset-4"
        onClick={() => void refreshUser()}
      >
        Try again
      </button>
    </div>
  );
}

function RequireVerifiedAccount() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <LoadingState label="Loading your account..." />;
  }

  if (error && !user) {
    return <SessionVerificationFailure />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!user.email_verified_at) {
    return <Navigate to={`/auth/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }

  return <Outlet />;
}

function RequireSellerAccess() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <LoadingState label="Loading seller access..." />;
  }

  if (error && !user) {
    return <SessionVerificationFailure />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!user.email_verified_at) {
    return <Navigate to={`/auth/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }

  if (user.status !== "active") {
    return <Navigate to="/403" replace />;
  }

  if (user.role !== "seller") {
    return <Navigate to="/403" replace />;
  }

  if (!user.seller_approved) {
    return <Navigate to="/seller-center/onboarding/status" replace />;
  }

  return <Outlet />;
}

function RequireAdminAccess() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <LoadingState label="Loading admin access..." />;
  }

  if (error && !user) {
    return <SessionVerificationFailure />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!user.email_verified_at) {
    return <Navigate to={`/auth/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }

  if (user.status !== "active") {
    return <Navigate to="/403" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

function NotFoundRoute() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-ground)] text-center px-6">
      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-4">
        404 · Page not found
      </p>
      <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-ink)] font-[400] mb-4">
        This page doesn't exist.
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mb-8 max-w-sm">
        The URL may have been mistyped or the page may have been moved.
      </p>
      <a href="/" className="bg-[var(--color-navy)] text-white text-sm font-[500] px-6 py-3 rounded-sm hover:opacity-90 transition-opacity">
        Back to Home
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/spec",
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/spec/01" replace /> },
      { path: ":partId", Component: SpecLayout },
    ],
  },
  { path: "/seller-center/onboarding", Component: SellerOnboarding, errorElement: <RouteErrorPage /> },
  { path: "/seller-center/onboarding/status", element: <SellerOnboarding view="status" />, errorElement: <RouteErrorPage /> },
  {
    path: "/seller-center",
    errorElement: <RouteErrorPage />,
    element: <RequireSellerAccess />,
    children: [
      {
        element: <SellerLayout />,
        children: [
          { index: true, Component: SellerDashboard },
          { path: "products", Component: ProductListPage },
          { path: "products/new", Component: ProductCreationPage },
          { path: "products/:id/edit", Component: ProductCreationPage },
          { path: "inventory", Component: InventoryPage },
          { path: "orders", Component: SellerOrdersPage },
          { path: "returns", Component: SellerReturnsPage },
          { path: "reviews", Component: SellerReviewsPage },
          { path: "customers", Component: CustomersPage },
          { path: "promotions", Component: PromotionsPage },
          { path: "analytics", Component: AnalyticsPage },
          { path: "store", Component: StoreManagementPage },
          { path: "messages", Component: MessagingPage },
          { path: "notifications", Component: NotificationCenter },
          { path: "settings", Component: SellerSettingsPage },
        ],
      },
    ],
  },
  {
    path: "/admin",
    errorElement: <RouteErrorPage />,
    element: <RequireAdminAccess />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, Component: AdminDashboard },
          { path: "users", Component: UserManagementPage },
          { path: "sellers", Component: SellerManagementPage },
          { path: "products", Component: AdminProductsPage },
          { path: "orders", Component: AdminOrdersPage },
          { path: "categories", Component: CategoryManagementPage },
          { path: "reports", Component: ReportsModerationPage },
          { path: "disputes", Component: AdminDisputesPage },
          { path: "moderation", element: <Navigate to="/admin/reports" replace /> },
          { path: "notifications", Component: NotificationCenter },
          { path: "analytics", Component: AdminAnalyticsPage },
          { path: "settings", Component: AdminSettingsPage },
        ],
      },
    ],
  },
  {
    path: "/",
    Component: PublicLayout,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, Component: HomeRoute },
      { path: "search", Component: SearchRoute },
      { path: "c/:slug", Component: CategoryRoute },
      { path: "p/:id", Component: ProductRoute },
      { path: "s/:id", Component: SellerStoreRoute },
      { path: "cart", Component: CartPage },
      {
        path: "checkout",
        element: <RequireVerifiedAccount />,
        children: [{ index: true, Component: CheckoutFlow }],
      },
      { path: "checkout/confirmation", element: <Navigate to="/account/orders" replace /> },
      {
        path: "account",
        element: <RequireVerifiedAccount />,
        children: [
          {
            element: <AccountRouteLayout />,
            children: [
              { index: true, element: <Navigate to="/account/profile" replace /> },
              { path: "orders", Component: OrderHistoryRoute },
              { path: "orders/:id", Component: OrderDetailRoute },
              { path: "wishlist", Component: WishlistPage },
              { path: "messages", Component: MessagingPage },
              { path: "notifications", Component: NotificationCenter },
              { path: "profile", Component: ProfileRoute },
              { path: "personal-info", Component: PersonalInfoPage },
              { path: "security", Component: SecurityPage },
              { path: "addresses", Component: AddressesPage },
              { path: "preferences", Component: PreferencesPage },
              { path: "reviews", Component: ReviewsPage },
            ],
          },
        ],
      },
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
  { path: "/403", Component: ForbiddenPage, errorElement: <RouteErrorPage /> },
  { path: "*", Component: NotFoundRoute, errorElement: <RouteErrorPage /> },
]);
