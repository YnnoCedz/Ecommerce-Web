import { Bell, Heart, MapPin, MessageSquare, Package, Settings, Shield, Star, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router";

const links = [
  ["/account/profile", "Profile", UserRound],
  ["/account/personal-info", "Personal info", UserRound],
  ["/account/orders", "Orders", Package],
  ["/account/wishlist", "Wishlist", Heart],
  ["/account/addresses", "Addresses", MapPin],
  ["/account/messages", "Messages", MessageSquare],
  ["/account/reviews", "Reviews", Star],
  ["/account/notifications", "Notifications", Bell],
  ["/account/security", "Security", Shield],
  ["/account/preferences", "Preferences", Settings],
] as const;

export default function AccountRouteLayout() {
  return (
    <div className="min-h-full bg-[var(--color-ground)]">
      <div className="border-b border-[var(--color-border)] bg-white">
        <nav aria-label="Account" className="mx-auto flex max-w-screen-xl gap-1 overflow-x-auto px-4 py-2 md:px-8 lg:px-12">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-[500] transition-colors ${isActive ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"}`}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
