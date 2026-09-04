import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, ShoppingBag, Truck, X } from "lucide-react";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { useSearchParams } from "react-router";
import {
  fetchAdminOrders,
  updateAdminDeliveryStatus,
  type AdminDeliveryStatus,
  type AdminOrder,
} from "../../api/admin";
import { useToast } from "../../components/ToastProvider";
import DeliveryProofViewer from "../../components/orders/DeliveryProofViewer";

type OrderTab =
  | "all"
  | "ready-for-pickup"
  | "picked-up"
  | "in-transit"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";
const TABS: readonly OrderTab[] = [
  "all",
  "ready-for-pickup",
  "picked-up",
  "in-transit",
  "out-for-delivery",
  "delivered",
  "cancelled",
];
const TAB_LABELS: Record<OrderTab, string> = {
  all: "All",
  "ready-for-pickup": "Ready for Pickup",
  "picked-up": "Picked Up",
  "in-transit": "In Transit",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const ACTION_LABELS: Record<AdminDeliveryStatus, string> = {
  "picked-up": "Mark as Picked Up",
  "in-transit": "Mark In Transit",
  "out-for-delivery": "Mark Out for Delivery",
  delivered: "Mark Delivered",
};
const STATUS_QUERY: Record<OrderTab, string> = {
  all: "",
  "ready-for-pickup": "ready",
  "picked-up": "picked-up",
  "in-transit": "in-transit",
  "out-for-delivery": "out-for-delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

const money = (value: number, currency = "PHP") =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-PH") : "Not available";
const label = (value: string | null) =>
  (value ?? "waiting-for-seller")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab") as OrderTab | null;
  const tab =
    requestedTab && TABS.includes(requestedTab) ? requestedTab : "all";
  const focusedSellerOrderId = Number(params.get("order")) || null;
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ gmv: 0, open_disputes: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    sellerOrderId: number;
    status: AdminDeliveryStatus;
    orderNumber: string;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const selected = useMemo(
    () =>
      focusedSellerOrderId
        ? (orders.find((order) =>
            order.seller_orders.some(
              (group) => group.id === focusedSellerOrderId,
            ),
          ) ?? null)
        : null,
    [focusedSellerOrderId, orders],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchAdminOrders({
        search,
        status: STATUS_QUERY[tab],
        per_page: 100,
      })
        .then((response) => {
          if (!active) return;
          setOrders(response.data);
          setMeta({
            gmv: response.meta.gmv,
            open_disputes: response.meta.open_disputes,
            total: response.meta.total,
          });
        })
        .catch((caught: Error) => {
          if (active) setError(caught.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, tab]);

  const setTab = (value: OrderTab) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      value === "all" ? next.delete("tab") : next.set("tab", value);
      next.delete("order");
      return next;
    });
  const openOrder = (sellerOrderId: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("order", String(sellerOrderId));
      return next;
    });
  const closeOrder = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("order");
      return next;
    });

  const confirmTransition = async () => {
    if (!confirmation || updatingId !== null) return;
    setUpdatingId(confirmation.sellerOrderId);
    try {
      const response = await updateAdminDeliveryStatus(
        confirmation.sellerOrderId,
        confirmation.status,
      );
      setOrders((current) =>
        current.map((order) =>
          order.id === response.data.id ? response.data : order,
        ),
      );
      setConfirmation(null);
      showToast({ kind: "success", title: response.message });
    } catch (caught) {
      showToast({
        kind: "error",
        title: "Unable to update delivery status",
        error: caught,
        errorContext: "admin",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const rows = orders.flatMap((order) =>
    order.seller_orders.map((group) => ({
      order,
      group,
      itemCount: order.items
        .filter((item) => item.seller_order_id === group.id)
        .reduce((sum, item) => sum + item.quantity, 0),
    })),
  );

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <main
        className={`min-w-0 flex-1 ${selected ? "hidden xl:block" : "block"}`}
      >
        <header className="border-b border-[var(--color-border)] bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-[var(--font-display)] text-xl">
                Admin Orders
              </h1>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Manage marketplace orders and delivery progress.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-navy-surface)] px-3 py-1 text-xs text-[var(--color-navy)]">
              <Truck size={13} /> Delivery Operations
            </span>
          </div>
          <label className="flex max-w-xl items-center gap-2 border border-[var(--color-border)] px-3 py-2">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, buyer, or seller"
              className="w-full text-sm outline-none"
            />
          </label>
          <div className="mt-4 flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`whitespace-nowrap rounded-sm px-3 py-2 text-xs ${tab === value ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}
              >
                {TAB_LABELS[value]}
              </button>
            ))}
          </div>
        </header>
        <div className="grid grid-cols-3 border-b border-[var(--color-border)] bg-white">
          <div className="p-3 text-center">
            <p className="font-[var(--font-display)] text-lg">{meta.total}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">Orders</p>
          </div>
          <div className="border-x border-[var(--color-border)] p-3 text-center">
            <p className="font-[var(--font-display)] text-lg">
              {money(meta.gmv)}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)]">GMV</p>
          </div>
          <div className="p-3 text-center">
            <p className="font-[var(--font-display)] text-lg">
              {meta.open_disputes}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Open disputes
            </p>
          </div>
        </div>
        {loading && (
          <p className="p-8 text-sm text-[var(--color-ink-muted)]">
            Loading real orders...
          </p>
        )}
        {error && (
          <p className="m-5 bg-[var(--color-red-light)] p-3 text-sm text-[var(--color-red)]">
            {error}
          </p>
        )}
        {!loading && rows.length === 0 && (
          <div className="p-12 text-center">
            <ShoppingBag className="mx-auto mb-3 text-[var(--color-ink-muted)]" />
            <p className="text-sm text-[var(--color-ink-muted)]">
              No seller fulfillments found.
            </p>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-[var(--color-surface)] text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                <tr>
                  {[
                    "Order / Date",
                    "Buyer",
                    "Seller",
                    "Items",
                    "Payment",
                    "Fulfillment",
                    "Delivery",
                    "Total",
                    "Action",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-[500]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order, group, itemCount }) => (
                  <tr
                    key={group.id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openOrder(group.id)}
                        className="font-[600] text-[var(--color-navy)]"
                      >
                        {order.order_number}
                      </button>
                      <span className="block text-[10px] text-[var(--color-ink-muted)]">
                        {date(order.placed_at ?? order.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.buyer_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      {group.seller?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">{itemCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={group.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={group.delivery_status} />
                      {group.delivery_handler && (
                        <span className="block text-[10px] text-[var(--color-ink-muted)]">
                          {group.delivery_handler}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {money(group.total, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {group.next_delivery_status ? (
                        <button
                          onClick={() =>
                            setConfirmation({
                              sellerOrderId: group.id,
                              status: group.next_delivery_status!,
                              orderNumber: order.order_number,
                            })
                          }
                          disabled={updatingId === group.id}
                          className="whitespace-nowrap rounded-sm bg-[var(--color-navy)] px-3 py-2 text-xs text-white disabled:opacity-50"
                        >
                          {ACTION_LABELS[group.next_delivery_status]}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          {[
                            "pending",
                            "new",
                            "confirmed",
                            "preparing",
                          ].includes(group.status)
                            ? "Waiting for seller"
                            : "No action"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selected && (
        <aside className="w-full overflow-y-auto border-l border-[var(--color-border)] bg-white xl:w-[500px]">
          <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white p-5">
            <button
              onClick={closeOrder}
              className="float-right"
              aria-label="Close order"
            >
              <X size={17} />
            </button>
            <h2 className="font-[600]">{selected.order_number}</h2>
            <p className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              <StatusBadge status={selected.status} />
              <span>Payment</span>
              <StatusBadge status={selected.payment_status} />
            </p>
          </header>
          <div className="space-y-5 p-5">
            <section>
              <h3 className="mb-2 text-xs uppercase text-[var(--color-ink-muted)]">
                Buyer and delivery
              </h3>
              <p className="text-sm">{selected.buyer?.name ?? "Unknown"}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {selected.buyer?.email}
              </p>
              <p className="mt-2 text-sm">
                {selected.shipping.name} - {selected.shipping.phone}
              </p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {selected.shipping.address}
              </p>
            </section>
            {selected.seller_orders.map((group) => (
              <section
                key={group.id}
                className={`rounded-sm border p-4 ${group.id === focusedSellerOrderId ? "border-[var(--color-navy)]" : "border-[var(--color-border)]"}`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-[600]">
                      {group.seller?.name ?? "Unknown seller"}
                    </h3>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      Pickup:{" "}
                      {group.seller?.pickup_address ||
                        "No seller pickup address"}
                    </p>
                  </div>
                  <span className="text-sm">
                    {money(group.total, selected.currency)}
                  </span>
                </div>
                <div className="mt-3 rounded-sm bg-[var(--color-surface)] p-3 text-xs">
                  <p className="flex items-center gap-2">
                    <strong>Seller order:</strong>{" "}
                    <StatusBadge status={group.status} />
                  </p>
                  <p className="flex items-center gap-2">
                    <strong>Delivery:</strong>{" "}
                    <StatusBadge status={group.delivery_status} />
                  </p>
                  <p>
                    <strong>Handler:</strong>{" "}
                    {group.delivery_handler ?? "Waiting for seller"}
                  </p>
                  <p>
                    <strong>Tracking:</strong>{" "}
                    {group.tracking_number ?? "Created at handoff"}
                  </p>
                </div>
                <DeliveryProofViewer
                  shipmentId={group.shipment_id}
                  proof={group.proof_of_delivery}
                  showCourier
                />
                <div className="mt-3 space-y-2">
                  {group.tracking_events.map((event) => (
                    <div
                      key={event.id}
                      className="border-l-2 border-[var(--color-navy)] pl-3"
                    >
                      <p className="text-xs font-[600]">
                        <StatusBadge status={event.status} />
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {event.note}
                      </p>
                      <p className="text-[10px] text-[var(--color-ink-disabled)]">
                        {date(event.occurred_at)}
                      </p>
                    </div>
                  ))}
                </div>
                {group.next_delivery_status && (
                  <button
                    onClick={() =>
                      setConfirmation({
                        sellerOrderId: group.id,
                        status: group.next_delivery_status!,
                        orderNumber: selected.order_number,
                      })
                    }
                    className="mt-4 w-full rounded-sm bg-[var(--color-navy)] px-3 py-2.5 text-sm text-white"
                  >
                    {ACTION_LABELS[group.next_delivery_status]}
                  </button>
                )}
              </section>
            ))}
            <section>
              <h3 className="mb-2 text-xs uppercase text-[var(--color-ink-muted)]">
                Products
              </h3>
              {selected.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 border-b border-[var(--color-border-subtle)] py-2 text-sm"
                >
                  <span>
                    {item.product_name}
                    <small className="block text-[var(--color-ink-muted)]">
                      {item.variant_name ?? "Default"} - {item.sku} - Qty{" "}
                      {item.quantity}
                    </small>
                  </span>
                  <span>{money(item.subtotal, selected.currency)}</span>
                </div>
              ))}
            </section>
          </div>
        </aside>
      )}

      {confirmation && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-xl">
            <h2 className="font-[var(--font-display)] text-xl">
              {ACTION_LABELS[confirmation.status]}?
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {confirmation.status === "picked-up"
                ? "This confirms that the package has been collected from the seller and is now under Marketo delivery handling."
                : confirmation.status === "delivered"
                  ? "This confirms delivery and will notify the buyer and seller."
                  : `This will move ${confirmation.orderNumber} to ${label(confirmation.status)}.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmation(null)}
                disabled={updatingId !== null}
                className="px-4 py-2.5 text-sm text-[var(--color-ink-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmTransition()}
                disabled={updatingId !== null}
                className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm text-white disabled:opacity-50"
              >
                {updatingId !== null && (
                  <LoaderCircle size={15} className="animate-spin" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
