import { useEffect, useState } from "react";
import { fetchBuyerOrders, type BuyerOrderListItem } from "../../api/buyer";
import { AccountUser, StatusBannerAccount } from "./AccountLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function statusClass(status: string) {
  if (["delivered", "completed"].includes(status)) return "text-[var(--color-green)] bg-[var(--color-green-light)]";
  if (["in-transit", "out-for-delivery", "processing"].includes(status)) return "text-[var(--color-amber)] bg-[var(--color-amber-light)]";
  if (["cancelled", "failed", "returned", "refunded"].includes(status)) return "text-[var(--color-red)] bg-[var(--color-red-light)]";
  return "text-[var(--color-navy)] bg-[var(--color-navy-surface)]";
}

function currency(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

export default function ProfilePage({ user, onNavigate, onPageChange }: {
  user: AccountUser;
  onNavigate: NavFn;
  onPageChange: (page: string) => void;
}) {
  const [orders, setOrders] = useState<BuyerOrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchBuyerOrders();
        if (!active) return;
        setOrders(response.data);
      } catch {
        if (active) setOrders([]);
      } finally {
        if (active) setLoadingOrders(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-4">
      <StatusBannerAccount status={user.status} />

      <SectionCard
        title="Profile"
        action={
          <button onClick={() => onPageChange("personal-info")}
            className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Edit profile
          </button>
        }>
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-[var(--color-navy)] rounded flex items-center justify-center">
              <span className="font-[var(--font-display)] text-3xl text-white font-[400]">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-0.5">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-[var(--color-ink-muted)] mb-3">{user.email}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Phone", value: user.phone },
                { label: "Member since", value: user.joinedDate },
                { label: "Orders placed", value: user.orderCount.toString() },
                { label: "Wishlist items", value: user.wishlistCount.toString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-[500] text-[var(--color-ink)] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Recent Orders"
        action={
          <button onClick={() => onPageChange("orders")}
            className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            View all orders
          </button>
        }>
        {loadingOrders ? (
          <div className="text-sm text-[var(--color-ink-muted)]">Loading orders...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-sm text-[var(--color-ink-muted)]">No orders found in your backend account yet.</div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-[var(--color-border-subtle)] last:border-0">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{order.order_number ?? `#${order.id}`}</span>
                    <span className={`font-[var(--font-mono)] text-[9px] font-[500] px-1.5 py-0.5 rounded-full ${statusClass(order.status)}`}>
                      {order.status.replaceAll("-", " ")}
                    </span>
                  </div>
                  <p className="text-sm font-[500] text-[var(--color-ink)] truncate">{order.main_product ?? "Order item"}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {order.placed_at ? new Date(order.placed_at).toLocaleDateString() : "Pending date"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-[600] text-[var(--color-ink)]">{currency(order.grand_total)}</p>
                  <button onClick={() => onNavigate("order-detail", { id: order.order_number ?? String(order.id) })} className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer mt-0.5">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Security"
        action={
          <button onClick={() => onPageChange("security")}
            className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Manage
          </button>
        }>
        <div className="space-y-3">
          {[
            { label: "Password", value: "Managed by the backend auth system", ok: true },
            { label: "Two-factor auth", value: user.twoFactorEnabled ? "Enabled in your account" : "Not enabled", ok: user.twoFactorEnabled },
            { label: "Email verification", value: user.emailVerifiedAt ? "Verified" : "Verification pending", ok: !!user.emailVerifiedAt },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-[var(--color-green)]" : "bg-[var(--color-amber)]"}`} />
              <div className="flex-1">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
                <p className={`text-xs ${ok ? "text-[var(--color-ink-muted)]" : "text-[var(--color-amber)]"}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
