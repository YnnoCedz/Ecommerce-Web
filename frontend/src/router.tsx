import { createBrowserRouter, Navigate, useParams, useSearchParams } from "react-router";

// ── Layouts ───────────────────────────────────────────────────
import PublicLayout, { useNav } from "./layouts/PublicLayout";
import SellerLayout from "./layouts/SellerLayout";
import AdminLayout from "./layouts/AdminLayout";
import SpecLayout from "./layouts/SpecLayout";

// ── Public pages ──────────────────────────────────────────────
import HomePage from "./pages/pub/HomePage";
import CategoryPage from "./pages/pub/CategoryPage";
import SearchPage from "./pages/pub/SearchPage";
import ProductPage from "./pages/pub/ProductPage";
import SellerStorePage from "./pages/pub/SellerStorePage";

// ── Auth pages ────────────────────────────────────────────────
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// ── Buyer / account pages ─────────────────────────────────────
import CartPage from "./pages/buyer/CartPage";
import WishlistPage from "./pages/buyer/WishlistPage";
import BuyerDashboardPage from "./pages/buyer/BuyerDashboardPage";
import CheckoutFlow from "./pages/checkout/CheckoutFlow";
import OrderHistoryPage from "./pages/orders/OrderHistoryPage";
import OrderDetailPage from "./pages/orders/OrderDetailPage";
import MessagingPage from "./pages/messaging/MessagingPage";
import NotificationCenter from "./pages/notifications/NotificationCenter";
import ProfilePage from "./pages/account/ProfilePage";
import SecurityPage from "./pages/account/SecurityPage";
import AddressesPage from "./pages/account/AddressesPage";
import PreferencesPage from "./pages/account/PreferencesPage";
import { DEMO_USER } from "./pages/account/AccountLayout";

// ── Seller pages ──────────────────────────────────────────────
import SellerDashboard from "./pages/seller/SellerDashboard";
import ProductListPage from "./pages/seller/ProductListPage";
import ProductCreationPage from "./pages/seller/ProductCreationPage";
import InventoryPage from "./pages/seller/InventoryPage";
import SellerOrdersPage from "./pages/seller/SellerOrdersPage";
import CustomersPage from "./pages/seller/CustomersPage";
import PromotionsPage from "./pages/seller/PromotionsPage";
import AnalyticsPage from "./pages/seller/AnalyticsPage";
import StoreManagementPage from "./pages/seller/StoreManagementPage";
import SellerSettingsPage from "./pages/seller/SellerSettingsPage";
import SellerOnboarding from "./pages/seller/onboarding/SellerOnboarding";

// ── Admin pages ───────────────────────────────────────────────
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import SellerManagementPage from "./pages/admin/SellerManagementPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import CategoryManagementPage from "./pages/admin/CategoryManagementPage";
import ReportsModerationPage from "./pages/admin/ReportsModerationPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

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

function ResetPasswordRoute() {
  const nav = useNav();
  return <ResetPasswordPage onNavigate={nav} />;
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
  return (
    <ProfilePage
      user={DEMO_USER}
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
          { path: "register", Component: RegisterRoute },
          { path: "forgot-password", Component: ForgotPasswordRoute },
          { path: "verify-email", Component: VerifyEmailRoute },
          { path: "reset-password", Component: ResetPasswordRoute },
        ],
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────
  { path: "*", Component: NotFoundRoute },
]);
