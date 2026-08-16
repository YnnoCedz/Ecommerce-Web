import { useState } from "react";
import PublicShell from "./shells/PublicShell";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import SessionExpiredPage from "./pages/auth/SessionExpiredPage";
import AuthErrorPage from "./pages/auth/AuthErrorPage";
import AccountLayout, { DEMO_USER, AccountPage, AccountStatus, AccountUser } from "./pages/account/AccountLayout";
import ProfilePage from "./pages/account/ProfilePage";
import PersonalInfoPage from "./pages/account/PersonalInfoPage";
import AddressesPage from "./pages/account/AddressesPage";
import SecurityPage from "./pages/account/SecurityPage";
import NotificationsPage from "./pages/account/NotificationsPage";
import PreferencesPage from "./pages/account/PreferencesPage";
import AccountStatusPage from "./pages/account/AccountStatusPage";

type AuthPage = "login" | "register" | "verify-email" | "forgot-password" | "reset-password" | "session-expired" | "auth-errors";
type Section = "auth" | "account";

const AUTH_PAGES: { id: AuthPage; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "register", label: "Register" },
  { id: "verify-email", label: "Verify Email" },
  { id: "forgot-password", label: "Forgot Password" },
  { id: "reset-password", label: "Reset Password" },
  { id: "session-expired", label: "Session Expired" },
  { id: "auth-errors", label: "Auth Errors" },
];

const ACCOUNT_PAGES: { id: AccountPage; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "personal-info", label: "Personal Info" },
  { id: "addresses", label: "Addresses" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "preferences", label: "Preferences" },
  { id: "account-status", label: "Account Status" },
];

const ACCOUNT_STATUSES: { id: AccountStatus; label: string }[] = [
  { id: "verified", label: "Verified" },
  { id: "unverified", label: "Unverified" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
  { id: "restricted", label: "Restricted" },
];

export default function Part06() {
  const [section, setSection] = useState<Section>("auth");
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [accountPage, setAccountPage] = useState<AccountPage>("profile");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("verified");
  const [user, setUser] = useState<AccountUser>({ ...DEMO_USER });

  const navigate = (page: string) => {
    if (["login", "register", "verify-email", "forgot-password", "reset-password", "session-expired", "auth-errors"].includes(page)) {
      setSection("auth");
      setAuthPage(page as AuthPage);
    }
  };

  const renderAuth = () => {
    const props = { onNavigate: navigate };
    switch (authPage) {
      case "login":          return <LoginPage {...props} />;
      case "register":       return <RegisterPage {...props} />;
      case "verify-email":   return <VerifyEmailPage {...props} />;
      case "forgot-password":return <ForgotPasswordPage {...props} />;
      case "reset-password": return <ResetPasswordPage {...props} />;
      case "session-expired":return <SessionExpiredPage {...props} />;
      case "auth-errors":    return <AuthErrorPage />;
    }
  };

  const renderAccount = () => {
    const userWithStatus: AccountUser = { ...user, status: accountStatus };
    const onPageChange = (p: string) => setAccountPage(p as AccountPage);
    const content = (() => {
      switch (accountPage) {
        case "profile":        return <ProfilePage user={userWithStatus} onNavigate={navigate} onPageChange={onPageChange} />;
        case "personal-info":  return <PersonalInfoPage user={userWithStatus} onUserChange={setUser} />;
        case "addresses":      return <AddressesPage />;
        case "security":       return <SecurityPage />;
        case "notifications":  return <NotificationsPage />;
        case "preferences":    return <PreferencesPage />;
        case "account-status": return <AccountStatusPage currentStatus={accountStatus} />;
      }
    })();

    return (
      <PublicShell isLoggedIn={true} cartCount={2} wishlistCount={5}>
        <AccountLayout
          activePage={accountPage}
          user={userWithStatus}
          onNavigate={navigate}
          onPageChange={p => setAccountPage(p)}>
          {content}
        </AccountLayout>
      </PublicShell>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-ground)]">

      {/* ── CONTROL STRIP ─────────────────────────────────── */}
      <div className="shrink-0 bg-[#0F2030] border-b border-white/10 flex items-center gap-3 px-4 py-2 overflow-x-auto">
        <span className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest shrink-0">PART 06 — AUTH & ACCOUNT</span>

        {/* Section tabs */}
        <div className="flex items-center gap-1 shrink-0">
          {(["auth", "account"] as Section[]).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`font-[var(--font-mono)] text-[10px] px-3 py-1 rounded-sm transition-colors cursor-pointer ${section === s ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/8"}`}>
              {s === "auth" ? "Auth Flows" : "Account"}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/15 shrink-0" />

        {/* Page pills */}
        {section === "auth" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {AUTH_PAGES.map(p => (
              <button key={p.id} onClick={() => setAuthPage(p.id)}
                className={`shrink-0 font-[var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${authPage === p.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {section === "account" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {ACCOUNT_PAGES.map(p => (
              <button key={p.id} onClick={() => setAccountPage(p.id)}
                className={`shrink-0 font-[var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${accountPage === p.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
                {p.label}
              </button>
            ))}
            <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />
            {/* Status selector */}
            <span className="font-[var(--font-mono)] text-[9px] text-white/30 shrink-0">status:</span>
            {ACCOUNT_STATUSES.map(s => (
              <button key={s.id} onClick={() => setAccountStatus(s.id)}
                className={`shrink-0 font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-sm transition-colors cursor-pointer border ${accountStatus === s.id ? "border-white/40 text-white bg-white/10" : "border-transparent text-white/35 hover:text-white/60"}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {section === "auth" ? (
          <div className="h-full overflow-y-auto">
            {renderAuth()}
          </div>
        ) : (
          <div className="h-full overflow-hidden flex flex-col">
            {renderAccount()}
          </div>
        )}
      </div>
    </div>
  );
}
