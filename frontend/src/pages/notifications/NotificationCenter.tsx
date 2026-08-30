import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import {
  Bell,
  Boxes,
  Gift,
  MessageSquare,
  Package,
  Settings2,
  ShieldAlert,
  Truck,
  UserCircle2,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "../../auth/AuthContext"
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFeedMeta,
  type NotificationRecord,
} from "../../api/notifications"
import { useUrlTab } from "../../hooks/useUrlTab"

type NotifCategory = "orders" | "delivery" | "messages" | "account" | "promotions" | "system" | "moderation" | "inventory"

type CategoryConfig = {
  label: string
  icon: LucideIcon
  badgeClass: string
  iconClass: string
}

const CATEGORY_CONFIG: Record<NotifCategory, CategoryConfig> = {
  orders: {
    label: "Orders",
    icon: Package,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  delivery: {
    label: "Delivery",
    icon: Truck,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  messages: {
    label: "Messages",
    icon: MessageSquare,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  account: {
    label: "Account",
    icon: UserCircle2,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  promotions: {
    label: "Promotions",
    icon: Gift,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  system: {
    label: "System",
    icon: Settings2,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  moderation: {
    label: "Moderation",
    icon: ShieldAlert,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
  inventory: {
    label: "Inventory",
    icon: Boxes,
    badgeClass: "bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
    iconClass: "text-[var(--color-ink-muted)]",
  },
}

const NOTIFICATION_TABS = [
  "all",
  ...Object.keys(CATEGORY_CONFIG),
] as readonly string[]

function isNotifCategory(value: string): value is NotifCategory {
  return value in CATEGORY_CONFIG
}

function formatTime(iso: string | null) {
  if (!iso) {
    return "Just now"
  }

  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) {
    return "Just now"
  }

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function resolveActionRoute(
  notification: NotificationRecord,
  role?: string | null,
) {
  switch (notification.action_type) {
    case "admin_order":
      if (role !== "admin") return null
      return notification.seller_order_id
        ? `/admin/orders?tab=all&order=${notification.seller_order_id}`
        : "/admin/orders"
    case "buyer_order":
      if (role === "seller" || role === "admin") return null
      return notification.order_number
        ? `/account/orders/${encodeURIComponent(notification.order_number)}`
        : "/account/orders"
    case "seller_order":
      if (role !== "seller") return null
      if (notification.seller_order_id)
        return `/seller-center/orders?order=${notification.seller_order_id}`
      return notification.order_id
        ? `/seller-center/orders?parent_order=${notification.order_id}`
        : "/seller-center/orders"
    case "order":
      if (role === "seller") return "/seller-center/orders"
      if (role === "admin") return "/admin/orders"
      return "/account/orders"
    case "message":
      if (role === "seller") return "/seller-center/messages"
      if (role === "admin") return "/admin/reports"
      return "/account/messages"
    case "inventory":
      return "/seller-center/inventory"
    case "seller-application":
      return role === "admin" ? "/admin/sellers" : "/seller-center"
    case "report":
      return "/admin/reports"
    case "analytics":
      return role === "seller" ? "/seller-center/analytics" : "/admin/analytics"
    case "seller-profile":
      return "/seller-center/settings"
    default:
      return null
  }
}

type NotificationRowProps = {
  notification: NotificationRecord
  role?: string | null
  onOpen: (notification: NotificationRecord) => void
  onDismiss: (notification: NotificationRecord) => void
}

function NotificationRow({
  notification,
  role,
  onOpen,
  onDismiss,
}: NotificationRowProps) {
  const category = isNotifCategory(notification.category)
    ? notification.category
    : "system"
  const cfg = CATEGORY_CONFIG[category]
  const unread = !notification.read_at

  return (
    <div
      className={`flex gap-4 px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-0 transition-colors ${
        unread ? "bg-[var(--color-navy-surface)]/35" : ""
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.badgeClass}`}
      >
        <cfg.icon size={18} className={cfg.iconClass} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <p
            className={`text-sm leading-snug ${
              unread
                ? "font-[600] text-[var(--color-ink)]"
                : "font-[500] text-[var(--color-ink)]"
            }`}
          >
            {notification.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] whitespace-nowrap">
              {formatTime(notification.created_at)}
            </span>
            {unread && (
              <div className="w-2 h-2 rounded-full bg-[var(--color-navy)] shrink-0" />
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed line-clamp-2 mb-2">
          {notification.body}
        </p>

        <div className="flex items-center gap-3">
          {notification.action_label && (
            <button
              onClick={() => onOpen(notification)}
              className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer"
            >
              {notification.action_label}
            </button>
          )}
          {notification.order_id && (
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
              #{notification.order_id}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        {unread && (
          <button
            onClick={() => onOpen(notification)}
            title="Mark as read"
            className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M2 7l3.5 3.5 6.5-6" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDismiss(notification)}
          title="Dismiss"
          className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-light)] rounded-sm cursor-pointer transition-colors"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 2l8 8M10 2L2 10" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function roleHeading(role?: string | null) {
  switch (role) {
    case "seller":
      return "Seller notifications"
    case "admin":
      return "Admin notifications"
    default:
      return "Notifications"
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [meta, setMeta] = useState<NotificationFeedMeta | null>(null)
  const { activeTab: activeCategory, setActiveTab: setActiveCategory } =
    useUrlTab(NOTIFICATION_TABS, "all")
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({})
  const [bulkBusy, setBulkBusy] = useState(false)

  const loadNotifications = async () => {
    try {
      const response = await fetchNotifications({ limit: 100 })
      setNotifications(
        response.data.filter((notification) => !notification.dismissed_at),
      )
      setMeta(response.meta)
      setError(null)
    } catch (err) {
      setNotifications([])
      setMeta(null)
      setError(
        err instanceof Error ? err.message : "Unable to load notifications.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const categoryOptions = useMemo(() => {
    const options: Array<{
      id: string
      label: string
      count: number
      unread: number
    }> = [
      {
        id: "all",
        label: "All notifications",
        count: meta?.total_count ?? notifications.length,
        unread:
          meta?.unread_count ??
          notifications.filter((notification) => !notification.read_at).length,
      },
    ]

    const dynamicCategories = meta?.categories?.length
      ? meta.categories
      : Object.entries(
          notifications.reduce<Record<string, {
            count: number
            unread: number
          }>>((acc, notification) => {
            const current = acc[notification.category] ?? {
              count: 0,
              unread: 0,
            }
            current.count += 1
            if (!notification.read_at) {
              current.unread += 1
            }
            acc[notification.category] = current
            return acc
          }, {}),
        ).map(([category, counts]) => ({
          category,
          label: isNotifCategory(category)
            ? CATEGORY_CONFIG[category].label
            : category.replace(/[-_]/g, " "),
          count: counts.count,
          unread_count: counts.unread,
        }))

    dynamicCategories.forEach((item) => {
      options.push({
        id: item.category,
        label: item.label,
        count: item.count,
        unread: item.unread_count,
      })
    })

    return options
  }, [meta, notifications])

  const visibleNotifications =
    activeCategory === "all"
      ? notifications
      : notifications.filter(
          (notification) => notification.category === activeCategory,
        )

  const unreadCount =
    meta?.unread_count ??
    notifications.filter((notification) => !notification.read_at).length
  const activeCategoryLabel =
    activeCategory === "all"
      ? "All Notifications"
      : (categoryOptions.find((item) => item.id === activeCategory)?.label ??
        (isNotifCategory(activeCategory)
          ? CATEGORY_CONFIG[activeCategory].label
          : activeCategory))

  const setNotificationBusy = (id: number, busy: boolean) => {
    setBusyIds((current) => ({ ...current, [id]: busy }))
  }

  const handleOpen = async (notification: NotificationRecord) => {
    if (!notification.read_at) {
      setNotificationBusy(notification.id, true)
      try {
        const response = await markNotificationRead(notification.id)
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? response.data : item,
          ),
        )
        if (meta) {
          setMeta({
            ...meta,
            unread_count: Math.max(0, meta.unread_count - 1),
            categories: meta.categories.map((item) =>
              item.category === notification.category
                ? { ...item, unread_count: Math.max(0, item.unread_count - 1) }
                : item,
            ),
          })
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to mark notification as read.",
        )
        return
      } finally {
        setNotificationBusy(notification.id, false)
      }
    }

    const route = resolveActionRoute(notification, user?.role)
    if (route) {
      navigate(route)
    }
  }

  const handleDismiss = async (notification: NotificationRecord) => {
    setNotificationBusy(notification.id, true)
    try {
      await dismissNotification(notification.id)
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id),
      )
      if (meta) {
        const unreadDelta = notification.read_at ? 0 : 1
        setMeta({
          ...meta,
          total_count: Math.max(0, meta.total_count - 1),
          unread_count: Math.max(0, meta.unread_count - unreadDelta),
          categories: meta.categories
            .map((item) => {
              if (item.category !== notification.category) {
                return item
              }

              return {
                ...item,
                count: Math.max(0, item.count - 1),
                unread_count: Math.max(0, item.unread_count - unreadDelta),
              }
            })
            .filter((item) => item.count > 0),
        })
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to dismiss notification.",
      )
    } finally {
      setNotificationBusy(notification.id, false)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return
    }

    setBulkBusy(true)
    try {
      await markAllNotificationsRead()
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      )
      if (meta) {
        setMeta({
          ...meta,
          unread_count: 0,
          categories: meta.categories.map((item) => ({
            ...item,
            unread_count: 0,
          })),
        })
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notifications.",
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const handleDismissVisible = async () => {
    const ids = visibleNotifications.map((notification) => notification.id)
    if (ids.length === 0) {
      return
    }

    setBulkBusy(true)
    try {
      await Promise.all(
        visibleNotifications.map((notification) =>
          dismissNotification(notification.id),
        ),
      )
      setNotifications((current) =>
        current.filter((notification) => !ids.includes(notification.id)),
      )
      setMeta((current) => {
        if (!current) return current

        const dismissedUnread = visibleNotifications.filter(
          (notification) => !notification.read_at,
        ).length
        const nextCategories = current.categories
          .map((item) => {
            const dismissedCount = visibleNotifications.filter(
              (notification) => notification.category === item.category,
            ).length
            const dismissedUnreadCount = visibleNotifications.filter(
              (notification) =>
                notification.category === item.category &&
                !notification.read_at,
            ).length
            if (!dismissedCount) return item

            return {
              ...item,
              count: Math.max(0, item.count - dismissedCount),
              unread_count: Math.max(
                0,
                item.unread_count - dismissedUnreadCount,
              ),
            }
          })
          .filter((item) => item.count > 0)

        return {
          ...current,
          total_count: Math.max(0, current.total_count - ids.length),
          unread_count: Math.max(0, current.unread_count - dismissedUnread),
          categories: nextCategories,
        }
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to dismiss notifications.",
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const heading = roleHeading(user?.role)

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => navigate("/")}
            className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer"
          >
            Home
          </button>
          <svg
            width="9"
            height="9"
            viewBox="0 0 9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            className="text-[var(--color-ink-disabled)]"
          >
            <path d="M3 2l3 2.5-3 2.5" />
          </svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">
            {heading}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">
              {heading}
              {unreadCount > 0 && (
                <span className="ml-2 font-[var(--font-mono)] text-sm font-[400] text-[var(--color-navy)]">
                  ({unreadCount} unread)
                </span>
              )}
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">
              Your live notification feed is now powered by the backend.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleMarkAllRead}
              disabled={bulkBusy || unreadCount === 0}
              className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkBusy ? "Updating..." : "Mark all read"}
            </button>
            <button
              onClick={handleDismissVisible}
              disabled={bulkBusy || visibleNotifications.length === 0}
              className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkBusy
                ? "Updating..."
                : `Dismiss ${activeCategory === "all" ? "all" : "category"}`}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-[var(--color-red-light)] border border-[var(--color-red)]/20 text-[var(--color-red)] px-4 py-3 rounded-sm text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              {categoryOptions.map((item, idx) => {
                const isActive = activeCategory === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      idx > 0
                        ? "border-t border-[var(--color-border-subtle)]"
                        : ""
                    } ${
                      isActive
                        ? "bg-[var(--color-navy-surface)] text-[var(--color-navy)]"
                        : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    <Bell
                      size={14}
                      className="shrink-0 text-[var(--color-ink-muted)]"
                    />
                    <span className="flex-1 text-sm font-[500]">
                      {item.label}
                    </span>
                    {item.unread > 0 ? (
                      <span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-navy)] text-white">
                        {item.unread}
                      </span>
                    ) : item.count > 0 ? (
                      <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-1">
              {categoryOptions.map((item) => {
                const isActive = activeCategory === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-[500] cursor-pointer transition-colors border ${
                      isActive
                        ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]"
                        : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.unread > 0 && (
                      <span
                        className={`font-[var(--font-mono)] text-[9px] px-1 rounded-full ${
                          isActive
                            ? "bg-white/20"
                            : "bg-[var(--color-navy)] text-white"
                        }`}
                      >
                        {item.unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-[600] text-[var(--color-ink)]">
                    {activeCategoryLabel}
                  </h3>
                  <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">
                    ({visibleNotifications.length})
                  </span>
                </div>
                {visibleNotifications.some(
                  (notification) => !notification.read_at,
                ) && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={bulkBusy}
                    className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-16 text-center text-sm text-[var(--color-ink-muted)]">
                  Loading notifications...
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center text-[var(--color-ink-muted)]">
                    <Bell size={20} strokeWidth={1.8} />
                  </div>
                  <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">
                    All caught up
                  </p>
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    {activeCategory === "all"
                      ? "No notifications to show."
                      : `No ${activeCategoryLabel.toLowerCase()} notifications.`}
                  </p>
                </div>
              ) : (
                <div>
                  {visibleNotifications.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      role={user?.role}
                      onOpen={handleOpen}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
