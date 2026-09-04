import { useEffect, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router"
import {
  BarChart3, Boxes, Building2, ClipboardList, Cog, LayoutDashboard, LogOut, Mail,
  PackageCheck, ShieldCheck, Truck, UserRoundCheck, Users, Warehouse, X, Menu,
} from "lucide-react"
import type { AuthUser, LogisticsContext } from "../api"
import { MARKETPLACE_URL } from "../config"

/**
 * Authenticated shell for the Logistics Partner Portal.
 *
 * Structurally modeled on frontend/src/shells/AdminShell.tsx, which is the
 * closer reference of the two Marketplace internal shells: a fixed dark
 * sidebar, a white top bar with a mobile trigger and an account menu, and a
 * scrolling `--color-ground` content area. The Seller shell carries
 * storefront-specific chrome that has no Logistics equivalent.
 *
 * Only routes that actually exist are listed. Further Logistics modules can be
 * added to NAV_ITEMS as their routes ship; no dead links are rendered.
 */

type NavItem = { id: string; label: string; path: string; icon: typeof LayoutDashboard }
type NavSection = { label: string; items: NavItem[] }

export const NAV_SECTIONS: NavSection[] = [
  { label: "Overview", items: [{ id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  { label: "Operations", items: [
    { id: "pickups", label: "Pickup Requests", path: "/operations/pickups", icon: ClipboardList },
    { id: "incoming", label: "Incoming Parcels", path: "/operations/incoming", icon: PackageCheck },
    { id: "sorting", label: "Sorting", path: "/operations/sorting", icon: Boxes },
    { id: "assignments", label: "Delivery Assignment", path: "/operations/assignments", icon: UserRoundCheck },
    { id: "shipments", label: "Shipments", path: "/operations/shipments", icon: Truck },
  ] },
  { label: "Network", items: [
    { id: "riders", label: "Riders", path: "/riders", icon: Users },
    { id: "hubs", label: "Hubs", path: "/hubs", icon: Warehouse },
  ] },
  { label: "Communication", items: [{ id: "messages", label: "Messages", path: "/messages", icon: Mail }] },
  { label: "Insights", items: [{ id: "reports", label: "Reports", path: "/reports", icon: BarChart3 }] },
  { label: "Management", items: [
    { id: "provider", label: "Provider Profile", path: "/provider", icon: Building2 },
    { id: "staff", label: "Staff & Access", path: "/staff", icon: ShieldCheck },
    { id: "settings", label: "Settings", path: "/settings", icon: Cog },
  ] },
]

export default function AppShell({
  user, context, onSignOut, children,
}: {
  user: AuthUser
  context: LogisticsContext
  onSignOut: () => void
  children: ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // The drawer is a route-level overlay; leaving the route must close it.
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const initial = (user.display_name || user.email || "L").slice(0, 1).toUpperCase()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand, matching the Admin shell lockup. */}
      <a href={MARKETPLACE_URL} aria-label="Return to Marketo Marketplace" className="flex items-center gap-2.5 h-14 px-5 border-b border-white/10 shrink-0 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-amber)]">
        <div className="w-6 h-6 bg-[var(--color-amber)] rounded flex items-center justify-center shrink-0">
          <span className="text-white font-[var(--font-display)] text-xs font-[400]">M</span>
        </div>
        <div>
          <p className="font-[var(--font-display)] text-sm font-[400] text-white leading-tight">Marketo</p>
          <p className="font-[var(--font-mono)] text-[9px] text-white/40 tracking-widest uppercase leading-tight">Logistics</p>
        </div>
      </a>

      <nav aria-label="Logistics navigation" className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map(section => <div key={section.label}>
          <p className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest uppercase px-3 mb-2">{section.label}</p>
          <div className="space-y-0.5">{section.items.map(item => {
          const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(`${item.path}/`))
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all cursor-pointer text-left ${
                isActive ? "bg-white/12 text-white" : "text-white/50 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon size={15} className="shrink-0" aria-hidden="true" />
              <span className="text-sm font-[500] truncate flex-1">{item.label}</span>
              {isActive && <span className="w-1 h-4 bg-[var(--color-amber)] rounded-full shrink-0" />}
            </button>
          )
          })}</div>
        </div>)}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/10 shrink-0">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-all cursor-pointer"
        >
          <LogOut size={15} className="shrink-0" aria-hidden="true" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--color-ground)]">
      <a
        href="#logistics-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-navy)] focus:text-white focus:text-sm focus:font-[500] focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0" style={{ background: "#0F2030" }}>
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-label="Logistics navigation"
            aria-modal="true"
            className="absolute inset-y-0 left-0 w-56 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.4)]"
            style={{ background: "#0F2030" }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-3 text-white/50 hover:text-white cursor-pointer p-1"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[var(--color-border)] flex items-center gap-3 px-4 md:px-6 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="lg:hidden text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer p-1"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase truncate">Logistics Partner Portal</p>
            <p className="text-xs text-[var(--color-ink)] truncate hidden sm:block">{context.provider.company_name} · {context.staff.primary_hub?.name ?? "Provider-wide access"}</p>
          </div>

          <div className="ml-auto relative">
            <button
              onClick={() => setAccountOpen(open => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-[var(--color-violet)] flex items-center justify-center">
                <span className="text-white text-[10px] font-[500]">{initial}</span>
              </span>
              <span className="text-xs font-[500] text-[var(--color-ink)] hidden sm:block max-w-[12rem] truncate">
                {user.display_name || user.email}
              </span>
            </button>

            {accountOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} aria-hidden="true" />
                <div role="menu" className="absolute right-0 top-full mt-1 w-56 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-50">
                  <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-xs font-[600] text-[var(--color-ink)] truncate">{user.display_name || "Logistics staff"}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] truncate">{user.email}</p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => { setAccountOpen(false); onSignOut() }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={13} aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main id="logistics-main-content" className="flex-1 overflow-y-auto bg-[var(--color-ground)]">
          <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
