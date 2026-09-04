import { useEffect, useMemo, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { useSearchParams } from "react-router"
import {
  cancelSellerOrderBySeller,
  fetchSellerOrders,
  updateSellerOrderStatus,
  type SellerOrder,
} from "../../api/seller"
import { useToast } from "../../components/ToastProvider"
import DeliveryProofViewer from "../../components/orders/DeliveryProofViewer"
import { useUrlTab } from "../../hooks/useUrlTab"

type FulfillmentStatus = "new" | "confirmed" | "preparing" | "ready" | "picked-up" | "in-transit" | "out-for-delivery" | "delivered" | "completed" | "cancelled" | "failed"
type OrderFilter = "all" | "new" | "active" | "completed" | "cancelled"

const ORDER_FILTERS: readonly OrderFilter[] = [
  "all",
  "new",
  "active",
  "completed",
  "cancelled",
]

const FULFILLMENT_CONFIG: Record<FulfillmentStatus, {
  label: string
  color: string
  bg: string
  border: string
}> = {
  new: {
    label: "New order",
    color: "var(--color-amber)",
    bg: "var(--color-amber-light)",
    border: "var(--color-amber-border)",
  },
  confirmed: {
    label: "Confirmed",
    color: "var(--color-navy)",
    bg: "var(--color-navy-surface)",
    border: "var(--color-navy-border)",
  },
  preparing: {
    label: "Preparing",
    color: "var(--color-navy)",
    bg: "var(--color-navy-surface)",
    border: "var(--color-navy-border)",
  },
  ready: {
    label: "Ready",
    color: "var(--color-green)",
    bg: "var(--color-green-light)",
    border: "var(--color-green-border)",
  },
  "picked-up": {
    label: "Picked up",
    color: "var(--color-amber)",
    bg: "var(--color-amber-light)",
    border: "var(--color-amber-border)",
  },
  "in-transit": {
    label: "In transit",
    color: "var(--color-amber)",
    bg: "var(--color-amber-light)",
    border: "var(--color-amber-border)",
  },
  "out-for-delivery": {
    label: "Out for delivery",
    color: "var(--color-amber)",
    bg: "var(--color-amber-light)",
    border: "var(--color-amber-border)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--color-green)",
    bg: "var(--color-green-light)",
    border: "var(--color-green-border)",
  },
  completed: {
    label: "Completed",
    color: "var(--color-green)",
    bg: "var(--color-green-light)",
    border: "var(--color-green-border)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--color-ink-muted)",
    bg: "var(--color-surface)",
    border: "var(--color-border)",
  },
  failed: {
    label: "Failed",
    color: "var(--color-red)",
    bg: "var(--color-red-light)",
    border: "var(--color-red-border)",
  },
}

function normalizeStatus(status: string): FulfillmentStatus {
  const aliases: Record<string, FulfillmentStatus> = {
    pending: "new",
    new: "new",
    confirmed: "confirmed",
    preparing: "preparing",
    ready: "ready",
    picked_up: "picked-up",
    "picked-up": "picked-up",
    in_transit: "in-transit",
    "in-transit": "in-transit",
    shipped: "in-transit",
    out_for_delivery: "out-for-delivery",
    "out-for-delivery": "out-for-delivery",
    delivered: "delivered",
    completed: "completed",
    cancelled: "cancelled",
    failed: "failed",
  }

  return aliases[status] ?? "failed"
}

function StatusBadge({ status }: { status: FulfillmentStatus }) {
  const cfg = FULFILLMENT_CONFIG[status]
  return (
    <span
      className="inline-flex items-center font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-full"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  )
}

function FulfillmentFlow({ current }: { current: FulfillmentStatus }) {
  const flow: FulfillmentStatus[] = [
    "new",
    "confirmed",
    "preparing",
    "ready",
    "picked-up",
    "in-transit",
    "out-for-delivery",
    "delivered",
    "completed",
  ]
  const currentIdx = flow.indexOf(current)
  const labels: Record<FulfillmentStatus, string> = {
    new: "New",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    "picked-up": "Picked up",
    "in-transit": "Transit",
    "out-for-delivery": "Out for delivery",
    delivered: "Delivered",
    completed: "Done",
    cancelled: "Cancelled",
    failed: "Failed",
  }

  return (
    <div className="flex items-center gap-0 mb-4 overflow-x-auto">
      {flow.map((status, index) => {
        const done = index < currentIdx
        const active = index === currentIdx
        const cfg = FULFILLMENT_CONFIG[status]
        return (
          <div key={status} className="flex items-center">
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-[var(--font-mono)] whitespace-nowrap ${
                done
                  ? "bg-[var(--color-green-light)] text-[var(--color-green)]"
                  : active
                    ? ""
                    : "text-[var(--color-ink-disabled)]"
              }`}
              style={active ? { background: cfg.bg, color: cfg.color } : {}}
            >
              {done && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 5l2.5 2.5 3.5-4" />
                </svg>
              )}
              {labels[status]}
            </div>
            {index < flow.length - 1 && (
              <div
                className={`w-4 h-px ${
                  done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const ACTION_LABELS: Record<NonNullable<SellerOrder["next_status"]>, string> = {
  confirmed: "Confirm order",
  preparing: "Start preparing",
  ready: "Mark packed and ready",
}

function OrderCard({
  order,
  onUpdated,
  focused = false,
}: {
  order: SellerOrder
  onUpdated: (order: SellerOrder) => void
  focused?: boolean
}) {
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const status = normalizeStatus(order.status)
  const cfg = FULFILLMENT_CONFIG[status]

  useEffect(() => {
    if (focused) setExpanded(true)
  }, [focused])

  const advanceOrder = async () => {
    if (!order.next_status) return
    setUpdating(true)
    try {
      const response = await updateSellerOrderStatus(
        order.id,
        order.next_status,
      )
      onUpdated(response.data)
      showToast({ title: "Order updated", message: response.message })
    } catch (error) {
      showToast({
        kind: "error",
        title: "Order not updated",
        error,
        errorContext: "orders",
      })
    } finally {
      setUpdating(false)
    }
  }

  const cancelOrder = async () => {
    if (cancelReason.trim().length < 5) return
    setUpdating(true)
    try {
      const response = await cancelSellerOrderBySeller(
        order.id,
        cancelReason.trim(),
      )
      onUpdated({ ...order, status: "cancelled", next_status: null })
      setCancelling(false)
      showToast({ title: "Order cancelled", message: response.message })
    } catch (error) {
      showToast({
        kind: "error",
        title: "Order not cancelled",
        error,
        errorContext: "orders",
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className={`bg-white border rounded-sm overflow-hidden transition-colors ${
        focused
          ? "border-[var(--color-navy)] ring-2 ring-[var(--color-navy)]/15"
          : status === "new"
            ? "border-[var(--color-amber-border)]"
            : "border-[var(--color-border)]"
      }`}
    >
      {status === "new" && <div className="h-1 bg-[var(--color-amber)]" />}

      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div>
          <p className="font-[var(--font-mono)] text-[11px] font-[600] text-[var(--color-ink)]">
            {order.order_number ?? `Order #${order.id}`}
          </p>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">
            {order.placed_at
              ? new Date(order.placed_at).toLocaleDateString()
              : "No date"}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-[500] text-[var(--color-ink)] truncate">
            {order.buyer?.name ?? "Guest buyer"}
          </p>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] truncate">
            {order.buyer?.email ?? "No email"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={status} />
          <span className="font-[var(--font-display)] text-base font-[400] text-[var(--color-ink)]">
            PHP {order.grand_total.toLocaleString()}
          </span>
          <button
            onClick={() => setExpanded((value) => !value)}
            className="w-6 h-6 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-4 px-5 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex gap-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="w-12 h-12 bg-[var(--color-surface)] rounded-sm overflow-hidden shrink-0"
            >
              <img
                src={
                  item.image ??
                  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop&auto=format"
                }
                alt={item.product_name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          {order.items.map((item) => (
            <p
              key={item.id}
              className="text-xs text-[var(--color-ink)] truncate leading-relaxed"
            >
              {item.product_name}{" "}
              <span className="text-[var(--color-ink-muted)]">
                {item.variant_name ? `(${item.variant_name})` : ""} x{" "}
                {item.quantity}
              </span>
            </p>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          <FulfillmentFlow current={status} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                Delivery address
              </p>
              <p className="text-sm text-[var(--color-ink-secondary)]">
                {order.shipping_address ?? "No shipping address"}
              </p>
            </div>
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                Payment
              </p>
              <p className="text-sm text-[var(--color-ink)]">
                {order.payment_method ?? "Unknown"}
              </p>
              <p className="text-sm font-[600] text-[var(--color-ink)]">
                PHP {order.grand_total.toLocaleString()}
              </p>
            </div>
            {order.courier && (
              <div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                  Courier assignment
                </p>
                <p className="text-sm font-[500] text-[var(--color-ink)]">
                  {order.courier.name ?? "Courier pending"}
                </p>
                {order.courier.driver && (
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Driver: {order.courier.driver}
                  </p>
                )}
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-0.5">
                  Tracking: {order.courier.tracking ?? "N/A"}
                </p>
              </div>
            )}
            <DeliveryProofViewer shipmentId={order.shipment_id} proof={order.proof_of_delivery} />
            <div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                Items
              </p>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm mb-0.5"
                >
                  <span className="text-[var(--color-ink-secondary)] truncate mr-2">
                    {item.product_name} x {item.quantity}
                  </span>
                  <span className="font-[500] text-[var(--color-ink)] shrink-0">
                    PHP {(item.unit_price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {order.next_status && (
            <div className="flex flex-col gap-3 border-t border-[var(--color-border-subtle)] pt-4 sm:flex-row sm:items-end sm:justify-between">
              <span />
              <button
                onClick={() => void advanceOrder()}
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm font-[500] text-white hover:bg-[var(--color-navy-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating && (
                  <LoaderCircle size={15} className="animate-spin" />
                )}
                {ACTION_LABELS[order.next_status]}
              </button>
            </div>
          )}
          {!order.next_status && ["ready", "picked-up", "in-transit", "out-for-delivery"].includes(status) && (
            <div className="rounded-sm border border-[var(--color-navy-border)] bg-[var(--color-navy-surface)] p-3 text-sm text-[var(--color-navy)]">
              {status === "ready" ? "Awaiting Maketo pickup." : status === "picked-up" ? "Picked up by Maketo Logistics." : status === "in-transit" ? "In transit with Maketo Logistics." : "Maketo Logistics is out for delivery."}
            </div>
          )}
          {["new", "confirmed"].includes(status) && (
            <div className="border-t border-[var(--color-border-subtle)] pt-4">
              {!cancelling ? (
                <button
                  onClick={() => setCancelling(true)}
                  className="text-sm text-[var(--color-red)]"
                >
                  Cancel this seller order
                </button>
              ) : (
                <div className="rounded-sm border border-[var(--color-red-border)] bg-[var(--color-red-light)] p-4">
                  <p className="text-sm font-[600] text-[var(--color-red)]">
                    Confirm seller cancellation
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Reason for the buyer"
                    className="mt-2 w-full resize-none rounded-sm border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setCancelling(false)}
                      className="px-3 py-2 text-sm"
                    >
                      Keep order
                    </button>
                    <button
                      onClick={() => void cancelOrder()}
                      disabled={updating || cancelReason.trim().length < 5}
                      className="rounded-sm bg-[var(--color-red)] px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Confirm cancellation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SellerOrdersPage() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const { activeTab: activeFilter, setActiveTab: setActiveFilter } = useUrlTab(
    ORDER_FILTERS,
    "all",
  )
  const [search, setSearch] = useState("")
  const focusedSellerOrderId = Number(searchParams.get("order")) || null
  const focusedParentOrderId = Number(searchParams.get("parent_order")) || null

  const replaceOrder = (updated: SellerOrder) => {
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? updated : order)),
    )
  }

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await fetchSellerOrders()
        if (!active) return
        setOrders(response.data)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    let next = orders

    if (activeFilter === "new") {
      next = next.filter((order) => normalizeStatus(order.status) === "new")
    } else if (activeFilter === "active") {
      next = next.filter((order) =>
        ["confirmed", "preparing", "ready", "picked-up", "in-transit", "out-for-delivery"].includes(
          normalizeStatus(order.status),
        ),
      )
    } else if (activeFilter === "completed") {
      next = next.filter((order) =>
        ["delivered", "completed"].includes(normalizeStatus(order.status)),
      )
    } else if (activeFilter === "cancelled") {
      next = next.filter((order) =>
        ["cancelled", "failed"].includes(normalizeStatus(order.status)),
      )
    }

    if (search) {
      const q = search.toLowerCase()
      next = next.filter(
        (order) =>
          String(order.order_number ?? order.id)
            .toLowerCase()
            .includes(q) ||
          order.buyer?.name.toLowerCase().includes(q) ||
          order.items.some((item) =>
            item.product_name.toLowerCase().includes(q),
          ),
      )
    }

    return next
  }, [activeFilter, orders, search])

  const filters = [
    { id: "all", label: "All", count: orders.length },
    {
      id: "new",
      label: "New",
      count: orders.filter((order) => normalizeStatus(order.status) === "new")
        .length,
    },
    {
      id: "active",
      label: "Active",
      count: orders.filter((order) =>
        ["confirmed", "preparing", "ready", "picked-up", "in-transit", "out-for-delivery"].includes(
          normalizeStatus(order.status),
        ),
      ).length,
    },
    {
      id: "completed",
      label: "Completed",
      count: orders.filter((order) =>
        ["delivered", "completed"].includes(normalizeStatus(order.status)),
      ).length,
    },
    {
      id: "cancelled",
      label: "Cancelled / Failed",
      count: orders.filter((order) =>
        ["cancelled", "failed"].includes(normalizeStatus(order.status)),
      ).length,
    },
  ] as const

  const newCount = filters[1].count

  if (loading) {
    return (
      <div className="p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">
        Loading orders...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">
            Orders
          </h1>
          {newCount > 0 && (
            <p className="text-sm text-[var(--color-amber)] mt-0.5 font-[500]">
              {newCount} new {newCount === 1 ? "order" : "orders"} require your
              attention
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Pending action",
            value: newCount.toString(),
            sub: "Require confirmation",
            urgent: newCount > 0,
          },
          {
            label: "In transit",
            value: orders
              .filter((order) =>
                ["picked-up", "in-transit", "out-for-delivery"].includes(
                  normalizeStatus(order.status),
                ),
              )
              .length.toString(),
            sub: "Active shipments",
          },
          {
            label: "Completed",
            value: orders
              .filter((order) =>
                ["delivered", "completed"].includes(
                  normalizeStatus(order.status),
                ),
              )
              .length.toString(),
            sub: "Fulfilled orders",
          },
          {
            label: "Revenue",
            value: `PHP ${orders.reduce((sum, order) => sum + order.grand_total, 0).toLocaleString()}`,
            sub: "All tracked orders",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-white border rounded-sm p-4 ${
              card.urgent
                ? "border-[var(--color-amber-border)] bg-[var(--color-amber-light)]"
                : "border-[var(--color-border)]"
            }`}
          >
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1">
              {card.label}
            </p>
            <p
              className={`font-[var(--font-display)] text-2xl font-[300] ${
                card.urgent
                  ? "text-[var(--color-amber)]"
                  : "text-[var(--color-ink)]"
              }`}
            >
              {card.value}
            </p>
            <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l2.5 2.5" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order ID, customer or product..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-[var(--color-border)] rounded-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-0 border-b border-[var(--color-border)] mb-5">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-[500] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === filter.id
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {filter.label}
            <span
              className={`font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded ${
                activeFilter === filter.id
                  ? "bg-[var(--color-navy)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-ink-muted)]"
              }`}
            >
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-sm p-12 text-center">
          <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">
            No orders found
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Try adjusting your search or filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdated={replaceOrder}
              focused={
                order.id === focusedSellerOrderId ||
                order.order_id === focusedParentOrderId
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
