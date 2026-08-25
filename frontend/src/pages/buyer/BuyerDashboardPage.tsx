import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { fetchBuyerNotifications, fetchBuyerOrders, fetchWishlistItems, type BuyerOrderListItem, type WishlistItemRecord } from "../../api/buyer";

type DashboardOrder = BuyerOrderListItem & {
  displaySeller: string;
  displayProduct: string;
  displayImage: string;
};

type SavedItem = {
  id: number;
  product: string;
  seller: string;
  slug: string;
  price: number;
  image: string;
  inStock: boolean;
  dateAdded: string;
};

function SectionCard({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
          {count !== undefined && (
            <span className="font-[var(--font-mono)] text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] text-[var(--color-ink-muted)] rounded">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function currency(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

function statusClass(status: string) {
  if (["delivered", "completed"].includes(status)) return "text-[var(--color-green)] bg-[var(--color-green-light)]";
  if (["in-transit", "out-for-delivery", "processing"].includes(status)) return "text-[var(--color-amber)] bg-[var(--color-amber-light)]";
  if (["cancelled", "failed", "returned", "refunded"].includes(status)) return "text-[var(--color-red)] bg-[var(--color-red-light)]";
  return "text-[var(--color-navy)] bg-[var(--color-navy-surface)]";
}

function normalizeWishlist(items: WishlistItemRecord[]): SavedItem[] {
  return items
    .map((item) => {
      const product = item.product;
      if (!product) return null;

      const sellerName = product.seller?.trade_name ?? product.seller?.business_name ?? "Seller";
      const primaryImage = product.images?.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.file_path ?? "";

      return {
        id: item.id,
        product: product.name,
        seller: sellerName,
        slug: product.slug,
        price: product.sale_price ?? product.price,
        image: primaryImage,
        inStock: product.status === "active" && product.stock_quantity > 0,
        dateAdded: item.added_at ? new Date(item.added_at).toLocaleDateString() : "Recently",
      };
    })
    .filter((item): item is SavedItem => Boolean(item));
}

export default function BuyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [wishlist, setWishlist] = useState<SavedItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [ordersResponse, wishlistResponse, notificationsResponse] = await Promise.all([
          fetchBuyerOrders(),
          fetchWishlistItems(),
          fetchBuyerNotifications(),
        ]);

        if (!active) return;

        const normalizedOrders = ordersResponse.data.map((order) => ({
          ...order,
          displayProduct: order.main_product ?? `Order ${order.order_number ?? order.id}`,
          displaySeller: order.seller_names?.[0] ?? "Seller",
          displayImage: order.main_image ?? "",
        }));

        setOrders(normalizedOrders);
        setWishlist(normalizeWishlist(wishlistResponse.data));
        setUnreadNotifications(notificationsResponse.meta?.unread_count ?? 0);
      } catch {
        if (!active) return;
        setOrders([]);
        setWishlist([]);
        setUnreadNotifications(0);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => ({
    orders: user?.order_count ?? orders.length,
    wishlist: user?.wishlist_count ?? wishlist.length,
    unread: unreadNotifications,
  }), [orders.length, unreadNotifications, user?.order_count, user?.wishlist_count, wishlist.length]);

  const recentOrders = orders.slice(0, 3);
  const recentWishlist = wishlist.slice(0, 3);

  if (loading) {
    return <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading dashboard...</div>;
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="bg-[var(--color-navy)] rounded-sm px-6 py-5 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="font-[var(--font-display)] text-xl text-white font-[400]">
                {(user?.display_name ?? user?.name ?? "U").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-white/50 uppercase tracking-wide">Welcome back</p>
              <h1 className="font-[var(--font-display)] text-xl font-[400] text-white">{user?.display_name ?? user?.name ?? "Account"}</h1>
              <p className="text-xs text-white/60 mt-0.5">{user?.email ?? "No account email"}</p>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-3 gap-6 text-center">
            {[
              { label: "Orders", value: stats.orders },
              { label: "Wishlist", value: stats.wishlist },
              { label: "Notifications", value: stats.unread },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-[var(--font-display)] text-2xl font-[300] text-white">{value}</p>
                <p className="font-[var(--font-mono)] text-[9px] text-white/50 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Orders", count: stats.orders, to: "/account/orders" },
            { label: "Wishlist", count: stats.wishlist, to: "/account/wishlist" },
            { label: "Messages", count: null as number | null, to: "/account/messages" },
            { label: "Addresses", count: null as number | null, to: "/account/addresses" },
            { label: "Notifications", count: stats.unread, to: "/account/notifications" },
            { label: "Settings", count: null as number | null, to: "/account/profile" },
          ].map(({ label, count, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="bg-white border border-[var(--color-border)] rounded-sm p-4 flex flex-col items-center gap-2 hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer group relative">
              <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] group-hover:text-[var(--color-navy)] transition-colors text-center">{label}</span>
              {count !== null && count > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-[var(--color-amber)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <SectionCard
              title="Recent Orders"
              count={recentOrders.length}
              action={<button onClick={() => navigate("/account/orders")} className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View all orders</button>}>
              {recentOrders.length === 0 ? (
                <div className="px-5 py-10 text-sm text-[var(--color-ink-muted)]">No orders found in your account yet.</div>
              ) : (
                <div>
                  {recentOrders.map((order, idx) => (
                    <div key={order.id} className={`flex gap-4 px-5 py-4 ${idx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}>
                      <div className="w-14 h-14 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0">
                        {order.displayImage ? <img src={order.displayImage} alt={order.displayProduct} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-[500] text-[var(--color-ink)] truncate leading-snug">{order.displayProduct}</p>
                            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">{order.displaySeller} · {order.placed_at ? new Date(order.placed_at).toLocaleDateString() : "Pending date"}</p>
                          </div>
                          <span className={`font-[var(--font-mono)] text-[9px] font-[500] px-2 py-0.5 rounded-full shrink-0 ${statusClass(order.status)}`}>
                            {order.status.replaceAll("-", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-[600] text-[var(--color-ink)]">{currency(order.grand_total)}</span>
                          <button onClick={() => navigate(`/account/orders/${order.order_number ?? order.id}`)} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer">Details</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Saved Items"
              count={wishlist.length}
              action={<button onClick={() => navigate("/account/wishlist")} className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">View wishlist</button>}>
              {recentWishlist.length === 0 ? (
                <div className="px-5 py-10 text-sm text-[var(--color-ink-muted)]">Your wishlist is empty.</div>
              ) : (
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentWishlist.map((item) => (
                    <button key={item.id} onClick={() => navigate(`/p/${item.slug}`)} className="group text-left">
                      <div className="relative bg-[var(--color-surface)] rounded-sm overflow-hidden aspect-square mb-2">
                        {item.image ? <img src={item.image} alt={item.product} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : null}
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">Out of stock</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-[500] text-[var(--color-ink)] leading-snug line-clamp-2">{item.product}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{item.seller}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">Saved {item.dateAdded}</p>
                      <p className="text-sm font-[600] text-[var(--color-ink)] mt-1">{currency(item.price)}</p>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Notifications" count={stats.unread}>
              <div className="px-4 py-4 text-sm text-[var(--color-ink-muted)]">
                {stats.unread > 0 ? `${stats.unread} unread notifications are available in the notification center.` : "No unread notifications."}
              </div>
            </SectionCard>

            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <p className="text-sm font-[600] text-[var(--color-ink)] mb-3">Quick summary</p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-muted)]">Account name</span>
                  <span className="text-[var(--color-ink)] font-[500]">{user?.display_name ?? user?.name ?? "Account"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-muted)]">Email</span>
                  <span className="text-[var(--color-ink)] font-[500]">{user?.email ?? "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-muted)]">Verification</span>
                  <span className="text-[var(--color-ink)] font-[500]">{user?.email_verified_at ? "Verified" : "Unverified"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
