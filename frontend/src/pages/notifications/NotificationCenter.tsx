import { useState } from "react";

type NotifCategory = "orders" | "delivery" | "messages" | "account" | "promotions" | "system";

const CATEGORY_CONFIG: Record<NotifCategory, { label: string; icon: string; color: string; bg: string }> = {
  orders:     { label: "Orders",          icon: "📦", color: "var(--color-navy)",   bg: "var(--color-navy-surface)" },
  delivery:   { label: "Delivery",        icon: "🚚", color: "var(--color-amber)",  bg: "var(--color-amber-light)" },
  messages:   { label: "Messages",        icon: "💬", color: "var(--color-violet)", bg: "var(--color-violet-light)" },
  account:    { label: "Account",         icon: "👤", color: "var(--color-ink)",    bg: "var(--color-surface)" },
  promotions: { label: "Promotions",      icon: "🎁", color: "var(--color-green)",  bg: "var(--color-green-light)" },
  system:     { label: "System",          icon: "⚙️", color: "var(--color-ink-muted)", bg: "var(--color-surface)" },
};

type Notification = {
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  action?: string;
  actionLabel?: string;
  image?: string;
  orderId?: string;
};

const NOTIFICATIONS: Notification[] = [
  { id: "n01", category: "delivery",   title: "Package out for delivery",         body: "Your order ORD-2831 (Natural Botanical Skincare Set) is out for delivery today. Estimated arrival: 2–6 PM.",  time: "Now",           unread: true,  action: "track",    actionLabel: "Track order",    orderId: "ORD-2831" },
  { id: "n02", category: "messages",   title: "New message from Verde Botanics",  body: "Hi Ana! Your order was picked up this morning. Standard delivery should reach you by tomorrow. 😊",            time: "10 min ago",    unread: true,  action: "message",  actionLabel: "Reply" },
  { id: "n03", category: "promotions", title: "Atelier Manila — 15% off",         body: "Atelier Manila is running a weekend sale on all accessories. Use code ATELIER15 at checkout. Ends Sunday.",    time: "2 hours ago",   unread: true,  action: "shop",     actionLabel: "Shop now",       image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop&auto=format" },
  { id: "n04", category: "orders",     title: "Order ORD-2837 confirmed",         body: "Atelier Manila has confirmed your order. Your Brass Desk Clock is being prepared for shipment.",               time: "4 hours ago",   unread: true,  action: "order",    actionLabel: "View order",     orderId: "ORD-2837" },
  { id: "n05", category: "delivery",   title: "Delivery update — ORD-2831",       body: "Your package has arrived at the Makati hub and will be out for delivery first thing tomorrow.",                 time: "Yesterday",     unread: false, action: "track",    actionLabel: "Track", orderId: "ORD-2831" },
  { id: "n06", category: "messages",   title: "Message from J&T Express",         body: "Hi! Your package is at our Makati hub. Estimated delivery today between 2–6 PM.",                               time: "Yesterday",     unread: false, action: "message",  actionLabel: "Reply" },
  { id: "n07", category: "account",    title: "New login detected",               body: "A new login was detected from Chrome on macOS (Makati, PH). If this was you, no action is needed.",            time: "Yesterday",     unread: false, action: "security", actionLabel: "Review" },
  { id: "n08", category: "orders",     title: "Review reminder — ORD-2849",       body: "How was your Minimalist Chronograph Watch? Leave a review and earn 50 reward points.",                          time: "Aug 13",        unread: false, action: "review",   actionLabel: "Write review",   orderId: "ORD-2849" },
  { id: "n09", category: "promotions", title: "Verde Botanics — back in stock",   body: "The Aloe & Rosehip Face Serum you wishlisted is back in stock. Limited quantities available.",                 time: "Aug 12",        unread: false, action: "shop",     actionLabel: "View product",   image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=80&h=80&fit=crop&auto=format" },
  { id: "n10", category: "orders",     title: "Refund processed — ORD-2718",      body: "Your refund of ₱1,850 for Brass Desk Clock has been processed. It will reflect in your Maya account within 3 business days.", time: "Aug 10", unread: false, action: "order", actionLabel: "View order", orderId: "ORD-2718" },
  { id: "n11", category: "delivery",   title: "ORD-2849 delivered",               body: "Your Minimalist Chronograph Watch was delivered on Aug 5 at 2:30 PM. Sign to confirm receipt.",                time: "Aug 5",         unread: false, action: "order",    actionLabel: "Confirm receipt", orderId: "ORD-2849" },
  { id: "n12", category: "account",    title: "Profile 80% complete",             body: "Add your birthday to complete your profile and unlock exclusive birthday rewards from Marketo.",                 time: "Aug 3",         unread: false, action: "profile",  actionLabel: "Complete now" },
  { id: "n13", category: "system",     title: "Scheduled maintenance",            body: "Marketo will undergo scheduled maintenance on Aug 20 from 2–4 AM. Brief service interruptions may occur.",      time: "Aug 1",         unread: false },
  { id: "n14", category: "system",     title: "Terms of Service updated",         body: "We've updated our Terms of Service and Privacy Policy, effective September 1, 2026. Please review the changes.", time: "Jul 28",        unread: false, action: "link",     actionLabel: "Read update" },
];

function NotifIcon({ category, size = "md" }: { category: NotifCategory; size?: "sm" | "md" }) {
  const cfg = CATEGORY_CONFIG[category];
  const dim = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  return (
    <div className={`${dim} rounded-full flex items-center justify-center shrink-0`} style={{ background: cfg.bg }}>
      {cfg.icon}
    </div>
  );
}

function NotifCard({ notif, onRead, onDismiss }: { notif: Notification; onRead: (id: string) => void; onDismiss: (id: string) => void }) {
  return (
    <div
      className={`flex gap-4 px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-0 transition-colors ${notif.unread ? "bg-[var(--color-navy-surface)]/40" : ""}`}>
      {notif.image ? (
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
            <img src={notif.image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: CATEGORY_CONFIG[notif.category].bg }}>
            {CATEGORY_CONFIG[notif.category].icon}
          </div>
        </div>
      ) : (
        <NotifIcon category={notif.category} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <p className={`text-sm leading-snug ${notif.unread ? "font-[600] text-[var(--color-ink)]" : "font-[500] text-[var(--color-ink)]"}`}>
            {notif.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] whitespace-nowrap">{notif.time}</span>
            {notif.unread && <div className="w-2 h-2 rounded-full bg-[var(--color-navy)] shrink-0" />}
          </div>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed line-clamp-2 mb-2">{notif.body}</p>
        {(notif.action || notif.orderId) && (
          <div className="flex items-center gap-3">
            {notif.actionLabel && (
              <button
                onClick={() => onRead(notif.id)}
                className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer">
                {notif.actionLabel}
              </button>
            )}
            {notif.orderId && (
              <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
                {notif.orderId}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        {notif.unread && (
          <button
            onClick={() => onRead(notif.id)}
            title="Mark as read"
            className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
          </button>
        )}
        <button
          onClick={() => onDismiss(notif.id)}
          title="Dismiss"
          className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-light)] rounded-sm cursor-pointer transition-colors">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState<Notification[]>(NOTIFICATIONS);
  const [activeCategory, setActiveCategory] = useState<NotifCategory | "all">("all");

  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
  const dismiss = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));
  const clearAll = () => setNotifs(prev => prev.filter(n => activeCategory !== "all" && n.category !== activeCategory));

  const unreadCount = notifs.filter(n => n.unread).length;

  const categoryCounts: Record<string, number> = {};
  notifs.forEach(n => { categoryCounts[n.category] = (categoryCounts[n.category] ?? 0) + 1; });
  const categoryUnread: Record<string, number> = {};
  notifs.filter(n => n.unread).forEach(n => { categoryUnread[n.category] = (categoryUnread[n.category] ?? 0) + 1; });

  const displayed = activeCategory === "all" ? notifs : notifs.filter(n => n.category === activeCategory);

  const SIDEBAR_ITEMS: { id: NotifCategory | "all"; label: string; icon: string }[] = [
    { id: "all",        label: "All notifications", icon: "🔔" },
    { id: "orders",     label: "Orders",            icon: "📦" },
    { id: "delivery",   label: "Delivery",          icon: "🚚" },
    { id: "messages",   label: "Messages",          icon: "💬" },
    { id: "account",    label: "Account",           icon: "👤" },
    { id: "promotions", label: "Promotions",        icon: "🎁" },
    { id: "system",     label: "System",            icon: "⚙️" },
  ];

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Page header */}
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Notifications</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">
              Notification Center
              {unreadCount > 0 && <span className="ml-2 font-[var(--font-mono)] text-sm font-[400] text-[var(--color-navy)]">({unreadCount} unread)</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer">Mark all read</button>
            )}
            <button onClick={() => clearAll()} className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer transition-colors">Clear {activeCategory === "all" ? "" : "category"}</button>
          </div>
        </div>

        <div className="flex gap-6">

          {/* ── SIDEBAR ──────────────────────────────────────── */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              {SIDEBAR_ITEMS.map((item, idx) => {
                const isActive = activeCategory === item.id;
                const count = item.id === "all" ? notifs.length : (categoryCounts[item.id] ?? 0);
                const unread = item.id === "all" ? unreadCount : (categoryUnread[item.id] ?? 0);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""} ${isActive ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"}`}>
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm font-[500]">{item.label}</span>
                    {unread > 0 && (
                      <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-navy)] text-white">{unread}</span>
                    )}
                    {unread === 0 && count > 0 && (
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{count}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Notification settings shortcut */}
            <div className="mt-4 px-1">
              <button className="w-full text-left flex items-center gap-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer transition-colors py-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" /></svg>
                Notification settings
              </button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ─────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Mobile category selector */}
            <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-1">
              {SIDEBAR_ITEMS.map(item => {
                const isActive = activeCategory === item.id;
                const unread = item.id === "all" ? unreadCount : (categoryUnread[item.id] ?? 0);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-[500] cursor-pointer transition-colors border ${isActive ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {unread > 0 && <span className={`font-[var(--font-mono)] text-[9px] px-1 rounded-full ${isActive ? "bg-white/20" : "bg-[var(--color-navy)] text-white"}`}>{unread}</span>}
                  </button>
                );
              })}
            </div>

            {/* Notification list */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              {/* Sub-header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-[600] text-[var(--color-ink)]">
                    {activeCategory === "all" ? "All Notifications" : CATEGORY_CONFIG[activeCategory]?.label}
                  </h3>
                  <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">({displayed.length})</span>
                </div>
                {displayed.some(n => n.unread) && (
                  <button onClick={markAllRead} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Mark all read</button>
                )}
              </div>

              {displayed.length === 0 ? (
                /* Empty state */
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">{activeCategory === "all" ? "🔔" : CATEGORY_CONFIG[activeCategory as NotifCategory]?.icon}</div>
                  <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">All caught up</p>
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    {activeCategory === "all" ? "No notifications to show." : `No ${CATEGORY_CONFIG[activeCategory as NotifCategory]?.label.toLowerCase()} notifications.`}
                  </p>
                </div>
              ) : (
                <div>
                  {/* Group by time: Today / Earlier */}
                  {(() => {
                    const today = displayed.filter(n => ["Now", "10 min ago", "2 hours ago", "4 hours ago"].includes(n.time) || n.time.endsWith("ago") || n.time === "Now");
                    const earlier = displayed.filter(n => !today.includes(n));
                    return (
                      <>
                        {today.length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-[var(--color-ground)] border-b border-[var(--color-border-subtle)]">
                              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Today</span>
                            </div>
                            {today.map(n => <NotifCard key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />)}
                          </>
                        )}
                        {earlier.length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-[var(--color-ground)] border-b border-[var(--color-border-subtle)]">
                              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Earlier</span>
                            </div>
                            {earlier.map(n => <NotifCard key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />)}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
