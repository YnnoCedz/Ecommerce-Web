import { useEffect, useMemo, useState } from "react";
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../../api/notifications";

function formatRelativeTime(value: string | null) {
  if (!value) return "Just now";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchNotifications({ limit: 50 });
        if (!active) return;
        setNotifications(response.data.filter((notification) => !notification.dismissed_at));
        setUnreadCount(response.meta.unread_count ?? 0);
      } catch {
        if (!active) return;
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => ({
    total: notifications.length,
    unread: unreadCount,
  }), [notifications.length, unreadCount]);

  const handleMarkRead = async (notification: NotificationRecord) => {
    if (notification.read_at) return;

    try {
      setSaving(notification.id);
      const response = await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? response.data : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    } finally {
      setSaving(null);
    }
  };

  const handleDismiss = async (notification: NotificationRecord) => {
    try {
      setSaving(notification.id);
      await dismissNotification(notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      if (!notification.read_at) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } finally {
      setSaving(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (summary.unread === 0) return;

    try {
      setBulkSaving(true);
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? now })));
      setUnreadCount(0);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white border border-[var(--color-border)] rounded-sm px-5 py-4">
        <div>
          <h1 className="text-sm font-[600] text-[var(--color-ink)]">Notifications</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">Loaded from the backend notification endpoint.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">
            {loading ? "Loading..." : `${summary.total} items`}
          </span>
          <button
            onClick={handleMarkAllRead}
            disabled={bulkSaving || summary.unread === 0}
            className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">No notifications yet</p>
            <p className="text-sm text-[var(--color-ink-muted)]">When the backend generates notifications, they will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              return (
                <div key={notification.id} className={`flex flex-col gap-3 px-5 py-4 ${unread ? "bg-[var(--color-navy-surface)]/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${unread ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${unread ? "font-[600] text-[var(--color-ink)]" : "font-[500] text-[var(--color-ink)]"}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{notification.body}</p>
                        </div>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] whitespace-nowrap">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {notification.action_label && (
                          <span className="text-[10px] font-[500] px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-ink-muted)]">
                            {notification.action_label}
                          </span>
                        )}
                        {notification.order_id && (
                          <span className="text-[10px] font-[500] px-2 py-0.5 rounded-full bg-[var(--color-navy-surface)] text-[var(--color-navy)]">
                            Order #{notification.order_id}
                          </span>
                        )}
                        {notification.product_id && (
                          <span className="text-[10px] font-[500] px-2 py-0.5 rounded-full bg-[var(--color-amber-light)] text-[var(--color-amber)]">
                            Product #{notification.product_id}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => void handleMarkRead(notification)}
                          disabled={saving === notification.id || !unread}
                          className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                        >
                          Mark read
                        </button>
                        <button
                          onClick={() => void handleDismiss(notification)}
                          disabled={saving === notification.id}
                          className="text-xs font-[500] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
