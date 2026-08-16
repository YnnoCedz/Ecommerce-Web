import { useState } from "react";

const RECENT_ORDERS = [
  {
    id: "ORD-2849",
    product: "Minimalist Chronograph Watch",
    seller: "Atelier Manila",
    status: "Delivered",
    statusColor: "text-[var(--color-green)] bg-[var(--color-green-light)]",
    date: "Aug 5, 2026",
    amount: 4200,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop&auto=format",
    tracking: "PH82849120",
  },
  {
    id: "ORD-2831",
    product: "Natural Botanical Skincare Set",
    seller: "Verde Botanics",
    status: "In transit",
    statusColor: "text-[var(--color-amber)] bg-[var(--color-amber-light)]",
    date: "Aug 10, 2026",
    amount: 1200,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100&h=100&fit=crop&auto=format",
    tracking: "PH82831095",
  },
  {
    id: "ORD-2814",
    product: "Genuine Leather Tote Bag",
    seller: "Casa Leather",
    status: "Processing",
    statusColor: "text-[var(--color-navy)] bg-[var(--color-navy-surface)]",
    date: "Aug 13, 2026",
    amount: 2800,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&h=100&fit=crop&auto=format",
    tracking: null,
  },
];

const NOTIFICATIONS = [
  {
    id: "n1",
    type: "order",
    icon: "📦",
    message: "Your order ORD-2831 has been picked up by the courier and is on its way.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "n2",
    type: "promo",
    icon: "🎁",
    message: "Atelier Manila is running a 15% sale on all accessories. Ends Sunday!",
    time: "Yesterday",
    unread: true,
  },
  {
    id: "n3",
    type: "review",
    icon: "⭐",
    message: "How was your Minimalist Chronograph Watch? Leave a review and help other buyers.",
    time: "Aug 7",
    unread: false,
  },
  {
    id: "n4",
    type: "wishlist",
    icon: "💛",
    message: "Linen Throw Blanket from Habi Textiles is back in stock. Grab it before it sells out.",
    time: "Aug 6",
    unread: false,
  },
];

const WISHLIST_PREVIEW = [
  {
    id: "w1",
    product: "Rattan Accent Chair",
    seller: "Form & Weave",
    price: 8500,
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200&h=200&fit=crop&auto=format",
    inStock: true,
  },
  {
    id: "w2",
    product: "Hand-thrown Ceramic Mug Set",
    seller: "Clay & Co.",
    price: 960,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=200&h=200&fit=crop&auto=format",
    inStock: true,
  },
  {
    id: "w3",
    product: "Pressed Flower Art Print",
    seller: "Bloom Studio",
    price: 650,
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&h=200&fit=crop&auto=format",
    inStock: false,
  },
];

const RECOMMENDED = [
  {
    id: "r1",
    product: "Brass Desk Clock",
    seller: "Atelier Manila",
    price: 1850,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&h=300&fit=crop&auto=format",
    tag: "Because you liked watches",
  },
  {
    id: "r2",
    product: "Aloe & Rosehip Face Serum",
    seller: "Verde Botanics",
    price: 680,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop&auto=format",
    tag: "Pairs with your skincare set",
  },
  {
    id: "r3",
    product: "Woven Rattan Wall Art",
    seller: "Form & Weave",
    price: 1200,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=300&fit=crop&auto=format",
    tag: "Trending in Home & Living",
  },
  {
    id: "r4",
    product: "Leather Card Wallet — Slim",
    seller: "Casa Leather",
    price: 720,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&h=300&fit=crop&auto=format",
    tag: "Pairs with your tote bag",
  },
];

const SHORTCUTS = [
  { label: "My Orders", count: 18, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="3" width="12" height="14" rx="1" /><path d="M6 7h6M6 10h4" /></svg> },
  { label: "Wishlist", count: 34, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 15s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" /></svg> },
  { label: "Reviews", count: 12, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2l1.8 3.6 4 .6-2.9 2.8.7 3.9L9 11.4l-3.6 1.5.7-3.9L3.2 6.2l4-.6L9 2z" /></svg> },
  { label: "Messages", count: 3, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z" /></svg> },
  { label: "Addresses", count: null, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2C6.2 2 4 4.2 4 7c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z" /><circle cx="9" cy="7" r="1.5" /></svg> },
  { label: "Settings", count: null, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="9" cy="9" r="2.5" /><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" /></svg> },
];

function SectionCard({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
          {count !== undefined && (
            <span className="font-[var(--font-mono)] text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] text-[var(--color-ink-muted)] rounded">{count}</span>
          )}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BuyerDashboardPage() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [cartAdded, setCartAdded] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

  const addToCart = (id: string) => {
    setCartAdded(prev => new Set(prev).add(id));
    setTimeout(() => setCartAdded(prev => { const next = new Set(prev); next.delete(id); return next; }), 2000);
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        {/* Welcome banner */}
        <div className="bg-[var(--color-navy)] rounded-sm px-6 py-5 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="font-[var(--font-display)] text-xl text-white font-[400]">AR</span>
            </div>
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-white/50 uppercase tracking-wide">Welcome back</p>
              <h1 className="font-[var(--font-display)] text-xl font-[400] text-white">Ana Reyes</h1>
              <p className="text-xs text-white/60 mt-0.5">Member since March 2024</p>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-3 gap-6 text-center">
            {[{ label: "Orders", value: "18" }, { label: "Reviews", value: "12" }, { label: "Wishlist", value: "34" }].map(({ label, value }) => (
              <div key={label}>
                <p className="font-[var(--font-display)] text-2xl font-[300] text-white">{value}</p>
                <p className="font-[var(--font-mono)] text-[9px] text-white/50 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Account shortcuts */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {SHORTCUTS.map(({ label, count, icon }) => (
            <button key={label} className="bg-white border border-[var(--color-border)] rounded-sm p-4 flex flex-col items-center gap-2 hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer group relative">
              <span className="text-[var(--color-ink-muted)] group-hover:text-[var(--color-navy)] transition-colors">{icon}</span>
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] group-hover:text-[var(--color-navy)] transition-colors text-center">{label}</span>
              {count !== null && count > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-[var(--color-amber)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center">{count > 9 ? "9+" : count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────── */}
          <div className="space-y-6">

            {/* Recent orders */}
            <SectionCard
              title="Recent Orders"
              count={18}
              action={<button className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View all orders</button>}>
              <div>
                {RECENT_ORDERS.map((order, idx) => (
                  <div key={order.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                    <div className="w-14 h-14 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                      <img src={order.image} alt={order.product} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-[500] text-[var(--color-ink)] truncate leading-snug">{order.product}</p>
                          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{order.seller} · {order.date}</p>
                        </div>
                        <span className={`font-[var(--font-mono)] text-[9px] font-[500] px-2 py-0.5 rounded-full shrink-0 ${order.statusColor}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-[600] text-[var(--color-ink)]">₱{order.amount.toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          {order.tracking && (
                            <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Track</button>
                          )}
                          {order.status === "Delivered" && (
                            <button className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:underline cursor-pointer">Write review</button>
                          )}
                          <button className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:underline cursor-pointer">Details</button>
                        </div>
                      </div>
                      {order.tracking && (
                        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-1">Tracking: {order.tracking}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Wishlist preview */}
            <SectionCard
              title="Saved Items"
              count={34}
              action={<button className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View wishlist</button>}>
              <div className="px-5 py-4 grid grid-cols-3 gap-3">
                {WISHLIST_PREVIEW.map(item => (
                  <div key={item.id} className="group">
                    <div className="relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square mb-2">
                      <img src={item.image} alt={item.product} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {!item.inStock && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Out of stock</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-[500] text-[var(--color-ink)] leading-snug line-clamp-1">{item.product}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">₱{item.price.toLocaleString()}</p>
                    {item.inStock && (
                      <button
                        onClick={() => addToCart(item.id)}
                        className={`mt-1.5 w-full text-[10px] font-[var(--font-mono)] py-1 rounded-sm transition-colors cursor-pointer ${
                          cartAdded.has(item.id)
                            ? "bg-[var(--color-green)] text-white"
                            : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"
                        }`}>
                        {cartAdded.has(item.id) ? "✓ Added" : "Add to cart"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Recommended products */}
            <SectionCard
              title="Recommended for You"
              action={<span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Based on your activity</span>}>
              <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {RECOMMENDED.map(item => (
                  <div key={item.id} className="group">
                    <div className="relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square mb-2">
                      <img src={item.image} alt={item.product} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <button className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[var(--color-ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--color-red)] cursor-pointer shadow-sm">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2c-2.2 0-4 1.8-4 4a4 4 0 004 4 4 4 0 004-4c0-2.2-1.8-4-4-4z" /></svg>
                      </button>
                    </div>
                    <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-amber)] uppercase tracking-wide mb-0.5">{item.tag}</p>
                    <p className="text-xs font-[500] text-[var(--color-ink)] leading-snug line-clamp-2 mb-0.5 cursor-pointer hover:text-[var(--color-navy)] transition-colors">{item.product}</p>
                    <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-1.5">{item.seller}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-[600] text-[var(--color-ink)]">₱{item.price.toLocaleString()}</span>
                      <div className="flex items-center gap-0.5">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="var(--color-amber)"><path d="M5 1l1.2 2.5 2.8.4-2 1.9.5 2.7L5 7.4 2.5 8.5l.5-2.7-2-1.9 2.8-.4z" /></svg>
                        <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{item.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* Notifications */}
            <SectionCard
              title="Notifications"
              count={unreadCount}
              action={unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
                  Mark all read
                </button>
              )}>
              <div>
                {notifications.map((notif, idx) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3.5 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""} ${notif.unread ? "bg-[var(--color-navy-surface)]/40" : ""}`}>
                    <span className="text-base shrink-0">{notif.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--color-ink)] leading-relaxed line-clamp-3">{notif.message}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-1">{notif.time}</p>
                    </div>
                    {notif.unread && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-navy)] shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
                <div className="px-4 py-3 border-t border-[var(--color-border)]">
                  <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">View all notifications</button>
                </div>
              </div>
            </SectionCard>

            {/* Order status tracker */}
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-sm font-[600] text-[var(--color-ink)] mb-4">Order in Transit</p>
              <div className="flex items-center justify-between mb-1">
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">ORD-2831</span>
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-amber)] font-[500]">In transit</span>
              </div>
              <p className="text-xs text-[var(--color-ink)] mb-4 truncate">Natural Botanical Skincare Set</p>

              {/* Tracker steps */}
              <div className="space-y-3">
                {[
                  { label: "Order placed", done: true, time: "Aug 10, 10:32 AM" },
                  { label: "Confirmed by seller", done: true, time: "Aug 10, 2:15 PM" },
                  { label: "Picked up by courier", done: true, time: "Aug 11, 9:00 AM" },
                  { label: "Out for delivery", done: false, time: "Estimated Aug 14" },
                  { label: "Delivered", done: false, time: "Estimated Aug 14" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`}>
                        {step.done && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M2 5l2.5 2.5 3.5-4" /></svg>
                        )}
                      </div>
                      {i < 4 && <div className={`w-px flex-1 min-h-[16px] mt-1 ${step.done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />}
                    </div>
                    <div className="pb-2">
                      <p className={`text-xs font-[500] ${step.done ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}>{step.label}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full text-xs text-[var(--color-navy)] hover:underline cursor-pointer text-center">View full tracking →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
