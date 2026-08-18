import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { fetchCatalogCategories, type CatalogCategory } from "../api/catalog";
import {
  IconCart, IconHeart, IconSearch, IconMenu, IconClose,
  IconChevronDown, IconChevronRight, IconHome,
} from "./icons";

interface PublicShellProps {
  children: React.ReactNode;
  cartCount?: number;
  wishlistCount?: number;
  isLoggedIn?: boolean;
  activePage?: string;
}

// Footer links carry an href so every entry routes somewhere real.
const FOOTER_LINKS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Marketplace",
    links: [
      { label: "Browse Products", href: "/c/all" },
      { label: "Featured Sellers", href: "/s/artisan-goods" },
      { label: "New Arrivals", href: "/c/all?sort=new" },
      { label: "Best Sellers", href: "/c/all?sort=popular" },
      { label: "Deals & Offers", href: "/c/all?deals=1" },
      { label: "Gift Cards", href: "/c/all" },
    ],
  },
  {
    heading: "Sell on Marketo",
    links: [
      { label: "Become a Seller", href: "/seller-center/onboarding" },
      { label: "Seller Guidelines", href: "/seller-center/onboarding" },
      { label: "Seller Dashboard", href: "/seller-center" },
      { label: "Commission Rates", href: "/seller-center/onboarding" },
      { label: "Seller Resources", href: "/seller-center" },
      { label: "Success Stories", href: "/seller-center" },
    ],
  },
  {
    heading: "Customer Care",
    links: [
      { label: "Help Center", href: "/account/messages" },
      { label: "Track My Order", href: "/account/orders" },
      { label: "Return Policy", href: "/account/orders" },
      { label: "Refund Policy", href: "/account/orders" },
      { label: "Payment Methods", href: "/account/preferences" },
      { label: "Contact Support", href: "/account/messages" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Marketo", href: "/" },
      { label: "Careers", href: "/" },
      { label: "Press", href: "/" },
      { label: "Blog", href: "/" },
      { label: "Privacy Policy", href: "/" },
      { label: "Terms of Service", href: "/" },
    ],
  },
];

// Account menu — label + destination route.
const BASE_ACCOUNT_LINKS: { label: string; href: string }[] = [
  { label: "My Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Messages", href: "/account/messages" },
  { label: "Settings", href: "/account/preferences" },
];

function getAccountLinks(user: ReturnType<typeof useAuth>["user"]) {
  const sellerLink = user?.seller_approved || user?.role === "seller"
    ? { label: "Switch to Seller", href: "/seller-center" }
    : { label: "Become a Seller", href: "/seller-center/onboarding" };

  return [...BASE_ACCOUNT_LINKS.slice(0, 4), sellerLink, BASE_ACCOUNT_LINKS[4]];
}

export default function PublicShell({ children, cartCount = 0, wishlistCount = 0, isLoggedIn = false, activePage }: PublicShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navCategories, setNavCategories] = useState<CatalogCategory[]>([]);

  const submitSearch = (q: string) => {
    const trimmed = q.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };
  const [megaMenuCategory, setMegaMenuCategory] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const megaRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const hasSession = Boolean(user) || isLoggedIn;
  const accountInitials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.trim() || user.display_name?.[0] || "M"
    : "M";
  const accountName = user?.display_name ?? "Guest";
  const accountEmail = user?.email ?? "Sign in to your account";
  const accountLinks = getAccountLinks(user);

  // Close menus on outside click
  useEffect(() => {
    void fetchCatalogCategories()
      .then((response) => setNavCategories(response.data))
      .catch(() => setNavCategories([]));

    const handler = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMegaMenuCategory(null);
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMoreMenuOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setAccountMenuOpen(false);
      setMobileMenuOpen(false);
      navigate("/auth/login");
    }
  };

  const activeCat = navCategories.find(c => c.label === megaMenuCategory);
  const visibleCategories = navCategories.slice(0, 7);
  const extraCategories = navCategories.slice(7);

  const openCategoryMenu = (label: string) => {
    setMoreMenuOpen(false);
    setMegaMenuCategory(label);
  };

  const openMoreCategoriesMenu = () => {
    setMegaMenuCategory(null);
    setMoreMenuOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ground)]">

      {/* Skip navigation — screen-reader / keyboard shortcut */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-navy)] focus:text-white focus:text-sm focus:font-[500] focus:rounded focus:shadow-lg">
        Skip to main content
      </a>

      {/* ── HEADER ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-border)] shadow-[0_1px_0_var(--color-border)]">

        {/* Announcement bar */}
        <div className="bg-[var(--color-navy)] text-white text-center py-1.5 text-xs font-[var(--font-mono)] tracking-wide hidden sm:block">
          Free shipping on orders over ₱1,500 &nbsp;·&nbsp; New sellers: Apply now and get 0% commission for 30 days
        </div>

        {/* Main header row */}
        <div className="px-4 md:px-6 lg:px-8 flex items-center gap-3 h-14">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer p-1"
            aria-label="Open navigation"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer">
            <IconMenu size={20} aria-hidden="true" />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 cursor-pointer">
            <div className="w-7 h-7 bg-[var(--color-navy)] rounded flex items-center justify-center">
              <span className="text-white font-[var(--font-display)] text-sm font-[400] leading-none">M</span>
            </div>
            <span className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] hidden sm:inline">Marketo</span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-xl mx-2 relative">
            <div className={`flex items-center gap-2 bg-[var(--color-surface)] border rounded-sm px-3 py-2 transition-all ${searchFocused ? "border-[var(--color-navy)] ring-2 ring-[var(--color-navy)]/10 bg-white" : "border-[var(--color-border)]"}`}>
              <IconSearch size={14} className="text-[var(--color-ink-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Search for products, sellers, categories…"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={e => { if (e.key === "Enter") submitSearch(searchValue); }}
                className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none min-w-0"
              />
              {searchValue && (
                <button onClick={() => setSearchValue("")} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer" aria-label="Clear search">
                  <IconClose size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Right icons cluster */}
          <div className="flex items-center gap-1 ml-auto shrink-0">

            {/* Wishlist */}
            <Link
              to="/account/wishlist"
              aria-label={wishlistCount > 0 ? `Wishlist — ${wishlistCount} saved item${wishlistCount !== 1 ? "s" : ""}` : "Wishlist"}
              className="relative flex-col items-center p-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer hidden md:flex">
              <IconHeart size={18} aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-red)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center" aria-hidden="true">{wishlistCount}</span>
              )}
              <span className="text-[9px] font-[var(--font-mono)] mt-0.5 hidden lg:block" aria-hidden="true">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              aria-label={cartCount > 0 ? `Cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Cart"}
              className="relative flex flex-col items-center p-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
              <IconCart size={18} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-0.5 w-4 h-4 bg-[var(--color-amber)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center" aria-hidden="true">{cartCount}</span>
              )}
              <span className="text-[9px] font-[var(--font-mono)] mt-0.5 hidden lg:block" aria-hidden="true">Cart</span>
            </Link>

            {/* Account */}
            <div ref={accountRef} className="relative hidden md:block">
              {hasSession ? (
                <>
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    aria-label="Account menu"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="true"
                    className="flex flex-col items-center p-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-navy)] flex items-center justify-center">
                      <span className="text-white text-[10px] font-[500]">{accountInitials}</span>
                    </div>
                    <span className="text-[9px] font-[var(--font-mono)] mt-0.5 hidden lg:block">Account</span>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                      <div className="px-4 py-3 border-b border-[var(--color-border)]">
                        <p className="text-sm font-[600] text-[var(--color-ink)]">{accountName}</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">{accountEmail}</p>
                      </div>
                      {accountLinks.map(({ label, href }) => (
                        <Link key={label} to={href} onClick={() => setAccountMenuOpen(false)} className={`flex items-center px-4 py-2.5 text-sm hover:bg-[var(--color-surface)] transition-colors cursor-pointer ${label === "Switch to Seller" || label === "Become a Seller" ? "text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink)]"}`}>{label}</Link>
                      ))}
                      <div className="border-t border-[var(--color-border)]">
                        <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] transition-colors cursor-pointer">Log out</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 ml-1">
                  <Link to="/auth/login" className="text-sm font-[500] text-[var(--color-ink)] hover:text-[var(--color-navy)] cursor-pointer transition-colors whitespace-nowrap px-2 py-1.5">Log in</Link>
                  <Link to="/auth/register"
                    className="text-sm font-[500] bg-[var(--color-navy)] text-white px-4 py-1.5 rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer whitespace-nowrap">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category nav bar */}
        <div ref={megaRef} className="relative hidden lg:block border-t border-[var(--color-border-subtle)]">
          <div className="px-8 flex items-center gap-0 h-10">
            <Link to="/c/all" className="flex items-center gap-1.5 px-4 h-full text-xs font-[500] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer border-r border-[var(--color-border-subtle)]">
              <IconHome size={13} />All Categories
            </Link>
            {visibleCategories.map(cat => (
              <button
                key={cat.label}
                onMouseEnter={() => openCategoryMenu(cat.label)}
                onMouseLeave={() => {}}
                onClick={() => {
                  setMoreMenuOpen(false);
                  navigate(`/c/${cat.slug}`);
                }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/c/${cat.slug}`); } if (e.key === "Escape") setMegaMenuCategory(null); }}
                aria-expanded={megaMenuCategory === cat.label}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-4 h-full text-xs font-[500] transition-colors cursor-pointer whitespace-nowrap ${megaMenuCategory === cat.label ? "text-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)]"}`}>
                {cat.label}
                <IconChevronDown size={10} aria-hidden="true" />
              </button>
            ))}
            {extraCategories.length > 0 && (
              <div
                className="relative h-full"
                onMouseEnter={openMoreCategoriesMenu}
                onMouseLeave={() => setMoreMenuOpen(false)}>
                <button
                  onClick={() => setMoreMenuOpen((open) => {
                    const next = !open;
                    if (next) setMegaMenuCategory(null);
                    return next;
                  })}
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 px-4 h-full text-xs font-[500] transition-colors cursor-pointer whitespace-nowrap ${moreMenuOpen ? "text-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)]"}`}>
                  More
                  <IconChevronDown size={10} aria-hidden="true" />
                </button>
                {moreMenuOpen && (
                  <div className="absolute top-full right-0 mt-0.5 w-[320px] bg-white border border-[var(--color-border)] shadow-[0_8px_24px_rgba(28,27,24,0.10)] z-50">
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                      <p className="text-xs font-[600] text-[var(--color-ink)] uppercase tracking-wide">More categories</p>
                      <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{extraCategories.length} additional categories</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2 grid grid-cols-1 gap-1">
                      {extraCategories.map((cat) => (
                        <button
                          key={cat.label}
                          onClick={() => {
                            navigate(`/c/${cat.slug}`);
                            setMoreMenuOpen(false);
                          }}
                          className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-sm text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] hover:text-[var(--color-navy)] transition-colors">
                          <span className="truncate">{cat.label}</span>
                          <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-disabled)]">{cat.count.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mega menu */}
          {megaMenuCategory && activeCat && (
            <div
              className="absolute top-full left-0 right-0 bg-white border-t border-b border-[var(--color-border)] shadow-[0_8px_24px_rgba(28,27,24,0.10)] z-50"
              onMouseLeave={() => setMegaMenuCategory(null)}>
              <div className="px-8 py-5 flex gap-8">
                <div className="min-w-[140px]">
                  <p className="font-[var(--font-display)] text-base font-[400] text-[var(--color-ink)] mb-3">{activeCat.label}</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                    {activeCat.subs.map(sub => (
                      <Link key={sub} to={`/c/${activeCat.slug}?sub=${encodeURIComponent(sub)}`} onClick={() => setMegaMenuCategory(null)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] transition-colors cursor-pointer py-0.5">
                        <IconChevronRight size={10} />
                        {sub}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
                    <Link to={`/c/${activeCat.slug}`} onClick={() => setMegaMenuCategory(null)} className="text-xs font-[600] text-[var(--color-navy)] hover:underline cursor-pointer">View all in {activeCat.label} →</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── MOBILE DRAWER ──────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[var(--color-ink)]/50" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true"
            className="absolute inset-y-0 left-0 w-80 max-w-[90vw] bg-white shadow-[4px_0_24px_rgba(28,27,24,0.15)] flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[var(--color-navy)] rounded flex items-center justify-center" aria-hidden="true">
                  <span className="text-white font-[var(--font-display)] text-xs">M</span>
                </div>
                <span className="font-[var(--font-display)] text-base font-[400]">Marketo</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-[var(--color-ink-muted)] cursor-pointer p-1" aria-label="Close navigation">
                <IconClose size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Mobile search */}
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-3 py-2">
                <IconSearch size={13} className="text-[var(--color-ink-muted)]" />
                <input
                  placeholder="Search…"
                  onKeyDown={e => { if (e.key === "Enter") { submitSearch((e.target as HTMLInputElement).value); setMobileMenuOpen(false); } }}
                  className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none" />
              </div>
            </div>

            {/* Mobile categories */}
            <div className="flex-1 overflow-y-auto py-2">
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest px-4 py-2 uppercase">Categories</p>
              {navCategories.map(cat => (
                <Link key={cat.label} to={`/c/${cat.slug}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] cursor-pointer">
                  {cat.label}
                  <IconChevronRight size={14} className="text-[var(--color-ink-muted)]" />
                </Link>
              ))}

              <div className="border-t border-[var(--color-border)] mt-2 pt-2">
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest px-4 py-2 uppercase">Account</p>
                {hasSession ? (
                  <>
                    {accountLinks.map(({ label, href }) => (
                      <Link key={label} to={href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center px-4 py-3 text-sm hover:bg-[var(--color-surface)] cursor-pointer ${label === "Switch to Seller" || label === "Become a Seller" ? "text-[var(--color-navy)] font-[500]" : "text-[var(--color-ink)]"}`}>{label}</Link>
                    ))}
                    <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-3 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-light)] cursor-pointer">Log out</button>
                  </>
                ) : (
                  <div className="flex gap-2 px-4 py-3">
                    <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center text-sm font-[500] border border-[var(--color-navy)] text-[var(--color-navy)] py-2 rounded-sm cursor-pointer">Log in</Link>
                    <Link to="/auth/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center text-sm font-[500] bg-[var(--color-navy)] text-white py-2 rounded-sm cursor-pointer">Register</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT ─────────────────────────────────────── */}
      <div id="main-content" className="flex-1">
        {children}
      </div>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="bg-[var(--color-ink)] text-white mt-auto">
        <div className="px-6 md:px-8 lg:px-12 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            {/* Brand column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-[var(--color-amber)] rounded flex items-center justify-center">
                  <span className="text-white font-[var(--font-display)] text-sm font-[400]">M</span>
                </div>
                <span className="font-[var(--font-display)] text-lg font-[400]">Marketo</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-4">The original multi-vendor marketplace connecting buyers and independent sellers across the Philippines.</p>
              <div className="flex gap-2">
                {[["FB","Facebook"],["IG","Instagram"],["TW","Twitter / X"],["YT","YouTube"]].map(([s, label]) => (
                  <a key={s} href="#" aria-label={label} className="w-7 h-7 bg-white/10 rounded flex items-center justify-center text-[10px] font-[var(--font-mono)] text-white/50 hover:bg-white/20 hover:text-white cursor-pointer transition-colors" aria-hidden="false"><span aria-hidden="true">{s}</span></a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_LINKS.map(col => (
              <div key={col.heading}>
                <p className="font-[var(--font-mono)] text-[10px] text-white/40 tracking-widest uppercase mb-4">{col.heading}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-white/30 font-[var(--font-mono)]">© 2026 Marketo Inc. All rights reserved.</p>
            <div className="flex gap-4">
              {["Privacy", "Terms", "Cookies"].map(l => (
                <a key={l} href="#" className="text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
